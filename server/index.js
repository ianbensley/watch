import express from 'express'
import compression from 'compression'
import multer from 'multer'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { nanoid } from 'nanoid'
import db, { UPLOAD_DIR } from './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
app.use(compression())
app.use(express.json({ limit: '2mb' }))

// ---------- Image uploads ----------
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = (path.extname(file.originalname) || '.jpg').toLowerCase()
    cb(null, `${Date.now()}-${nanoid(8)}${ext}`)
  },
})
const upload = multer({ storage, limits: { fileSize: 12 * 1024 * 1024 } })
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }))

// ---------- Helpers ----------
const parse = (row) => row && { ...row, values: JSON.parse(row.values_json || '{}') }
const imagesFor = db.prepare('SELECT id, filename, is_primary, sort FROM images WHERE watch_id = ? ORDER BY is_primary DESC, sort ASC')

// Remove image files from disk for a set of watches (used before cascade deletes).
function unlinkImagesForWatches(watchIds) {
  if (!watchIds.length) return
  const rows = db.prepare(`SELECT filename FROM images WHERE watch_id IN (${watchIds.map(() => '?').join(',')})`).all(...watchIds)
  rows.forEach((im) => { try { fs.unlinkSync(path.join(UPLOAD_DIR, im.filename)) } catch {} })
}

function watchWithExtras(row) {
  const w = parse(row)
  w.images = imagesFor.all(w.id).map((im) => ({ ...im, url: `/uploads/${im.filename}` }))
  delete w.values_json
  return w
}

// ---------- Bulk data (drives the whole UI) ----------
app.get('/api/data', (_req, res) => {
  const brands = db.prepare('SELECT * FROM brands ORDER BY sort, name').all()
  const collections = db.prepare('SELECT * FROM collections ORDER BY sort, name').all()
  const watches = db.prepare('SELECT * FROM watches ORDER BY sort, name').all().map(watchWithExtras)
  const fields = db.prepare('SELECT * FROM field_defs ORDER BY sort, id').all()
    .map((f) => ({ ...f, options: JSON.parse(f.options_json || '[]') }))
  res.json({ brands, collections, watches, fields })
})

// ---------- Brands ----------
app.post('/api/brands', (req, res) => {
  const { name, country, founded, website, notes } = req.body
  if (!name) return res.status(400).json({ error: 'name required' })
  const info = db.prepare('INSERT INTO brands (name,country,founded,website,notes) VALUES (?,?,?,?,?)')
    .run(name, country || null, founded || null, website || null, notes || null)
  res.json(db.prepare('SELECT * FROM brands WHERE id=?').get(info.lastInsertRowid))
})
app.put('/api/brands/:id', (req, res) => {
  const { name, country, founded, website, notes } = req.body
  db.prepare('UPDATE brands SET name=?,country=?,founded=?,website=?,notes=? WHERE id=?')
    .run(name, country || null, founded || null, website || null, notes || null, req.params.id)
  res.json(db.prepare('SELECT * FROM brands WHERE id=?').get(req.params.id))
})
app.delete('/api/brands/:id', (req, res) => {
  const wids = db.prepare('SELECT w.id FROM watches w JOIN collections c ON w.collection_id=c.id WHERE c.brand_id=?')
    .all(req.params.id).map((r) => r.id)
  unlinkImagesForWatches(wids)
  db.prepare('DELETE FROM brands WHERE id=?').run(req.params.id) // cascades to collections, watches, images
  res.json({ ok: true })
})

// ---------- Collections ----------
app.post('/api/collections', (req, res) => {
  const { brand_id, name, description, notes } = req.body
  if (!brand_id || !name) return res.status(400).json({ error: 'brand_id and name required' })
  const info = db.prepare('INSERT INTO collections (brand_id,name,description,notes) VALUES (?,?,?,?)')
    .run(brand_id, name, description || null, notes || null)
  res.json(db.prepare('SELECT * FROM collections WHERE id=?').get(info.lastInsertRowid))
})
app.put('/api/collections/:id', (req, res) => {
  const { brand_id, name, description, notes } = req.body
  db.prepare('UPDATE collections SET brand_id=?,name=?,description=?,notes=? WHERE id=?')
    .run(brand_id, name, description || null, notes || null, req.params.id)
  res.json(db.prepare('SELECT * FROM collections WHERE id=?').get(req.params.id))
})
app.delete('/api/collections/:id', (req, res) => {
  const wids = db.prepare('SELECT id FROM watches WHERE collection_id=?').all(req.params.id).map((r) => r.id)
  unlinkImagesForWatches(wids)
  db.prepare('DELETE FROM collections WHERE id=?').run(req.params.id) // cascades to watches, images
  res.json({ ok: true })
})

