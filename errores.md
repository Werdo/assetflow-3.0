# Reporte de Errores y Soluciones - AssetFlow 3.0

**Fecha:** 22 de Octubre de 2025
**Entorno:** Producción (167.235.58.24)
**Versión:** AssetFlow 3.0

---

## 1. TAREA INICIAL: Generación Automática de Códigos

### Requisito del Usuario
Implementar generación automática de códigos para:
- **Clientes:** `CLI-XXXXX` (5 dígitos, incremental)
- **Emplazamientos:** `EMP-2025-XXXXXX` (6 dígitos, incremental con año)
- **Depósitos:** `DEP-2025-XXXXXXX` (7 dígitos, incremental con año)
- **Productos:** Mantener manual (para coincidir con ERP)

### Implementación Realizada

#### 1.1 Modelo Cliente (`backend/src/models/Cliente.js`)
```javascript
// Campo agregado
codigo: {
  type: String,
  unique: true,
  trim: true,
  uppercase: true
}

// Pre-save hook agregado (líneas 53-83)
clienteSchema.pre('save', async function(next) {
  if (this.isNew && !this.codigo) {
    const Cliente = this.constructor;
    const lastCliente = await Cliente.findOne({ codigo: /^CLI-/ })
      .sort({ codigo: -1 })
      .limit(1)
      .select('codigo')
      .lean();

    let nextNumber = 1;
    if (lastCliente && lastCliente.codigo) {
      const match = lastCliente.codigo.match(/^CLI-(\\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }
    this.codigo = `CLI-${String(nextNumber).padStart(5, '0')}`;
  }
  next();
});

// Índice agregado
clienteSchema.index({ codigo: 1 }, { unique: true, sparse: true });
```

#### 1.2 Modelo Emplazamiento (`backend/src/models/Emplazamiento.js`)
```javascript
// Campo agregado
codigo: {
  type: String,
  unique: true,
  trim: true,
  uppercase: true
}

// Pre-save hook agregado (líneas 70-102)
emplazamientoSchema.pre('save', async function(next) {
  if (this.isNew && !this.codigo) {
    const currentYear = new Date().getFullYear();
    const prefix = `EMP-${currentYear}-`;

    const lastEmplazamiento = await Emplazamiento.findOne({
      codigo: new RegExp(`^${prefix}`)
    })
      .sort({ codigo: -1 })
      .limit(1)
      .select('codigo')
      .lean();

    let nextNumber = 1;
    if (lastEmplazamiento && lastEmplazamiento.codigo) {
      const match = lastEmplazamiento.codigo.match(/^EMP-\\d{4}-(\\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }
    this.codigo = `${prefix}${String(nextNumber).padStart(6, '0')}`;
  }
  next();
});

// Índice agregado
emplazamientoSchema.index({ codigo: 1 }, { unique: true, sparse: true });
```

#### 1.3 Modelo Depósito (`backend/src/models/Deposito.js`)
```javascript
// Campo agregado
numeroDeposito: {
  type: String,
  unique: true,
  trim: true,
  uppercase: true
}

// Pre-save hook modificado (líneas 72-133)
depositoSchema.pre('save', async function(next) {
  try {
    // Auto-generar numeroDeposito
    if (this.isNew && !this.numeroDeposito) {
      const Deposito = this.constructor;
      const currentYear = new Date().getFullYear();
      const prefix = `DEP-${currentYear}-`;

      const lastDeposito = await Deposito.findOne({
        numeroDeposito: new RegExp(`^${prefix}`)
      })
        .sort({ numeroDeposito: -1 })
        .limit(1)
        .select('numeroDeposito')
        .lean();

      let nextNumber = 1;
      if (lastDeposito && lastDeposito.numeroDeposito) {
        const match = lastDeposito.numeroDeposito.match(/^DEP-\\d{4}-(\\d+)$/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }
      this.numeroDeposito = `${prefix}${String(nextNumber).padStart(7, '0')}`;
    }

    // ... resto del código existente para valorUnitario y estado
    next();
  } catch (error) {
    next(error);
  }
});

// Índice agregado
depositoSchema.index({ numeroDeposito: 1 }, { unique: true, sparse: true });
```

### Despliegue Inicial
- Modelos modificados y desplegados vía SCP a `/var/www/assetflow/backend/src/models/`
- Contenedor backend reiniciado exitosamente

---

## 2. ERROR #1: Validación de Depósitos (500 Internal Server Error)

