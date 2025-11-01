# Instrucciones de Deployment - AssetFlow 3.0

## Resumen de Cambios
- **Fix**: Corrección de visibilidad de pines en el mapa del dashboard
- **Feature**: Sistema completo de filtrado y paginación en emplazamientos
- **Enhancement**: Tooltips interactivos en pines del mapa

---

## Opción 1: Script Automático (Recomendado)

### En Git Bash o Terminal Linux/Mac:

```bash
# Dar permisos de ejecución
chmod +x deploy.sh

# Ejecutar deployment
./deploy.sh
```

Ingresa la contraseña cuando se solicite: `bb474edf`

---

## Opción 2: Deployment Manual (Windows/PowerShell)

### Paso 1: Conectar al servidor vía SSH

```powershell
ssh admin@167.235.58.24
# Password: bb474edf
```

### Paso 2: Navegar al directorio del proyecto

```bash
cd /var/www/assetflow
```

### Paso 3: Obtener últimos cambios

```bash
git pull origin main
```

**Salida esperada:**
```
From https://github.com/Werdo/assetflow-3.0
 * branch            main       -> FETCH_HEAD
   cfcee81..d183db4  main       -> origin/main
Updating cfcee81..d183db4
Fast-forward
 backend/src/controllers/dashboardController.js       | 56 ++++++++++++++++----
 backend/src/controllers/emplazamientoController.js   | 12 ++++-
 frontend/src/components/dashboard/RobustMapView.tsx  | 40 ++++++++------
 frontend/src/components/dashboard/SimplifiedMapView.tsx | 280 ++++++++++++++++++++
 frontend/src/pages/emplazamientos/EmplazamientosPage.tsx | 350 ++++++++++++++++++++++
 frontend/src/types/index.ts                          | 4 +-
 6 files changed, 814 insertions(+), 377 deletions(-)
```

### Paso 4: Reconstruir contenedores

```bash
sudo docker-compose build backend frontend
```

### Paso 5: Reiniciar servicios

```bash
sudo docker-compose restart backend frontend
```

### Paso 6: Verificar estado

```bash
sudo docker-compose ps
```

**Salida esperada:**
```
NAME                  STATUS    PORTS
assetflow-backend     Up        0.0.0.0:5000->5000/tcp
assetflow-frontend    Up        0.0.0.0:3000->80/tcp
assetflow-mongodb     Up        27017/tcp
```

### Paso 7: Verificar logs del backend

```bash
sudo docker logs assetflow-backend --tail 20
```

**Buscar líneas como:**
```
[INFO] Server running on port 5000
[INFO] MongoDB Connected: localhost
```

### Paso 8: Verificar funcionamiento

```bash
curl http://localhost:5000/api/health
```

**Salida esperada:**
```json
{
  "success": true,
  "message": "AssetFlow 3.0 API is healthy"
}
```

---

## Opción 3: Deployment desde Windows con PuTTY

1. Abrir **PuTTY**
2. Host Name: `admin@167.235.58.24`
3. Port: `22`
4. Click **Open**
5. Login con password: `bb474edf`
6. Seguir pasos 2-8 de la Opción 2

---

## Verificación Final

### Frontend
Abrir en navegador:
```
https://assetflow.oversunenergy.com
```

**Verificar:**
- ✅ Dashboard carga correctamente
- ✅ Pines del mapa son visibles
- ✅ Tooltips aparecen al pasar el mouse sobre pines
- ✅ Click en pin muestra popup con detalles
- ✅ Filtros en página de emplazamientos funcionan
- ✅ Paginación funciona (50/100/200/Todos)

### Backend API
```
https://assetflow.oversunenergy.com/api/health
```

**Debe retornar:**
```json
{
  "success": true,
  "message": "AssetFlow 3.0 API is healthy",
  "timestamp": "2025-10-31T22:30:00.000Z"
}
```

---

## Rollback (En caso de problemas)

Si algo sale mal, hacer rollback al commit anterior:

```bash
ssh admin@167.235.58.24
cd /var/www/assetflow
git reset --hard cfcee81
sudo docker-compose restart backend frontend
```

---

## Cambios Incluidos en Este Deployment

### Backend (`dashboardController.js`)
- Transformación de coordenadas GeoJSON a formato simple {lat, lng}
- Cálculo automático de estado (verde/amarillo/critico/rojo)
- Agregado campo `diasMinimosRestantes`
- Agregados campos: codigo, ciudad, provincia

### Backend (`emplazamientoController.js`)
- Agregadas estadísticas a lista de emplazamientos
- Campos: valorTotal, depositosActivos, diasMinimo

### Frontend (`RobustMapView.tsx`)
- Pines del mapa mejorados (30px, círculos con centro blanco)
- Tooltips on hover con info rápida
- Popups on click con info detallada
- Color-coding basado en días hasta vencimiento

### Frontend (`EmplazamientosPage.tsx`)
- Sistema completo de filtrado (9 filtros independientes)
- Columnas ordenables con indicadores visuales
- Paginación flexible (50/100/200/Todos)

### Frontend (`SimplifiedMapView.tsx`)
- Replicado sistema de filtrado de EmplazamientosPage
- Vista de tabla en dashboard con misma funcionalidad

### Frontend (`types/index.ts`)
- Actualizado interface Emplazamiento
- Agregados campos opcionales de estadísticas

---

## Contacto de Soporte

Si tienes problemas con el deployment:
- Email: ppelaez@oversunenergy.com
- Revisar logs: `sudo docker logs assetflow-backend -f`
- Estado contenedores: `sudo docker-compose ps`

---

**Última actualización**: 31 de Octubre 2025
**Commit**: d183db4 - Fix: Map pins visibility and comprehensive filtering system
