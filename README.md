# 時計 · Watch Directory

A self-hosted directory for cataloguing watches by **Brand › Collection › Watch**, built for a Japanese horology collection. Dark *sumi-e* theme, custom fields, photos, and three ways to explore your data: an interactive **tree graph**, a **gallery**, and a **filterable table**.

![hierarchy](https://img.shields.io/badge/hierarchy-Brand%20%E2%80%BA%20Collection%20%E2%80%BA%20Watch-c8a24a)

## Features

- **Three views** — Tree graph (react-d3-tree, zoom/pan/collapse), Gallery cards, and a sortable Table.
- **Customisable displays** — pick exactly which fields appear on gallery cards and which columns show in the table (saved per-browser).
- **Filter everything** — search box plus filters for brands, collections, and every spec (select chips, number min/max ranges, yes/no toggles).
- **Fully custom fields** — add/edit/delete spec fields with types: `text`, `long text`, `number`, `select`, `boolean`, `date`, `url`. Group them and set units (mm, m, £, h…).
- **Photos** — upload multiple images per watch, pick a primary, delete individually.
- **Add / edit / delete** brands, collections and watches from the UI.
- **Persistent** — SQLite database + uploaded images stored on a Railway volume.
- Seeded with example Japanese watches (Seiko, Grand Seiko, Citizen, Casio) — edit or delete freely.

## Tech

React + Vite frontend · Express + better-sqlite3 backend · single service (Express serves the built frontend in production).

## Run locally

```bash
npm install
npm run dev      # Vite on :5173 (proxies API to Express on :3001)
```

Open http://localhost:5173. Data + images are written to `./data/` by default.

To test the production build:

```bash
npm run build    # builds the frontend into /dist
npm run start    # Express serves API + /dist on :3001
```

## Deploy to Railway

1. **Push this folder to a GitHub repo** (or use `railway up` from the Railway CLI).
2. In Railway, **New Project → Deploy from GitHub repo** and select it. Nixpacks auto-detects Node, runs `npm install` (which compiles `better-sqlite3`), then `npm run build`, then `npm run start`.
3. **Add a Volume for persistent storage** (this is what keeps your watches + photos between deploys):
   - In the service, go to **Settings → Volumes → New Volume**.
   - Mount path: **`/data`**
4. **Set an environment variable** so the app writes to that volume:
   - `DATA_DIR` = `/data`
   - (Railway sets `PORT` automatically — no need to configure it.)
5. Deploy. Railway gives you a public URL. Done.

> The SQLite file lives at `$DATA_DIR/watches.db` and uploads at `$DATA_DIR/uploads/`. As long as the volume is mounted at `/data` and `DATA_DIR=/data`, nothing is lost on redeploy.

### Password

The app is gated behind a password screen. Default password: **`Website12`**. To change it, set an environment variable **`APP_PASSWORD`** to your chosen value (Railway → service → Variables). Note this is a lightweight gate suitable for a personal site — the images under `/uploads` remain directly accessible by URL.

### Backups
Your whole database is a single file. To back up, download `watches.db` (and the `uploads/` folder) from the volume via the Railway shell, or copy `./data/` when running locally.

## Project structure

```
server/
  db.js        SQLite schema + seed data
  index.js     Express REST API + serves the built frontend
src/
  App.jsx      state, filtering, view routing
  api.js       fetch wrappers
  components/   TreeView, GalleryView, TableView, Filters,
                WatchForm, EntityForm, FieldManager, WatchDetail, Modal, Icons
  theme.css    dark Japanese theme
railway.json   Railway build/start config
```

## Customising

- **Add a field:** top bar → **Fields** → *New Field*. Choose a type, group, and whether it's available in gallery cards / table columns.
- **Add a brand or collection:** the **＋** buttons in the left sidebar (double-click a chip to edit).
- **Add a watch:** **Add Watch** in the top bar. Assign it to a Brand › Collection, fill specs, upload photos.
