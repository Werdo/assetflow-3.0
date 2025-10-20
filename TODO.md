## TODO - AssetFlow 3.0

**Sistema de Control de Inventario Depositado en Emplazamientos de Clientes**

Actualizado: 2025-01-20

---

## 🚨 REGLAS IMPORTANTES

- ✅ Solo marcar `[x]` cuando esté 100% funcional y probado
- ❌ NO marcar si tiene TODOs o placeholders
- ✅ Probar happy path + error cases antes de marcar
- ❌ NO avanzar a siguiente tarea sin completar la actual

---

## 🚀 FASE 1: Setup Inicial del Proyecto (1 semana)

### Repositorio y Estructura Base
- [ ] Crear repositorio en GitHub: `assetflow-3.0`
- [ ] Configurar .gitignore (incluir .credentials/, .logs/, .env)
- [ ] Copiar clave SSH a `.credentials/ssh/id_rsa`
- [ ] Configurar permisos SSH: `chmod 600`
- [ ] Crear estructura de carpetas backend/frontend
- [ ] Inicializar Git con primer commit
- [ ] Configurar GitHub con token de acceso

### Backend - Setup Inicial
- [ ] Inicializar proyecto Node.js en backend/
- [ ] Instalar dependencias principales:
  - [ ] express@4.18.2
  - [ ] mongoose@8.0.3
  - [ ] jsonwebtoken@9.0.2
  - [ ] bcryptjs@2.4.3
  - [ ] cors@2.8.5
  - [ ] dotenv@16.3.1
  - [ ] express-validator@7.0.1
  - [ ] morgan@1.10.0
  - [ ] node-cron@3.0.2
  - [ ] nodemailer@6.9.7
  - [ ] openai@4.0.0
  - [ ] @anthropic-ai/sdk@0.9.0
- [ ] Crear estructura de carpetas:
  - [ ] src/models/
  - [ ] src/controllers/
  - [ ] src/routes/
  - [ ] src/middleware/
  - [ ] src/services/
  - [ ] src/jobs/
  - [ ] src/agents/
  - [ ] src/utils/
  - [ ] src/config/
- [ ] Crear server.js básico
- [ ] Configurar conexión a MongoDB
- [ ] Probar: `node src/server.js` debe iniciar sin errores

### Frontend - Setup Inicial
- [ ] Inicializar proyecto Vite + React + TypeScript
- [ ] Instalar dependencias principales:
  - [ ] react@18.2.0
  - [ ] react-dom@18.2.0
  - [ ] react-router-dom@6.20.0
  - [ ] axios@1.6.2
  - [ ] bootstrap@5.3.2
  - [ ] react-bootstrap@2.9.1
  - [ ] leaflet@1.9.4
  - [ ] react-leaflet@4.2.1
  - [ ] apexcharts@3.44.0
  - [ ] recharts@2.10.3
- [ ] Copiar plantilla Facit desde facit-vite/
- [ ] Crear estructura de carpetas:
  - [ ] src/pages/
  - [ ] src/components/
  - [ ] src/services/
  - [ ] src/contexts/
  - [ ] src/config/
  - [ ] src/utils/
- [ ] Crear archivo src/config/api.ts
- [ ] Probar: `npm run dev` debe cargar en localhost:3000

### Docker y Deployment
- [ ] Crear Dockerfile para backend
- [ ] Crear Dockerfile para frontend
- [ ] Crear docker-compose.yml
- [ ] Crear archivo .env desde .env.example
- [ ] Configurar JWT_SECRET seguro (64 caracteres)
- [ ] Probar: `docker-compose up -d --build`
- [ ] Verificar: 3 contenedores corriendo

### Base de Datos
- [ ] Verificar MongoDB iniciado
- [ ] Crear base de datos 'assetflow'
- [ ] Probar conexión desde backend
- [ ] Ver en logs: "✅ MongoDB conectado"

---

## 📦 FASE 2: Backend - Modelos y Autenticación (1 semana)

### Modelos de Base de Datos (10 modelos)

#### User Model
- [ ] Crear backend/src/models/User.js
- [ ] Schema con: name, email, password, role, active
- [ ] Hash de password con bcrypt (pre-save hook)
- [ ] Índice único en email
- [ ] Método comparePassword
- [ ] Probar: Crear usuario en MongoDB funciona

#### Producto Model
- [ ] Crear backend/src/models/Producto.js
- [ ] Schema con: codigo, nombre, descripcion, categoria, precioUnitario, stockEnNuestroAlmacen, activo
- [ ] Índice único en codigo
- [ ] Validación: precioUnitario > 0
- [ ] Probar: CRUD funciona

#### Cliente Model
- [ ] Crear backend/src/models/Cliente.js
- [ ] Schema con: codigo, nombre, cif, direccionFiscal, ciudad, codigoPostal, telefono, email, contacto, activo
- [ ] Índice único en codigo y cif
- [ ] Validación: email válido si se proporciona
- [ ] Probar: CRUD funciona

