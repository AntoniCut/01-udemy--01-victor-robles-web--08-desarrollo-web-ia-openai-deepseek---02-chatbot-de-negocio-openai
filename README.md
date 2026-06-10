# 02 - ChatBot de Negocio con OpenAI

Chatbot conversacional de negocio ("El PicoEsquina") implementado con **JavaScript**, **Node.js**, **Express** y la **Chat Completions API de OpenAI** (modelo `gpt-3.5-turbo`). El frontend es un chat estatico servido por el propio backend, y el backend expone un endpoint `POST /api/chatbot` que mantiene el contexto de la conversacion por usuario mediante un historial en memoria.

Repositorio: https://github.com/AntoniCut/01-udemy--01-victor-robles-web--08-desarrollo-web-ia-openai-deepseek---02-chatbot-de-negocio-openai

---

## Tabla de contenidos

1. [Stack tecnologico](#stack-tecnologico)
2. [Estructura del proyecto](#estructura-del-proyecto)
3. [Variables de entorno](#variables-de-entorno)
4. [Despliegue en local](#despliegue-en-local)
5. [Despliegue en produccion (VPS + Nginx)](#despliegue-en-produccion-vps--nginx)
6. [Endpoint API](#endpoint-api)
7. [Build de produccion con Gulp](#build-de-produccion-con-gulp)
8. [Licencia](#licencia)

---

## Stack tecnologico

- **Backend:** Node.js (ES Modules), Express 5, OpenAI Node SDK 6 (Chat Completions API).
- **Frontend:** HTML + CSS + JS estaticos servidos desde `public/`.
- **Build:** Gulp 5 (terser, clean-css, htmlmin) para generar `dist/`.
- **Dev server:** Nodemon.
- **Despliegue:** Nginx como reverse proxy + PM2 como process manager.

Dependencias principales (`package.json`):

| Paquete     | Version  | Uso                                  |
|-------------|----------|--------------------------------------|
| express     | ^5.2.1   | Servidor HTTP y middleware           |
| openai      | ^6.16.0  | SDK de OpenAI (Chat Completions API) |
| dotenv      | ^17.2.3  | Carga de variables de entorno         |
| axios       | 1.8.1    | Cliente HTTP (utilidades internas)   |

---

## Estructura del proyecto

```
02-chatbot-de-negocio-openai/
├── app.js                  # Servidor Express + endpoint /api/chatbot
├── gulpfile.js             # Tareas de build (minificacion, copia a dist/)
├── package.json
├── pnpm-lock.yaml
├── .env                    # Variables de entorno (NO subir al repo)
├── .gitignore
├── jsconfig.json
├── public/                 # Frontend estatico
│   ├── index.html
│   └── assets/
│       ├── css/
│       ├── img/
│       └── js/
├── types/                  # Tipos JSDoc
└── productos-*.json        # Catalogos de productos del chatbot
```

---

## Variables de entorno

Crea un archivo `.env` en la raiz del proyecto:

```env
# Puerto del servidor (en produccion, > 1024 para no necesitar root)
PORT=1112

# API key de OpenAI (https://platform.openai.com/api-keys)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx
```

Notas:

- `OPENAI_API_KEY` es **obligatoria**. Sin ella, el endpoint devolvera `500`.
- El archivo `.env` esta incluido en `.gitignore`. **No lo subas al repositorio**.

---

## Despliegue en local

### Requisitos

- Node.js >= 18 (recomendado 20 LTS o superior).
- npm (incluido con Node) o pnpm.

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/AntoniCut/01-udemy--01-victor-robles-web--08-desarrollo-web-ia-openai-deepseek---02-chatbot-de-negocio-openai.git
cd 02-chatbot-de-negocio-openai

# 2. Instalar dependencias
npm install
# o, si prefieres pnpm:
pnpm install

# 3. Crear el archivo .env
nano .env
#   PORT=1112
#   OPENAI_API_KEY=sk-proj-...

# 4. Arrancar en modo desarrollo (con nodemon)
npm run start
# o en modo produccion simple:
npm run serve
```

La aplicacion estara disponible en:

```
http://localhost:1112/victor-robles-web/08-desarrollo-web-ia-openai-deepseek-javascript-nodejs/02-chatbot-de-negocio-openai/
```

> El puerto por defecto del codigo es `3000`, pero este proyecto usa `1112` para evitar conflicto con otros proyectos del portfolio. Puedes cambiar `PORT` en `.env`.

---

## Despliegue en produccion (VPS + Nginx)

Arquitectura: **Nginx** (reverse proxy + SSL con Let's Encrypt) -> **Node.js** gestionado con **PM2** en el mismo VPS.

### 1. Subir el codigo al VPS

Con FileZilla, sube todo el contenido del proyecto (excepto `node_modules`, `.env` y `dist/`) a:

```
/var/www/udemy.antonydev.tech/victor-robles-web/08-desarrollo-web-ia-openai-deepseek-javascript-nodejs/02-chatbot-de-negocio-openai
```

### 2. Instalar dependencias en el VPS (sin devDependencies)

Conecta por SSH y ejecuta:

```bash
cd /var/www/udemy.antonydev.tech/victor-robles-web/08-desarrollo-web-ia-openai-deepseek-javascript-nodejs/02-chatbot-de-negocio-openai

# Crear el .env de produccion (con tus claves reales)
nano .env
#   PORT=1112
#   OPENAI_API_KEY=sk-proj-...

# Instalar solo dependencias de produccion
npm install --omit=dev
```

> Importante: en Linux, los puertos < 1024 requieren root. Usa `PORT=1112` o cualquier puerto >= 1024 para no necesitar privilegios.

### 3. Arrancar con PM2 (persiste al cerrar SSH)

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Arrancar la app
pm2 start app.js --name chatbot-openai

# Configurar arranque automatico tras reinicio del servidor
pm2 startup
pm2 save
```

Comandos utiles de PM2:

```bash
pm2 status                       # Ver estado
pm2 logs chatbot-openai          # Ver logs en tiempo real
pm2 restart chatbot-openai       # Reiniciar
pm2 stop chatbot-openai          # Detener
pm2 delete chatbot-openai        # Eliminar del registro
```

### 4. Configurar Nginx como reverse proxy

Edita el bloque `server` de tu vhost (`/etc/nginx/sites-available/udemy.antonydev.tech` o donde lo tengas) y anade una `location`:

```nginx
location ^~ /victor-robles-web/08-desarrollo-web-ia-openai-deepseek-javascript-nodejs/02-chatbot-de-negocio-openai {
    proxy_pass http://localhost:1112;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

> Usa `^~` para que Nginx no intente servir archivos estaticos directamente desde `root` antes de hacer proxy.

Recarga Nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 5. Verificar

```
https://udemy.antonydev.tech/victor-robles-web/08-desarrollo-web-ia-openai-deepseek-javascript-nodejs/02-chatbot-de-negocio-openai/
```

---

## Endpoint API

### `POST /api/chatbot`

Recibe un mensaje del usuario, lo envia al modelo `gpt-3.5-turbo` de OpenAI con un contexto de negocio (supermercado "El PicoEsquina") y devuelve la respuesta manteniendo el historial de conversacion por `userId` en memoria.

**Request body:**

```json
{
  "message": "¿Que productos teneis en oferta?",
  "userId": "usuario-123"
}
```

**Respuesta 200 (exito):**

```json
{
  "message": "Actualmente tenemos en oferta..."
}
```

**Respuesta 400 (mensaje vacio):**

```json
{
  "error": "Has mandado un mensaje vacio. La pregunta del usuario es requerida!!"
}
```

**Respuesta 500 (error interno / fallo de OpenAI):**

```json
{
  "error": "Error al generar respuesta del chatbot."
}
```

Tambien accesible en la ruta con prefijo:

```
POST /victor-robles-web/08-desarrollo-web-ia-openai-deepseek-javascript-nodejs/02-chatbot-de-negocio-openai/api/chatbot
```

---

## Build de produccion con Gulp

El proyecto incluye un `gulpfile.js` que genera una version minificada del frontend y copia el backend a `dist/`:

```bash
npm run build
```

Salida: carpeta `dist/` con HTML/CSS/JS minificados, `app.js` y un `package.json` minimo.

Para ejecutar el build:

```bash
npm run start:prod
```

---

## Licencia

ISC © AntonyDev
