# PROYECTO: AssetFlow 3.0

> **⚠️ ESTE ES EL DOCUMENTO PRINCIPAL DEL PROYECTO**
> Claude Code debe leer esto ANTES de cualquier acción

---

## 📌 INFORMACIÓN GENERAL

**Nombre**: AssetFlow 3.0
**Versión**: 3.0.0
**Fecha Inicio**: 2025-01-20
**Estado**: En desarrollo inicial
**Responsable**: ppelaez
**Email**: ppelaez@oversunenergy.com
**Organización**: Oversun Energy
**Dominio**: assetflow.oversunenergy.com
**Servidor**: 167.235.58.24 (Ubuntu 24.04)

---

## 🚨 REGLAS ABSOLUTAS PARA CLAUDE CODE

### ❌ PROHIBIDO TERMINANTEMENTE

1. **NUNCA crear código no funcional**
   - ❌ PROHIBIDO mockups o placeholders
   - ❌ PROHIBIDO funcionalidades a medias
   - ❌ PROHIBIDO comentarios "TODO: implementar"
   - ❌ PROHIBIDO avanzar sin probar

2. **NUNCA trabajar sin contexto completo**
   - ❌ PROHIBIDO asumir requisitos
   - ❌ PROHIBIDO inventar funcionalidades
   - ❌ PROHIBIDO ignorar especificaciones

### ✅ OBLIGATORIO SIEMPRE

1. **SOLO código 100% funcional**
   - ✅ OBLIGATORIO probar antes de commitear
   - ✅ OBLIGATORIO que funcione end-to-end
   - ✅ OBLIGATORIO validar con datos reales

2. **Desarrollo incremental y verificado**
   - ✅ Módulo por módulo
   - ✅ No avanzar hasta que funcione al 100%
   - ✅ Probar happy path + error cases

3. **Agentes de monitoreo activos**
   - ✅ OBLIGATORIO instalar Claude Code en servidor
   - ✅ OBLIGATORIO crear health checks automáticos
   - ✅ OBLIGATORIO logs en tiempo real
   - ✅ OBLIGATORIO alertas automáticas

---

## 🎯 OBJETIVO REAL DEL SISTEMA

**AssetFlow 3.0 es un sistema de control y valoración de inventario depositado en emplazamientos de clientes con análisis mediante IA.**

### ❌ LO QUE NO ES

- ❌ NO es un ERP completo
- ❌ NO es un sistema de gestión de oficinas postales
- ❌ NO gestiona facturación (ERP externo lo hace)
- ❌ NO gestiona albaranes complejos (ERP externo lo hace)
- ❌ NO gestiona inventario de "nuestras instalaciones"

### ✅ LO QUE SÍ ES

Un sistema para:
1. **Controlar QUÉ mercancía** tenemos depositada en clientes
2. **Saber DÓNDE está** cada producto (visualización geográfica)
3. **Saber CUÁNTO VALE** en tiempo real (valoración)
4. **Controlar FECHAS LÍMITE** de depósito (obligatorio facturar o devolver)
5. **Analizar con IA** para optimizar y predecir
6. **Visualizar en MAPA** todos los emplazamientos activos

### Problema que Resuelve

Tenemos **productos propios** que depositamos temporalmente en **emplazamientos de clientes**. Necesitamos:
- Saber exactamente qué tenemos depositado y dónde
- Conocer el valor inmovilizado en tiempo real
- Controlar fechas límite para recuperar o facturar
- Optimizar mediante análisis inteligente con IA
- Visualizar geográficamente todos nuestros depósitos

### Flujo Real del Negocio

```
1. Tenemos PRODUCTOS (mercancía propia)
   ↓
2. Sacamos productos mediante ALBARANES (gestionado en ERP externo)
   ↓
3. Los DEPOSITAMOS en EMPLAZAMIENTOS de CLIENTES
   ↓
4. AssetFlow REGISTRA y CONTROLA:
   - ¿Qué productos depositamos?
   - ¿En qué emplazamiento de qué cliente?
   - ¿Cuánto vale? (valoración automática)
   - ¿Cuándo vence el plazo?
   ↓
5. AssetFlow VISUALIZA en mapa geográfico
   ↓
6. IA ANALIZA y PREDICE:
   - Riesgos de vencimiento
   - Optimizaciones posibles
   - Recomendaciones accionables
   ↓
7. AssetFlow ALERTA cuando se acerca fecha límite
   ↓
8. DECISIÓN: Facturar (en ERP externo) o Devolver
   ↓
9. AssetFlow ACTUALIZA estado del depósito
```

---

## 🏗️ ARQUITECTURA

### Stack Tecnológico
```yaml
# Frontend
framework: React 18.2 con TypeScript
build_tool: Vite 5.0
ui_library: Bootstrap 5.3.2 + React Bootstrap 2.9.1
plantilla: Facit Template (integrada desde facit-vite/)
mapas: Leaflet con OpenStreetMap
estado: Context API + Local State
http_client: Axios 1.6.2
routing: React Router DOM 6.20.0
charts: ApexCharts 3.44.0 + Recharts 2.10.3

# Backend
runtime: Node.js 18+ (Latest LTS)
framework: Express.js 4.18.2
odm: Mongoose 8.0.3
auth: JWT (jsonwebtoken 9.0.2)
password_hash: bcryptjs 2.4.3
validation: express-validator 7.0.1
ia_openai: openai ^4.0.0
ia_anthropic: @anthropic-ai/sdk ^0.9.0

# Base de datos
database: MongoDB 6.0
auth_mechanism: SCRAM-SHA-256
auth_source: admin

# Containerización
orchestration: Docker Compose
volumes: Persistentes para datos
networks: Internas para comunicación

# Servidor
host: 167.235.58.24
os: Ubuntu 24.04
usuario: Admin
password: bb474edf
dominio: assetflow.oversunenergy.com
ssl: Configurado con Let's Encrypt
```

### Arquitectura General

```
┌──────────────────────────────────────────────────────────────┐
│                    AssetFlow 3.0 System                      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐     ┌──────────────┐    ┌──────────┐     │
│  │   Frontend   │────▶│   Backend    │───▶│ MongoDB  │     │
│  │  React/Vite  │◀────│  Express.js  │◀───│ Database │     │
│  │ Facit+Leaflet│     │   + AI APIs  │    │Port:27017│     │
│  │  Port: 3000  │     │  Port: 5000  │    └──────────┘     │
│  └──────────────┘     └──────────────┘          │           │
│         │                      │                 │           │
│         │                      ▼                 │           │
│         │              ┌──────────────┐          │           │
│         │              │  AI Services │          │           │
│         │              │ OpenAI+Claude│          │           │
│         │              └──────────────┘          │           │
│         │                      │                 │           │
│         └──────────────────────┴─────────────────┘           │
│                            │                                 │
│                     ┌──────▼────────┐                        │
│                     │    Docker     │                        │
│                     │    Compose    │                        │
│                     └───────────────┘                        │
└──────────────────────────────────────────────────────────────┘
           │                                        │
           ▼                                        ▼
    Usuario Final                          Dominio SSL
  (Web Browser)                    assetflow.oversunenergy.com
```