#### Emplazamiento Model ⭐ CORE
- [ ] Crear backend/src/models/Emplazamiento.js
- [ ] Schema con: codigo, nombre, cliente, direccion, ciudad, coordenadas{lat,lng}, capacidadM3, tipoAlmacen, responsable, telefono, estado, notas
- [ ] Índice único en codigo
- [ ] Índice en cliente
- [ ] Índice geoespacial en coordenadas
- [ ] Validación: coordenadas válidas (-90 a 90, -180 a 180)
- [ ] Probar: CRUD funciona y coordenadas se guardan correctamente

#### Deposito Model ⭐ CORE
- [ ] Crear backend/src/models/Deposito.js
- [ ] Schema completo con productos[], fechas, valoraciones, estado
- [ ] Método virtual: diasRestantes (calculado)
- [ ] Método virtual: estadoCalculado (según días restantes)
- [ ] Pre-save hook: calcular valorTotalDeposito
- [ ] Pre-save hook: generar numeroDeposito si no existe
- [ ] Índices: numeroDeposito (unique), cliente, estado, fechaLimite
- [ ] Probar: Crear depósito calcula valores automáticamente

#### Movimiento Model
- [ ] Crear backend/src/models/Movimiento.js
- [ ] Schema con: tipo, deposito, producto, cantidad, valorUnitario, valorTotal, fechaMovimiento, referenciaAlbaran, motivo, usuarioResponsable, notas
- [ ] Índices en: deposito, producto, fechaMovimiento
- [ ] Probar: Registro de movimientos funciona

#### Alerta Model ⭐ CORE
- [ ] Crear backend/src/models/Alerta.js
- [ ] Schema con: tipo, deposito, emplazamiento, cliente, titulo, descripcion, valorAfectado, diasRestantes, prioridad, estado, accionTomada, emailEnviado
- [ ] Índices en: deposito, estado, prioridad, fechaAlerta
- [ ] Probar: Crear alertas funciona

#### AI_Config Model
- [ ] Crear backend/src/models/AI_Config.js
- [ ] Schema con: proveedor, nombreDisplay, apiKey, modelo, maxTokens, temperatura, activo, prioridadUso, costoPor1000Tokens, limiteMensual, usoMensualActual
- [ ] Método: encriptarKey() - antes de guardar
- [ ] Método: desencriptarKey() - al leer
- [ ] Probar: API key se encripta correctamente

#### AI_Consulta Model
- [ ] Crear backend/src/models/AI_Consulta.js
- [ ] Schema con: tipoConsulta, proveedor, modelo, prompt, contexto, usuario, respuesta, tokensUsados, costoEstimado, tiempoRespuesta, utilidad, guardado
- [ ] Índices en: usuario, tipoConsulta, fechaConsulta
- [ ] Probar: Historial se guarda correctamente

#### AI_Insight Model
- [ ] Crear backend/src/models/AI_Insight.js
- [ ] Schema con: tipo, titulo, descripcion, prioridad, estado, accionesSugeridas[], generadoPor, modeloUtilizado, confianza, vistoPor[], accionesTomadas[]
- [ ] Índices en: tipo, estado, prioridad, fechaGeneracion
- [ ] Probar: Insights se guardan correctamente

### Sistema de Autenticación JWT

#### Middleware de Autenticación
- [ ] Crear backend/src/middleware/auth.js
- [ ] Función authenticate: Verificar JWT token
- [ ] Función authorize: Verificar roles
- [ ] Función protect: Alias de authenticate
- [ ] Probar: Token inválido retorna 401
- [ ] Probar: Token válido adjunta user a request
- [ ] Probar: authorize rechaza roles no permitidos

#### Auth Controller
- [ ] Crear backend/src/controllers/authController.js
- [ ] POST /api/auth/register - Crear usuario
  - [ ] Validar email único
  - [ ] Hashear password
  - [ ] Crear usuario en BD
  - [ ] Probar: Usuario se crea correctamente
- [ ] POST /api/auth/login - Login
  - [ ] Buscar usuario por email
  - [ ] Verificar password
  - [ ] Generar JWT token
  - [ ] Retornar token + datos usuario
  - [ ] Probar: Login exitoso retorna token válido
  - [ ] Probar: Login con password incorrecto retorna 401
- [ ] GET /api/auth/me - Obtener usuario actual
  - [ ] Retornar datos del usuario autenticado
  - [ ] Probar: Con token válido retorna usuario

#### Auth Routes
- [ ] Crear backend/src/routes/authRoutes.js
- [ ] Definir rutas POST /register, POST /login, GET /me
- [ ] Aplicar middleware authenticate en /me
- [ ] Montar en server.js: app.use('/api/auth', authRoutes)
- [ ] Probar todas las rutas con Postman/curl

#### Crear Usuario Admin Inicial
- [ ] Crear script backend/src/scripts/seedAdmin.js
- [ ] Insertar usuario:
  - Email: ppelaez@oversunenergy.com
  - Password: bb474edf (hasheado)
  - Role: admin
  - Name: ppelaez
- [ ] Ejecutar script: `node src/scripts/seedAdmin.js`
- [ ] Probar: Login con este usuario funciona

---

## 🏢 FASE 3: Backend - Emplazamientos (1 semana) ⭐

### Emplazamiento Controller
- [ ] Crear backend/src/controllers/emplazamientoController.js
- [ ] GET /api/emplazamientos - Listar todos
  - [ ] Filtros: cliente, estado
  - [ ] Búsqueda: por nombre, ciudad
  - [ ] Populate: cliente
  - [ ] Ordenar por nombre
  - [ ] Probar: Retorna lista correctamente