### Descripción del Error
```
POST https://assetflow.oversunenergy.com/api/depositos 500 (Internal Server Error)
Mensaje: "Errores de validación"
```

### Causa Raíz
Inconsistencia en nombres de campos entre frontend, controller y modelo:
- **Frontend** envía: `observaciones`
- **Backend Controller** espera: `observaciones`
- **Modelo Deposito** tenía: `notas`

### Solución Aplicada
Modificar el modelo Deposito.js para usar `observaciones` en lugar de `notas`:

```bash
# En servidor: /var/www/assetflow/backend/src/models/Deposito.js
# Línea 55: cambiar 'notas' por 'observaciones'
sed -i 's/notas:/observaciones:/g' Deposito.js
sed -i 's/this\.notas/this.observaciones/g' Deposito.js
```

**Resultado:** Contenedor backend reiniciado, error resuelto

---

## 3. ERROR #2: Dashboard en Blanco (TypeError: toLocaleString)

### Descripción del Error
```
TypeError: Cannot read properties of undefined (reading 'toLocaleString')
at index-DbThLC_1.js:260:3690
```

**Síntomas:**
- Dashboard completamente en blanco
- Error persistente incluso después de limpiar caché del navegador
- Verificado en múltiples navegadores (Chrome, Opera)

### Proceso de Diagnóstico

#### 3.1 Investigación Inicial
1. **Verificación de contenedor frontend:**
   - Archivos en `/usr/share/nginx/html/` fechados Oct 22 12:45
   - JavaScript antiguo: `index-DbThLC_1.js`

2. **Múltiples intentos de rebuild:**
   - `docker compose build frontend` → Usaba caché
   - `docker compose build --no-cache` → Múltiples procesos en background quedaron colgados
   - Contenedores recreados pero seguían sirviendo archivos antiguos

3. **Descubrimiento del problema:**
   - La imagen Docker tenía archivos de 2 horas antes (12:45)
   - Builds posteriores usaban layer caching de Docker
   - El código fuente en el servidor provenía del repositorio GitHub (no tenía los cambios locales)

#### 3.2 Localización del Error
Búsqueda exhaustiva de uso de `toLocaleString()`:

```bash
# Búsqueda en DashboardPage
grep -n 'toLocaleString' /var/www/assetflow/frontend/src/pages/dashboard/DashboardPage.tsx
# Resultado: Solo línea 205 (fecha, no es el error)

# Búsqueda en componentes
find /var/www/assetflow/frontend/src/components -name '*.tsx' -exec grep -l 'toLocaleString' {} \;
# Resultado: MapView.tsx
```

**Archivo problemático:** `/var/www/assetflow/frontend/src/components/dashboard/MapView.tsx`

**Línea 215 (ANTES):**
```typescript
€{emp.valorTotal.toLocaleString('es-ES', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})}
```

### Causa Raíz
Cuando un emplazamiento no tiene depósitos, `valorTotal` es `undefined`, causando que `.toLocaleString()` falle y crashee React.

### Solución Aplicada

**Línea 215 (DESPUÉS):**
```typescript
€{(emp.valorTotal || 0).toLocaleString('es-ES', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})}
```

**Comando aplicado:**
```bash
ssh admin@167.235.58.24 "sed -i \"215s/.*/                            €{(emp.valorTotal || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/\" /var/www/assetflow/frontend/src/components/dashboard/MapView.tsx"
```

### Despliegue de la Solución

```bash
# 1. Limpiar contenedor temporal
docker stop assetflow-frontend-new
docker rm assetflow-frontend-new

# 2. Rebuild frontend con fix
docker compose build frontend

# Resultado del build:
# - Nuevo archivo JavaScript: index-qzloV1hy.js (631.27 kB)
# - Timestamp: Oct 22 14:28
# - Build exitoso en 6.59s

# 3. Recrear contenedor
docker compose up -d --no-deps frontend
```

**Verificación:**
```bash
docker exec assetflow-frontend ls -la /usr/share/nginx/html/assets/
# Resultado: index-qzloV1hy.js con timestamp Oct 22 14:28 ✓
```

**Estado Final:**
```
CONTAINER ID   IMAGE                STATUS
c9c7fc652911   assetflow-frontend   Up 56 seconds (healthy)
3c58cb71e1d9   assetflow-backend    Up 9 minutes (unhealthy)
9addb35df412   mongo:6.0            Up 9 minutes (healthy)
```

**Nota:** Backend marcado como "unhealthy" pero funcional (healthcheck lento, pero sirviendo requests correctamente según logs)

