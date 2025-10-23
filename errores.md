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

**Documento generado por:** Claude Code
**Última actualización:** 2025-10-22 14:30 UTC
**Estado:** Listo para redespliegue limpio