### Componentes Principales

1. **Frontend (React + Facit Template)**
   - Dashboard con mapa interactivo (Leaflet)
   - Gestión de emplazamientos y depósitos
   - Chat con IA
   - Panel de insights generados por IA
   - Reportes y analytics

2. **Backend (Express.js)**
   - API REST con autenticación JWT
   - Servicios de negocio
   - Integración con IA (OpenAI + Anthropic)
   - Jobs automáticos (alertas, análisis)
   - Agentes de monitoreo

3. **MongoDB**
   - 10 modelos principales
   - Índices optimizados
   - Datos geoespaciales

4. **AI Services**
   - OpenAI GPT-4 para análisis predictivo
   - Anthropic Claude para insights profundos
   - Sistema configurable multi-proveedor

5. **Monitoring Agents**
   - Health checks automáticos
   - Error logging en tiempo real
   - Performance monitoring
   - Claude Code integrado en servidor

---

## 📊 ENTIDADES DEL SISTEMA

### 1. User (Usuarios del Sistema)
```javascript
{
  _id: ObjectId,
  name: String (required),
  email: String (required, unique),
  password: String (required, hashed),
  role: Enum ['admin', 'manager', 'user'] (default: 'user'),
  active: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}

Indexes:
- email: unique

Usuario inicial:
- Email: ppelaez@oversunenergy.com
- Password: bb474edf (hasheado)
- Role: admin
- Name: ppelaez
```

### 2. Producto (Nuestra Mercancía)
```javascript
{
  _id: ObjectId,
  codigo: String (required, unique),
  nombre: String (required),
  descripcion: String,
  categoria: String,
  precioUnitario: Number (required), // Para valoración
  unidadMedida: String (default: 'unidades'),
  stockEnNuestroAlmacen: Number, // Info de referencia
  activo: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}

Indexes:
- codigo: unique
- nombre: 1
- categoria: 1
```

### 3. Cliente
```javascript
{
  _id: ObjectId,
  codigo: String (required, unique),
  nombre: String (required),
  cif: String (unique, sparse),
  direccionFiscal: String,
  ciudad: String,
  codigoPostal: String,
  provincia: String,
  pais: String (default: 'España'),
  telefono: String,
  email: String,
  contacto: String,
  activo: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}

Indexes:
- codigo: unique
- cif: unique, sparse
- nombre: 1
```

### 4. Emplazamiento ⭐ CORE
```javascript
{
  _id: ObjectId,
  codigo: String (required, unique),
  nombre: String (required),
  cliente: ObjectId (ref: 'Cliente', required),
  
  // Ubicación física
  direccion: String (required),
  ciudad: String (required),
  codigoPostal: String,
  provincia: String,
  pais: String (default: 'España'),
  
  // Coordenadas para mapa
  coordenadas: {
    lat: Number (required),
    lng: Number (required)
  },
  
  // Información adicional
  capacidadM3: Number,
  tipoAlmacen: Enum ['general', 'refrigerado', 'congelado'] (default: 'general'),
  responsable: String,
  telefono: String,
  email: String,
  
  // Estado
  estado: Enum ['activo', 'inactivo'] (default: 'activo'),
  
  notas: String,
  createdAt: Date,
  updatedAt: Date
}

Indexes:
- codigo: unique
- cliente: 1
- 'coordenadas.lat': 1, 'coordenadas.lng': 1 (geoespacial)
- estado: 1
```

### 5. Deposito ⭐ CORE
```javascript
{
  _id: ObjectId,
  numeroDeposito: String (required, unique), // Auto: DEP-2025-0001
  
  // Relaciones
  emplazamiento: ObjectId (ref: 'Emplazamiento', required),
  cliente: ObjectId (ref: 'Cliente', required), // Denormalizado
  
  // Productos depositados
  productos: [{
    producto: ObjectId (ref: 'Producto', required),
    cantidad: Number (required),
    precioUnitario: Number (required),
    valorTotal: Number (required), // cantidad * precioUnitario
    lote: String,
    fechaDeposito: Date (default: Date.now)
  }],
  
  // Fechas críticas
  fechaInicio: Date (required),
  fechaLimite: Date (required), // ⚠️ OBLIGATORIO
  diasRestantes: Number, // Calculado virtualmente
  
  // Valoración
  valorTotalDeposito: Number (required), // Suma de valorTotal de productos
  
  // Estado del depósito
  estado: Enum [
    'activo',
    'proximo_vencimiento', // < 7 días
    'vencido',
    'facturado',
    'devuelto'
  ] (default: 'activo'),
  
  // Sistema de alertas
  alertaEnviada: Boolean (default: false),
  fechaAlerta: Date,
  
  // Resolución
  accion: Enum [null, 'facturar', 'devolver'],
  fechaAccion: Date,
  referenciaAlbaran: String, // Del ERP externo
  
  notas: String,
  creadoPor: ObjectId (ref: 'User'),
  createdAt: Date,
  updatedAt: Date
}

Indexes:
- numeroDeposito: unique
- emplazamiento: 1
- cliente: 1
- estado: 1
- fechaLimite: 1
- {cliente: 1, estado: 1}
```

### 6. Movimiento (Historial)
```javascript
{
  _id: ObjectId,
  tipo: Enum ['entrada', 'salida', 'ajuste'] (required),
  
  // Relaciones
  deposito: ObjectId (ref: 'Deposito', required),
  producto: ObjectId (ref: 'Producto', required),
  emplazamiento: ObjectId (ref: 'Emplazamiento', required),
  
  // Datos del movimiento
  cantidad: Number (required),
  valorUnitario: Number,
  valorTotal: Number,
  
  fechaMovimiento: Date (required, default: Date.now),
  referenciaAlbaran: String, // Del ERP externo
  lote: String,
  
  motivo: Enum [
    'nuevo_deposito',
    'devolucion',
    'ajuste_inventario',
    'facturado',
    'extension_plazo'
  ] (required),
  
  usuarioResponsable: ObjectId (ref: 'User', required),
  notas: String,
  createdAt: Date
}

Indexes:
- deposito: 1
- producto: 1
- emplazamiento: 1
- fechaMovimiento: -1
- tipo: 1
```