- [ ] GET /api/emplazamientos/:id - Obtener uno
  - [ ] Populate: cliente
  - [ ] Probar: Retorna emplazamiento con cliente
- [ ] POST /api/emplazamientos - Crear
  - [ ] Validar: código único
  - [ ] Validar: coordenadas válidas
  - [ ] Validar: cliente existe
  - [ ] Auto-generar código si no se proporciona
  - [ ] Probar: Crea emplazamiento correctamente
  - [ ] Probar: Rechaza coordenadas inválidas
- [ ] PUT /api/emplazamientos/:id - Actualizar
  - [ ] Validar: código único (si se cambia)
  - [ ] Probar: Actualiza correctamente
- [ ] DELETE /api/emplazamientos/:id - Eliminar (soft delete)
  - [ ] Verificar: No tiene depósitos activos
  - [ ] Cambiar estado a 'inactivo' en lugar de eliminar
  - [ ] Probar: Soft delete funciona
  - [ ] Probar: Rechaza si tiene depósitos activos

#### Geocoding Service
- [ ] Crear backend/src/services/geocodingService.js
- [ ] POST /api/emplazamientos/geocode - Dirección → Coordenadas
- [ ] Integrar API de geocoding (OpenStreetMap Nominatim o Google)
- [ ] Probar: Dirección válida retorna coordenadas
- [ ] Probar: Dirección inválida retorna error claro

### Emplazamiento Routes
- [ ] Crear backend/src/routes/emplazamientoRoutes.js
- [ ] Definir todas las rutas CRUD
- [ ] Aplicar middleware authenticate en todas
- [ ] Aplicar authorize('admin', 'manager') en POST, PUT, DELETE
- [ ] Montar en server.js
- [ ] Probar todas las rutas con Postman

### Frontend - Emplazamientos

#### Servicio de API
- [ ] Crear frontend/src/services/emplazamientoService.ts
- [ ] Métodos: getAll, getById, create, update, delete, geocode
- [ ] Incluir token en headers
- [ ] Probar: Llamadas API funcionan

#### Página Listado
- [ ] Crear frontend/src/pages/Emplazamientos.tsx
- [ ] Tabla con columnas: Código, Nombre, Cliente, Ciudad, Depósitos Activos, Valor Total, Estado
- [ ] Búsqueda por nombre, ciudad
- [ ] Filtros: Cliente (select), Estado (select)
- [ ] Botón "Nuevo Emplazamiento"
- [ ] Botones por fila: Ver, Editar, Ver en Mapa
- [ ] Probar: Carga datos correctamente
- [ ] Probar: Búsqueda funciona
- [ ] Probar: Filtros funcionan

#### Formulario Crear/Editar
- [ ] Crear frontend/src/components/FormEmplazamiento.tsx
- [ ] Campos: todos los del schema
- [ ] Select de Cliente con búsqueda
- [ ] Input coordenadas con validación
- [ ] Botón "Obtener coordenadas" que llama a geocode
- [ ] Mapa preview con Leaflet mostrando pin
- [ ] Validaciones en tiempo real (Formik + Yup)
- [ ] Probar: Crear emplazamiento funciona end-to-end
- [ ] Probar: Editar emplazamiento funciona
- [ ] Probar: Validaciones funcionan
- [ ] Probar: Geocoding funciona
- [ ] Probar: Mapa preview funciona

#### Página Detalle
- [ ] Crear frontend/src/pages/EmplazamientoDetalle.tsx
- [ ] Mostrar toda la información
- [ ] Mapa grande con pin del emplazamiento
- [ ] Lista de depósitos activos
- [ ] Botones: Editar, Volver
- [ ] Probar: Muestra datos correctamente
- [ ] Probar: Mapa se carga correctamente

---

## 📦 FASE 4: Backend - Depósitos (2 semanas) ⭐

### Deposito Controller
- [ ] Crear backend/src/controllers/depositoController.js
- [ ] GET /api/depositos - Listar todos
  - [ ] Filtros: cliente, emplazamiento, estado
  - [ ] Búsqueda: por numeroDeposito
  - [ ] Rango fechas: fechaInicio, fechaLimite
  - [ ] Populate: cliente, emplazamiento, productos.producto
  - [ ] Calcular: diasRestantes para cada uno
  - [ ] Ordenar por: fechaLimite ASC (próximos primero)
  - [ ] Paginación: 20 por página
  - [ ] Probar: Retorna lista correctamente
  - [ ] Probar: Filtros funcionan
- [ ] GET /api/depositos/:id - Obtener uno
  - [ ] Populate: cliente, emplazamiento, productos.producto, creadoPor
  - [ ] Incluir: historial de movimientos relacionados
  - [ ] Incluir: alertas relacionadas
  - [ ] Probar: Retorna depósito completo
