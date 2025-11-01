# Changelog - AssetFlow

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

---

## [3.5.1] - 2025-11-01 - Backup & Snapshot Streaming

### Added
- **Backup System - Real-Time Streaming**: Sistema completo de backups con ejecución en tiempo real
  - Endpoint streaming `/api/admin/backups/execute-stream` con Server-Sent Events (SSE)
  - Componente `RealTimeTerminal` para visualización de output en vivo
  - Simulación de backup para desarrollo en Windows (17 mensajes)
  - Ejecución real de scripts bash en producción Linux
  - Detección automática de plataforma con `process.platform`

- **Snapshot System - Real-Time Streaming**: Sistema completo de snapshots Docker con streaming
  - Endpoint streaming `/api/admin/snapshots/execute-stream` con SSE
  - Simulación de snapshot para desarrollo en Windows (23 mensajes)
  - Ejecución real de scripts para snapshots Docker en producción
  - Incluye stop/start de contenedores, export de imágenes y volúmenes

- **BackupsPage**: Interfaz completa de gestión de backups
  - Botón "Ejecutar Backup Ahora" con confirmación
  - Terminal en tiempo real con auto-scroll
  - Lista de backups disponibles con descarga
  - Configuración de horarios con ScheduleSelector
  - Políticas de retención (diarios/semanales/mensuales)

- **SnapshotsPage**: Interfaz completa de gestión de snapshots
  - Botón "Ejecutar Snapshot Ahora" con confirmación
  - Terminal en tiempo real para proceso Docker
  - Lista de snapshots con tamaños y fechas
  - Descarga de snapshots
  - Push a servidor remoto vía SSH

### Fixed
- **API Client baseURL**: Corregido error en `terminalService.ts`
  - Cambiado de `api.defaults.baseURL` (undefined) a `API_CONFIG.BASE_URL`
  - Afectaba 4 métodos: getBackupStreamUrl, getSnapshotStreamUrl, getBackupDownloadUrl, getSnapshotDownloadUrl
  - Error: "Cannot read properties of undefined (reading 'baseURL')"

- **Streaming Execution - Windows Compatibility**: Resuelto error 500 en desarrollo
  - Backend intentaba ejecutar bash scripts en Windows (sin bash nativo)
  - Implementada detección de plataforma y simulación para desarrollo
  - Producción Linux ejecuta scripts reales sin cambios

### Changed
- **Terminal Service**: Arquitectura mejorada con platform detection
  - Método `streamBackupExecution()` detecta OS y bifurca ejecución
  - Método `_simulateBackupExecution()` para Windows con delays realistas (300ms)
  - Método `streamSnapshotExecution()` con misma lógica
  - Método `_simulateSnapshotExecution()` para Windows (350ms delays)

- **RealTimeTerminal Component**: Mejorada gestión de streaming
  - Usa Fetch API con ReadableStream en lugar de EventSource
  - Parser SSE personalizado con buffer de líneas
  - Manejo de eventos: stdout, stderr, complete, error
  - Auto-scroll suave al recibir nuevo output
  - Botón "Limpiar" después de completar

### Technical Details
**Backend:**
- `backend/src/services/terminalService.js` (lines 343-557)
  - Platform detection: `process.platform === 'win32'`
  - SSE headers: `text/event-stream`, `no-cache`, `keep-alive`
  - Child process spawning con `spawn('bash', [scriptPath])`
  - Streaming de stdout/stderr line por line

**Frontend:**
- `frontend/src/services/terminalService.ts` (lines 90-121)
  - Import de `API_CONFIG` desde `../config/api`
  - Generación correcta de URLs con baseURL + token
- `frontend/src/components/admin/RealTimeTerminal.tsx`
  - Fetch con AbortController para cancelación
  - TextDecoder para streaming de bytes
  - Buffer parsing para mensajes SSE completos
- `frontend/src/pages/admin/BackupsPage.tsx`
- `frontend/src/pages/admin/SnapshotsPage.tsx`

### Testing
- ✅ Windows development: Simulación funcional para testing UI
- ✅ Linux production: Scripts bash ejecutan backups/snapshots reales
- ✅ Real-time output: Streaming SSE funcionando correctamente
- ✅ Error handling: Manejo de fallos y timeouts

---

## [3.5.0] - 2025-10-24 - Stable Production Release

### Fixed
- **Alertas Module**: Resuelto fallo crítico por mismatch de campo `depositoAfectado` vs `deposito`
  - Renombrado en 5 archivos: alertaController, dashboardController, depositoController, alertasJob, Alerta model
  - 40+ referencias corregidas en alertaController.js
  - Agregada null safety en `crearAlertaValorAlto` método
  - Agregado parámetro `diasHastaVencimiento` en `crearAlertaVencimiento`

- **Depósitos - Creación**: Resuelto bloqueo de HTML5 validation con fecha vacía
  - Default `fechaVencimiento` = +30 días desde hoy
  - Corregido en 2 ubicaciones en DepositosPage.tsx

- **Depósitos - Días Restantes**: Agregado cálculo en toPublicJSON
  - Campo `diasHastaVencimiento` ahora incluido en respuesta API
  - Muestra días correctamente en lugar de "-"

- **Dashboard Alertas**: Corregido error de populate anidado
  - Cambiado de populate directo `deposito.cliente` a populate anidado correcto
  - Path correcto: deposito → emplazamiento → cliente

