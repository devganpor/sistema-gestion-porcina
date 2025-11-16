# 🚀 Despliegue en Railway

## Pasos para publicar en Railway

### 1. Preparar el repositorio
```bash
git init
git add .
git commit -m "Initial commit - Sistema Gestión Porcina"
```

### 2. Subir a GitHub
1. Crear repositorio en GitHub
2. Conectar y subir:
```bash
git remote add origin https://github.com/tu-usuario/sistema-gestion-porcina.git
git push -u origin main
```

### 3. Desplegar en Railway
1. Ve a [railway.app](https://railway.app)
2. **New Project** → **Deploy from GitHub repo**
3. Selecciona tu repositorio
4. Railway detectará automáticamente el proyecto Node.js

### 4. Configurar Variables de Entorno
En Railway Dashboard → Variables:

```
NODE_ENV=production
PORT=3001
JWT_SECRET=tu_clave_jwt_muy_segura_de_32_caracteres_minimo
SESSION_SECRET=otra_clave_diferente_para_sesiones
SENDGRID_API_KEY=SG.tu_sendgrid_api_key_real
EMAIL_FROM=comganpor@outlook.com
EMAIL_FROM_NAME=ganpor
FRONTEND_URL=https://tu-dominio.railway.app
RATE_LIMIT_MAX_REQUESTS=1000
AUTH_RATE_LIMIT_MAX=10
BACKUP_ENABLED=false
```

### 5. Configurar Dominio (Opcional)
- Railway → Settings → Domains
- Generar dominio público o conectar dominio personalizado

### 6. Verificar Despliegue
- Railway ejecutará automáticamente las migraciones
- El servidor estará disponible en la URL generada
- Logs disponibles en Railway Dashboard

## URLs del Proyecto
- **Backend API**: `https://tu-proyecto.railway.app`
- **Health Check**: `https://tu-proyecto.railway.app/health`
- **API Docs**: `https://tu-proyecto.railway.app/api`

## Comandos Útiles
```bash
# Ver logs en tiempo real
railway logs

# Conectar a la base de datos
railway connect

# Ejecutar comandos remotos
railway run npm run migrate
```

## Notas Importantes
- Railway usa SQLite por defecto (incluido en el proyecto)
- Los backups automáticos están deshabilitados en producción
- Las variables de entorno deben configurarse en Railway Dashboard
- El dominio se genera automáticamente al desplegar