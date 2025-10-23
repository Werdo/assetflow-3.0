#!/bin/bash

###############################################################################
# AssetFlow 3.0 - Sistema de Monitorización y Diagnóstico Automático
# Versión: 1.0
# Descripción: Agente de monitorización que supervisa el sistema y reporta problemas
###############################################################################

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Directorio de logs
LOG_DIR="/var/log/assetflow-monitor"
REPORT_FILE="$LOG_DIR/monitor-report-$(date +%Y%m%d-%H%M%S).log"
ALERT_FILE="$LOG_DIR/alerts.log"

# Crear directorio de logs si no existe
mkdir -p "$LOG_DIR"

# Función de logging
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$REPORT_FILE"
}

# Función para escribir en el reporte
report() {
    echo "$@" | tee -a "$REPORT_FILE"
}

# Banner
clear
report "================================================================================"
report "   AssetFlow 3.0 - Sistema de Monitorización y Diagnóstico"
report "   Inicio: $(date '+%Y-%m-%d %H:%M:%S')"
report "================================================================================"
report ""

###############################################################################
# 1. VERIFICACIÓN DE CONTENEDORES DOCKER
###############################################################################
log "INFO" "Verificando estado de contenedores Docker..."
report ""
report "=========================================="
report "1. ESTADO DE CONTENEDORES DOCKER"
report "=========================================="

CONTAINERS=$(docker ps -a --filter "name=assetflow" --format "{{.Names}}|{{.Status}}|{{.Ports}}")

if [ -z "$CONTAINERS" ]; then
    log "ERROR" "No se encontraron contenedores de AssetFlow"
    report "❌ ERROR: No hay contenedores de AssetFlow en el sistema"
else
    while IFS='|' read -r name status ports; do
        if echo "$status" | grep -q "Up"; then
            if echo "$status" | grep -q "healthy"; then
                report "✅ $name - HEALTHY - $ports"
                log "INFO" "$name está healthy"
            elif echo "$status" | grep -q "unhealthy"; then
                report "⚠️  $name - UNHEALTHY - $ports"
                log "WARN" "$name está unhealthy"
                echo "$(date '+%Y-%m-%d %H:%M:%S') - Container $name is UNHEALTHY" >> "$ALERT_FILE"
            else
                report "🟢 $name - RUNNING - $ports"
                log "INFO" "$name está running"
            fi
        else
            report "❌ $name - STOPPED/ERROR - $status"
            log "ERROR" "$name NO está corriendo: $status"
            echo "$(date '+%Y-%m-%d %H:%M:%S') - Container $name is DOWN: $status" >> "$ALERT_FILE"
        fi
    done <<< "$CONTAINERS"
fi

report ""

###############################################################################
# 2. VERIFICACIÓN DE LOGS DE BACKEND
###############################################################################
log "INFO" "Analizando logs del backend..."
report "=========================================="
report "2. ANÁLISIS DE LOGS DEL BACKEND"
report "=========================================="

if docker ps | grep -q "assetflow-backend"; then
    BACKEND_LOGS=$(docker logs assetflow-backend --tail 50 2>&1)

    # Buscar errores
    ERRORS=$(echo "$BACKEND_LOGS" | grep -i "error\|exception\|fail" | tail -10)
    if [ -n "$ERRORS" ]; then
        report "⚠️  ERRORES ENCONTRADOS EN BACKEND:"
        echo "$ERRORS" | while read -r line; do
            report "   $line"
            log "WARN" "Backend error: $line"
        done
    else
        report "✅ No se encontraron errores en logs del backend"
        log "INFO" "Backend logs clean"
    fi

    # Verificar último health check
    HEALTH_CHECK=$(echo "$BACKEND_LOGS" | grep "Health Check" | tail -1)
    if [ -n "$HEALTH_CHECK" ]; then
        report ""
        report "📊 Último Health Check:"
        report "   $HEALTH_CHECK"
    fi
else
    report "❌ Backend container no está corriendo"
    log "ERROR" "Backend container is not running"
fi

report ""

###############################################################################
# 3. VERIFICACIÓN DE FRONTEND
###############################################################################
log "INFO" "Verificando frontend..."
report "=========================================="
report "3. VERIFICACIÓN DE FRONTEND"
report "=========================================="