- [ ] POST /api/depositos - Crear
  - [ ] Validar: cliente existe
  - [ ] Validar: emplazamiento existe y pertenece al cliente
  - [ ] Validar: fechaLimite > fechaInicio
  - [ ] Validar: al menos 1 producto
  - [ ] Auto-generar numeroDeposito: DEP-2025-XXXX
  - [ ] Calcular: valorTotalDeposito automáticamente
  - [ ] Crear: movimientos de entrada para cada producto
  - [ ] Probar: Crea depósito correctamente
  - [ ] Probar: Movimientos se crean automáticamente
  - [ ] Probar: Valoración calculada correcta
- [ ] PUT /api/depositos/:id - Actualizar
  - [ ] Solo permitir si estado = 'activo'
  - [ ] Recalcular valoraciones si se modifican productos
  - [ ] Probar: Actualiza correctamente
  - [ ] Probar: Rechaza si no está activo
- [ ] DELETE /api/depositos/:id - Eliminar
  - [ ] Solo admin
  - [ ] Solo si estado != 'activo' (depósitos cerrados)
  - [ ] Soft delete preferido
  - [ ] Probar: Solo admin puede eliminar
- [ ] POST /api/depositos/:id/extender-plazo - Extender plazo
  - [ ] Validar: nueva fecha > fecha actual
  - [ ] Actualizar: fechaLimite
  - [ ] Registrar: movimiento tipo 'extension_plazo'
  - [ ] Eliminar: alertas pendientes obsoletas
  - [ ] Regenerar: nuevas alertas según nueva fecha
  - [ ] Probar: Extiende plazo correctamente
  - [ ] Probar: Alertas se regeneran
- [ ] POST /api/depositos/:id/marcar-facturado - Facturar
  - [ ] Validar: referenciaFactura requerida
  - [ ] Actualizar: estado = 'facturado', accion = 'facturar'
  - [ ] Registrar: movimiento tipo 'facturado'
  - [ ] Resolver: alertas pendientes relacionadas
  - [ ] Probar: Marca como facturado correctamente
- [ ] POST /api/depositos/:id/marcar-devuelto - Devolver
  - [ ] Validar: referenciaAlbaran requerida
  - [ ] Actualizar: estado = 'devuelto', accion = 'devolver'
  - [ ] Registrar: movimientos de salida para cada producto
  - [ ] Resolver: alertas pendientes relacionadas
  - [ ] Probar: Marca como devuelto correctamente
- [ ] GET /api/depositos/stats - Estadísticas
  - [ ] Total depósitos activos
  - [ ] Valor total depositado
  - [ ] Próximos a vencer (< 7 días)
  - [ ] Vencidos
  - [ ] Por cliente
  - [ ] Probar: Estadísticas correctas

### Deposito Routes
- [ ] Crear backend/src/routes/depositoRoutes.js
- [ ] Definir todas las rutas
- [ ] Aplicar authenticate en todas
- [ ] Aplicar authorize en DELETE
- [ ] Montar en server.js
- [ ] Probar todas las rutas con Postman

### Deposito Service (Lógica de negocio)
- [ ] Crear backend/src/services/depositoService.js
- [ ] Método: calcularValoracion(productos[])
- [ ] Método: generarNumeroDeposito()
- [ ] Método: calcularDiasRestantes(fechaLimite)
- [ ] Método: determinarEstado(diasRestantes)
- [ ] Probar: Todos los métodos funcionan correctamente

### Frontend - Depósitos

#### Servicio de API
- [ ] Crear frontend/src/services/depositoService.ts
- [ ] Métodos para todas las operaciones CRUD
- [ ] Métodos: extenderPlazo, marcarFacturado, marcarDevuelto
- [ ] Probar: Todas las llamadas funcionan

#### Página Listado
- [ ] Crear frontend/src/pages/Depositos.tsx
- [ ] Tabla con columnas: Número, Cliente, Emplazamiento, Fecha Límite, Días Restantes, Valor, Estado
- [ ] Filtros: Cliente, Emplazamiento, Estado, Rango fechas
- [ ] Búsqueda por número
- [ ] Indicadores visuales de color según días restantes
- [ ] Botón "Nuevo Depósito"
- [ ] Probar: Carga y muestra correctamente
- [ ] Probar: Colores se aplican correctamente

#### Formulario Multi-Paso
- [ ] Crear frontend/src/components/FormDeposito.tsx
- [ ] PASO 1: Información básica (cliente, emplazamiento, fechas)
- [ ] PASO 2: Productos (lista dinámica agregar/quitar)
- [ ] PASO 3: Confirmación y notas
- [ ] Cálculos en tiempo real: días depósito, valor total
- [ ] Validaciones por paso
- [ ] Navegación: Siguiente, Anterior, Cancelar, Crear
- [ ] Probar: Navega entre pasos correctamente
- [ ] Probar: Cálculos automáticos funcionan
- [ ] Probar: Crear depósito end-to-end funciona

#### Página Detalle
- [ ] Crear frontend/src/pages/DepositoDetalle.tsx
- [ ] Información completa del depósito
- [ ] Tabla de productos con subtotales
- [ ] Barra de progreso de días restantes
- [ ] Historial de movimientos
- [ ] Alertas relacionadas
- [ ] Botones de acción: Extender, Facturar, Devolver
- [ ] Probar: Muestra toda la información correctamente

#### Modales de Acciones
- [ ] Modal Extender Plazo
  - [ ] DatePicker nueva fecha
  - [ ] Textarea justificación
  - [ ] Probar: Extiende plazo correctamente