### 7. Alerta ⭐ CORE
```javascript
{
  _id: ObjectId,
  tipo: Enum [
    'vencimiento_30dias',
    'vencimiento_7dias',
    'vencimiento_3dias',
    'vencido',
    'alto_valor'
  ] (required),
  
  // Relaciones
  deposito: ObjectId (ref: 'Deposito', required),
  emplazamiento: ObjectId (ref: 'Emplazamiento', required),
  cliente: ObjectId (ref: 'Cliente', required),
  
  // Información de la alerta
  titulo: String (required),
  descripcion: String (required),
  valorAfectado: Number (required),
  diasRestantes: Number,
  
  // Prioridad
  prioridad: Enum ['baja', 'media', 'alta', 'critica'] (required),
  
  // Estado
  estado: Enum ['pendiente', 'vista', 'en_proceso', 'resuelta', 'descartada'] (default: 'pendiente'),
  
  // Resolución
  accionTomada: Enum [null, 'facturar', 'devolver', 'extender_plazo'],
  fechaResolucion: Date,
  usuarioResolutor: ObjectId (ref: 'User'),
  notasResolucion: String,
  
  // Notificaciones
  emailEnviado: Boolean (default: false),
  fechaEnvioEmail: Date,
  
  fechaAlerta: Date (required, default: Date.now),
  expiraEn: Date,
  createdAt: Date
}

Indexes:
- deposito: 1
- estado: 1
- prioridad: 1
- fechaAlerta: -1
- {estado: 1, prioridad: 1}
```

### 8. AI_Config (Configuración IA)
```javascript
{
  _id: ObjectId,
  proveedor: Enum ['openai', 'anthropic'] (required),
  nombreDisplay: String (required),
  
  // API Configuration
  apiKey: String (required), // ENCRIPTADO
  apiUrl: String,
  modelo: String (required), // gpt-4-turbo-preview, claude-3-5-sonnet-20241022
  
  // Parámetros
  maxTokens: Number (default: 2000),
  temperatura: Number (default: 0.7), // 0.0 - 1.0
  
  // Estado y prioridad
  activo: Boolean (default: true),
  prioridadUso: Number (default: 1), // 1 = primario, 2+ = fallback
  
  // Control de costos
  costoPor1000Tokens: Number,
  limiteMensual: Number, // Presupuesto máximo en €
  usoMensualActual: Number (default: 0),
  
  creadoPor: ObjectId (ref: 'User'),
  notas: String,
  createdAt: Date,
  updatedAt: Date
}

Indexes:
- proveedor: 1
- activo: 1
- prioridadUso: 1
```

### 9. AI_Consulta (Historial IA)
```javascript
{
  _id: ObjectId,
  tipoConsulta: Enum ['chat', 'analisis', 'reporte', 'prediccion', 'optimizacion'] (required),
  
  // Proveedor usado
  proveedor: Enum ['openai', 'anthropic'] (required),
  modelo: String (required),
  
  // Input
  prompt: String (required),
  contexto: Object, // Datos enviados
  usuario: ObjectId (ref: 'User', required),
  
  // Output
  respuesta: String (required),
  respuestaJSON: Object, // Si structured output
  
  // Metadata
  tokensUsados: Number (required),
  costoEstimado: Number,
  tiempoRespuesta: Number, // milisegundos
  
  // Feedback
  utilidad: Number, // 1-5 estrellas
  feedback: String,
  
  // Categorización
  tags: [String],
  guardado: Boolean (default: false),
  
  fechaConsulta: Date (required, default: Date.now),
  createdAt: Date
}

Indexes:
- usuario: 1
- tipoConsulta: 1
- fechaConsulta: -1
- guardado: 1
```

### 10. AI_Insight (Insights Generados)
```javascript
{
  _id: ObjectId,
  tipo: Enum ['alerta', 'oportunidad', 'riesgo', 'recomendacion'] (required),
  
  // Contenido
  titulo: String (required),
  descripcion: String (required),
  datosBase: Object, // Datos que generaron el insight
  
  // Prioridad
  prioridad: Enum ['baja', 'media', 'alta', 'critica'] (required),
  confianza: Number (required), // 0.0 - 1.0
  
  // Estado
  estado: Enum ['nuevo', 'visto', 'en_accion', 'resuelto', 'descartado'] (default: 'nuevo'),
  
  // Acciones sugeridas
  accionesSugeridas: [{
    accion: String (required),
    razonamiento: String,
    impactoEstimado: String,
    prioridad: Number
  }],
  
  // Metadata IA
  generadoPor: Enum ['openai', 'anthropic', 'sistema'] (required),
  modeloUtilizado: String,
  
  // Vigencia
  fechaGeneracion: Date (required, default: Date.now),
  validezHasta: Date,
  
  // Seguimiento
  vistoPor: [ObjectId (ref: 'User')],
  accionesTomadas: [String],
  resultado: String,
  
  // Relacionado
  depositosRelacionados: [ObjectId (ref: 'Deposito')],
  emplazamientosRelacionados: [ObjectId (ref: 'Emplazamiento')],
  
  createdAt: Date
}

Indexes:
- tipo: 1
- estado: 1
- prioridad: 1
- fechaGeneracion: -1
- {estado: 1, prioridad: 1}
```

---

## 📋 FUNCIONALIDADES DEL SISTEMA

### PRIORIDAD ABSOLUTA ⭐⭐⭐⭐⭐

#### 1. Dashboard Principal con Mapa ⭐⭐⭐⭐⭐
**Estado**: Pendiente
**Prioridad**: CRÍTICA

**Descripción**: Vista principal del sistema con mapa geográfico interactivo y KPIs en tiempo real.

**Componentes**:
- **Mapa Interactivo (Leaflet + OpenStreetMap)**
  - Pin por cada emplazamiento activo
  - Colores según estado:
    - 🟢 Verde: Sin problemas (> 30 días)
    - 🟡 Amarillo: Próximo vencimiento (7-30 días)
    - 🔴 Rojo: Vencido o crítico (< 7 días)
  - Popup al hacer click:
    - Nombre emplazamiento
    - Cliente
    - Cantidad de depósitos activos
    - Valor total depositado
    - Botón "Ver detalle"
  - Clustering de pins cuando hay muchos cercanos

- **KPIs en Cards** (actualización en tiempo real):
  ```
  ┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
  │  Valor Total    │  Emplazamientos │   Depósitos     │    Alertas      │
  │  Depositado     │     Activos     │    Activos      │   Pendientes    │
  │   €325,450.00   │       24        │       156       │        8        │
  └─────────────────┴─────────────────┴─────────────────┴─────────────────┘
  
  ┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
  │  Próximos a     │    Vencidos     │  Top Cliente    │  Top Producto   │
  │   Vencer (<7d)  │      Hoy        │   (por valor)   │  (por cantidad) │
  │        5        │        3        │   Cliente ABC   │   Producto X    │
  │   €45,000.00    │   €12,500.00    │  €180,250.00    │   1,250 uds     │
  └─────────────────┴─────────────────┴─────────────────┴─────────────────┘
  ```

