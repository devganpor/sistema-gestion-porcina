# Sistema de Gestión Porcina v1.0 🐷

Sistema integral de gestión para finca porcina de ciclo completo, diseñado para optimizar el control reproductivo, sanitario, productivo y financiero con tecnología moderna y seguridad avanzada.

## ✨ Características Principales

### 🔐 Seguridad Avanzada
- **Autenticación JWT** con tokens seguros y expiración automática
- **Protección CSRF** contra ataques de falsificación de solicitudes
- **Rate Limiting** para prevenir ataques de fuerza bruta
- **Validación de entrada** y sanitización de datos
- **Logs de auditoría** completos para trazabilidad
- **Backup automático** diario de la base de datos

### 📊 Dashboard Inteligente
- **KPIs en tiempo real** con métricas clave del negocio
- **Alertas automáticas** para eventos críticos
- **Gráficos interactivos** y visualización de datos
- **Acciones rápidas** para tareas frecuentes
- **Estado del sistema** en tiempo real

### 🐷 Gestión de Animales
- **Registro individual** con trazabilidad completa
- **Validación de formularios** en tiempo real
- **Genealogía** y seguimiento de parentesco
- **Estados y categorías** dinámicas
- **Búsqueda y filtros** avanzados

### ❤️ Control Reproductivo
- **Ciclos reproductivos** completos
- **Detección de celos** y servicios
- **Gestaciones** y seguimiento de partos
- **Estadísticas reproductivas** detalladas

### ⚖️ Control de Peso
- **Seguimiento de crecimiento** individual
- **Alertas de peso objetivo** automáticas
- **Gráficos de evolución** temporal
- **Estadísticas de rendimiento** por categoría

### 🏠 Gestión de Ubicaciones
- **Corrales y galpones** organizados
- **Movimientos de animales** registrados
- **Capacidad y ocupación** en tiempo real
- **Historial de ubicaciones** completo

### 💉 Control Sanitario
- **Vacunas y tratamientos** programados
- **Medicamentos** y dosis controladas
- **Eventos sanitarios** registrados
- **Alertas de salud** preventivas

### 💰 Gestión Financiera
- **Ingresos y gastos** categorizados
- **Rentabilidad** calculada automáticamente
- **Presupuestos** y control de costos
- **Reportes financieros** detallados

### 📈 Reportes y Analytics
- **Reportes personalizables** en PDF/Excel
- **Análisis de tendencias** y patrones
- **Comparativas temporales** y benchmarking
- **Exportación de datos** flexible

### 🔧 Características Técnicas
- **Interfaz responsive** para móviles y tablets
- **Notificaciones en tiempo real** del sistema
- **Manejo de errores** robusto y user-friendly
- **Carga optimizada** y rendimiento mejorado
- **Multi-usuario** con roles y permisos granulares

## 🛠️ Stack Tecnológico

### Backend
- **Node.js 16+** con Express.js
- **SQLite** para desarrollo (PostgreSQL para producción)
- **JWT** para autenticación segura
- **Helmet** para seguridad HTTP
- **Rate Limiting** y protección CSRF
- **Bcrypt** para hash de contraseñas
- **Express Validator** para validación de datos

### Frontend
- **React 18** con TypeScript
- **Axios** para comunicación HTTP
- **Context API** para manejo de estado
- **CSS3** con variables y grid moderno
- **Responsive Design** mobile-first

### Seguridad
- **CORS** configurado restrictivamente
- **Content Security Policy** (CSP)
- **Session Management** seguro
- **Input Sanitization** automática
- **Audit Logging** completo

### DevOps
- **Backup automático** programado
- **Log rotation** automática
- **Health checks** del sistema
- **Environment variables** para configuración
- **Scripts de instalación** automatizados

## 🚀 Instalación Rápida

### Prerrequisitos

- **Node.js 16+** (recomendado 18+)
- **npm 8+** o yarn
- **Git** para clonar el repositorio