- [ ] Modal Marcar Facturado
  - [ ] Input referencia factura
  - [ ] Confirmación
  - [ ] Probar: Marca como facturado
- [ ] Modal Marcar Devuelto
  - [ ] Input referencia albarán
  - [ ] Confirmación
  - [ ] Probar: Marca como devuelto

---

## 🗺️ FASE 5: Dashboard con Mapa (1 semana) ⭐⭐⭐

### Backend - Dashboard Controller
- [ ] Crear backend/src/controllers/dashboardController.js
- [ ] GET /api/dashboard/kpis - KPIs principales
  - [ ] Valor total depositado
  - [ ] Emplazamientos activos
  - [ ] Depósitos activos
  - [ ] Alertas pendientes
  - [ ] Próximos a vencer (< 7 días)
  - [ ] Vencidos
  - [ ] Top cliente por valor
  - [ ] Top producto por cantidad
  - [ ] Probar: Retorna KPIs correctos
- [ ] GET /api/dashboard/mapa - Datos para mapa
  - [ ] Todos los emplazamientos activos con:
    - coordenadas
    - nombre
    - cliente
    - depósitos activos (count)
    - valor total depositado
    - estado (según depósitos)
  - [ ] Calcular color según estado:
    - Verde: Sin problemas
    - Amarillo: Algún depósito próximo vencimiento
    - Rojo: Algún depósito vencido
  - [ ] Probar: Retorna datos correctos para mapa
- [ ] GET /api/dashboard/alertas-criticas - Top 10 alertas
  - [ ] Solo estado 'pendiente'
  - [ ] Ordenar por prioridad DESC, diasRestantes ASC
  - [ ] Limit 10
  - [ ] Populate: deposito, cliente, emplazamiento
  - [ ] Probar: Retorna alertas más urgentes

### Dashboard Routes
- [ ] Crear backend/src/routes/dashboardRoutes.js
- [ ] Definir rutas
- [ ] Aplicar authenticate
- [ ] Montar en server.js
- [ ] Probar con Postman

### Frontend - Dashboard

#### Componente Mapa
- [ ] Crear frontend/src/components/MapaEmplazamientos.tsx
- [ ] Integrar Leaflet con OpenStreetMap
- [ ] Cargar emplazamientos desde API
- [ ] Renderizar pins con colores según estado
- [ ] Popup al hacer click:
  - Nombre emplazamiento
  - Cliente
  - Depósitos activos
  - Valor total
  - Botón "Ver Detalle"
- [ ] Clustering de pins si hay muchos cercanos
- [ ] Probar: Mapa se carga correctamente
- [ ] Probar: Pins se muestran en coordenadas correctas
- [ ] Probar: Popups funcionan
- [ ] Probar: Colores se aplican correctamente

#### KPI Cards
- [ ] Crear frontend/src/components/KPICards.tsx
- [ ] 8 cards con los KPIs principales
- [ ] Actualización automática cada 30 segundos
- [ ] Iconos y colores apropiados
- [ ] Click en card lleva a vista detallada
- [ ] Probar: Muestra datos correctos
- [ ] Probar: Actualización automática funciona

#### Tabla Alertas
- [ ] Crear frontend/src/components/TablaAlertasCriticas.tsx
- [ ] Top 10 alertas más urgentes
- [ ] Botón "Ver Detalle" por alerta
- [ ] Botón "Resolver" que abre modal
- [ ] Badge de prioridad con color
- [ ] Probar: Muestra alertas correctamente

#### Página Dashboard
- [ ] Crear frontend/src/pages/Dashboard.tsx
- [ ] Layout: Mapa arriba (60% altura), KPIs y tabla abajo
- [ ] Responsive design
- [ ] Probar: Todo se carga y funciona end-to-end
- [ ] Probar: Es la vista más impresionante del sistema ⭐

---

## 🚨 FASE 6: Sistema de Alertas (1 semana) ⭐

### Backend - Alertas Controller
- [ ] Crear backend/src/controllers/alertaController.js
- [ ] GET /api/alertas - Listar
  - [ ] Filtros: estado, prioridad, cliente
  - [ ] Ordenar por prioridad DESC, fechaAlerta DESC
  - [ ] Populate: deposito, cliente, emplazamiento
  - [ ] Paginación
  - [ ] Probar: Retorna alertas correctamente
- [ ] GET /api/alertas/:id - Obtener una
  - [ ] Populate completo
  - [ ] Probar: Retorna alerta completa
- [ ] POST /api/alertas/:id/resolver - Resolver
  - [ ] Validar: accionTomada requerida
  - [ ] Actualizar: estado = 'resuelta'
  - [ ] Registrar: usuarioResolutor, fechaResolucion
  - [ ] Si acción es 'facturar' o 'devolver': actualizar depósito
  - [ ] Probar: Resuelve correctamente
  - [ ] Probar: Depósito se actualiza si aplica
- [ ] POST /api/alertas/:id/descartar - Descartar
  - [ ] Actualizar: estado = 'descartada'
  - [ ] Registrar: usuario y fecha
  - [ ] Probar: Descarta correctamente