- **Tabla de Alertas Urgentes** (parte inferior):
  - Solo las 10 más urgentes
  - Ordenadas por prioridad y días restantes
  - Columnas: Cliente, Emplazamiento, Valor, Días Restantes, Estado
  - Botones acción rápida: "Ver Detalle" / "Resolver"

**Input esperado**: Token JWT válido
**Output esperado**: 
- Mapa con pins georreferenciados
- KPIs calculados
- Alertas críticas

**Validaciones**:
- Usuario autenticado
- Coordenadas válidas para cada emplazamiento
- Cálculos de valoración correctos

**Casos de error**:
- No hay emplazamientos: Mostrar mensaje informativo
- Error al cargar mapa: Fallback a lista
- Error en cálculos: Log y valores por defecto

**API Endpoints**:
```typescript
GET /api/dashboard/kpis
GET /api/dashboard/mapa
GET /api/dashboard/alertas-criticas
```

#### 2. Gestión de Emplazamientos ⭐⭐⭐⭐⭐
**Estado**: Pendiente
**Prioridad**: CRÍTICA

**Descripción**: CRUD completo de emplazamientos con geolocalización.

**Funcionalidades**:

**A. Listado de Emplazamientos**
- Tabla con búsqueda y filtros
- Columnas: Código, Nombre, Cliente, Ciudad, Depósitos Activos, Valor Total, Estado
- Filtros: Cliente, Estado, Tipo de almacén
- Búsqueda: Por código, nombre, ciudad
- Acciones por fila: Ver, Editar, Ver en Mapa, Desactivar

**B. Crear/Editar Emplazamiento**
- Formulario completo:
  ```
  INFORMACIÓN BÁSICA
  - Código: Auto-generado (EMP-2025-001)
  - Nombre: [Input required]
  - Cliente: [Select required] → filtrar por activos
  - Tipo Almacén: [Select] general/refrigerado/congelado
  
  UBICACIÓN
  - Dirección: [Input required]
  - Ciudad: [Input required]
  - Código Postal: [Input]
  - Provincia: [Input]
  - País: [Input default: España]
  
  COORDENADAS (para mapa)
  - Latitud: [Input number required]
  - Longitud: [Input number required]
  - [Botón: Obtener de dirección] → Geocoding API
  - [Mapa preview] → Mostrar pin en posición
  
  INFORMACIÓN ADICIONAL
  - Capacidad (m³): [Input number]
  - Responsable: [Input]
  - Teléfono: [Input]
  - Email: [Input email]
  - Notas: [Textarea]
  
  [Cancelar] [Guardar]
  ```

- Validaciones en tiempo real:
  - Código único
  - Coordenadas válidas (-90 a 90 lat, -180 a 180 lng)
  - Email válido si se proporciona
  - Cliente existe y está activo

**C. Vista Detalle**
- Información completa del emplazamiento
- Mapa con pin del emplazamiento
- Lista de depósitos activos en este emplazamiento
- Gráfico de ocupación si hay capacidad definida
- Historial de movimientos
- Botón "Editar" / "Ver en Dashboard"

**Input esperado**: Datos del formulario validados
**Output esperado**: Emplazamiento creado/actualizado con coordenadas
**Validaciones**: Todas las del formulario
**Casos de error**: 
- Código duplicado
- Coordenadas inválidas
- Cliente no existe
- Error en geocoding: Pedir coordenadas manuales

**API Endpoints**:
```typescript
GET    /api/emplazamientos
GET    /api/emplazamientos/:id
POST   /api/emplazamientos
PUT    /api/emplazamientos/:id
DELETE /api/emplazamientos/:id (soft delete)
POST   /api/emplazamientos/geocode (dirección → coordenadas)
```

#### 3. Gestión de Depósitos ⭐⭐⭐⭐⭐
**Estado**: Pendiente
**Prioridad**: CRÍTICA

**Descripción**: CRUD completo de depósitos con cálculo automático de valoraciones y alertas.

**Funcionalidades**:

**A. Crear Nuevo Depósito**
- Formulario multi-paso:
  ```
  PASO 1: INFORMACIÓN BÁSICA
  - Número Depósito: [Auto: DEP-2025-0156]
  - Cliente: [Select required]
  - Emplazamiento: [Select filtered by cliente]
  - Fecha Inicio: [DatePicker default: hoy]
  - Fecha Límite: [DatePicker required] ⚠️ OBLIGATORIO
  - Días de depósito: [Calculado automático: 90 días]
  - Referencia Albarán ERP: [Input]
  
  PASO 2: PRODUCTOS
  ┌────────────────────────────────────────────────────┐
  │ Producto       Cant.  Precio    Subtotal      [X]  │
  ├────────────────────────────────────────────────────┤
  │ [Select ▼]    [___]  €100.00   €5,000.00     [X]  │
  │ [Select ▼]    [___]  €150.00   €7,500.00     [X]  │
  │ [+ Añadir producto]                                │
  └────────────────────────────────────────────────────┘
  
  Valoraciones (calculadas automáticamente):
  - Valor Total Depósito: €12,500.00
  - Valor por m³ (si capacidad definida): €125.00
  
  PASO 3: CONFIRMACIÓN
  - Resumen completo
  - Notas adicionales: [Textarea]
  
  [Anterior] [Cancelar] [Crear Depósito]
  ```

- Cálculos automáticos en tiempo real:
  - Subtotal por producto: cantidad × precioUnitario
  - Valor total depósito: suma de subtotales
  - Días de depósito: fechaLimite - fechaInicio
  - Días restantes: fechaLimite - hoy

- Validaciones:
  - Cliente y emplazamiento requeridos
  - Fecha límite > fecha inicio
  - Al menos 1 producto
  - Cantidad > 0 para cada producto
  - Precio unitario > 0

**B. Listado de Depósitos**
- Tabla con columnas:
  - Número
  - Cliente
  - Emplazamiento
  - Fecha Límite
  - Días Restantes (con colores)
  - Valor Total
  - Estado (badge con color)
- Filtros:
  - Cliente (select)
  - Emplazamiento (select)
  - Estado (multi-select)
  - Rango de fechas
- Búsqueda: Por número de depósito
- Ordenamiento por cualquier columna
- Paginación: 20 por página

- Indicadores visuales:
  - 🟢 Verde texto: > 30 días restantes
  - 🟡 Amarillo texto: 7-30 días restantes
  - 🟠 Naranja texto: 3-7 días restantes
  - 🔴 Rojo texto + bold: < 3 días o vencido