### Instalación Automática

```bash
# Clonar el repositorio
git clone <repository-url>
cd sistema-gestion-porcina

# Ejecutar script de instalación automática
chmod +x install.sh
./install.sh
```

### Instalación Manual

1. **Instalar dependencias del servidor**
```bash
cd server
npm install
```

2. **Instalar dependencias del cliente**
```bash
cd ../client-app
npm install
```

3. **Configurar variables de entorno**
```bash
cd ../server
cp .env.example .env
# Editar .env con tus configuraciones
```

4. **Ejecutar migraciones**
```bash
npm run migrate
```

5. **Iniciar en modo desarrollo**
```bash
# Terminal 1 - Servidor
cd server
npm run dev

# Terminal 2 - Cliente
cd client-app
npm start
```

### Configuración de Producción

```bash
# Variables de entorno importantes
NODE_ENV=production
JWT_SECRET=tu_clave_super_segura_de_32_caracteres_minimo
SESSION_SECRET=otra_clave_diferente_para_sesiones
FRONTEND_URL=https://tu-dominio.com
ADMIN_EMAIL=admin@tugranja.com
ADMIN_PASSWORD=contraseña_segura

# Construir cliente para producción
cd client-app
npm run build

# Iniciar servidor en producción
cd ../server
npm start
```

## Estructura del Proyecto

```
sistema-gestion-porcina/
├── server/                 # Backend API
│   ├── config/            # Configuración de BD
│   ├── middleware/        # Middlewares de autenticación
│   ├── models/           # Modelos de datos
│   ├── routes/           # Rutas de la API
│   └── scripts/          # Scripts de migración
├── client/               # Frontend React (próximamente)
└── docs/                # Documentación
```

## API Endpoints

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/verify` - Verificar token

### Animales
- `GET /api/animals` - Listar animales
- `POST /api/animals` - Crear animal
- `GET /api/animals/:id` - Obtener animal
- `PUT /api/animals/:id` - Actualizar animal

### Reproducción
- `GET /api/reproduction/cycles` - Ciclos reproductivos
- `POST /api/reproduction/cycles` - Crear ciclo
- `POST /api/reproduction/heat` - Registrar celo
- `POST /api/reproduction/service` - Registrar servicio
- `POST /api/reproduction/birth` - Registrar parto

### Ubicaciones
- `GET /api/locations` - Listar ubicaciones
- `POST /api/locations` - Crear ubicación
- `POST /api/locations/move-animal` - Mover animal

### Pesajes
- `GET /api/weights/animal/:id` - Pesajes de animal
- `POST /api/weights` - Registrar pesaje
- `GET /api/weights/growth-stats/:id` - Estadísticas de crecimiento

### Dashboard
- `GET /api/dashboard/kpis` - KPIs principales
- `GET /api/dashboard/alerts` - Alertas del sistema

## 👤 Credenciales por Defecto

Después de ejecutar las migraciones, se crea un usuario administrador:

- **Email**: admin@granja.com (configurable con ADMIN_EMAIL)
- **Password**: admin123 (configurable con ADMIN_PASSWORD)

> ⚠️ **IMPORTANTE**: Cambia estas credenciales inmediatamente en producción

## 🔧 Configuración Avanzada

### Variables de Entorno Importantes

```bash
# Seguridad
JWT_SECRET=clave_jwt_muy_segura_minimo_32_caracteres
SESSION_SECRET=clave_sesion_diferente_al_jwt

# Base de datos (para PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gestion_porcina
DB_USER=postgres
DB_PASSWORD=tu_password

# Configuración de aplicación
PORT=3001
FRONTEND_URL=http://localhost:3000
NODE_ENV=development

# Backup automático
BACKUP_ENABLED=true
MAX_BACKUPS=30

# Rate limiting
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX=5

# Email (opcional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_email@gmail.com
SMTP_PASS=tu_password_de_aplicacion
```

### Comandos Útiles

```bash
# Desarrollo
npm run dev          # Servidor con auto-reload
npm start           # Cliente React

