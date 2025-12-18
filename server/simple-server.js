const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
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

const app = express();
const PORT = process.env.PORT || 3001;

// Configuración de seguridad básica
app.use(helmet({
  contentSecurityPolicy: false // Deshabilitado para desarrollo
}));

app.use(compression());

// CORS simple para desarrollo
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: false
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

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

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Manejo global de errores
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`👤 Usuario: admin@granja.com / admin123`);
  console.log(`🌐 Frontend: http://localhost:3000`);
});
