#!/bin/bash

# Script de instalación automática del Sistema de Gestión Porcina
# Versión: 1.0.0

echo "🐷 ====================================="
echo "   Sistema de Gestión Porcina v1.0"
echo "   Script de Instalación Automática"
echo "====================================="
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para mostrar mensajes
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar si Node.js está instalado
check_node() {
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        log_success "Node.js encontrado: $NODE_VERSION"
        
        # Verificar versión mínima (16.0.0)
        REQUIRED_VERSION="16.0.0"
        if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" = "$REQUIRED_VERSION" ]; then
            log_success "Versión de Node.js compatible"
        else
            log_error "Se requiere Node.js v16.0.0 o superior"
            exit 1
        fi
    else
        log_error "Node.js no está instalado"
        log_info "Por favor instala Node.js desde https://nodejs.org/"
        exit 1
    fi
}

# Verificar si npm está instalado
check_npm() {
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        log_success "npm encontrado: v$NPM_VERSION"
    else
        log_error "npm no está instalado"
        exit 1
    fi
}

# Instalar dependencias del servidor
install_server_deps() {
    log_info "Instalando dependencias del servidor..."
    cd server
    
    if npm install; then
        log_success "Dependencias del servidor instaladas"
    else
        log_error "Error instalando dependencias del servidor"
        exit 1
    fi
    
    cd ..
}

# Instalar dependencias del cliente
install_client_deps() {
    log_info "Instalando dependencias del cliente..."
    cd client-app
    
    if npm install; then
        log_success "Dependencias del cliente instaladas"
    else
        log_error "Error instalando dependencias del cliente"
        exit 1
    fi
    
    cd ..
}

# Configurar variables de entorno
setup_env() {
    log_info "Configurando variables de entorno..."
    
    if [ ! -f "server/.env" ]; then
        cp server/.env.example server/.env
        log_success "Archivo .env creado desde .env.example"
        log_warning "Por favor edita server/.env con tus configuraciones"
    else
        log_info "Archivo .env ya existe"
    fi
}

# Ejecutar migraciones
run_migrations() {
    log_info "Ejecutando migraciones de base de datos..."
    cd server
    
    if npm run migrate; then
        log_success "Migraciones ejecutadas correctamente"
    else
        log_error "Error ejecutando migraciones"
        exit 1
    fi
    
    cd ..
}

# Crear directorios necesarios
create_directories() {
    log_info "Creando directorios necesarios..."
    
    mkdir -p server/logs
    mkdir -p server/backups
    mkdir -p server/uploads
    
    log_success "Directorios creados"
}

# Función principal
main() {
    echo "Iniciando instalación..."
    echo ""
    
    # Verificaciones previas
    check_node
    check_npm
    
    # Instalación
    install_server_deps
    install_client_deps
    
    # Configuración
    setup_env
    create_directories
    run_migrations
    
    echo ""
    log_success "¡Instalación completada exitosamente!"
    echo ""
    echo "📋 Próximos pasos:"
    echo "1. Edita server/.env con tus configuraciones"
    echo "2. Para desarrollo:"
    echo "   - Servidor: cd server && npm run dev"
    echo "   - Cliente: cd client-app && npm start"
    echo "3. Para producción:"
    echo "   - Servidor: cd server && npm start"
    echo "   - Cliente: cd client-app && npm run build"
    echo ""
    echo "🌐 URLs por defecto:"
    echo "   - API: http://localhost:3001"
    echo "   - Frontend: http://localhost:3000"
    echo ""
    echo "👤 Usuario por defecto:"
    echo "   - Email: admin@granja.com"
    echo "   - Password: admin123"
    echo ""
    log_warning "¡Recuerda cambiar las credenciales por defecto!"
}

# Ejecutar función principal
main