- [ ] GET /api/alertas/stats - Estadísticas
  - [ ] Por estado, por prioridad
  - [ ] Probar: Estadísticas correctas

### Alertas Service
- [ ] Crear backend/src/services/alertaService.js
- [ ] Método: generarAlertasDeposito(deposito)
  - [ ] Calcula días restantes
  - [ ] Determina tipo y prioridad de alerta
  - [ ] Verifica si ya existe alerta pendiente (evitar duplicados)
  - [ ] Crea alerta si corresponde
  - [ ] Retorna alerta creada o null
- [ ] Método: enviarEmailAlerta(alerta)
  - [ ] Obtiene destinatarios (admin, managers)
  - [ ] Genera HTML del email
  - [ ] Envía mediante nodemailer
  - [ ] Marca: emailEnviado = true
  - [ ] Registra: fechaEnvioEmail
  - [ ] Probar: Email se envía correctamente
- [ ] Probar: Todos los métodos funcionan

### Job Automático de Alertas
- [ ] Crear backend/src/jobs/alertasJob.js
- [ ] Configurar cron: cada hora (0 * * * *)
- [ ] Proceso:
  1. Buscar todos los depósitos con estado 'activo'
  2. Para cada depósito:
     - Calcular días restantes
     - Llamar a alertaService.generarAlertasDeposito()
     - Si alerta creada y prioridad >= 'alta': enviar email
  3. Log: "Alertas job ejecutado - X alertas generadas"
- [ ] Probar: Job se ejecuta correctamente
- [ ] Probar: Alertas se generan automáticamente
- [ ] Probar: Emails se envían para alertas críticas

### Email Service
- [ ] Crear backend/src/services/emailService.js
- [ ] Configurar nodemailer con SMTP
- [ ] Método: enviarEmail(to, subject, html)
- [ ] Template HTML profesional para alertas
- [ ] Probar: Email llega correctamente
- [ ] Probar: Template se ve bien en Gmail, Outlook

### Inicializar Jobs en Server
- [ ] Importar alertasJob en server.js
- [ ] Iniciar job: alertasJob.start()
- [ ] Log: "✅ Alertas job iniciado"
- [ ] Probar: Job se ejecuta automáticamente cada hora

### Alertas Routes
- [ ] Crear backend/src/routes/alertaRoutes.js
- [ ] Definir todas las rutas
- [ ] Aplicar authenticate
- [ ] Montar en server.js
- [ ] Probar con Postman

### Frontend - Alertas

#### Servicio API
- [ ] Crear frontend/src/services/alertaService.ts
- [ ] Métodos: getAll, getById, resolver, descartar
- [ ] Probar: Llamadas funcionan

#### Página Alertas
- [ ] Crear frontend/src/pages/Alertas.tsx
- [ ] Lista de alertas con cards
- [ ] Filtros: Estado, Prioridad, Cliente
- [ ] Cada card muestra:
  - Badge prioridad
  - Título
  - Descripción
  - Cliente y emplazamiento
  - Valor afectado
  - Días restantes
  - Botones: Ver Depósito, Resolver, Descartar
- [ ] Probar: Muestra alertas correctamente

#### Modal Resolver Alerta
- [ ] Crear modal de resolución
- [ ] Radio buttons: Facturar / Devolver / Extender plazo
- [ ] Textarea notas (required)
- [ ] Probar: Resuelve alerta correctamente
- [ ] Probar: Actualiza depósito si aplica

---

## 🤖 FASE 7: Módulo IA (2 semanas) ⭐

### Backend - IA Config

#### AI_Config CRUD
- [ ] Crear backend/src/controllers/iaConfigController.js
- [ ] GET /api/ia/config - Listar (sin mostrar apiKey)
- [ ] POST /api/ia/config - Crear
  - [ ] Validar: proveedor válido
  - [ ] Encriptar: apiKey antes de guardar
  - [ ] Probar: Config se crea y key se encripta
- [ ] PUT /api/ia/config/:id - Actualizar
  - [ ] Si se cambia apiKey: encriptar
  - [ ] Probar: Actualiza correctamente
- [ ] DELETE /api/ia/config/:id - Eliminar
  - [ ] Solo admin
  - [ ] Verificar que no sea única config activa
  - [ ] Probar: Elimina correctamente

#### Encryption Utils
- [ ] Crear backend/src/utils/encryption.js
- [ ] Método: encriptarKey(key) usando ENCRYPTION_KEY del .env
- [ ] Método: desencriptarKey(encrypted)
- [ ] Usar: crypto.createCipher o similar
- [ ] Probar: Encripta y desencripta correctamente

### AI Services

#### OpenAI Provider
- [ ] Crear backend/src/services/ai/openaiProvider.js
- [ ] Clase OpenAIProvider
- [ ] Método: consultar(prompt, contexto, config)
  - [ ] Desencriptar apiKey
  - [ ] Crear cliente OpenAI
  - [ ] Llamar a chat.completions.create
  - [ ] Retornar: respuesta, tokensUsados, modelo
- [ ] Probar: Consulta a OpenAI funciona
- [ ] Probar: Structured output funciona