- **Depósitos - Botones Editar/Eliminar**: Corregida visibilidad
  - Cambiado condición de `estado === 'activo'` a `estado !== 'retirado'`
  - Permite editar depósitos en estados: activo, proximo_vencimiento, vencido

- **Depósitos - Eliminación**: Corregida inconsistencia de estado
  - Backend ahora establece explícitamente `estado = 'retirado'`
  - Respuesta incluye depósito actualizado con populate completo
  - Frontend actualiza estado local sin reload completo de lista

- **Emplazamientos - Edición**: Resuelto error de página en blanco
  - Mismatch de campo `notas` vs `observaciones` corregido
  - Renombrado en modelo, controller, types y UI (5+ ubicaciones)
  - Label cambiado de "Notas" a "Observaciones"

- **Emplazamientos - Estado Toggle**: Resuelto estado siempre "inactivo"
  - Agregado mapeo `estado` en toPublicJSON: `activo ? 'activo' : 'inactivo'`
  - Controller acepta campo `estado` y lo convierte a boolean `activo`
  - Toggle activo/inactivo ahora funcional

- **Usuarios - Creación**: Corregido error "Cannot read properties of undefined"
  - Eliminado doble acceso a `.data` en UsersPage.tsx
  - Acceso correcto: `response.users` en lugar de `response.data.users`

### Changed
- **Backend Models**: Estandarización de nombres de campos
  - Todos los modelos usan `observaciones` (no `notas`)
  - Referencias a depósitos usan `deposito` (no `depositoAfectado`)
  - Emplazamientos mapean `activo` boolean a `estado` string en API responses

- **API Responses**: Mejoradas respuestas de delete operations
  - `DELETE /api/depositos/:id` ahora retorna depósito actualizado
  - Incluye populate completo de relaciones (producto, emplazamiento, cliente)

### Documentation
- **errores.md**: Documento completo con 7 errores críticos documentados
  - Secciones 10-15 agregadas con análisis detallado
  - Lecciones aprendidas sobre schema mismatches
  - Mejores prácticas implementadas
  - Recomendaciones futuras para prevención

### Deployment
- **Production**: Sistema desplegado y verificado en 167.235.58.24
  - Commit: 5338951 (fixes principales)
  - Commit: 8dc50ee (documentación)
  - Commit: 95c8514 (usuarios fix)
  - Todos los contenedores healthy
  - 9 funcionalidades críticas verificadas

### Technical Debt Resolved
- Inconsistencias de nombres de campos entre frontend/backend
- Falta de null safety en métodos de Alerta
- Populate paths incorrectos en consultas anidadas
- Response data missing en operaciones de delete
- Type mismatches entre Boolean y String para estados

---

## [Unreleased]

### [2025-01-XX XX:XX] - Documentación Inicial
#### Added
- Proyecto AssetFlow 3.0 inicializado
- Configuración completa de Claude Code setup
- PROJECT.md generado con especificaciones completas del sistema
- TODO.md con plan de desarrollo detallado
- CHANGELOG.md (este archivo)
- .clinerules configurado para gestión automática
- Estructura base de documentación técnica
- Especificaciones de 12 módulos del sistema
- Definición de 12 modelos de base de datos
- Documentación de 90+ endpoints de API
- Variables de entorno documentadas
- Configuración de servidor de producción documentada
- Plan de deployment con Docker documentado
- Sistema de backups automáticos documentado

#### Configuration
- Servidor: 167.235.58.24 (Ubuntu 24.04)
- Dominio: assetflow.oversunenergy.com
- Base de datos: MongoDB 6.0
- Usuario admin inicial: ppelaez@oversunenergy.com
- Email SMTP: smtp.dondominio.com configurado
- Backup diario: 02:00 AM en /backup/assetflow/
- JWT expiration: 7 días
- Puertos: Frontend (3000), Backend (5000), MongoDB (27017)

---

## [Future Releases]

### [3.0.0] - Release Inicial (Planificado)
Fecha estimada: TBD

#### Planned Features
- Sistema completo de autenticación con JWT
- Assets Module - Gestión de artículos y familias
- Movements Module - Albaranes de entrada/salida
- Deposits Module - Gestión de depósitos
- Invoicing Module - Facturación automatizada
- Reports Module - Dashboard y analytics
- Admin Users - Gestión de usuarios y roles
- Admin Clients - Gestión de clientes
- Admin Warehouses - Gestión de almacenes multi-cliente
- Admin Stock - Control de inventario en tiempo real
- Admin Lots - Trazabilidad completa por lotes
- Settings - Configuración del sistema
- Docker deployment completo
- Sistema de backups automáticos
- SSL configurado en producción

---

## Convenciones del Changelog

### Tipos de Cambios
- **Added**: Nuevas funcionalidades
- **Changed**: Cambios en funcionalidades existentes
- **Deprecated**: Funcionalidades que serán removidas
- **Removed**: Funcionalidades removidas
- **Fixed**: Corrección de bugs
- **Security**: Cambios relacionados con seguridad

### Formato de Entrada
```markdown
### [YYYY-MM-DD HH:MM] - Título del cambio
#### Added
- Descripción del cambio añadido

#### Changed
- Descripción del cambio modificado

#### Fixed
- Descripción del bug corregido
```

---

**Última actualización**: 2025-01-XX
**Mantenido por**: ppelaez
