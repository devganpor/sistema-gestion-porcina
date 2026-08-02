@echo off
REM Script de desarrollo para Windows
REM Sistema de Gestión Porcina v1.0

echo.
echo 🐷 =====================================
echo    Sistema de Gestión Porcina v1.0
echo    Script de Desarrollo
echo =====================================
echo.

REM Verificar si Node.js está instalado
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js no está instalado
    echo Por favor instala Node.js desde https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js encontrado: 
node --version

REM Verificar si npm está instalado
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm no está instalado
    pause
    exit /b 1
)

echo ✅ npm encontrado: v
npm --version

echo.
echo 📦 Instalando dependencias...
echo.

REM Instalar dependencias del servidor
echo 🔧 Instalando dependencias del servidor...
cd server
call npm install
if %errorlevel% neq 0 (
    echo ❌ Error instalando dependencias del servidor
    pause
    exit /b 1
)
echo ✅ Dependencias del servidor instaladas

cd ..

REM Instalar dependencias del cliente
echo 🔧 Instalando dependencias del cliente...
cd client-app
call npm install
if %errorlevel% neq 0 (
    echo ❌ Error instalando dependencias del cliente
    pause
    exit /b 1
)
echo ✅ Dependencias del cliente instaladas

cd ..

REM Configurar variables de entorno
echo 🔧 Configurando variables de entorno...
if not exist "server\.env" (
    copy "server\.env.example" "server\.env"
    echo ✅ Archivo .env creado desde .env.example
    echo ⚠️  Por favor edita server\.env con tus configuraciones
) else (
    echo ℹ️  Archivo .env ya existe
)

REM Crear directorios necesarios
echo 🔧 Creando directorios necesarios...
if not exist "server\logs" mkdir "server\logs"
if not exist "server\backups" mkdir "server\backups"
if not exist "server\uploads" mkdir "server\uploads"
echo ✅ Directorios creados

REM Ejecutar migraciones
echo 🔧 Ejecutando migraciones de base de datos...
cd server
call npm run migrate
if %errorlevel% neq 0 (
    echo ❌ Error ejecutando migraciones
    pause
    exit /b 1
)
echo ✅ Migraciones ejecutadas correctamente

cd ..

echo.
echo ✅ ¡Configuración completada exitosamente!
echo.
echo 📋 Para iniciar el desarrollo:
echo.
echo 1. Servidor (Terminal 1):
echo    cd server
echo    npm run dev
echo.
echo 2. Cliente (Terminal 2):
echo    cd client-app
echo    npm start
echo.
echo 🌐 URLs:
echo    - API: http://localhost:3001
echo    - Frontend: http://localhost:3000
echo.
echo 👤 Usuario por defecto:
echo    - Email: admin@granja.com
echo    - Password: admin123
echo.
echo ⚠️  ¡Recuerda cambiar las credenciales por defecto!
echo.

REM Preguntar si quiere iniciar automáticamente
set /p choice="¿Quieres iniciar el servidor automáticamente? (s/n): "
if /i "%choice%"=="s" (
    echo.
    echo 🚀 Iniciando servidor...
    cd server
    start "Servidor API" cmd /k "npm run dev"
    cd ..
    
    echo 🚀 Iniciando cliente...
    cd client-app
    start "Cliente React" cmd /k "npm start"
    cd ..
    
    echo.
    echo ✅ Servidores iniciados en ventanas separadas
)

echo.
echo 🎉 ¡Listo para desarrollar!
pause