#### Anthropic Provider
- [ ] Crear backend/src/services/ai/anthropicProvider.js
- [ ] Clase AnthropicProvider
- [ ] Método: consultar(prompt, contexto, config)
  - [ ] Desencriptar apiKey
  - [ ] Crear cliente Anthropic
  - [ ] Llamar a messages.create
  - [ ] Retornar: respuesta, tokensUsados, modelo
- [ ] Probar: Consulta a Claude funciona

#### AI Service (Core)
- [ ] Crear backend/src/services/aiService.js
- [ ] Método: consultar(prompt, opciones)
  - [ ] Obtener config activa según prioridad
  - [ ] Verificar límites mensuales
  - [ ] Seleccionar proveedor
  - [ ] Ejecutar consulta
  - [ ] Actualizar: usoMensualActual
  - [ ] Guardar en AI_Consulta
  - [ ] Probar: Consulta funciona end-to-end
- [ ] Método: chat(mensaje, historial)
  - [ ] Preparar contexto del sistema (datos AssetFlow)
  - [ ] Construir prompt conversacional
  - [ ] Llamar a consultar()
  - [ ] Probar: Chat conversacional funciona
- [ ] Método: analizarVencimientos()
  - [ ] Obtener depósitos activos
  - [ ] Obtener histórico de vencimientos
  - [ ] Construir prompt de análisis predictivo
  - [ ] Llamar a consultar() con structured output
  - [ ] Procesar respuesta
  - [ ] Probar: Análisis predictivo funciona
- [ ] Método: optimizarDepositos()
  - [ ] Obtener datos de distribución, valoraciones
  - [ ] Construir prompt de optimización
  - [ ] Llamar a consultar()
  - [ ] Probar: Optimización funciona
- [ ] Método: generarReporteEjecutivo(periodo)
  - [ ] Obtener datos del periodo
  - [ ] Construir prompt de reporte
  - [ ] Llamar a consultar()
  - [ ] Formatear respuesta
  - [ ] Probar: Reporte se genera correctamente
- [ ] Método: generarInsights()
  - [ ] Obtener todos los datos relevantes
  - [ ] Construir prompt de insights
  - [ ] Llamar a consultar() con structured output
  - [ ] Guardar insights en AI_Insight model
  - [ ] Probar: Insights se generan y guardan

### IA Controller
- [ ] Crear backend/src/controllers/iaController.js
- [ ] POST /api/ia/chat - Chat conversacional
- [ ] POST /api/ia/analizar/vencimientos - Análisis predictivo
- [ ] POST /api/ia/optimizar/depositos - Optimización
- [ ] POST /api/ia/generar-reporte/:periodo - Reporte ejecutivo
- [ ] GET /api/ia/insights - Listar insights
- [ ] POST /api/ia/insights/generar - Generar insights bajo demanda
- [ ] POST /api/ia/insights/:id/resolver - Resolver insight
- [ ] GET /api/ia/historial - Historial consultas del usuario
- [ ] Probar: Todas las rutas funcionan

### IA Routes
- [ ] Crear backend/src/routes/iaRoutes.js
- [ ] Definir todas las rutas
- [ ] authenticate en todas
- [ ] authorize('admin') solo en /config
- [ ] Montar en server.js
- [ ] Probar con Postman

### Job Automático de Insights
- [ ] Crear backend/src/jobs/insightsIAJob.js
- [ ] Configurar cron: diario 02:00 AM (0 2 * * *)
- [ ] Llamar a aiService.generarInsights()
- [ ] Enviar resumen por email a admin
- [ ] Log ejecución
- [ ] Probar: Job se ejecuta correctamente
- [ ] Iniciar en server.js

### Frontend - Módulo IA

#### Panel Configuración IA (Admin)
- [ ] Crear frontend/src/pages/admin/IAConfig.tsx
- [ ] Tabla de configuraciones existentes
- [ ] Formulario nueva configuración
- [ ] Input type=password para API key con toggle mostrar/ocultar
- [ ] Validaciones: proveedor, modelo, límites
- [ ] Probar: CRUD funciona end-to-end
- [ ] Probar: API key NO se muestra en tabla

#### Chat con IA
- [ ] Crear frontend/src/pages/IAChat.tsx
- [ ] Interfaz estilo ChatGPT
- [ ] Área de mensajes con scroll
- [ ] Input + botón enviar
- [ ] Indicador "Escribiendo..."
- [ ] Historial de conversación se mantiene en estado
- [ ] Sugerencias iniciales de preguntas
- [ ] Probar: Chat funciona end-to-end
- [ ] Probar: Respuestas son coherentes

#### Panel de Insights
- [ ] Crear frontend/src/pages/IAInsights.tsx
- [ ] Grid de cards de insights
- [ ] Filtros: Tipo, Estado, Prioridad
- [ ] Cada card muestra: icono, título, descripción, acciones sugeridas
- [ ] Botones: Tomar Acción, Ver Detalle, Descartar
- [ ] Probar: Muestra insights correctamente
- [ ] Probar: Acciones funcionan

#### Botones de Análisis
- [ ] En Dashboard: Botón "Analizar Vencimientos"
- [ ] En Reportes: Botón "Optimizar Depósitos"
- [ ] En Reportes: Botón "Generar Reporte IA"
- [ ] Modal de loading mientras IA procesa
- [ ] Modal de resultados con formato claro
- [ ] Probar: Botones funcionan end-to-end