**C. Detalle de Depósito**
- Vista completa:
  ```
  INFORMACIÓN GENERAL
  - Número: DEP-2025-0156
  - Cliente: ABC S.L.
  - Emplazamiento: Almacén Norte Madrid
  - Estado: [Badge con color]
  - Creado por: ppelaez
  - Fecha creación: 2025-01-20
  
  FECHAS
  - Fecha Inicio: 2025-01-20
  - Fecha Límite: 2025-04-20
  - Días depósito: 90 días
  - Días restantes: 45 días [Barra de progreso]
  
  PRODUCTOS DEPOSITADOS
  ┌──────────────────────────────────────────────┐
  │ Producto    Cant.  Precio U.  Subtotal  Lote │
  ├──────────────────────────────────────────────┤
  │ Producto X   50    €100.00   €5,000.00  L001 │
  │ Producto Y   50    €150.00   €7,500.00  L002 │
  ├──────────────────────────────────────────────┤
  │ TOTAL VALORACIÓN:           €12,500.00       │
  └──────────────────────────────────────────────┘
  
  HISTORIAL DE MOVIMIENTOS
  - Lista cronológica de movimientos relacionados
  
  ALERTAS GENERADAS
  - Lista de alertas relacionadas con este depósito
  
  ACCIONES DISPONIBLES
  [Extender Plazo] [Marcar como Facturado] [Marcar como Devuelto]
  ```

**D. Acciones sobre Depósito**
- **Extender Plazo**: 
  - Modal con nueva fecha límite
  - Justificación (textarea required)
  - Registra movimiento tipo "extension_plazo"
  - Recalcula alertas

- **Marcar como Facturado**:
  - Modal de confirmación
  - Referencia de factura (input)
  - Cambia estado a "facturado"
  - Registra movimiento de salida
  - NO elimina el depósito (mantener histórico)

- **Marcar como Devuelto**:
  - Modal de confirmación
  - Referencia de albarán devolución (input)
  - Cambia estado a "devuelto"
  - Registra movimiento de salida
  - NO elimina el depósito

**API Endpoints**:
```typescript
GET    /api/depositos
GET    /api/depositos/:id
POST   /api/depositos
PUT    /api/depositos/:id
DELETE /api/depositos/:id (solo admin, soft delete)
POST   /api/depositos/:id/extender-plazo
POST   /api/depositos/:id/marcar-facturado
POST   /api/depositos/:id/marcar-devuelto
GET    /api/depositos/stats
```

#### 4. Sistema de Alertas ⭐⭐⭐⭐⭐
**Estado**: Pendiente
**Prioridad**: CRÍTICA

**Descripción**: Sistema automático de generación y gestión de alertas basado en fechas límite.

**Generación Automática** (Cron Job cada hora):
- Revisa todos los depósitos con estado "activo"
- Calcula días restantes hasta fecha límite
- Genera alertas según umbral:
  - 30 días antes: Alerta tipo "vencimiento_30dias", prioridad "baja"
  - 7 días antes: Alerta tipo "vencimiento_7dias", prioridad "media"
  - 3 días antes: Alerta tipo "vencimiento_3dias", prioridad "alta"
  - Vencido: Alerta tipo "vencido", prioridad "critica"
  - Alto valor (> €50,000): Alerta adicional tipo "alto_valor"

- Evita duplicados: No genera alerta si ya existe pendiente del mismo tipo
- Envía email automático para alertas prioridad "alta" y "critica"

**Vista de Alertas**:
- Lista de todas las alertas
- Filtros:
  - Estado (pendiente/vista/en_proceso/resuelta)
  - Prioridad (todas/critica/alta/media/baja)
  - Cliente
  - Tipo de alerta
- Ordenamiento: Por prioridad DESC, fecha alerta DESC
- Paginación: 20 por página

- Cada alerta muestra:
  ```
  ┌────────────────────────────────────────────────────┐
  │ [!] CRÍTICO: Depósito Vencido                      │
  │ Cliente: ABC S.L. | Emplazamiento: Almacén Norte  │
  │ Depósito: DEP-2025-0156 | Valor: €12,500.00       │
  │ Vencido hace: 3 días                               │
  │                                                     │
  │ [Ver Depósito] [Resolver] [Descartar]             │
  └────────────────────────────────────────────────────┘
  ```

**Resolución de Alertas**:
- Modal al hacer click en "Resolver":
  ```
  RESOLVER ALERTA
  
  Acción tomada:
  ( ) Facturar depósito
  ( ) Devolver mercancía
  ( ) Extender plazo
  
  Notas de resolución: [Textarea required]
  
  [Cancelar] [Resolver]
  ```
- Actualiza estado de alerta a "resuelta"
- Registra usuario que resolvió
- Si elige "Facturar" o "Devolver", actualiza depósito automáticamente

**Notificaciones por Email**:
- Envío automático para alertas críticas y altas
- Template HTML profesional:
  ```
  Asunto: ⚠️ AssetFlow - Alerta de Depósito Vencido
  
  Estimado/a Usuario,
  
  Se ha generado una alerta crítica en AssetFlow:
  
  - Cliente: ABC S.L.
  - Emplazamiento: Almacén Norte Madrid
  - Depósito: DEP-2025-0156
  - Valor Afectado: €12,500.00
  - Situación: Depósito vencido hace 3 días
  
  Por favor, tome acción inmediata:
  [Ver en AssetFlow]
  
  Saludos,
  AssetFlow System
  ```

**API Endpoints**:
```typescript
GET    /api/alertas
GET    /api/alertas/:id
POST   /api/alertas/:id/resolver
POST   /api/alertas/:id/descartar
GET    /api/alertas/stats
```

#### 5. Módulo de IA - Chat, Análisis y Insights ⭐⭐⭐⭐⭐
**Estado**: Pendiente
**Prioridad**: ALTA

**Descripción**: Sistema de análisis inteligente mediante IA (OpenAI GPT + Anthropic Claude) configurable.

**Sub-módulos**:

**A. Configuración de APIs de IA** (Solo Admin)
- Pantalla para gestionar proveedores de IA:
  ```
  CONFIGURACIONES DE IA
  
  ┌────────────────────────────────────────────────────┐
  │ Proveedor: OpenAI (ChatGPT)                        │
  │ Modelo: gpt-4-turbo-preview                        │
  │ Estado: ✅ Activo | Prioridad: 1 (Principal)       │
  │ Uso Mensual: €45.00 / €100.00                      │
  │ [Editar] [Desactivar] [Eliminar]                   │
  └────────────────────────────────────────────────────┘
  
  ┌────────────────────────────────────────────────────┐
  │ Proveedor: Anthropic (Claude)                      │
  │ Modelo: claude-3-5-sonnet-20241022                 │
  │ Estado: ⚪ Inactivo | Prioridad: 2 (Fallback)      │
  │ Uso Mensual: €0.00 / €50.00                        │
  │ [Editar] [Activar] [Eliminar]                      │
  └────────────────────────────────────────────────────┘
  
  [+ Nueva Configuración]
  ```