---

## 4. ERRORES SECUNDARIOS DURANTE TROUBLESHOOTING

### 4.1 Procesos de Build en Background Colgados
**Problema:** Múltiples comandos `docker compose build` quedaron corriendo en background sin completarse.

**Procesos identificados:**
- Bash 36b802, 54763b, 90af65, 68e866, 2b3420, d942ab, 703be0
- Bash 883f0d, d84a94, 448ad5, a5f1b7, 0da624, 88ca03
- Bash 6d32e8, b9399e, b2be51, 383ec4, 908a13

**Solución:** Estos procesos deben ser terminados antes del redespliegue limpio.

### 4.2 Errores en Middleware de Validación
**Problema:** Al intentar agregar debug logging, se introdujeron errores de sintaxis:
- Líneas duplicadas de `require()`
- Closing brace extra (`};` en lugar de `}`)

**Solución Aplicada:**
```bash
sed -i '7,8d' validate.js      # Eliminar líneas duplicadas 7-8
sed -i '26s/};/}/' validate.js  # Corregir closing brace extra
```

**Estado:** Corregido, pero el archivo debe ser revisado en el redespliegue.

### 4.3 Docker Layer Caching
**Problema:** Docker estaba usando layers cacheados incluso después de modificar archivos fuente.

**Lecciones Aprendidas:**
- `docker compose build` sin flags puede usar caché agresivamente
- La copia de archivos al stage de nginx puede usar layers antiguos
- Es necesario `docker compose up -d --no-deps` para evitar dependencias de healthchecks

---

## 5. ARCHIVOS MODIFICADOS EN PRODUCCIÓN

### Backend
1. `/var/www/assetflow/backend/src/models/Cliente.js`
   - Agregado campo `codigo`
   - Agregado pre-save hook para generación automática
   - Agregado índice unique sparse

2. `/var/www/assetflow/backend/src/models/Emplazamiento.js`
   - Agregado campo `codigo`
   - Agregado pre-save hook para generación automática con año
   - Agregado índice unique sparse

3. `/var/www/assetflow/backend/src/models/Deposito.js`
   - Agregado campo `numeroDeposito`
   - Modificado pre-save hook para generación automática con año
   - **Campo `notas` renombrado a `observaciones`**
   - Agregado índice unique sparse

4. `/var/www/assetflow/backend/src/middleware/validate.js`
   - Corregidos errores de sintaxis (líneas duplicadas y closing brace)

### Frontend
1. `/var/www/assetflow/frontend/src/components/dashboard/MapView.tsx`
   - **Línea 215:** Agregado safety check `(emp.valorTotal || 0)`

---

## 6. ESTADO ACTUAL DEL SISTEMA

### Contenedores Docker
- **assetflow-mongodb:** ✅ Healthy
- **assetflow-backend:** ⚠️ Unhealthy (pero funcional)
- **assetflow-frontend:** ✅ Healthy (recién reconstruido con fix)

### Funcionalidad
- ✅ Generación automática de códigos implementada
- ✅ Dashboard arreglado (MapView.tsx con safety check)
- ✅ Frontend sirviendo nuevo JavaScript (index-qzloV1hy.js)
- ⚠️ Backend healthcheck fallando (timeout, pero API responde correctamente)

### Archivos Desplegados
- Backend: Desplegado vía SCP, contenedor reiniciado
- Frontend: Reconstruido in-place en servidor, nuevo container creado

---

## 7. RECOMENDACIONES PARA REDESPLIEGUE LIMPIO

### Antes del Redespliegue
1. ✅ Terminar todos los procesos bash en background
2. ✅ Hacer backup de la base de datos MongoDB
3. ✅ Verificar que archivos fuente en servidor tienen todos los cambios

### Durante el Redespliegue
1. ✅ `docker compose down` (eliminar todos los contenedores)
2. ✅ `docker system prune -f` (limpiar imágenes y layers antiguos)
3. ✅ `docker compose build --no-cache` (rebuild completo sin caché)
4. ✅ `docker compose up -d` (iniciar servicios)

### Después del Redespliegue
1. ✅ Verificar logs de cada contenedor
2. ✅ Probar creación de Cliente, Emplazamiento y Depósito
3. ✅ Verificar que Dashboard carga correctamente
4. ✅ Confirmar que backend healthcheck pasa (dar tiempo de warmup)

---

## 8. LECCIONES APRENDIDAS