#### Servicio IA
- [ ] Crear frontend/src/services/iaService.ts
- [ ] Métodos para todas las operaciones
- [ ] Probar: Todas las llamadas funcionan

---

## 🛡️ FASE 8: Agentes de Monitoreo (1 semana) ⭐

### Health Check Agent
- [ ] Crear backend/src/agents/healthCheckAgent.js
- [ ] Verificaciones cada 5 minutos:
  - [ ] MongoDB conectado
  - [ ] API /api/health responde
  - [ ] Espacio en disco > 20%
  - [ ] Memoria libre > 20%
  - [ ] Jobs de alertas activos
  - [ ] Jobs de insights activos
- [ ] Si falla algo: Enviar email urgente + Log crítico
- [ ] Intentar auto-recuperación si es posible
- [ ] Probar: Detecta MongoDB caído
- [ ] Probar: Envía email de alerta
- [ ] Iniciar en server.js

### Error Log Agent
- [ ] Crear backend/src/agents/errorLogAgent.js
- [ ] Middleware global de errores en Express
- [ ] Captura:
  - Errores 500
  - Excepciones no capturadas
  - Promises rechazadas
  - Queries que fallan
  - Timeout de requests
  - Errores de IA APIs
- [ ] Almacena en BD (modelo ErrorLog)
- [ ] Envía email si error crítico
- [ ] Probar: Captura errores correctamente
- [ ] Probar: Emails se envían
- [ ] Integrar en server.js

### Performance Agent
- [ ] Crear backend/src/agents/performanceAgent.js
- [ ] Monitorea cada 10 minutos:
  - Tiempo de respuesta promedio
  - Queries lentas (> 1 seg)
  - Uso de CPU
  - Uso de memoria
  - Requests por minuto
  - Tokens IA consumidos por hora
- [ ] Almacena métricas en BD
- [ ] Alerta si degrada (ej: tiempo respuesta > 500ms)
- [ ] Probar: Monitorea correctamente
- [ ] Iniciar en server.js

### Instalar Claude Code en Servidor
- [ ] Conectar SSH al servidor
- [ ] Instalar Claude Code CLI
- [ ] Configurar para monitorear AssetFlow
- [ ] Configurar alertas automáticas
- [ ] Probar: Claude Code detecta problemas

### Dashboard de Monitoreo (Admin)
- [ ] Crear frontend/src/pages/admin/Monitoreo.tsx
- [ ] Mostrar estado de health checks
- [ ] Mostrar últimos errores
- [ ] Mostrar métricas de performance
- [ ] Gráficos de tendencias
- [ ] Probar: Muestra datos en tiempo real

---

## 📊 FASE 9: Productos, Clientes, Reportes (1 semana)

### Productos CRUD
- [ ] Backend: Controller, routes
- [ ] Frontend: Listado, formulario, detalle
- [ ] Probar: CRUD funciona 100%

### Clientes CRUD
- [ ] Backend: Controller, routes
- [ ] Frontend: Listado, formulario, detalle
- [ ] Probar: CRUD funciona 100%

### Reportes Básicos
- [ ] Backend: Controller con queries de agregación
- [ ] Frontend: Página de reportes
- [ ] Reporte por cliente
- [ ] Reporte por emplazamiento
- [ ] Reporte financiero
- [ ] Exportación Excel/PDF
- [ ] Probar: Reportes correctos

---

## 🚀 FASE 10: Testing y Producción (1 semana)

### Testing
- [ ] Tests backend: Modelos, controllers
- [ ] Tests frontend: Componentes críticos
- [ ] Tests E2E: Flujos principales
- [ ] Coverage > 70%

### Deploy Producción
- [ ] Conectar al servidor
- [ ] Clonar repo en /var/www/assetflow
- [ ] Copiar .env.production como .env
- [ ] docker-compose up -d --build
- [ ] Verificar: 3 contenedores corriendo
- [ ] Configurar Nginx reverse proxy
- [ ] Configurar SSL con Let's Encrypt
- [ ] Probar: https://assetflow.oversunenergy.com carga
- [ ] Crear usuario admin
- [ ] Cargar datos de ejemplo
- [ ] Configurar backup automático (cron)
- [ ] Verificar: Jobs ejecutándose
- [ ] Verificar: Agentes monitoreando

### Documentación Final
- [ ] Actualizar CHANGELOG.md con todos los cambios
- [ ] Completar README.md
- [ ] Videos o screenshots de funcionalidades clave
- [ ] Manual de usuario básico

---

## ✅ CRITERIOS DE COMPLETADO

Una tarea se marca como `[x]` solo si:
- ✅ El código funciona al 100%
- ✅ Probado manualmente (happy path + errors)
- ✅ Sin TODOs ni placeholders
- ✅ Sin console.log olvidados
- ✅ Documentado en CHANGELOG.md
- ✅ No rompe nada existente

---

## 📊 PROGRESO GENERAL

**TOTAL ESTIMADO**: 10 semanas (~2.5 meses)

**Fases completadas**: 0/10
**Progreso**: 0%

---

**Última actualización**: 2025-01-20
**Próxima revisión**: Diaria durante desarrollo activo