# Base de datos
npm run migrate     # Ejecutar migraciones
npm run seed        # Datos de prueba (opcional)

# Producción
npm run build       # Construir cliente
npm run start:prod  # Servidor en producción

# Mantenimiento
npm run backup      # Crear backup manual
npm run logs        # Ver logs del sistema
```

## 🔒 Características de Seguridad

### Implementadas
- ✅ Autenticación JWT con expiración
- ✅ Protección CSRF con tokens
- ✅ Rate limiting por IP
- ✅ Validación y sanitización de entrada
- ✅ Headers de seguridad (Helmet)
- ✅ CORS restrictivo
- ✅ Hash seguro de contraseñas (bcrypt)
- ✅ Logs de auditoría completos
- ✅ Backup automático programado
- ✅ Manejo seguro de sesiones

### Recomendaciones Adicionales
- 🔐 Usar HTTPS en producción
- 🔐 Configurar firewall del servidor
- 🔐 Monitoreo de logs de seguridad
- 🔐 Actualizaciones regulares de dependencias
- 🔐 Backup offsite de la base de datos

## 📊 Métricas y Monitoreo

### KPIs Disponibles
- Total de animales y estado
- Reproductores activos
- Lechones pendientes de destete
- Peso promedio por categoría
- Ventas y gastos mensuales
- Rentabilidad calculada
- Alertas del sistema

### Logs y Auditoría
- Todos los cambios son registrados
- Logs rotativos automáticos
- Trazabilidad completa de acciones
- Monitoreo de accesos y errores

## 🚀 Próximas Características

### En Desarrollo
- [ ] **Notificaciones Push** para eventos críticos
- [ ] **API REST completa** para integraciones
- [ ] **Exportación avanzada** (PDF, Excel, CSV)
- [ ] **Gráficos interactivos** con Chart.js
- [ ] **App móvil nativa** (React Native)

### Planificadas
- [ ] **Integración IoT** para sensores
- [ ] **Machine Learning** para predicciones
- [ ] **Multi-granja** para empresas grandes
- [ ] **Marketplace** para compra/venta
- [ ] **Integración contable** con sistemas ERP

## 🆘 Soporte y Documentación

### Documentación
- **API Docs**: Disponible en `/api/docs` cuando el servidor esté ejecutándose
- **Guía de Usuario**: Ver carpeta `/docs/user-guide`
- **Guía de Desarrollador**: Ver carpeta `/docs/developer-guide`

### Solución de Problemas

**Error de conexión a la base de datos:**
```bash
# Verificar que SQLite esté disponible
ls -la server/database.sqlite

# Ejecutar migraciones nuevamente
cd server && npm run migrate
```

**Error de permisos:**
```bash
# Dar permisos de ejecución
chmod +x install.sh

# Verificar permisos de directorios
chmod 755 server/logs server/backups
```

**Puerto en uso:**
```bash
# Cambiar puerto en .env
PORT=3002

# O matar proceso en puerto 3001
lsof -ti:3001 | xargs kill -9
```

### Contribuir

1. Fork el repositorio
2. Crear rama feature (`git checkout -b feature/nueva-caracteristica`)
3. Commit cambios (`git commit -am 'Agregar nueva característica'`)
4. Push a la rama (`git push origin feature/nueva-caracteristica`)
5. Crear Pull Request

### Reportar Bugs

Usa el sistema de Issues de GitHub con la siguiente información:
- Versión del sistema
- Pasos para reproducir
- Comportamiento esperado vs actual
- Screenshots si aplica
- Logs relevantes

## 📄 Licencia

MIT License - Ver archivo [LICENSE](LICENSE) para más detalles.

---

**Desarrollado con ❤️ para la industria porcina**

*Sistema de Gestión Porcina v1.0 - Tecnología moderna para granjas tradicionales*