- Formulario Nueva Configuración:
  ```
  NUEVA CONFIGURACIÓN DE IA
  
  Proveedor: [Select] OpenAI / Anthropic
  Nombre Display: [Input] Ej: ChatGPT 4 Turbo
  API Key: [Input type=password] sk-... [👁️]
  Modelo: [Input] gpt-4-turbo-preview
  Max Tokens: [Input number] 2000
  Temperatura: [Input number 0-1] 0.7
  Límite Mensual (€): [Input number] 100
  Prioridad: [Input number] 1
  Estado: [Checkbox] Activo
  
  [Cancelar] [Guardar]
  ```
- API Key se encripta antes de guardar en BD
- Solo se muestra enmascarada: sk-***************

**B. Chat Conversacional con IA**
- Interfaz de chat estilo ChatGPT:
  ```
  ┌────────────────────────────────────────────────────┐
  │ 💬 Asistente IA - AssetFlow                        │
  │ Pregunta cualquier cosa sobre tus datos            │
  ├────────────────────────────────────────────────────┤
  │                                                     │
  │  👤 Usuario:                                        │
  │  ¿Qué cliente tiene más valor depositado?          │
  │                                                     │
  │  🤖 Asistente:                                      │
  │  Según los datos actuales, el cliente con mayor    │
  │  valor depositado es ABC S.L. con €180,250.00      │
  │  distribuidos en 3 emplazamientos...               │
  │                                                     │
  │  👤 Usuario:                                        │
  │  ¿Cuántos depósitos vencen esta semana?            │
  │                                                     │
  │  🤖 Asistente: [Escribiendo...]                    │
  │                                                     │
  ├────────────────────────────────────────────────────┤
  │ [Escribe tu pregunta...] [Enviar]                  │
  └────────────────────────────────────────────────────┘
  ```

- La IA tiene acceso a contexto del sistema:
  - Todos los depósitos activos
  - Valoraciones totales
  - Alertas pendientes
  - Estadísticas generales
- Responde en lenguaje natural
- Puede generar insights accionables
- Historial de conversación se mantiene en sesión

**C. Análisis Predictivo**
- Botón "Analizar Vencimientos" en dashboard
- Ejecuta análisis con IA sobre:
  - Depósitos activos
  - Histórico de vencimientos
  - Patrones de clientes
- Genera reporte con:
  - Predicción de riesgo de vencimiento (0-100%)
  - Clientes con comportamiento irregular
  - Recomendaciones preventivas
  - Priorización de acciones

- Ejemplo de output:
  ```
  ANÁLISIS PREDICTIVO DE VENCIMIENTOS
  
  Riesgo Alto (>70%):
  - Depósito DEP-2025-0145 (Cliente XYZ) - 85% riesgo
    Razón: Historial de vencimientos previos, valor alto
    Acción: Contactar urgentemente
  
  Riesgo Medio (30-70%):
  - Depósito DEP-2025-0132 (Cliente ABC) - 55% riesgo
    Razón: Se acerca fecha límite, cliente nuevo
    Acción: Recordatorio preventivo
  
  Recomendaciones Generales:
  1. Priorizar contacto con Cliente XYZ
  2. Considerar políticas más estrictas para clientes nuevos
  3. Implementar recordatorios automáticos a 14 días
  ```

**D. Optimización de Depósitos**
- Botón "Optimizar Depósitos" en reportes
- IA analiza:
  - Distribución geográfica de depósitos
  - Rentabilidad por emplazamiento
  - Productos con mayor rotación
  - Oportunidades de consolidación

- Genera recomendaciones:
  ```
  OPTIMIZACIÓN DE DEPÓSITOS
  
  Oportunidades Identificadas:
  
  1. Consolidar depósitos en Madrid
     Impacto: Reducción de 15% en costos logísticos
     Acción: Unificar 3 emplazamientos en 1 central
  
  2. Priorizar recuperación Producto X
     Impacto: Liberar €45,000 inmovilizados
     Acción: Contactar clientes con stock > 90 días
  
  3. Emplazamiento "Almacén Sur" subutilizado
     Impacto: Potencial para +€30,000 adicionales
     Acción: Ofrecer a nuevos clientes en zona
  ```

**E. Generación de Reportes Ejecutivos**
- Botón "Generar Reporte IA" con selector de periodo
- IA genera reporte ejecutivo profesional:
  ```
  REPORTE EJECUTIVO - ENERO 2025
  
  RESUMEN EJECUTIVO
  Durante enero 2025, el valor total depositado aumentó un
  12% respecto al mes anterior, alcanzando €325,450. Se
  identifican 8 alertas críticas que requieren atención
  inmediata.
  
  KPIS PRINCIPALES
  - Valor Total: €325,450 (+12%)
  - Depósitos Activos: 156 (+8)
  - Tasa Recuperación: 92% (-3%)
  - Tiempo Medio Depósito: 67 días
  
  INSIGHTS CLAVE
  1. Cliente ABC incrementó depósitos en 45%
  2. 3 depósitos vencidos requieren acción urgente
  3. Emplazamiento Norte Madrid alcanzó capacidad máxima
  
  RIESGOS IDENTIFICADOS
  - Alto: €37,500 en riesgo de vencimiento (3 depósitos)
  - Medio: Cliente XYZ con historial irregular
  
  RECOMENDACIONES
  1. Priorizar recuperación de depósitos vencidos
  2. Ampliar capacidad en Madrid (alta demanda)
  3. Revisar política de plazos para cliente XYZ
  ```
- Formato: PDF descargable + vista HTML

**F. Panel de Insights Automáticos**
- Vista de insights generados automáticamente por IA:
  ```
  INSIGHTS GENERADOS POR IA
  
  ┌────────────────────────────────────────────────────┐
  │ 🔴 CRÍTICO                       Hace 2 horas       │
  │ Alto Riesgo Financiero Detectado                   │
  │                                                     │
  │ Se detectó acumulación de €87,500 en depósitos     │
  │ próximos a vencer en los próximos 7 días.          │
  │                                                     │
  │ Acciones Sugeridas:                                │
  │ • Contactar urgentemente a 3 clientes              │
  │ • Preparar facturas preventivas                    │
  │ • Coordinar logística de devoluciones              │
  │                                                     │
  │ [Tomar Acción] [Ver Detalle] [Descartar]           │
  └────────────────────────────────────────────────────┘
  
  ┌────────────────────────────────────────────────────┐
  │ 🟡 OPORTUNIDAD                   Hace 5 horas       │
  │ Potencial de Crecimiento en Barcelona              │
  │                                                     │
  │ Análisis indica demanda no cubierta en zona de     │
  │ Barcelona. Potencial adicional: €50,000.           │
  │                                                     │
  │ Acciones Sugeridas:                                │
  │ • Identificar emplazamiento en Barcelona           │
  │ • Contactar clientes actuales en la zona           │
  │                                                     │
  │ [Ver Análisis] [Descartar]                         │
  └────────────────────────────────────────────────────┘
  ```

