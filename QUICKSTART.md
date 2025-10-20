# 🚀 QUICKSTART - AssetFlow 3.0

Guía rápida para poner en marcha AssetFlow en **menos de 20 minutos**.

---

## ⚡ Requisitos

- Git
- Node.js 18+
- Docker + Docker Compose
- Acceso SSH: `167.235.58.24`
- Clave SSH: `id_rsa` (proporcionada)

---

## 📋 Paso 1: Crear Repositorio GitHub

```bash
# Ir a https://github.com/werdo
# Crear nuevo repositorio: assetflow-3.0
# Private
# Sin README (lo agregaremos después)
```

---

## 📥 Paso 2: Clonar y Setup

```bash
# Clonar
git clone https://github.com/werdo/assetflow-3.0.git
cd assetflow-3.0

# Crear estructura
mkdir -p backend frontend .credentials/ssh .logs docs scripts

# Copiar clave SSH
cp /path/to/id_rsa .credentials/ssh/id_rsa
chmod 600 .credentials/ssh/id_rsa

# Copiar todos los archivos .md generados
# PROJECT.md, TODO.md, CHANGELOG.md, README.md, etc.
```

---

## 🔐 Paso 3: Configurar .env

```bash
# Copiar template
cp .env.production .env

# Verificar valores críticos en .env:
# - MONGODB_URI
# - JWT_SECRET
# - VITE_API_URL
# - SMTP_*
```

---

## 🏗️ Paso 4: Backend Setup

```bash
cd backend

# Inicializar
npm init -y

# Instalar dependencias
npm install express@4.18.2 mongoose@8.0.3 jsonwebtoken@9.0.2 bcryptjs@2.4.3 cors@2.8.5 dotenv@16.3.1 express-validator@7.0.1 morgan@1.10.0 node-cron@3.0.2 nodemailer@6.9.7 openai@4.0.0 @anthropic-ai/sdk@0.9.0

# Crear estructura
mkdir -p src/{models,controllers,routes,middleware,services,jobs,agents,utils,config}

# Crear Dockerfile
cat > Dockerfile << 'EOF'
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["node", "src/server.js"]
EOF
```

---

## 🎨 Paso 5: Frontend Setup

```bash
cd ../frontend

# Crear proyecto Vite
npm create vite@latest . -- --template react-ts

# Instalar dependencias
npm install react-router-dom@6.20.0 axios@1.6.2 bootstrap@5.3.2 react-bootstrap@2.9.1 leaflet@1.9.4 react-leaflet@4.2.1 apexcharts@3.44.0 recharts@2.10.3

# Copiar Facit template
cp -r ../facit-vite/* ./

# Crear Dockerfile
cat > Dockerfile << 'EOF'
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
EOF
```

---

## 🐳 Paso 6: Docker

```bash
cd ..

# Crear docker-compose.yml (ya generado)
# Verificar que existe y tiene contenido correcto

# Build y ejecutar
docker-compose up -d --build

# Verificar
docker-compose ps
# Debe mostrar 3 contenedores: mongodb, backend, frontend
```

---

## 🌐 Paso 7: Deploy en Servidor

```bash
# Conectar
ssh -i .credentials/ssh/id_rsa Admin@167.235.58.24

# Ir al directorio
cd /var/www
sudo git clone https://github.com/werdo/assetflow-3.0.git assetflow
cd assetflow

# Copiar .env desde local (en otra terminal)
scp -i .credentials/ssh/id_rsa .env.production Admin@167.235.58.24:/var/www/assetflow/.env

# Volver al servidor
# Instalar Docker si no está
sudo apt update
sudo apt install -y docker.io docker-compose

# Build y ejecutar
sudo docker-compose up -d --build

# Ver logs
sudo docker logs assetflow-backend -f
```

---

## 🔒 Paso 8: Nginx y SSL

```bash
# En el servidor
sudo apt install -y nginx certbot python3-certbot-nginx

# Configurar Nginx
sudo nano /etc/nginx/sites-available/assetflow

# Pegar:
server {
    listen 80;
    server_name assetflow.oversunenergy.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}

# Activar
sudo ln -s /etc/nginx/sites-available/assetflow /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# SSL
sudo certbot --nginx -d assetflow.oversunenergy.com
```

---

## 👤 Paso 9: Usuario Admin

```bash
# Opción manual: Conectar a MongoDB
docker exec -it assetflow-mongodb mongosh

use assetflow

# Hashear password (desde Node.js)
# bcrypt.hash('bb474edf', 10) = [HASH]

db.users.insertOne({
  name: "ppelaez",
  email: "ppelaez@oversunenergy.com",
  password: "[HASH_GENERADO]",
  role: "admin",
  active: true,
  createdAt: new Date(),
  updatedAt: new Date()
})
```

---

## ✅ Paso 10: Verificación

### Backend
```bash
curl https://assetflow.oversunenergy.com/api/health
# Debe retornar: {"success":true,"message":"..."}
```

### Frontend
```
Abrir: https://assetflow.oversunenergy.com
Debe cargar la aplicación
```

### Login
```
Email: ppelaez@oversunenergy.com
Password: bb474edf
Debe entrar al dashboard
```

---

## 🔧 Comandos Útiles

```bash
# Ver logs
docker logs assetflow-backend -f
docker logs assetflow-frontend -f
docker logs assetflow-mongodb -f

# Restart
docker-compose restart

# Rebuild
docker-compose down
docker-compose up -d --build

# Estado
docker-compose ps

# Entrar a contenedor
docker exec -it assetflow-backend sh
```

---

## 🆘 Troubleshooting

### Backend no conecta a MongoDB
```bash
docker logs assetflow-mongodb
# Verificar que está corriendo y acepta conexiones
```

### Frontend no carga
```bash
docker logs assetflow-frontend
# Verificar que build fue exitoso
```

### Error 502 Bad Gateway
```bash
sudo nginx -t
sudo systemctl status nginx
# Verificar que proxy_pass apunta correctamente
```

---

## 📚 Siguientes Pasos

1. Leer **PROJECT.md** completo
2. Revisar **TODO.md** para plan de desarrollo
3. Comenzar FASE 1: Setup y Backend Core
4. Seguir estrictamente las reglas: **SOLO CÓDIGO 100% FUNCIONAL**

---

**¡Listo! AssetFlow 3.0 está corriendo. 🎉**

Tiempo total: ~20 minutos
