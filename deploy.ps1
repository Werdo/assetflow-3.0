# ==============================================================================
# AssetFlow 3.0 - Deployment Script for Windows (PowerShell)
# ==============================================================================

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  AssetFlow 3.0 - Deployment" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

$ServerHost = "167.235.58.24"
$ServerUser = "admin"
$ServerPath = "/var/www/assetflow"

Write-Host "📡 Conectando al servidor: $ServerHost" -ForegroundColor Yellow
Write-Host ""

# Crear script temporal con comandos a ejecutar
$RemoteCommands = @"
set -e
echo '📂 Navegando al directorio del proyecto...'
cd $ServerPath
echo '📥 Obteniendo últimos cambios de GitHub...'
git pull origin main
echo '🏗️  Reconstruyendo contenedores...'
sudo docker-compose build backend frontend
echo '🔄 Reiniciando servicios...'
sudo docker-compose restart backend frontend
echo ''
echo '✅ Deployment completado exitosamente!'
echo ''
echo '📊 Estado de los contenedores:'
sudo docker-compose ps
echo ''
echo '📝 Logs del backend (últimas 20 líneas):'
sudo docker logs assetflow-backend --tail 20
"@

# Guardar comandos en archivo temporal
$TempFile = [System.IO.Path]::GetTempFileName() + ".sh"
$RemoteCommands | Out-File -FilePath $TempFile -Encoding ASCII

try {
    # Ejecutar comandos via SSH usando plink (PuTTY)
    Write-Host "Ejecutando deployment en servidor..." -ForegroundColor Green

    # Usar ssh nativo de Windows 10/11
    $RemoteCommands | ssh -o StrictHostKeyChecking=no "$ServerUser@$ServerHost" "bash -s"

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "=========================================" -ForegroundColor Green
        Write-Host "  ✅ Deployment Finalizado" -ForegroundColor Green
        Write-Host "=========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "🌐 Frontend: https://assetflow.oversunenergy.com" -ForegroundColor Cyan
        Write-Host "🔌 Backend API: https://assetflow.oversunenergy.com/api" -ForegroundColor Cyan
        Write-Host "💚 Health Check: https://assetflow.oversunenergy.com/api/health" -ForegroundColor Cyan
        Write-Host ""
    } else {
        Write-Host "❌ Error durante el deployment" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    exit 1
} finally {
    # Limpiar archivo temporal
    if (Test-Path $TempFile) {
        Remove-Item $TempFile -Force
    }
}