- Insights se generan automáticamente:
  - Job nocturno (02:00 AM)
  - También bajo demanda (botón manual)
- Se almacenan en BD para seguimiento
- Usuario puede marcar como visto/resuelto/descartado

**API Endpoints**:
```typescript
// Configuración
GET    /api/ia/config
POST   /api/ia/config
PUT    /api/ia/config/:id
DELETE /api/ia/config/:id

// Chat
POST   /api/ia/chat

// Análisis
POST   /api/ia/analizar/vencimientos
POST   /api/ia/optimizar/depositos
POST   /api/ia/generar-reporte/:periodo

// Insights
GET    /api/ia/insights
GET    /api/ia/insights/:id
POST   /api/ia/insights/generar
POST   /api/ia/insights/:id/resolver

// Historial
GET    /api/ia/historial
```

---

### PRIORIDAD ALTA ⭐⭐⭐⭐

#### 6. Gestión de Productos
**Estado**: Pendiente
**Prioridad**: Alta

CRUD básico de productos con código, nombre, descripción, categoría, precio unitario.

#### 7. Gestión de Clientes
**Estado**: Pendiente
**Prioridad**: Alta

CRUD básico de clientes con código, nombre, CIF, dirección, contacto.

#### 8. Reportes Básicos
**Estado**: Pendiente
**Prioridad**: Alta

- Reporte por cliente (valor depositado)
- Reporte por emplazamiento
- Reporte financiero (valor inmovilizado)
- Exportación a Excel/PDF

---

### PRIORIDAD MEDIA ⭐⭐⭐

#### 9. Historial de Movimientos
Vista completa de todos los movimientos registrados con filtros avanzados.

#### 10. Usuarios y Roles
Panel de administración de usuarios con roles (admin/manager/user).

---

### PRIORIDAD BAJA ⭐⭐

#### 11. Configuración del Sistema
Panel de configuración global (empresa, parámetros, integraciones).

#### 12. Auditoría de Acciones
Log completo de todas las acciones realizadas en el sistema.

---

## 🤖 AGENTES DE MONITOREO (OBLIGATORIO)

### 1. Health Check Agent
```javascript
// backend/src/agents/healthCheckAgent.js
// Ejecuta cada 5 minutos
// Verifica:
// - MongoDB conectado y respondiendo
// - API endpoints críticos funcionando
// - Espacio en disco > 20%
// - Memoria disponible > 20%
// - Jobs de alertas ejecutándose
// Si falla: Email urgente + Log crítico + Intento de auto-recuperación
```

### 2. Error Log Agent
```javascript
// backend/src/agents/errorLogAgent.js
// Captura en tiempo real:
// - Todos los errores 500
// - Excepciones no capturadas
// - Queries que fallan
// - Timeout de requests
// - Errores de IA APIs
// Almacena en BD + Envía email si crítico
```

### 3. Performance Agent
```javascript
// backend/src/agents/performanceAgent.js
// Monitorea cada 10 minutos:
// - Tiempo de respuesta promedio API
// - Queries lentas (> 1 segundo)
// - Uso de CPU y memoria
// - Número de requests por minuto
// - Tokens consumidos de IA por hora
// Alerta si degrada performance
```

### 4. Alertas Job (Cron)
```javascript
// backend/src/jobs/alertasJob.js
// Ejecuta cada hora (0 * * * *)
// Proceso:
// 1. Busca todos los depósitos activos
// 2. Calcula días restantes para cada uno
// 3. Genera alertas según umbrales (30, 7, 3, 0 días)
// 4. Evita duplicados (verifica si ya existe alerta pendiente)
// 5. Envía emails para alertas críticas y altas
// 6. Registra ejecución en log
```

### 5. Insights IA Job (Cron)
```javascript
// backend/src/jobs/insightsIAJob.js
// Ejecuta diariamente a las 02:00 AM (0 2 * * *)
// Proceso:
// 1. Recopila datos del sistema (depósitos, valoraciones, alertas)
// 2. Llama a IA para generar insights
// 3. Guarda insights en BD
// 4. Envía resumen diario por email a admin
// 5. Actualiza métricas de uso de IA
```

### 6. Estadísticas Job (Cron)
```javascript
// backend/src/jobs/estadisticasJob.js
// Ejecuta cada 5 minutos (* /5 * * * *)
// Proceso:
// 1. Recalcula KPIs del dashboard
// 2. Actualiza caché de estadísticas
// 3. Verifica integridad de valoraciones
// 4. Optimiza índices si es necesario
```

---

## 🔐 SEGURIDAD Y CREDENCIALES

### Variables de Entorno (CRÍTICAS)
```bash
# MongoDB
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=assetflow2025secure
MONGODB_URI=mongodb://admin:assetflow2025secure@mongodb:27017/assetflow?authSource=admin
DB_NAME=assetflow

# Backend
BACKEND_PORT=5000
NODE_ENV=production

# JWT
JWT_SECRET=a3f8d9e7c2b5f1a9d4e8c7b3a6f2d9e5c8b4a7f3d6e9c2b5a8f4d7e3c9b6a2f5
JWT_EXPIRE=7d

# Frontend
VITE_API_URL=https://assetflow.oversunenergy.com/api
FRONTEND_PORT=3000

# Email SMTP
SMTP_HOST=smtp.dondominio.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=admin@things360.io
SMTP_PASSWORD=@S1i9m8o1n
SMTP_FROM=AssetFlow <admin@things360.io>

# Servidor
SERVER_HOST=167.235.58.24
SERVER_USER=Admin
SERVER_PASSWORD=bb474edf
SSH_KEY_PATH=./.credentials/ssh/id_rsa

# Dominio
DOMAIN=assetflow.oversunenergy.com
SSL_ENABLED=true

# IA APIs (ENCRIPTAR EN BD)
# OpenAI y Anthropic se configuran desde el panel de admin
# NO incluir API keys aquí

# Encriptación
ENCRYPTION_KEY=d7e3c9b6a2f5a3f8d9e7c2b5f1a9d4e8c7b3a6f2d9e5c8b4a7f3d6e9c2b5a8f4

# Backup
BACKUP_ENABLED=true
BACKUP_PATH=/backup/assetflow
BACKUP_RETENTION_DAYS=30
BACKUP_TIME=02:00

# Sistema
LANGUAGE=es
TIMEZONE=Europe/Madrid
CURRENCY=EUR

# Logging
LOG_LEVEL=info
LOG_PATH=./.logs
LOG_MAX_FILES=30

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
```

### Usuario Admin Inicial
```javascript
{
  email: "ppelaez@oversunenergy.com",
  password: "bb474edf", // Se hasheará con bcrypt
  name: "ppelaez",
  role: "admin"
}
```

---

## 🚀 DEPLOYMENT