if docker ps | grep -q "assetflow-frontend"; then
    # Verificar archivos JavaScript en el contenedor
    JS_FILES=$(docker exec assetflow-frontend ls -lh /usr/share/nginx/html/assets/*.js 2>/dev/null)
    if [ -n "$JS_FILES" ]; then
        report "📦 Archivos JavaScript servidos:"
        echo "$JS_FILES" | while read -r line; do
            report "   $line"
        done
    fi

    # Verificar configuración de nginx
    NGINX_STATUS=$(docker exec assetflow-frontend nginx -t 2>&1)
    if echo "$NGINX_STATUS" | grep -q "successful"; then
        report "✅ Configuración de Nginx válida"
        log "INFO" "Nginx config is valid"
    else
        report "❌ Error en configuración de Nginx:"
        report "$NGINX_STATUS"
        log "ERROR" "Nginx config error: $NGINX_STATUS"
    fi
else
    report "❌ Frontend container no está corriendo"
    log "ERROR" "Frontend container is not running"
fi

report ""

###############################################################################
# 4. VERIFICACIÓN DE MONGODB
###############################################################################
log "INFO" "Verificando MongoDB..."
report "=========================================="
report "4. VERIFICACIÓN DE MONGODB"
report "=========================================="

if docker ps | grep -q "assetflow-mongodb"; then
    # Verificar conexión a MongoDB
    MONGO_STATUS=$(docker exec assetflow-mongodb mongosh --eval "db.adminCommand('ping')" --quiet 2>&1)
    if echo "$MONGO_STATUS" | grep -q "ok.*1"; then
        report "✅ MongoDB responde correctamente"
        log "INFO" "MongoDB is responsive"

        # Obtener estadísticas de base de datos
        DB_STATS=$(docker exec assetflow-mongodb mongosh assetflow --eval "db.stats()" --quiet 2>&1 | grep -E "collections|dataSize|indexes")
        if [ -n "$DB_STATS" ]; then
            report ""
            report "📊 Estadísticas de Base de Datos:"
            echo "$DB_STATS" | while read -r line; do
                report "   $line"
            done
        fi
    else
        report "❌ MongoDB no responde"
        report "$MONGO_STATUS"
        log "ERROR" "MongoDB not responding: $MONGO_STATUS"
    fi
else
    report "❌ MongoDB container no está corriendo"
    log "ERROR" "MongoDB container is not running"
fi

report ""

###############################################################################
# 5. PRUEBA DE CONECTIVIDAD HTTP
###############################################################################
log "INFO" "Probando conectividad HTTP..."
report "=========================================="
report "5. PRUEBAS DE CONECTIVIDAD HTTP"
report "=========================================="

# Test Backend Health Endpoint
BACKEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/health 2>/dev/null)
if [ "$BACKEND_HEALTH" = "200" ]; then
    report "✅ Backend API Health: HTTP $BACKEND_HEALTH (OK)"
    log "INFO" "Backend API health check passed"
else
    report "❌ Backend API Health: HTTP $BACKEND_HEALTH (FAIL)"
    log "ERROR" "Backend API health check failed: HTTP $BACKEND_HEALTH"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Backend API health check failed: HTTP $BACKEND_HEALTH" >> "$ALERT_FILE"
fi

# Test Frontend
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null)
if [ "$FRONTEND_STATUS" = "200" ]; then
    report "✅ Frontend: HTTP $FRONTEND_STATUS (OK)"
    log "INFO" "Frontend is accessible"
else
    report "❌ Frontend: HTTP $FRONTEND_STATUS (FAIL)"
    log "ERROR" "Frontend not accessible: HTTP $FRONTEND_STATUS"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Frontend not accessible: HTTP $FRONTEND_STATUS" >> "$ALERT_FILE"
fi

report ""

###############################################################################
# 6. VERIFICACIÓN DE RECURSOS DEL SISTEMA
###############################################################################
log "INFO" "Verificando recursos del sistema..."
report "=========================================="
report "6. RECURSOS DEL SISTEMA"
report "=========================================="

# CPU y Memoria
report "💻 Uso de CPU y Memoria:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" | head -4 | while read -r line; do
    report "   $line"
done

report ""

# Espacio en disco
DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')
report "💾 Uso de Disco: ${DISK_USAGE}%"
if [ "$DISK_USAGE" -gt 80 ]; then
    log "WARN" "Disk usage is high: ${DISK_USAGE}%"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - High disk usage: ${DISK_USAGE}%" >> "$ALERT_FILE"
fi

# Docker disk usage
DOCKER_DISK=$(docker system df --format "{{.Type}}\t{{.Size}}")
report ""
report "🐳 Uso de Disco Docker:"
echo "$DOCKER_DISK" | while read -r line; do
    report "   $line"
done

report ""

###############################################################################
# 7. VERIFICACIÓN DE CÓDIGOS AUTOMÁTICOS (MODELOS)
###############################################################################
log "INFO" "Verificando modelos de datos..."
report "=========================================="
report "7. VERIFICACIÓN DE MODELOS Y CÓDIGO FUENTE"
report "=========================================="

# Verificar que los archivos tienen 'observaciones' y no 'notas'
MODEL_FILES=("/var/www/assetflow/backend/src/models/Cliente.js"
             "/var/www/assetflow/backend/src/models/Emplazamiento.js"
             "/var/www/assetflow/backend/src/models/Deposito.js")

for model in "${MODEL_FILES[@]}"; do
    filename=$(basename "$model")
    if [ -f "$model" ]; then
        if grep -q "observaciones:" "$model"; then
            report "✅ $filename - Campo 'observaciones' presente"
        else
            report "⚠️  $filename - Campo 'observaciones' NO encontrado"
            log "WARN" "$filename missing 'observaciones' field"
        fi

        # Verificar pre-save hooks para códigos automáticos
        if echo "$filename" | grep -qE "Cliente|Emplazamiento|Deposito"; then
            if grep -q "pre('save'" "$model"; then
                report "✅ $filename - Pre-save hook presente (códigos automáticos)"
            else
                report "⚠️  $filename - Pre-save hook NO encontrado"
                log "WARN" "$filename missing pre-save hook"
            fi
        fi
    else
        report "❌ $filename - Archivo NO encontrado"
        log "ERROR" "$filename not found"
    fi
done

report ""

# Verificar MapView.tsx tiene el safety check
MAPVIEW_FILE="/var/www/assetflow/frontend/src/components/dashboard/MapView.tsx"
if [ -f "$MAPVIEW_FILE" ]; then
    if grep -q "valorTotal || 0" "$MAPVIEW_FILE"; then
        report "✅ MapView.tsx - Safety check presente (valorTotal || 0)"
        log "INFO" "MapView.tsx has safety check"
    else
        report "❌ MapView.tsx - Safety check AUSENTE"
        log "ERROR" "MapView.tsx missing safety check"
        echo "$(date '+%Y-%m-%d %H:%M:%S') - MapView.tsx missing safety check" >> "$ALERT_FILE"
    fi
else
    report "❌ MapView.tsx - Archivo NO encontrado"
    log "ERROR" "MapView.tsx not found"
fi

report ""

###############################################################################
# 8. RESUMEN Y RECOMENDACIONES
###############################################################################
report "=========================================="
report "8. RESUMEN Y RECOMENDACIONES"
report "=========================================="
report ""

# Contar problemas
CRITICAL_COUNT=$(grep -c "ERROR" "$REPORT_FILE" 2>/dev/null || echo "0")
WARNING_COUNT=$(grep -c "WARN" "$REPORT_FILE" 2>/dev/null || echo "0")

if [ "$CRITICAL_COUNT" -eq 0 ] && [ "$WARNING_COUNT" -eq 0 ]; then
    report "✅ SISTEMA OPERATIVO - No se encontraron problemas críticos"
    log "INFO" "System check completed successfully"
elif [ "$CRITICAL_COUNT" -eq 0 ]; then
    report "⚠️  SISTEMA ESTABLE CON ADVERTENCIAS"
    report "   - Advertencias encontradas: $WARNING_COUNT"
    report "   - Problemas críticos: 0"
    log "WARN" "System stable with $WARNING_COUNT warnings"
else
    report "❌ SISTEMA CON PROBLEMAS CRÍTICOS"
    report "   - Errores críticos: $CRITICAL_COUNT"
    report "   - Advertencias: $WARNING_COUNT"
    log "ERROR" "System has $CRITICAL_COUNT critical errors and $WARNING_COUNT warnings"
fi

report ""
report "📋 Reporte completo guardado en: $REPORT_FILE"
report "🚨 Alertas guardadas en: $ALERT_FILE"
report ""
report "================================================================================"
report "   Fin del análisis: $(date '+%Y-%m-%d %H:%M:%S')"
report "================================================================================"

# Retornar código de salida basado en problemas encontrados
if [ "$CRITICAL_COUNT" -gt 0 ]; then
    exit 1
elif [ "$WARNING_COUNT" -gt 0 ]; then
    exit 2
else
    exit 0
fi