1. **Docker Layer Caching:** Puede causar que cambios en código fuente no se reflejen. Siempre usar `--no-cache` para builds críticos.

2. **Healthchecks Bloqueantes:** Los healthchecks de Docker Compose pueden impedir que contenedores dependientes inicien, incluso si el servicio está funcionando.

3. **Consistencia de Nombres de Campos:** Mantener sincronizados frontend, controller y modelo es crítico. Documentar convenciones de nombres.

4. **Safety Checks en Frontend:** Siempre agregar validación de datos nulos/undefined antes de llamar métodos, especialmente con datos de API.

5. **Background Processes:** Evitar iniciar múltiples builds en paralelo. Puede causar deadlocks y confusión.

6. **Git vs Despliegue Directo:** El código en el servidor debe estar sincronizado con el repositorio para evitar discrepancias.

---

## 9. PRÓXIMOS PASOS REQUERIDOS

### Crítico
- [ ] Redesplegar sistema completo desde cero (docker compose down + build --no-cache)
- [ ] Verificar funcionamiento de generación automática de códigos
- [ ] Confirmar que dashboard funciona correctamente

### Importante
- [ ] Investigar por qué backend healthcheck falla (timeout de curl)
- [ ] Sincronizar cambios con repositorio Git
- [ ] Hacer commit de todos los cambios realizados

### Mejora Continua
- [ ] Agregar tests unitarios para pre-save hooks de modelos
- [ ] Agregar PropTypes o TypeScript validations en MapView
- [ ] Mejorar error handling en dashboard para errores de API
- [ ] Documentar convención de nombres de campos (observaciones vs notas)

---

## 10. INTERVENCIÓN 23 OCTUBRE 2025 - ERRORES CRÍTICOS EN PRODUCCIÓN

**Fecha:** 2025-10-23
**Commit inicial:** `a8ba182`
**Commits de fixes:** `5338951`

### 10.1 ERROR #3: Alertas Completamente Fallidas

**Síntomas:**
```
Error al cargar alertas
GET https://assetflow.oversunenergy.com/api/alertas 500 (Internal Server Error)
```

**Causa Raíz:**
Mismatch de nombres de campo en esquema de Alertas:
- **Modelo Alerta:** Define campo `deposito` (ObjectId ref)
- **Controladores:** Usaban `depositoAfectado` en todas partes

**Archivos Afectados:**
- `backend/src/controllers/alertaController.js` - 40+ referencias a `depositoAfectado`
- `backend/src/controllers/dashboardController.js` - 14 referencias
- `backend/src/controllers/depositoController.js` - 6 referencias
- `backend/src/jobs/alertasJob.js` - 12 referencias
- `backend/src/models/Alerta.js` - Rutas de populate

**Solución Aplicada:**
```bash
# Renombrado global: depositoAfectado → deposito
# En todos los archivos mencionados arriba
```

**Cambios Específicos:**

1. **alertaController.js línea 130:**
```javascript
// ANTES:
const deposito = await Deposito.findById(deposito); // ❌ Variable name conflict

// DESPUÉS:
const depositoDoc = await Deposito.findById(deposito); // ✅
```

2. **models/Alerta.js - Null safety:**
```javascript
// ANTES:
mensaje: `Valor alto detectado: €${deposito.valorTotal.toFixed(2)}`

// DESPUÉS:
const valorTotal = deposito.valorTotal || 0;
const valorUmbralSafe = valorUmbral || 0;
mensaje: `Valor alto detectado: €${valorTotal.toFixed(2)}`
```

3. **alertasJob.js línea 74:**
```javascript
// ANTES:
await Alerta.crearAlertaVencimiento(deposito); // ❌ Falta parámetro

// DESPUÉS:
await Alerta.crearAlertaVencimiento(deposito, diasHastaVencimiento); // ✅
```

**Resultado:** ✅ Módulo de alertas funcionando completamente

---

### 10.2 ERROR #4: Depósitos - Múltiples Fallos

#### 10.2.1 No se puede crear depósito nuevo

**Síntomas:**
```
Campo "Fecha de Vencimiento" inicializado vacío → HTML5 validation bloquea submit
```

**Causa Raíz:**
```typescript
// DepositosPage.tsx línea 58, 185
fechaVencimiento: '' // ❌ HTML5 date input no permite empty string
```

**Solución:**
```typescript
// DESPUÉS:
fechaVencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  .toISOString()
  .split('T')[0] // ✅ Default a +30 días
```

