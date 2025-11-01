#!/bin/bash
# Deployment directo al servidor de producción

set -e

echo "=== AssetFlow 3.0 - Deployment a Producción ==="
echo ""

cd /var/www/assetflow

echo "📥 1/5: Obteniendo últimos cambios de GitHub..."
git pull origin main
echo "✅ Cambios obtenidos"
echo ""

echo "🏗️  2/5: Reconstruyendo contenedor backend..."
sudo docker-compose build backend
echo "✅ Backend reconstruido"
echo ""

echo "🏗️  3/5: Reconstruyendo contenedor frontend..."
sudo docker-compose build frontend
echo "✅ Frontend reconstruido"
echo ""

echo "🔄 4/5: Reiniciando servicios..."
sudo docker-compose restart backend frontend
echo "✅ Servicios reiniciados"
echo ""

echo "📊 5/5: Verificando estado..."
sudo docker-compose ps
echo ""

echo "📝 Logs del backend:"
sudo docker logs assetflow-backend --tail 30
echo ""

echo "================================================"
echo "✅ DEPLOYMENT COMPLETADO EXITOSAMENTE"
echo "================================================"
echo ""
echo "🌐 Frontend: https://assetflow.oversunenergy.com"
echo "🔌 API: https://assetflow.oversunenergy.com/api"
echo "💚 Health: https://assetflow.oversunenergy.com/api/health"
echo ""
