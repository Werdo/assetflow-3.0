#!/bin/bash
# ==============================================================================
# AssetFlow 3.0 - Deployment Script
# ==============================================================================
# Este script despliega los cambios al servidor de producción
# ==============================================================================

set -e  # Exit on error

echo "========================================="
echo "  AssetFlow 3.0 - Deployment"
echo "========================================="
echo ""

# Variables
SERVER_HOST="167.235.58.24"
SERVER_USER="admin"
SERVER_PATH="/var/www/assetflow"

echo "📡 Conectando al servidor: $SERVER_HOST"
echo ""

# Ejecutar comandos en el servidor
ssh ${SERVER_USER}@${SERVER_HOST} << 'ENDSSH'
set -e

echo "📂 Navegando al directorio del proyecto..."
cd /var/www/assetflow

echo "📥 Obteniendo últimos cambios de GitHub..."
git pull origin main

echo "🏗️  Reconstruyendo contenedores..."
sudo docker-compose build backend frontend

echo "🔄 Reiniciando servicios..."
sudo docker-compose restart backend frontend

echo ""
echo "✅ Deployment completado exitosamente!"
echo ""

echo "📊 Estado de los contenedores:"
sudo docker-compose ps

echo ""
echo "📝 Logs del backend (últimas 20 líneas):"
sudo docker logs assetflow-backend --tail 20

ENDSSH

echo ""
echo "========================================="
echo "  ✅ Deployment Finalizado"
echo "========================================="
echo ""
echo "🌐 Frontend: https://assetflow.oversunenergy.com"
echo "🔌 Backend API: https://assetflow.oversunenergy.com/api"
echo "💚 Health Check: https://assetflow.oversunenergy.com/api/health"
echo ""