**Resultado:** ✅ Creación de depósitos funcional

#### 10.2.2 "Días Restantes" muestra "-" en todos los depósitos

**Causa Raíz:**
```javascript
// models/Deposito.js - toPublicJSON no incluía diasHastaVencimiento
```

**Solución:**
```javascript
// Agregado en toPublicJSON (líneas 220-226):
depositoSchema.methods.toPublicJSON = function() {
  let diasHastaVencimiento = null;
  if (this.fechaVencimiento) {
    const hoy = new Date();
    const fechaVenc = new Date(this.fechaVencimiento);
    diasHastaVencimiento = Math.ceil((fechaVenc - hoy) / (1000 * 60 * 60 * 24));
  }
  return {
    // ... otros campos
    diasHastaVencimiento: diasHastaVencimiento,
    // ...
  };
};
```

**Resultado:** ✅ Días restantes se muestran correctamente

---

### 10.3 ERROR #5: Dashboard Alertas No Carga

**Síntomas:**
```
Alertas en dashboard: 500 Internal Server Error
Error: Cannot populate path 'deposito.cliente'
```

**Causa Raíz:**
Populate incorrecto - el modelo Deposito no tiene campo `cliente` directo.

**Estructura Real:**
```
Deposito → emplazamiento → cliente
```

**Solución:**
```javascript
// dashboardController.js líneas 356-367
// ANTES:
.populate('deposito', 'numeroDeposito producto cliente emplazamiento...')

// DESPUÉS:
.populate({
  path: 'deposito',
  select: 'numeroDeposito producto emplazamiento cantidad valorTotal',
  populate: [
    { path: 'producto', select: 'codigo nombre' },
    {
      path: 'emplazamiento',
      select: 'nombre cliente',
      populate: { path: 'cliente', select: 'nombre' }
    }
  ]
})
```

**Resultado:** ✅ Dashboard alertas cargando correctamente

---

### 10.4 ERROR #6: Botones Editar/Eliminar No Visibles en Depósitos

**Síntomas:**
```
Usuario reporta: "no veo boton de eliminar deposito, no se puede editar un deposito"
```

**Causa Raíz:**
```typescript
// DepositosPage.tsx línea 647
// ANTES:
{deposito.estado === 'activo' && ( // ❌ Muy restrictivo
  <> botones editar/eliminar </>
)}

// Problema: TODOS los depósitos tenían estado = 'proximo_vencimiento'
// Solo estado='activo' es muy raro en producción
```

**Solución:**
```typescript
// DESPUÉS:
{deposito.estado !== 'retirado' && ( // ✅ Permite activo, proximo_vencimiento, vencido
  <> botones editar/eliminar </>
)}
```

**Resultado:** ✅ Botones visibles para depósitos no retirados

---

### 10.5 ERROR #7: Eliminar Depósito - Inconsistencias

**Síntomas:**
```
- Al eliminar depósito da error
- El depósito no cambia de estado visualmente
- Se resta correctamente en el contador del dashboard
```

**Causa Raíz:**

1. **Estado no se establecía explícitamente:**
```javascript
// depositoController.js línea 429
// ANTES:
deposito.activo = false; // Solo cambiaba activo
await deposito.save();

// El pre-save hook calculaba estado, pero no forzaba 'retirado'
```

2. **Respuesta no incluía depósito actualizado:**
```javascript
// ANTES:
res.status(200).json({
  success: true,
  message: 'Depósito desactivado exitosamente'
  // ❌ Sin data
});
```

3. **Frontend recargaba toda la lista:**
```typescript
// DepositosPage.tsx
await depositoService.delete(id);
toast.success('Depósito eliminado');
loadDepositos(); // ❌ Recarga completa = slow
```

**Solución Completa:**

1. **Backend - Establecer estado explícitamente:**
```javascript
// depositoController.js líneas 428-473
deposito.activo = false;
deposito.estado = 'retirado'; // ✅ Forzar estado

// Populate completo para respuesta
await deposito.populate([
  {
    path: 'producto',
    select: 'codigo nombre'
  },
  {
    path: 'emplazamiento',
    select: 'codigo nombre cliente',
    populate: { path: 'cliente', select: 'nombre' }
  }
]);

// Respuesta con datos
res.status(200).json({
  success: true,
  message: 'Depósito desactivado exitosamente',
  data: {
    deposito: deposito.toPublicJSON() // ✅ Incluir depósito actualizado
  }
});
```