### Servidor de Producción
- **Host**: 167.235.58.24
- **OS**: Ubuntu 24.04
- **Usuario**: Admin
- **Password**: bb474edf
- **Dominio**: assetflow.oversunenergy.com
- **SSL**: Let's Encrypt (auto-renovación)

### Estructura en Servidor
```
/var/www/assetflow/
├── docker-compose.yml
├── .env
├── backend/
├── frontend/
├── mongodb/data/
├── .credentials/
└── .logs/
```

### Comandos de Deployment
```bash
# Conectar al servidor
ssh Admin@167.235.58.24

# Ir al directorio
cd /var/www/assetflow

# Pull cambios
git pull origin main

# Rebuild y reiniciar
docker-compose down
docker-compose up -d --build

# Ver logs
docker logs assetflow-backend -f
```

---

## 📋 PLAN DE DESARROLLO

### FASE 1: Setup y Backend Core (1 semana)
- [ ] Setup completo del proyecto
- [ ] Modelos de BD (10 modelos) 100% funcionales
- [ ] Autenticación JWT 100% funcional
- [ ] Usuario admin inicial creado
- [ ] Health check endpoint funcionando

### FASE 2: Emplazamientos (1 semana)
- [ ] CRUD Emplazamientos 100% funcional
- [ ] Frontend con formulario completo
- [ ] Integración con geocoding
- [ ] Validaciones end-to-end

### FASE 3: Depósitos (2 semanas)
- [ ] CRUD Depósitos 100% funcional
- [ ] Cálculo automático valoraciones
- [ ] Frontend formulario multi-paso
- [ ] Sistema de estados
- [ ] Acciones (facturar/devolver/extender)

### FASE 4: Dashboard con Mapa (1 semana)
- [ ] Integración Leaflet 100% funcional
- [ ] Mapa con pins coloreados
- [ ] KPIs en tiempo real
- [ ] Popups interactivos
- [ ] TODO funcionando perfectamente

### FASE 5: Sistema de Alertas (1 semana)
- [ ] Job automático generación alertas
- [ ] Vista de alertas
- [ ] Resolución de alertas
- [ ] Envío de emails automático
- [ ] 100% funcional

### FASE 6: Módulo IA (2 semanas)
- [ ] Configuración APIs IA (admin panel)
- [ ] Chat conversacional 100% funcional
- [ ] Análisis predictivo
- [ ] Optimización depósitos
- [ ] Generación reportes ejecutivos
- [ ] Panel de insights automáticos
- [ ] Job nocturno insights

### FASE 7: Agentes de Monitoreo (1 semana)
- [ ] Health Check Agent funcional
- [ ] Error Log Agent funcional
- [ ] Performance Agent funcional
- [ ] Claude Code instalado en servidor
- [ ] Dashboard de monitoreo

### FASE 8: Productos, Clientes, Reportes (1 semana)
- [ ] CRUD Productos
- [ ] CRUD Clientes
- [ ] Reportes básicos
- [ ] Exportación Excel/PDF

### FASE 9: Testing y Producción (1 semana)
- [ ] Tests de todos los módulos
- [ ] Deploy en producción
- [ ] Datos de ejemplo
- [ ] Backup automático
- [ ] SSL configurado
- [ ] Monitoreo activo

**TOTAL: 10 semanas (~2.5 meses)**

---

## ✅ CHECKLIST ANTES DE CADA COMMIT

```
[ ] El código funciona al 100% (probado manualmente)
[ ] Happy path funciona
[ ] Error cases manejados
[ ] No hay TODOs ni placeholders
[ ] Sin console.log olvidados
[ ] Documentado en CHANGELOG.md
[ ] TODO.md actualizado
[ ] Sin warnings en consola
[ ] API probada con Postman/curl (si aplica)
[ ] Frontend probado en navegador (si aplica)
[ ] Base de datos actualizada correctamente
[ ] No se rompió nada existente
```

---

## ⚠️ RESTRICCIONES Y LIMITACIONES

### ❌ PROHIBIDO
- Hacer push directo a `main` sin PR
- Modificar BD en producción sin backup
- Ignorar tests fallidos
- Commitear archivos de `.credentials/`
- Hardcodear credenciales
- Dejar código no funcional
- Asumir requisitos no documentados

### ✅ OBLIGATORIO
- Usar feature branches
- Escribir código 100% funcional
- Probar antes de commitear
- Documentar cambios en CHANGELOG
- Actualizar TODO.md
- Hacer backup antes de cambios críticos
- Revisar código antes de PR
- Solicitar aprobación para deploy

---

## 📚 DOCUMENTACIÓN

### Documentos del Proyecto
- **PROJECT.md** (este documento) - Documento principal
- **TODO.md** - Lista de tareas y roadmap
- **CHANGELOG.md** - Historial de cambios
- **QUICKSTART.md** - Guía de inicio rápido
- **DEVELOPMENT.md** - Guía para desarrolladores
- **API.md** - Documentación completa de API
- **DATABASE.md** - Schemas y relaciones
- **DEPLOYMENT.md** - Guía de despliegue
- **SECURITY.md** - Checklist de seguridad
- **AI_MODULE.md** - Documentación específica del módulo IA

### Enlaces Útiles
- Repositorio: https://github.com/werdo/assetflow-3.0
- Producción: https://assetflow.oversunenergy.com
- Servidor: 167.235.58.24
- Plantilla Facit: ./facit-vite/

---

## 📞 CONTACTOS

- **Product Owner**: ppelaez@oversunenergy.com
- **Tech Lead**: ppelaez@oversunenergy.com
- **Organización**: Oversun Energy

---

## 📝 HISTORIAL DE CAMBIOS DEL DOCUMENTO

| Fecha | Versión | Cambios | Autor |
|-------|---------|---------|-------|
| 2025-01-20 | 1.0.0 | Creación inicial con especificaciones completas | Claude Code |

---

**Última actualización**: 2025-01-20
**Versión del documento**: 1.0.0
**Revisado por**: ppelaez

---

## 🎯 RESUMEN EJECUTIVO PARA CLAUDE CODE

**AssetFlow 3.0 es un sistema de control de inventario depositado en emplazamientos de clientes con:**

1. **Dashboard con mapa geográfico** mostrando todos los emplazamientos
2. **Gestión de depósitos** con valoración automática y control de fechas límite
3. **Sistema de alertas automático** para vencimientos
4. **Análisis mediante IA** (OpenAI + Anthropic) configurable
5. **Agentes de monitoreo** 24/7 para detectar problemas

**CRÍTICO:**
- Solo código 100% funcional
- Probar antes de avanzar
- No inventar funcionalidades
- Seguir especificaciones exactas
- Agentes de monitoreo obligatorios

**PRIORIDAD ABSOLUTA:**
1. Dashboard con mapa
2. Gestión de depósitos
3. Sistema de alertas
4. Módulo IA
5. Agentes de monitoreo
