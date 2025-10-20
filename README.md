# AssetFlow 3.0

> **Sistema de Control de Inventario Depositado en Emplazamientos de Clientes con IA**

![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)
![Status](https://img.shields.io/badge/status-en_desarrollo-yellow.svg)
![License](https://img.shields.io/badge/license-Proprietary-red.svg)

---

## 📋 Descripción

AssetFlow 3.0 es un sistema avanzado de control y valoración de inventario depositado en emplazamientos de clientes, con análisis inteligente mediante IA y visualización geográfica en tiempo real.

### ❌ Lo que NO es
- No es un ERP completo
- No gestiona facturación (se hace en ERP externo)
- No gestiona albaranes complejos (se hace en ERP externo)

### ✅ Lo que SÍ es
- Control de QUÉ mercancía tenemos depositada
- Visualización DÓNDE está en mapa geográfico
- Valoración en tiempo real CUÁNTO vale
- Control de fechas límite CUÁNDO vence
- Análisis con IA para optimizar y predecir
- Alertas automáticas para recuperación

---

## 🎯 Características Principales

### Core del Sistema
- ✅ **Dashboard con Mapa Geográfico** - Visualización de todos los emplazamientos con pins coloreados
- ✅ **Gestión de Depósitos** - Control completo con valoración automática
- ✅ **Sistema de Alertas** - Notificaciones automáticas por vencimientos
- ✅ **Fechas Límite** - Control obligatorio para facturar o devolver

### Inteligencia Artificial
- 🤖 **Chat Conversacional** - Pregunta sobre tus datos en lenguaje natural
- 📊 **Análisis Predictivo** - Predice riesgos de vencimiento
- 🎯 **Optimización** - Sugerencias para maximizar rentabilidad
- 📝 **Reportes Ejecutivos** - Generación automática con IA
- 💡 **Insights Automáticos** - Alertas y oportunidades detectadas por IA

### Monitoreo y Seguridad
- 🛡️ **Agentes de Monitoreo 24/7** - Health checks automáticos
- 📧 **Alertas por Email** - Notificaciones críticas automáticas
- 🔒 **Autenticación JWT** - Sistema seguro con roles
- 📊 **Logs Completos** - Auditoría de todas las acciones

---

## 🏗️ Arquitectura

### Stack Tecnológico

**Frontend:**
- React 18.2 + TypeScript
- Vite 5.0
- Bootstrap 5.3.2 + Plantilla Facit
- Leaflet (mapas interactivos)
- ApexCharts + Recharts

**Backend:**
- Node.js + Express.js 4.18.2
- MongoDB 6.0 (Mongoose ODM)
- JWT Autenticación
- OpenAI GPT-4 + Anthropic Claude

**Infraestructura:**
- Docker + Docker Compose
- Nginx (reverse proxy)
- SSL (Let's Encrypt)
- Ubuntu 24.04

---

## 🚀 Inicio Rápido

### Prerrequisitos

```bash
- Node.js 18+
- Docker y Docker Compose
- Git
```

### Instalación Local

```bash
# 1. Clonar repositorio
git clone https://github.com/werdo/assetflow-3.0.git
cd assetflow-3.0

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores

# 3. Instalar dependencias backend
cd backend
npm install

# 4. Instalar dependencias frontend
cd ../frontend
npm install

# 5. Iniciar con Docker
cd ..
docker-compose up -d --build

# 6. Acceder
Frontend: http://localhost:3000
Backend: http://localhost:5000
```

### Primer Login

```
Email: ppelaez@oversunenergy.com
Password: bb474edf
```

---

## 📦 Módulos del Sistema

### 1. Dashboard con Mapa 🗺️
Vista principal con mapa interactivo mostrando todos los emplazamientos, KPIs en tiempo real y alertas críticas.

### 2. Emplazamientos 📍
Gestión completa de ubicaciones de clientes con geolocalización y visualización en mapa.

### 3. Depósitos 📦
Control de mercancía depositada con valoración automática, fechas límite y estados.

### 4. Alertas 🚨
Sistema automático de notificaciones por vencimientos con envío de emails.

### 5. Módulo IA 🤖
- Chat conversacional
- Análisis predictivo
- Optimización de depósitos
- Reportes ejecutivos
- Insights automáticos

### 6. Productos y Clientes 🏢
Gestión básica de catálogo de productos y clientes.

### 7. Reportes 📊
Reportes financieros, por cliente, por emplazamiento con exportación Excel/PDF.

### 8. Monitoreo 🛡️
Dashboard de salud del sistema con agentes activos 24/7.

---

## 🔐 Seguridad

- Autenticación JWT (tokens 7 días)
- Passwords encriptados (bcryptjs)
- Roles: Admin, Manager, User
- API Keys IA encriptadas en BD
- CORS configurado
- Rate limiting
- SSL/TLS en producción
- Logs de auditoría completos

---

## 📚 Documentación

### Documentos Principales
- **[PROJECT.md](./PROJECT.md)** - Especificaciones completas del sistema
- **[TODO.md](./TODO.md)** - Plan de desarrollo y tareas
- **[CHANGELOG.md](./CHANGELOG.md)** - Historial de cambios
- **[QUICKSTART.md](./QUICKSTART.md)** - Guía de inicio rápido
- **[API.md](./docs/API.md)** - Documentación de API
- **[DATABASE.md](./docs/DATABASE.md)** - Schemas de base de datos

### Documentación Técnica
- **DEVELOPMENT.md** - Guía para desarrolladores
- **DEPLOYMENT.md** - Guía de despliegue
- **SECURITY.md** - Checklist de seguridad

---

## 🛠️ Desarrollo

### Estructura del Proyecto

```
assetflow-3.0/
├── backend/                 # Backend Node.js + Express
│   ├── src/
│   │   ├── models/         # Mongoose models (10)
│   │   ├── controllers/    # API controllers
│   │   ├── routes/         # Express routes
│   │   ├── services/       # Business logic + IA
│   │   ├── jobs/           # Cron jobs (alertas, insights)
│   │   ├── agents/         # Monitoring agents
│   │   └── server.js       # Entry point
│   └── Dockerfile
├── frontend/               # Frontend React + TypeScript
│   ├── src/
│   │   ├── pages/         # Páginas principales
│   │   ├── components/    # Componentes reutilizables
│   │   ├── services/      # API services
│   │   └── config/        # Configuración
│   └── Dockerfile
├── .credentials/          # Credenciales (NO commitear)
├── .logs/                 # Logs del sistema
├── docs/                  # Documentación adicional
├── docker-compose.yml
├── .env.example
└── README.md
```

### Scripts Disponibles

**Backend:**
```bash
npm run dev      # Desarrollo con nodemon
npm start        # Producción
npm test         # Tests
```

**Frontend:**
```bash
npm run dev      # Desarrollo
npm run build    # Build para producción
npm test         # Tests
```

### Flujo de Trabajo

```bash
# 1. Crear feature branch
git checkout -b feature/nombre-feature

# 2. Desarrollar (código 100% funcional)
# 3. Probar manualmente
# 4. Actualizar CHANGELOG.md
# 5. Actualizar TODO.md

# 6. Commit
git add .
git commit -m "feat: descripción del cambio"

# 7. Push
git push origin feature/nombre-feature

# 8. Crear Pull Request en GitHub
```

---

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test
npm run test:coverage

# Frontend tests
cd frontend
npm test

# E2E (cuando esté implementado)
npm run test:e2e
```

---

## 🚀 Deployment

### Producción

**Servidor:** 167.235.58.24
**Dominio:** https://assetflow.oversunenergy.com
**OS:** Ubuntu 24.04

### Deploy Manual

```bash
# 1. Conectar al servidor
ssh Admin@167.235.58.24

# 2. Ir al directorio
cd /var/www/assetflow

# 3. Pull cambios
git pull origin main

# 4. Rebuild
docker-compose down
docker-compose up -d --build

# 5. Verificar
docker-compose ps
docker logs assetflow-backend -f
```

### Health Check

```bash
# Backend
curl https://assetflow.oversunenergy.com/api/health

# Logs
docker logs assetflow-backend -f
docker logs assetflow-frontend -f
docker logs assetflow-mongodb -f
```

---

## 🔄 Backups

- **Frecuencia:** Diario a las 02:00 AM
- **Ubicación:** `/backup/assetflow/`
- **Retención:** 30 días
- **Incluye:** MongoDB dump + archivos críticos

```bash
# Backup manual
bash scripts/backup.sh

# Restaurar
bash scripts/restore.sh YYYY-MM-DD
```

---

## 📊 Monitoreo

### Agentes Activos 24/7

- **Health Check Agent** - Cada 5 minutos
- **Error Log Agent** - Tiempo real
- **Performance Agent** - Cada 10 minutos

### Jobs Automáticos

- **Alertas Job** - Cada hora
- **Insights IA Job** - Diario 02:00 AM
- **Estadísticas Job** - Cada 5 minutos

---

## 👥 Equipo

- **Product Owner:** ppelaez@oversunenergy.com
- **Tech Lead:** ppelaez@oversunenergy.com
- **Organización:** Oversun Energy

---

## 📝 Licencia

Proprietary - © 2025 Oversun Energy. Todos los derechos reservados.

---

## 🆘 Soporte

**Email:** ppelaez@oversunenergy.com

**Documentación:** Ver PROJECT.md para especificaciones completas

---

## 🗺️ Roadmap

### Fase Actual
✅ Documentación completa (Semana 1)

### Próximas Fases
- 🔄 Setup y Backend Core (Semana 2)
- 📋 Emplazamientos (Semana 3)
- 📦 Depósitos (Semanas 4-5)
- 🗺️ Dashboard con Mapa (Semana 6)
- 🚨 Sistema de Alertas (Semana 7)
- 🤖 Módulo IA (Semanas 8-9)
- 🛡️ Agentes Monitoreo (Semana 10)

**Release v3.0.0:** ~2.5 meses desde inicio

---

## 🙏 Agradecimientos

- Plantilla Facit para diseño base
- OpenAI y Anthropic por APIs de IA
- Comunidad Open Source

---

**AssetFlow 3.0** - Control Inteligente de Inventario Depositado 📦🗺️🤖
