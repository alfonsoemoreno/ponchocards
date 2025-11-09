# Ponchocards

Interfaz para generar fichas en PDF y administrar la base de datos de canciones utilizada por Ponchister. Incluye:

- Generador de tarjetas (cara A y cara B con QR) a partir de archivos Excel compatibles con la plantilla oficial.
- Panel de administración protegido por autenticación de Supabase para crear, editar y eliminar canciones.

## Requisitos previos

- Node.js 20+
- Cuenta de Supabase con la tabla `songs` (`id`, `artist`, `title`, `year`, `youtube_url`) y políticas RLS que permitan CRUD únicamente a usuarios autenticados.

## Variables de entorno

Define un archivo `.env.local` (o `.env`) en la raíz del proyecto con tus credenciales públicas:

```bash
VITE_SUPABASE_URL=https://<tu-proyecto>.supabase.co
VITE_SUPABASE_ANON_KEY=<clave_anonima>
```

Sin estas variables el generador seguirá funcionando, pero el panel de administración permanecerá deshabilitado.

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

- El generador de PDF está disponible por defecto.
- El acceso administrativo se activa desde el botón `Acceso admin` (esquina superior derecha). Se solicitará un correo y contraseña vértice de Supabase Auth.
- Una vez autenticado podrás gestionar las canciones y cerrar sesión desde el propio panel.

## Seed de canciones desde Excel

El script `scripts/seed-songs.mjs` permite cargar canciones desde `plantilla.xlsx` hacia Supabase. Asegúrate de definir las variables de entorno y luego ejecuta:

```bash
node scripts/seed-songs.mjs
```

## Construcción y despliegue

```bash
npm run build
npm run preview
```

El directorio `dist/` contendrá los archivos estáticos listos para desplegar en Vercel, Netlify u otro hosting estático.