2. **Service - Retornar depósito:**
```typescript
// depositoService.ts líneas 130-138
async delete(id: string): Promise<Deposito> { // ✅ Retorna Deposito
  const response = await apiClient.delete<{ deposito: Deposito }>(`/depositos/${id}`);
  return response.deposito;
}
```

3. **Frontend - Update local sin reload:**
```typescript
// DepositosPage.tsx líneas 377-384
const depositoActualizado = await depositoService.delete(id);

// Actualizar estado local directamente (no reload)
setDepositos(prevDepositos =>
  prevDepositos.map(dep =>
    dep._id === depositoActualizado._id ? depositoActualizado : dep
  )
);
```

**Resultado:** ✅ Depósitos se eliminan correctamente con estado 'retirado' visible

---

### 10.6 ERROR #8: Emplazamientos - Editar Abre Página en Blanco

**Síntomas:**
```
Al hacer clic en botón "Editar" de emplazamiento → Página en blanco
```

**Causa Raíz:**
Mismatch de nombres de campo:
- **Modelo Emplazamiento:** Campo `observaciones`
- **Frontend:** Usaba `notas` en 5 lugares
- **Controller:** Usaba `notas` en create/update

**Solución:**

1. **Backend Models:**
```javascript
// emplazamientoController.js
// ANTES:
const { cliente, nombre, direccion, coordenadas, contacto, notas } = req.body;

// DESPUÉS:
const { cliente, nombre, direccion, coordenadas, contacto, observaciones } = req.body;

// Líneas 89, 122, 155, 193
```

2. **Frontend Types:**
```typescript
// types/index.ts
export interface Emplazamiento {
  // ...
  observaciones?: string; // ✅ Antes era 'notas'
}

export interface EmplazamientoFormData {
  // ...
  observaciones?: string; // ✅ Antes era 'notas'
}
```

3. **Frontend Page:**
```typescript
// EmplazamientosPage.tsx - 5 instancias
// ANTES: notas: ''
// DESPUÉS: observaciones: ''

// ANTES: notas: emplazamiento.notas || ''
// DESPUÉS: observaciones: emplazamiento.observaciones || ''

// Form label cambiado de "Notas" a "Observaciones"
```

**Resultado:** ✅ Edición de emplazamientos funciona correctamente

---

### 10.7 ERROR #9: Emplazamientos - Estado Siempre "Inactivo"

**Síntomas:**
```
- Todos los emplazamientos muestran badge "Inactivo"
- No se puede cambiar a "Activo"
- Toggle de estado no funciona
```

**Causa Raíz:**
**Mismatch de tipos de datos:**
- **Backend modelo:** `activo: Boolean` (true/false)
- **Frontend:** Espera `estado: 'activo' | 'inactivo'` (string)

**Análisis del Problema:**

```javascript
// Backend - models/Emplazamiento.js
activo: {
  type: Boolean,
  default: true
}

// toPublicJSON devolvía:
{
  activo: true,  // ❌ Boolean
  // NO había campo 'estado'
}
```

```typescript
// Frontend - types/index.ts
export interface Emplazamiento {
  estado: 'activo' | 'inactivo'; // ✅ String esperado
}

// Frontend - emplazamientoService.ts
async toggleEstado(id: string, estado: 'activo' | 'inactivo'): Promise<Emplazamiento> {
  const data = await apiClient.put(`/emplazamientos/${id}`, { estado });
  return data;
}
```

**Problema Secundario:**
No existía endpoint backend para recibir el campo `estado`

**Solución Completa:**

1. **Agregar mapeo en toPublicJSON:**
```javascript
// models/Emplazamiento.js línea 184
emplazamientoSchema.methods.toPublicJSON = function() {
  return {
    _id: this._id,
    codigo: this.codigo,
    // ... otros campos
    activo: this.activo,
    estado: this.activo ? 'activo' : 'inactivo', // ✅ Agregar mapeo
    observaciones: this.observaciones,
    // ...
  };
};
```

2. **Convertir estado → activo en controller:**
```javascript
// controllers/emplazamientoController.js líneas 157-161
const { cliente, nombre, direccion, coordenadas, contacto, observaciones, activo, estado } = req.body;

// Si se envía estado en lugar de activo, convertirlo
let activoValue = activo;
if (estado !== undefined) {
  activoValue = estado === 'activo'; // ✅ String → Boolean
}

// Más abajo (línea 194):
if (activoValue !== undefined) emplazamiento.activo = activoValue;
```