// ---------- Watches ----------
app.post('/api/watches', (req, res) => {
  const { collection_id, name, values } = req.body
  if (!collection_id || !name) return res.status(400).json({ error: 'collection_id and name required' })
  const info = db.prepare('INSERT INTO watches (collection_id,name,values_json) VALUES (?,?,?)')
    .run(collection_id, name, JSON.stringify(values || {}))
  res.json(watchWithExtras(db.prepare('SELECT * FROM watches WHERE id=?').get(info.lastInsertRowid)))
})
app.put('/api/watches/:id', (req, res) => {
  const { collection_id, name, values } = req.body
  db.prepare("UPDATE watches SET collection_id=?,name=?,values_json=?,updated_at=datetime('now') WHERE id=?")
    .run(collection_id, name, JSON.stringify(values || {}), req.params.id)
  res.json(watchWithExtras(db.prepare('SELECT * FROM watches WHERE id=?').get(req.params.id)))
})
app.delete('/api/watches/:id', (req, res) => {
  const imgs = imagesFor.all(req.params.id)
  imgs.forEach((im) => { try { fs.unlinkSync(path.join(UPLOAD_DIR, im.filename)) } catch {} })
  db.prepare('DELETE FROM watches WHERE id=?').run(req.params.id)
  res.json({ ok: true })
})

// ---------- Watch images ----------
app.post('/api/watches/:id/images', upload.array('images', 8), (req, res) => {
  const wId = req.params.id
  const existing = imagesFor.all(wId).length
  const ins = db.prepare('INSERT INTO images (watch_id,filename,is_primary,sort) VALUES (?,?,?,?)')
  ;(req.files || []).forEach((file, i) => {
    ins.run(wId, file.filename, existing === 0 && i === 0 ? 1 : 0, existing + i)
  })
  res.json(watchWithExtras(db.prepare('SELECT * FROM watches WHERE id=?').get(wId)))
})
app.put('/api/images/:id/primary', (req, res) => {
  const img = db.prepare('SELECT * FROM images WHERE id=?').get(req.params.id)
  if (!img) return res.status(404).json({ error: 'not found' })
  db.prepare('UPDATE images SET is_primary=0 WHERE watch_id=?').run(img.watch_id)
  db.prepare('UPDATE images SET is_primary=1 WHERE id=?').run(img.id)
  res.json(watchWithExtras(db.prepare('SELECT * FROM watches WHERE id=?').get(img.watch_id)))
})
app.delete('/api/images/:id', (req, res) => {
  const img = db.prepare('SELECT * FROM images WHERE id=?').get(req.params.id)
  if (!img) return res.status(404).json({ error: 'not found' })
  try { fs.unlinkSync(path.join(UPLOAD_DIR, img.filename)) } catch {}
  db.prepare('DELETE FROM images WHERE id=?').run(img.id)
  res.json({ ok: true })
})

// ---------- Custom fields ----------
app.post('/api/fields', (req, res) => {
  let { key, label, type, options, unit, group_name, show_in_gallery, show_in_table } = req.body
  if (!label) return res.status(400).json({ error: 'label required' })
  key = (key || label).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || `f_${nanoid(5)}`
  if (db.prepare('SELECT 1 FROM field_defs WHERE key=?').get(key)) key = `${key}_${nanoid(4)}`
  const maxSort = db.prepare('SELECT COALESCE(MAX(sort),0)+1 AS s FROM field_defs').get().s
  const info = db.prepare(`INSERT INTO field_defs (key,label,type,options_json,unit,group_name,sort,show_in_gallery,show_in_table)
    VALUES (?,?,?,?,?,?,?,?,?)`).run(
    key, label, type || 'text', JSON.stringify(options || []), unit || null,
    group_name || 'Custom', maxSort, show_in_gallery ? 1 : 0, show_in_table ? 1 : 0)
  res.json({ ...db.prepare('SELECT * FROM field_defs WHERE id=?').get(info.lastInsertRowid), options: options || [] })
})
app.put('/api/fields/:id', (req, res) => {
  const { label, type, options, unit, group_name, show_in_gallery, show_in_table } = req.body
  db.prepare(`UPDATE field_defs SET label=?,type=?,options_json=?,unit=?,group_name=?,show_in_gallery=?,show_in_table=? WHERE id=?`)
    .run(label, type, JSON.stringify(options || []), unit || null, group_name || 'Custom',
      show_in_gallery ? 1 : 0, show_in_table ? 1 : 0, req.params.id)
  const f = db.prepare('SELECT * FROM field_defs WHERE id=?').get(req.params.id)
  res.json({ ...f, options: JSON.parse(f.options_json || '[]') })
})
app.delete('/api/fields/:id', (req, res) => {
  db.prepare('DELETE FROM field_defs WHERE id=?').run(req.params.id)
  res.json({ ok: true })
})

// ---------- Serve built frontend (production) ----------
const dist = path.join(__dirname, '..', 'dist')
if (fs.existsSync(dist)) {
  app.use(express.static(dist))
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')))
}

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Watch Directory running on :${PORT}`))
