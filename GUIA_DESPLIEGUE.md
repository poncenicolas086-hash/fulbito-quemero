# Guía Paso a Paso: Supabase + GitHub + Vercel 🎈⚽

## 1. Configurar la Base de Datos en Supabase

1. Entrá a [supabase.com](https://supabase.com), iniciá sesión y hacé clic en **New Project**.
2. Elegí un nombre (ej. `fulbito-quemero`), una contraseña segura para la base de datos y la región más cercana (ej. *South America (São Paulo)*).
3. Esperá 1–2 minutos a que termine de crearse el proyecto.
4. En el menú lateral izquierdo, entrá a **SQL Editor** → **New query**.
5. Abrí el archivo `schema.sql` de este proyecto, copiá **todo** su contenido, pegalo en el editor SQL y hacé clic en **Run** (abajo a la derecha).
   - *Nota:* Si ya habías corrido la versión anterior de `schema.sql`, ejecutá también estas dos políticas para que deje guardar la foto del MVP anual en `premios_anuales`:
     ```sql
     create policy "crear premios" on premios_anuales for insert with check (true);
     create policy "editar premios" on premios_anuales for update using (true) with check (true);
     ```
6. **Obtener las credenciales:**
   - En el menú lateral izquierdo, andá a **Project Settings** (ícono de engranaje ⚙️) → **API**.
   - Copiá dos valores que vas a necesitar en Vercel (y en tu `.env` local):
     - **Project URL** → va en `VITE_SUPABASE_URL`
     - **Project API keys (`anon` `public`)** → va en `VITE_SUPABASE_ANON_KEY`

---

## 2. Probar en tu PC (Opcional)

1. Creá un archivo llamado `.env` en la raíz del proyecto (`fulbito-quemero/.env`) con tus datos de Supabase:
   ```env
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
   ```
2. Abrí una terminal en la carpeta del proyecto y ejecutá:
   ```bash
   npm install
   npm run dev
   ```

---

## 3. Subir el Proyecto a GitHub

1. Entrá a [github.com/new](https://github.com/new) y creá un repositorio nuevo (por ejemplo `fulbito-quemero`), **sin** marcar "Add a README".
2. Abrí una terminal en la carpeta `C:\Users\Administrator\.gemini\antigravity\scratch\fulbito-quemero` y corré:
   ```bash
   git init
   git add .
   git commit -m "Fulbito Rojiblanco completo"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/fulbito-quemero.git
   git push -u origin main
   ```

---

## 4. Publicar Gratis en Vercel

1. Entrá a [vercel.com](https://vercel.com) e iniciá sesión con tu cuenta de **GitHub**.
2. Hacé clic en **Add New…** → **Project** e importá el repositorio `fulbito-quemero`.
3. En la pantalla de configuración del proyecto:
   - **Framework Preset:** Vercel detecta **Vite** automáticamente.
   - Desplegá la sección **Environment Variables** y agregá las dos variables:
     - Nombre: `VITE_SUPABASE_URL` → Valor: *(tu Project URL de Supabase)*
     - Nombre: `VITE_SUPABASE_ANON_KEY` → Valor: *(tu clave `anon public` de Supabase)*
4. Hacé clic en **Deploy**.
5. En ~1 minuto te va a dar tu link público (ej. `https://fulbito-quemero.vercel.app`).
   - Gracias al archivo `vercel.json` incluido, las rutas como `/partido/:id` y `/stats` van a funcionar directo al compartirlas por WhatsApp sin dar error 404.