**Resultado:** ✅ Toggle de estado funciona correctamente, emplazamientos muestran estado correcto

---

## 11. RESUMEN DE ARCHIVOS MODIFICADOS - INTERVENCIÓN 23 OCT 2025

### Backend Models
1. **`models/Alerta.js`**
   - Null safety en `crearAlertaValorAlto`
   - Agregado parámetro `diasHastaVencimiento`

2. **`models/Deposito.js`**
   - Agregado `diasHastaVencimiento` en toPublicJSON (líneas 220-226)

3. **`models/Emplazamiento.js`**
   - Agregado mapeo `estado` en toPublicJSON (línea 184)

### Backend Controllers
4. **`controllers/alertaController.js`**
   - Renombrado: `depositoAfectado` → `deposito` (40+ referencias)
   - Fixed variable name conflict (línea 130)

5. **`controllers/dashboardController.js`**
   - Renombrado: `depositoAfectado` → `deposito` (14 referencias)
   - Fixed nested populate para alertas (líneas 356-367)

6. **`controllers/depositoController.js`**
   - Renombrado: `depositoAfectado` → `deposito` (6 referencias)
   - Fixed deleteDeposito: establece `estado = 'retirado'` (línea 430)
   - Retorna depósito actualizado con populate (líneas 434-473)

7. **`controllers/emplazamientoController.js`**
   - Renombrado: `notas` → `observaciones` (líneas 89, 122, 155, 193)
   - Agregada conversión `estado` → `activo` (líneas 157-161)
   - Usa `activoValue` en update (línea 194)

### Backend Jobs
8. **`jobs/alertasJob.js`**
   - Renombrado: `depositoAfectado` → `deposito` (12 referencias)
   - Agregado parámetro `diasHastaVencimiento` (línea 74)

### Frontend Types
9. **`types/index.ts`**
   - Renombrado en Emplazamiento: `notas` → `observaciones` (línea 154)
   - Renombrado en EmplazamientoFormData: `notas` → `observaciones` (línea 185)

### Frontend Services
10. **`services/depositoService.ts`**
    - Cambiado return type de `delete()`: `void` → `Promise<Deposito>` (líneas 130-138)

### Frontend Pages
11. **`pages/depositos/DepositosPage.tsx`**
    - Default `fechaVencimiento` = +30 días (líneas 58, 185)
    - Condición botones: `estado === 'activo'` → `estado !== 'retirado'` (línea 647)
    - handleDelete actualiza estado local sin reload (líneas 377-384)

12. **`pages/emplazamientos/EmplazamientosPage.tsx`**
    - Renombrado: `notas` → `observaciones` (líneas 58, 100, 123, 631-632)
    - Cambiado label "Notas" → "Observaciones"

---

## 12. DEPLOYMENT TIMELINE - 23 OCTUBRE 2025

### Primera Ronda de Fixes (Alertas y Depósitos Básicos)
```
Commit: a8ba182 → (intermediate commits)
Archivos: 8 modificados
- Schema mismatches (depositoAfectado)
- Null safety en alertas
- Default dates en depósitos
```

### Segunda Ronda de Fixes (Dashboard y Botones)
```
Archivos: Dashboard populate, botones visibility
Deploy: Production rebuild
```

### Tercera Ronda de Fixes (Depósito Deletion + Emplazamientos)
```
Commit: 5338951
Título: "Fix: Deposito deletion, Emplazamiento estado toggle and field name mismatches"
Archivos: 7 modificados
- depositoController.js (estado retirado, response con data)
- emplazamientoController.js (notas→observaciones, estado→activo conversion)
- Emplazamiento.js (estado mapping)
- depositoService.ts (return Deposito)
- DepositosPage.tsx (update local state)
- EmplazamientosPage.tsx (observaciones)
- types/index.ts (observaciones)

Deploy: docker compose down && docker compose up -d --build
Timestamp: 2025-10-23 16:03 UTC
Status: ✅ All containers healthy
```

---

## 13. ESTADO FINAL DEL SISTEMA - 23 OCTUBRE 2025

### Contenedores Docker
```
CONTAINER ID   IMAGE                STATUS
a500f738cb52   assetflow-frontend   Up, healthy
e9d4cb7548b4   assetflow-backend    Up, healthy
3ce6d72d34fc   mongo:6.0            Up, healthy
```

