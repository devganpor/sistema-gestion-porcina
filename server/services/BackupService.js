const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class BackupService {
  constructor() {
    this.backupDir = path.join(__dirname, '../backups');
    this.dbPath = path.join(__dirname, '../database.sqlite');
    this.maxBackups = 30; // Mantener 30 backups
    
    // Crear directorio de backups si no existe
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  async createBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `backup_${timestamp}.sqlite`;
      const backupPath = path.join(this.backupDir, backupFileName);

      // Copiar base de datos
      fs.copyFileSync(this.dbPath, backupPath);

      console.log(`✅ Backup creado: ${backupPath}`);
      
      // Limpiar backups antiguos
      await this.cleanOldBackups();
      
      return backupPath;
    } catch (error) {
      console.error('❌ Error creando backup:', error);
      throw error;
    }
  }

  async cleanOldBackups() {
    try {
      const files = fs.readdirSync(this.backupDir)
        .filter(file => file.startsWith('backup_') && file.endsWith('.sqlite'))
        .map(file => ({
          name: file,
          path: path.join(this.backupDir, file),
          time: fs.statSync(path.join(this.backupDir, file)).mtime
        }))
        .sort((a, b) => b.time - a.time);

      // Eliminar backups antiguos
      if (files.length > this.maxBackups) {
        const filesToDelete = files.slice(this.maxBackups);
        for (const file of filesToDelete) {
          fs.unlinkSync(file.path);
          console.log(`🗑️ Backup eliminado: ${file.name}`);
        }
      }
    } catch (error) {
      console.error('❌ Error limpiando backups:', error);
    }
  }

  getBackupList() {
    try {
      return fs.readdirSync(this.backupDir)
        .filter(file => file.startsWith('backup_') && file.endsWith('.sqlite'))
        .map(file => {
          const filePath = path.join(this.backupDir, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            size: stats.size,
            created: stats.mtime,
            path: filePath
          };
        })
        .sort((a, b) => b.created - a.created);
    } catch (error) {
      console.error('❌ Error obteniendo lista de backups:', error);
      return [];
    }
  }

  // Programar backups automáticos
  scheduleAutoBackup() {
    // Backup diario a las 2:00 AM
    const scheduleDaily = () => {
      const now = new Date();
      const scheduledTime = new Date();
      scheduledTime.setHours(2, 0, 0, 0);
      
      if (scheduledTime <= now) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
      }
      
      const timeUntilBackup = scheduledTime.getTime() - now.getTime();
      
      setTimeout(async () => {
        await this.createBackup();
        scheduleDaily(); // Programar el siguiente
      }, timeUntilBackup);
      
      console.log(`📅 Próximo backup programado: ${scheduledTime.toLocaleString()}`);
    };

    scheduleDaily();
  }
}

module.exports = BackupService;