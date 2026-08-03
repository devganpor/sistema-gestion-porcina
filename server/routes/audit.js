const express = require('express');
const { query } = require('../config/database-auto');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/audit — listar logs con filtros
router.get('/', authenticateToken, requireRole(['administrador']), async (req, res) => {
  try {
    const { usuario_id, accion, modulo, fecha_inicio, fecha_fin,
            exitoso, buscar, page = 1, limit = 50 } = req.query;

    const params = [];
    const conditions = [];

    if (usuario_id) { params.push(usuario_id); conditions.push(`al.usuario_id = $${params.length}`); }
    if (accion)     { params.push(accion);      conditions.push(`al.accion = $${params.length}`); }
    if (modulo)     { params.push(modulo);       conditions.push(`al.modulo = $${params.length}`); }
    if (exitoso !== undefined && exitoso !== '') {
      params.push(exitoso === 'true');
      conditions.push(`al.exitoso = $${params.length}`);
    }
    if (fecha_inicio) { params.push(fecha_inicio); conditions.push(`al.created_at >= $${params.length}`); }
    if (fecha_fin)    { params.push(fecha_fin + ' 23:59:59'); conditions.push(`al.created_at <= $${params.length}`); }
    if (buscar) {
      params.push(`%${buscar}%`);
      const idx = params.length;
      conditions.push(`(al.descripcion ILIKE $${idx} OR al.usuario_email ILIKE $${idx} OR al.usuario_nombre ILIKE $${idx} OR al.ruta ILIKE $${idx})`);
    }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [logsRes, countRes] = await Promise.all([
      query(`
        SELECT al.*, u.nombre as usuario_nombre_actual
        FROM audit_logs al
        LEFT JOIN usuarios u ON al.usuario_id = u.id
        ${where}
        ORDER BY al.created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `, [...params, parseInt(limit), offset]),
      query(`SELECT COUNT(*) as total FROM audit_logs al ${where}`, params)
    ]);

    res.json({
      logs: logsRes.rows,
      total: parseInt(countRes.rows[0].total),
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(parseInt(countRes.rows[0].total) / parseInt(limit))
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error obteniendo logs de auditoría' });
  }
});

// GET /api/audit/stats — estadísticas para el dashboard del módulo
router.get('/stats', authenticateToken, requireRole(['administrador']), async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;
    const fi = fecha_inicio || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    const ff = fecha_fin   || new Date().toISOString().split('T')[0];

    const [totales, porAccion, porModulo, porUsuario, porDia, fallidos] = await Promise.all([
      query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE exitoso) as exitosos,
                    COUNT(*) FILTER (WHERE NOT exitoso) as fallidos
             FROM audit_logs WHERE created_at BETWEEN $1 AND $2`, [fi, ff + ' 23:59:59']),

      query(`SELECT accion, COUNT(*) as total FROM audit_logs
             WHERE created_at BETWEEN $1 AND $2
             GROUP BY accion ORDER BY total DESC`, [fi, ff + ' 23:59:59']),

      query(`SELECT modulo, COUNT(*) as total FROM audit_logs
             WHERE created_at BETWEEN $1 AND $2 AND modulo IS NOT NULL
             GROUP BY modulo ORDER BY total DESC LIMIT 10`, [fi, ff + ' 23:59:59']),

      query(`SELECT usuario_nombre, usuario_email, COUNT(*) as total
             FROM audit_logs
             WHERE created_at BETWEEN $1 AND $2 AND usuario_id IS NOT NULL
             GROUP BY usuario_nombre, usuario_email ORDER BY total DESC LIMIT 10`, [fi, ff + ' 23:59:59']),

      query(`SELECT DATE(created_at) as fecha, COUNT(*) as total
             FROM audit_logs WHERE created_at BETWEEN $1 AND $2
             GROUP BY DATE(created_at) ORDER BY fecha`, [fi, ff + ' 23:59:59']),

      query(`SELECT al.*, u.nombre as usuario_nombre_actual FROM audit_logs al
             LEFT JOIN usuarios u ON al.usuario_id = u.id
             WHERE al.exitoso = false AND al.created_at BETWEEN $1 AND $2
             ORDER BY al.created_at DESC LIMIT 20`, [fi, ff + ' 23:59:59'])
    ]);

    res.json({
      periodo: { fecha_inicio: fi, fecha_fin: ff },
      totales: totales.rows[0],
      por_accion: porAccion.rows,
      por_modulo: porModulo.rows,
      por_usuario: porUsuario.rows,
      por_dia: porDia.rows,
      fallidos: fallidos.rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error obteniendo estadísticas de auditoría' });
  }
});

// GET /api/audit/usuarios — lista de usuarios que han generado logs
router.get('/usuarios', authenticateToken, requireRole(['administrador']), async (req, res) => {
  try {
    const result = await query(`
      SELECT DISTINCT usuario_id, usuario_email, usuario_nombre,
             COUNT(*) as total_acciones,
             MAX(created_at) as ultima_actividad
      FROM audit_logs
      WHERE usuario_id IS NOT NULL
      GROUP BY usuario_id, usuario_email, usuario_nombre
      ORDER BY ultima_actividad DESC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo usuarios' });
  }
});

// DELETE /api/audit/purge — purgar logs antiguos (solo admin)
router.delete('/purge', authenticateToken, requireRole(['administrador']), async (req, res) => {
  try {
    const { dias = 90 } = req.body;
    const result = await query(
      `DELETE FROM audit_logs WHERE created_at < NOW() - ($1 || ' days')::INTERVAL`,
      [parseInt(dias)]
    );
    res.json({ message: `Logs anteriores a ${dias} días eliminados`, eliminados: result.rowCount });
  } catch (error) {
    res.status(500).json({ error: 'Error purgando logs' });
  }
});

module.exports = router;
