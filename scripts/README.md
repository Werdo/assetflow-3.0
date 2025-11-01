# AssetFlow Automation Scripts

Scripts automatizados para copias de seguridad, snapshots y gestión del sistema AssetFlow.

## 📋 Contenido

1. **Sistema de Backups** - Copias de seguridad automatizadas de MongoDB y archivos
2. **Sistema de Snapshots** - Snapshots de contenedores Docker
3. **Terminal de Administración** - Interfaz web para gestión del sistema

---

## 🔄 Sistema de Backups

### Archivos
- `backup.sh` - Script principal de backup
- `backup.config.json` - Configuración del sistema de backup

### Características
- ✅ Backup de MongoDB (mongodump)
- ✅ Backup de archivos de configuración
- ✅ Compresión automática (tar.gz)
- ✅ Rotación de backups (daily/weekly/monthly)
- ✅ Retención configurable
- ✅ Logs detallados

### Configuración (`backup.config.json`)

```json
{
  "enabled": true,                    // Activar/desactivar sistema
  "schedule": "0 2 * * *",            // Cron: 2 AM todos los días
  "retention": {
    "daily": 7,                       // Mantener 7 backups diarios
    "weekly": 4,                      // Mantener 4 backups semanales
    "monthly": 6                      // Mantener 6 backups mensuales
  },
  "destinations": {
    "local": {
      "enabled": true,
      "path": "/var/backups/assetflow"
    }
  },
  "mongodb": {
    "enabled": true,
    "host": "mongodb",
    "port": 27017,
    "database": "assetflow"
  },
  "files": {
    "enabled": true,
    "paths": [
      "/var/www/assetflow/.env",
      "/var/www/assetflow/docker-compose.yml"
    ]
  }
}
```

### Uso Manual

```bash
# Ejecutar backup manualmente
sudo ./backup.sh

# Ver logs
tail -f /var/log/assetflow/backup.log

# Listar backups
ls -lh /var/backups/assetflow/
```

---

## 📸 Sistema de Snapshots

### Archivos
- `snapshot.sh` - Script principal de snapshots
- `snapshot.config.json` - Configuración de snapshots

### Características
- ✅ Snapshot de contenedores Docker
- ✅ Backup de volúmenes Docker
- ✅ Metadata de contenedores
- ✅ Limpieza automática
- ✅ Retención por cantidad y edad

### Configuración (`snapshot.config.json`)

```json
{
  "enabled": true,
  "schedule": "0 */6 * * *",          // Cada 6 horas
  "containers": [
    {
      "name": "assetflow-backend",
      "enabled": true,
      "includeVolumes": true
    },
    {
      "name": "mongodb",
      "enabled": true,
      "includeVolumes": true
    }
  ],
  "destination": {
    "path": "/var/snapshots/assetflow"
  },
  "retention": {
    "count": 10,                      // Mantener 10 snapshots
    "maxAgeDays": 30                  // Máximo 30 días
  }
}
```

### Uso Manual

```bash
# Crear snapshot manualmente
sudo ./snapshot.sh

# Ver logs
tail -f /var/log/assetflow/snapshot.log

# Listar snapshots
ls -lh /var/snapshots/assetflow/
```

### Restaurar desde Snapshot

```bash
# Ver metadata del snapshot
cat /var/snapshots/assetflow/assetflow-backend_TIMESTAMP_metadata.json

# Restaurar contenedor
docker load -i /var/snapshots/assetflow/assetflow-backend_TIMESTAMP.tar.gz

# Restaurar volumen
tar -xzf /var/snapshots/assetflow/assetflow-backend_TIMESTAMP_volumes/VOLUME_NAME.tar.gz \
    -C /var/lib/docker/volumes/VOLUME_NAME/_data/
```

---

## ⚙️ Instalación

### 1. Copiar scripts al servidor

```bash
# Copiar directorio completo
scp -r scripts/ admin@server:/var/www/assetflow/

# Conectar al servidor
ssh admin@server
cd /var/www/assetflow/scripts
```

### 2. Instalar dependencias

```bash
# Instalar jq (si no está instalado)
sudo apt-get update
sudo apt-get install -y jq

# Verificar Docker
docker --version
```

### 3. Configurar scripts

```bash
# Editar configuración de backup
nano backup.config.json

# Editar configuración de snapshot
nano snapshot.config.json
```

### 4. Instalar cron jobs

```bash
# Ejecutar instalador
./install-cron.sh

# Verificar instalación
crontab -l
```

---

## 📊 Monitoreo y Logs

### Ubicación de Logs
```
/var/log/assetflow/
├── backup.log      # Logs de backups
└── snapshot.log    # Logs de snapshots
```

### Ver logs en tiempo real
```bash
# Backups
tail -f /var/log/assetflow/backup.log

# Snapshots
tail -f /var/log/assetflow/snapshot.log

# Ambos
tail -f /var/log/assetflow/*.log
```

### Monitorear espacio
```bash
# Espacio usado por backups
du -sh /var/backups/assetflow/

# Espacio usado por snapshots
du -sh /var/snapshots/assetflow/

# Total
df -h
```

---

## 🔧 Mantenimiento

### Modificar horarios

```bash
# Editar crontab directamente
crontab -e

# O reinstalar después de cambiar config
./install-cron.sh
```

### Limpiar backups manualmente

```bash
# Eliminar backups antiguos
find /var/backups/assetflow -type f -mtime +30 -delete

# Eliminar snapshots antiguos
find /var/snapshots/assetflow -type f -mtime +30 -delete
```

### Deshabilitar temporalmente

```bash
# Opción 1: Editar config
nano backup.config.json  # Cambiar enabled: false

# Opción 2: Comentar en crontab
crontab -e  # Añadir # al inicio de la línea
```

---

## 📅 Schedules Recomendados

### Entorno de Producción
- **Backups**: `0 2 * * *` (2 AM diario)
- **Snapshots**: `0 */6 * * *` (Cada 6 horas)

### Entorno de Desarrollo
- **Backups**: `0 0 * * *` (Medianoche diario)
- **Snapshots**: `0 */12 * * *` (Cada 12 horas)

### Alta Disponibilidad
- **Backups**: `0 */4 * * *` (Cada 4 horas)
- **Snapshots**: `0 */2 * * *` (Cada 2 horas)

---

## 🚨 Troubleshooting

### Backup falla - Permission denied
```bash
# Dar permisos necesarios
sudo chmod +x backup.sh
sudo mkdir -p /var/backups/assetflow
sudo chown -R $USER:$USER /var/backups/assetflow
```

### Snapshot falla - Docker not found
```bash
# Verificar que Docker está en PATH
which docker

# Añadir al PATH si es necesario
export PATH=$PATH:/usr/bin
```

### Cron no ejecuta
```bash
# Verificar servicio cron
sudo systemctl status cron

# Reiniciar cron
sudo systemctl restart cron

# Ver logs de cron
grep CRON /var/log/syslog
```

### Espacio insuficiente
```bash
# Verificar espacio
df -h

# Limpiar backups antiguos inmediatamente
find /var/backups/assetflow -mtime +7 -delete
find /var/snapshots/assetflow -mtime +7 -delete
```

---

## 📞 Soporte

Para más información o reportar problemas, consulta la documentación principal de AssetFlow.