### Funcionalidad Verificada ✅
- ✅ Alertas: Carga y muestra correctamente
- ✅ Depósitos: Creación con fecha por defecto
- ✅ Depósitos: "Días Restantes" calculado correctamente
- ✅ Depósitos: Botones editar/eliminar visibles
- ✅ Depósitos: Eliminación cambia estado a "retirado"
- ✅ Dashboard: Alertas carga con populate correcto
- ✅ Emplazamientos: Edición funciona correctamente
- ✅ Emplazamientos: Toggle estado activo/inactivo funcional
- ✅ Emplazamientos: Campo "Observaciones" sincronizado

### Problemas Resueltos
| # | Error | Estado |
|---|-------|--------|
| 3 | Alertas completamente fallidas | ✅ Resuelto |
| 4 | No se puede crear depósito | ✅ Resuelto |
| 4 | Días restantes muestra "-" | ✅ Resuelto |
| 5 | Dashboard alertas no carga | ✅ Resuelto |
| 6 | Botones editar/eliminar invisibles | ✅ Resuelto |
| 7 | Eliminar depósito inconsistente | ✅ Resuelto |
| 8 | Editar emplazamiento página en blanco | ✅ Resuelto |
| 9 | Estado emplazamientos siempre inactivo | ✅ Resuelto |

---

## 14. LECCIONES APRENDIDAS - SCHEMA MISMATCHES

### Patrón Identificado: Field Name Inconsistencies

1. **Alerta Model:**
   - ❌ Controller usaba: `depositoAfectado`
   - ✅ Schema definía: `deposito`
   - **Impacto:** Error 500 en módulo completo

2. **Deposito Model:**
   - ❌ Schema original: `notas`
   - ✅ Frontend esperaba: `observaciones`
   - **Impacto:** Validación fallida en creación

3. **Emplazamiento Model:**
   - ❌ Controller/Frontend: `notas`
   - ✅ Schema definía: `observaciones`
   - **Impacto:** Página en blanco al editar

4. **Emplazamiento State:**
   - ❌ Schema: `activo: Boolean`
   - ✅ Frontend: `estado: 'activo' | 'inactivo'`
   - **Impacto:** Toggle no funcional, siempre inactivo

### Mejores Prácticas Implementadas

1. **Siempre mapear en toPublicJSON:**
```javascript
toPublicJSON() {
  return {
    // Campos del schema
    activo: this.activo,
    // Mappings para frontend
    estado: this.activo ? 'activo' : 'inactivo',
  };
}
```

2. **Controllers deben aceptar ambos formatos:**
```javascript
const { activo, estado } = req.body;
let activoValue = activo;
if (estado !== undefined) {
  activoValue = estado === 'activo';
}
```

3. **Frontend service types deben coincidir con toPublicJSON:**
```typescript
export interface Model {
  // Incluir AMBOS si backend los provee
  activo?: boolean;    // Del schema
  estado?: string;     // Del toPublicJSON mapping
}
```

4. **Verificar populate paths:**
```javascript
// ❌ INCORRECTO:
.populate('deposito', 'numeroDeposito cliente') // deposito NO tiene cliente directo

// ✅ CORRECTO:
.populate({
  path: 'deposito',
  populate: {
    path: 'emplazamiento',
    populate: { path: 'cliente' }
  }
})
```

---

## 15. RECOMENDACIONES FUTURAS

### Prevención de Schema Mismatches

1. **Crear script de validación:**
```bash
# Verificar consistencia de nombres de campos entre:
# - Models (schema definitions)
# - Controllers (destructuring)
# - Frontend types
# - Frontend services
```

2. **Documentar convenciones:**
```
SIEMPRE usar:
- observaciones (no notas)
- deposito (no depositoAfectado)
- estado string en frontend (mapear desde activo boolean)
```

3. **Tests de integración:**
```javascript
// Test que verifica response del API coincide con TypeScript types
describe('API Response Types', () => {
  it('should match Emplazamiento interface', async () => {
    const response = await api.get('/emplazamientos/123');
    expect(response.data).toHaveProperty('estado');
    expect(response.data.estado).toMatch(/^(activo|inactivo)$/);
  });
});
```

4. **ESLint rules:**
```javascript
// Prohibir uso de campos deprecados
'no-restricted-properties': [
  'error',
  { object: 'formData', property: 'notas', message: 'Use observaciones instead' },
  { object: 'req.body', property: 'depositoAfectado', message: 'Use deposito instead' }
]
```

---

**Documento generado por:** Claude Code
**Última actualización:** 2025-10-23 16:30 UTC
**Estado:** ✅ Todos los errores críticos resueltos, sistema en producción estable
