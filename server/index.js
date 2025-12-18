const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
// Solo cargar SQLiteStore en desarrollo
let SQLiteStore;
if (process.env.NODE_ENV !== 'production' && !process.env.DATABASE_URL) {
  try {
    SQLiteStore = require('connect-sqlite3')(session);
  } catch (err) {
    console.log('SQLite no disponible, usando sesiones en memoria');
  }
}
require('dotenv').config();

const authRoutes = require('./routes/auth');
const animalsRoutes = require('./routes/animals');
const reproductionRoutes = require('./routes/reproduction');
const locationsRoutes = require('./routes/locations');
const weightsRoutes = require('./routes/weights');
const dashboardRoutes = require('./routes/dashboard');
const healthRoutes = require('./routes/health');
const financeRoutes = require('./routes/finance');
const reportsRoutes = require('./routes/reports');
const genealogyRoutes = require('./routes/genealogy');
const nutritionRoutes = require('./routes/nutrition');
const usersRoutes = require('./routes/users');
const emailRoutes = require('./routes/email');
const BackupService = require('./services/BackupService');
const { AuditLogger, auditMiddleware } = require('./services/AuditLogger');
const { errorHandler } = require('./middleware/errorHandler');
const { generateCSRFToken } = require('./middleware/csrf');

const app = express();
const backupService = new BackupService();
const auditLogger = new AuditLogger();
const PORT = process.env.PORT || 3001;

// Rate limiting global (excluding auth)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // máximo 1000 requests por IP
  message: { error: 'Demasiadas solicitudes, intenta más tarde' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path.startsWith('/api/auth')
});

// Configuración de seguridad
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(compression());

// CORS configurado de forma restrictiva
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
};
app.use(cors(corsOptions));

// Sesión para CSRF
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'session-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
  },
};

// Solo usar SQLiteStore en desarrollo local
if (process.env.NODE_ENV !== 'production' && !process.env.DATABASE_URL && SQLiteStore) {
  sessionConfig.store = new SQLiteStore({ db: 'sessions.db' });
}

app.use(session(sessionConfig));

app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Middleware de auditoría
app.use(auditMiddleware(auditLogger));

// Generar token CSRF
app.use('/api', generateCSRFToken);

// Endpoint para obtener token CSRF
app.get('/api/csrf-token', (req, res) => {
  res.json({ csrfToken: req.session.csrfToken });
});

// Endpoints de administración
app.post('/api/admin/backup', async (req, res) => {
  try {
    const backupPath = await backupService.createBackup();
    res.json({ message: 'Backup creado exitosamente', path: backupPath });
  } catch (error) {
    res.status(500).json({ error: 'Error creando backup' });
  }
});

app.get('/api/admin/backups', (req, res) => {
  try {
    const backups = backupService.getBackupList();
    res.json(backups);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo backups' });
  }
});

app.get('/api/admin/audit-logs', (req, res) => {
  try {
    const filters = {
      userId: req.query.userId,
      action: req.query.action,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      limit: parseInt(req.query.limit) || 100
    };
    const logs = auditLogger.getLogs(filters);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo logs' });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/animals', animalsRoutes);
app.use('/api/reproduction', reproductionRoutes);
app.use('/api/locations', locationsRoutes);
app.use('/api/weights', weightsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/genealogy', genealogyRoutes);
app.use('/api/nutrition', nutritionRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/email', emailRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Manejo global de errores
app.use(errorHandler);

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en puerto ${PORT}`);
  console.log(`Entorno: ${process.env.NODE_ENV || 'development'}`);
  
  // Iniciar backup automático
  backupService.scheduleAutoBackup();
  
  // Rotar logs al iniciar
  auditLogger.rotateLogs();
});
