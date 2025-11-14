# Ponchocards

> Suite profesional para generar tarjetas musicales con QR, administrar el catálogo de canciones y sincronizar Supabase en segundos.

## Tabla rápida

- [Visión general](#visión-general)
- [Características principales](#características-principales)
- [Pila tecnológica](#pila-tecnológica)
- [Arquitectura funcional](#arquitectura-funcional)
- [Primeros pasos](#primeros-pasos)
- [Variables de entorno](#variables-de-entorno)
- [Flujo de sincronización (Excel → Supabase)](#flujo-de-sincronización-excel--supabase)
- [Comandos habituales](#comandos-habituales)
- [Checklist de QA](#checklist-de-qa)
- [Despliegue](#despliegue)
- [Resolución de problemas](#resolución-de-problemas)

## Visión general

Ponchocards acompaña a Ponchister proporcionando herramientas de producción y administración. Permite generar tarjetas PDF elegantes con códigos QR a partir de un Excel maestro y ofrece un panel administrativo con autenticación Supabase para crear, editar o eliminar canciones. El resultado es una experiencia premium, consistente y fácil de mantener.

## Características principales

- **Generador de tarjetas PDF**: procesa el archivo `plantilla.xlsx`, renderiza cara A/B con QR e información clave, listo para imprimir.
- **Panel administrativo responsivo**: CRUD completo con filtros, ordenamiento, paginación y estadísticas.
- **Autenticación Supabase Auth**: solo usuarios autorizados pueden modificar el catálogo.
- **Sincronización ágil**: script `seed-songs.mjs` para importar datos desde Excel usando la Service Role Key.
- **Tema visual cohesivo**: gradientes y componentes compartidos con Ponchister para una identidad alineada.

## Pila tecnológica

- **Framework**: React 19 + Vite 7.
- **Lenguaje**: TypeScript 5.
- **UI**: MUI 7 con tema personalizado y variantes responsivas.
- **PDF y códigos QR**: `jspdf`, `jspdf-autotable`, `qrcode` y `qrcode.react`.
- **Backend**: Supabase JS v2 para CRUD y autenticación.

## Arquitectura funcional

```text
ponchocards/
├─ public/                # Assets estáticos y plantilla Excel oficial
├─ src/
│  ├─ App.tsx             # Shell principal, routing básico
│  ├─ PDFCardGenerator.tsx# Generador interactivo de tarjetas
│  ├─ admin/              # Panel protegido
│  │  ├─ AdminDashboard.tsx
│  │  ├─ AdminAccessDialog.tsx
│  │  ├─ SongFormDialog.tsx
│  │  └─ SongStatisticsView.tsx
│  ├─ services/songService.ts
│  ├─ lib/supabaseClient.ts
│  ├─ lib/useSupabaseAuth.ts
│  ├─ theme.ts            # Tokens de diseño
│  └─ assets/
├─ scripts/
│  └─ seed-songs.mjs      # Sincronización Excel → Supabase
├─ package.json
└─ vite.config.ts
```

## Primeros pasos

### Requisitos

- Node.js 18+ (recomendado 20).
- Proyecto Supabase con tabla `songs` y políticas RLS configuradas.
- Archivo Excel actualizado con el catálogo de canciones.

### Instalación

```bash
pnpm install
```

## Variables de entorno

Define un `.env.local` con credenciales públicas:

```ini
VITE_SUPABASE_URL=https://<tu-proyecto>.supabase.co
VITE_SUPABASE_ANON_KEY=<tu-clave-anon>
```

Para scripts privilegiados añade `.env` o variables de shell:

```ini
SUPABASE_URL=https://<tu-proyecto>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<tu-service-role-key>
```

> Nunca expongas la Service Role Key en el frontend; úsala solo en `seed-songs.mjs` o automatizaciones seguras.

## Flujo de sincronización (Excel → Supabase)

1. Actualiza `public/plantilla.xlsx` con nuevas canciones.
2. Guarda el archivo (el script maneja filas vacías y espacios extras).
3. Ejecuta `pnpm seed:songs`.
4. El script normaliza entradas, valida IDs de YouTube y hace `upserts` basados en `youtube_url`.
5. Repite cuando agregues o edites canciones; los IDs permanecen estables.

## Comandos habituales

- `pnpm dev` – servidor de desarrollo en `http://localhost:5173`.
- `pnpm build` – build optimizado listo para producción.
- `pnpm preview` – sirve `dist/` para validaciones previas al deploy.
- `pnpm lint` – revisa el código con ESLint.
- `pnpm seed:songs` – sincroniza Excel ↔ Supabase (requiere variables privadas).

## Checklist de QA

- Asegúrate de que `pnpm lint` y `pnpm build` ejecuten sin errores.
- Valida que el PDF genere correctamente ambos lados y que los QR funcionen.
- Prueba el panel admin en pantallas chicas y grandes; verifica tooltips y estados hover.
- Confirma que la autenticación Supabase funcione y que el cierre de sesión limpie el estado.
- Revisa que las estadísticas se actualicen tras crear/editar/eliminar canciones.

## Despliegue

- Ejecuta `vercel --prod` (u otro proveedor) desde la carpeta `ponchocards`.
- Configura `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en el proveedor.
- Si quieres automatizar el seed, crea un job separado con `pnpm seed:songs` usando secretos seguros.

## Resolución de problemas

- **Panel deshabilitado**: revisa que el frontend tenga las variables `VITE_SUPABASE_*` definidas.
- **Seed falla**: confirma que `SUPABASE_SERVICE_ROLE_KEY` tenga permisos de escritura y que la URL sea correcta.
- **QR inválido en PDF**: comprueba que la columna `youtube_url` contenga enlaces válidos (11 caracteres). El script rechaza filas no compatibles.
- **Errores de CORS**: añade los dominios de despliegue en Supabase (Authentication → URL Configuration).
- **Estilos inconsistentes**: limpia caché o ejecuta `pnpm build && pnpm preview` para validar la versión generada.
