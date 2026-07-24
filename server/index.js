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

// ---------- Simple password gate ----------
// Set APP_PASSWORD in the environment to change it. Images under /uploads stay
// public (so <img> tags load), but all data endpoints require the header.
const APP_PASSWORD = process.env.APP_PASSWORD || 'Website12'
app.use('/api', (req, res, next) => {
  if (!APP_PASSWORD) return next()
  if (req.get('x-app-password') === APP_PASSWORD) return next()
  res.status(401).json({ error: 'unauthorized' })
})

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
const imagesFor = db.prepare('SELECT id, filename, url, is_primary, sort FROM images WHERE watch_id = ? ORDER BY sort ASC, id ASC')

const imageUrl = (im) => im.url ? im.url : (im.filename ? `/uploads/${im.filename}` : '')

// Remove uploaded image files from disk for a set of watches (used before cascade deletes).
function unlinkImagesForWatches(watchIds) {
  if (!watchIds.length) return
  const rows = db.prepare(`SELECT filename FROM images WHERE watch_id IN (${watchIds.map(() => '?').join(',')})`).all(...watchIds)
  rows.forEach((im) => { if (im.filename) { try { fs.unlinkSync(path.join(UPLOAD_DIR, im.filename)) } catch {} } })
}

function watchWithExtras(row) {
  const w = parse(row)
  w.images = imagesFor.all(w.id).map((im) => ({ ...im, url: imageUrl(im) }))
  delete w.values_json
  return w
}

// ---------- Bulk data (drives the whole UI) ----------
app.get('/api/data', (_req, res) => {
  const brands = db.prepare('SELECT * FROM brands ORDER BY sort, name').all()
  const collections = db.prepare('SELECT * FROM collections ORDER BY sort, name').all()
  const families = db.prepare('SELECT * FROM families ORDER BY sort, name').all()
  const watches = db.prepare('SELECT * FROM watches ORDER BY sort, name').all().map(watchWithExtras)
  const fields = db.prepare('SELECT * FROM field_defs ORDER BY sort, id').all()
    .map((f) => ({ ...f, options: JSON.parse(f.options_json || '[]') }))
  res.json({ brands, collections, families, watches, fields })
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
  db.prepare('DELETE FROM collections WHERE id=?').run(req.params.id) // cascades to families, watches, images
  res.json({ ok: true })
})

// ---------- Families ----------
app.post('/api/families', (req, res) => {
  const { collection_id, name, description, notes } = req.body
  if (!collection_id || !name) return res.status(400).json({ error: 'collection_id and name required' })
  const info = db.prepare('INSERT INTO families (collection_id,name,description,notes) VALUES (?,?,?,?)')
    .run(collection_id, name, description || null, notes || null)
  res.json(db.prepare('SELECT * FROM families WHERE id=?').get(info.lastInsertRowid))
})
app.put('/api/families/:id', (req, res) => {
  const { collection_id, name, description, notes } = req.body
  db.prepare('UPDATE families SET collection_id=?,name=?,description=?,notes=? WHERE id=?')
    .run(collection_id, name, description || null, notes || null, req.params.id)
  res.json(db.prepare('SELECT * FROM families WHERE id=?').get(req.params.id))
})
app.delete('/api/families/:id', (req, res) => {
  const wids = db.prepare('SELECT id FROM watches WHERE family_id=?').all(req.params.id).map((r) => r.id)
  unlinkImagesForWatches(wids)
  db.prepare('DELETE FROM watches WHERE family_id=?').run(req.params.id)
  db.prepare('DELETE FROM families WHERE id=?').run(req.params.id)
  res.json({ ok: true })
})

// ---------- Watches ----------
const collectionOfFamily = (familyId) => {
  const f = db.prepare('SELECT collection_id FROM families WHERE id=?').get(familyId)
  return f ? f.collection_id : null
}

const IMAGE_MODES = ['single', 'collage', 'slideshow']
const cleanMode = (m) => IMAGE_MODES.includes(m) ? m : 'single'

app.post('/api/watches', (req, res) => {
  const { family_id, name, values, image_mode } = req.body
  const collection_id = collectionOfFamily(family_id)
  if (!family_id || !collection_id || !name) return res.status(400).json({ error: 'family_id and name required' })
  const info = db.prepare('INSERT INTO watches (collection_id,family_id,name,values_json,image_mode) VALUES (?,?,?,?,?)')
    .run(collection_id, family_id, name, JSON.stringify(values || {}), cleanMode(image_mode))
  res.json(watchWithExtras(db.prepare('SELECT * FROM watches WHERE id=?').get(info.lastInsertRowid)))
})
app.put('/api/watches/:id', (req, res) => {
  const { family_id, name, values, image_mode } = req.body
  const collection_id = collectionOfFamily(family_id)
  if (!family_id || !collection_id || !name) return res.status(400).json({ error: 'family_id and name required' })
  db.prepare("UPDATE watches SET collection_id=?,family_id=?,name=?,values_json=?,image_mode=?,updated_at=datetime('now') WHERE id=?")
    .run(collection_id, family_id, name, JSON.stringify(values || {}), cleanMode(image_mode), req.params.id)
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
// Add image URLs to a watch. Each URL is downloaded and stored as a real file when
// possible (so it behaves like an upload); if the download fails it is kept as an
// external link so the image still shows.
const EXT_BY_TYPE = { 'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'image/avif': '.avif', 'image/bmp': '.bmp', 'image/svg+xml': '.svg' }
app.post('/api/watches/:id/image-urls', async (req, res) => {
  const wId = req.params.id
  const urls = (req.body.urls || []).map((u) => String(u).trim()).filter(Boolean)
  let existing = imagesFor.all(wId).length
  const ins = db.prepare('INSERT INTO images (watch_id,filename,url,is_primary,sort) VALUES (?,?,?,?,?)')
  for (let i = 0; i < urls.length; i++) {
    const u = urls[i]
    let filename = null, extUrl = null
    try {
      const r = await fetch(u, { redirect: 'follow' })
      const ct = (r.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
      if (r.ok && ct.startsWith('image/')) {
        const buf = Buffer.from(await r.arrayBuffer())
        if (buf.length > 0 && buf.length <= 15 * 1024 * 1024) {
          filename = `${Date.now()}-${nanoid(8)}${EXT_BY_TYPE[ct] || '.jpg'}`
          fs.writeFileSync(path.join(UPLOAD_DIR, filename), buf)
        } else extUrl = u
      } else extUrl = u
    } catch { extUrl = u }
    ins.run(wId, filename, extUrl, existing === 0 && i === 0 ? 1 : 0, existing)
    existing++
  }
  res.json(watchWithExtras(db.prepare('SELECT * FROM watches WHERE id=?').get(wId)))
})
// Reorder a watch's images. Body: { order: [imageId, ...] }
app.put('/api/watches/:id/images/order', (req, res) => {
  const { order } = req.body
  if (!Array.isArray(order)) return res.status(400).json({ error: 'order array required' })
  const upd = db.prepare('UPDATE images SET sort=? WHERE id=? AND watch_id=?')
  db.transaction(() => order.forEach((imgId, i) => upd.run(i, imgId, req.params.id)))()
  res.json(watchWithExtras(db.prepare('SELECT * FROM watches WHERE id=?').get(req.params.id)))
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
  if (img.filename) { try { fs.unlinkSync(path.join(UPLOAD_DIR, img.filename)) } catch {} }
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
// Reorder fields (and therefore groups). Body: { order: [fieldId, ...] }.
// Must be declared before '/api/fields/:id' so 'reorder' isn't treated as an id.
app.put('/api/fields/reorder', (req, res) => {
  const { order } = req.body
  if (!Array.isArray(order)) return res.status(400).json({ error: 'order array required' })
  const upd = db.prepare('UPDATE field_defs SET sort=? WHERE id=?')
  db.transaction(() => order.forEach((id, i) => upd.run(i, id)))()
  res.json({ ok: true })
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

// ---------- Bulk JSON import ----------
// Body: { fields?: [...], brands: [{ name, country?, ..., collections: [{ name, ...,
//   families: [{ name, ..., watches: [{ name, values? }] }] }] }] }
// Brands/collections/families are matched by name under their parent (created if missing);
// watches are always appended.
app.post('/api/import', (req, res) => {
  const body = req.body || {}
  const counts = { brands: 0, collections: 0, families: 0, watches: 0, fields: 0 }
  try {
    const run = db.transaction(() => {
      // Optional field definitions
      ;(body.fields || []).forEach((f) => {
        if (!f || !f.label) return
        let key = (f.key || f.label).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
        if (!key) return
        if (db.prepare('SELECT 1 FROM field_defs WHERE key=?').get(key)) return
        const maxSort = db.prepare('SELECT COALESCE(MAX(sort),0)+1 AS s FROM field_defs').get().s
        db.prepare(`INSERT INTO field_defs (key,label,type,options_json,unit,group_name,sort,show_in_gallery,show_in_table)
          VALUES (?,?,?,?,?,?,?,?,?)`).run(key, f.label, f.type || 'text', JSON.stringify(f.options || []),
          f.unit || null, f.group_name || 'Custom', maxSort,
          f.show_in_gallery === false ? 0 : 1, f.show_in_table === false ? 0 : 1)
        counts.fields++
      })

      const findBrand = db.prepare('SELECT id FROM brands WHERE name=? COLLATE NOCASE')
      const findColl = db.prepare('SELECT id FROM collections WHERE brand_id=? AND name=? COLLATE NOCASE')
      const findFam = db.prepare('SELECT id FROM families WHERE collection_id=? AND name=? COLLATE NOCASE')

      ;(body.brands || []).forEach((b) => {
        if (!b || !b.name) return
        let brandId = findBrand.get(b.name)?.id
        if (!brandId) {
          brandId = db.prepare('INSERT INTO brands (name,country,founded,website,notes) VALUES (?,?,?,?,?)')
            .run(b.name, b.country || null, b.founded || null, b.website || null, b.notes || null).lastInsertRowid
          counts.brands++
        }
        ;(b.collections || []).forEach((c) => {
          if (!c || !c.name) return
          let collId = findColl.get(brandId, c.name)?.id
          if (!collId) {
            collId = db.prepare('INSERT INTO collections (brand_id,name,description,notes) VALUES (?,?,?,?)')
              .run(brandId, c.name, c.description || null, c.notes || null).lastInsertRowid
            counts.collections++
          }
          // A collection may list families, or watches directly (auto-placed in a "General" family).
          const familyGroups = c.families && c.families.length
            ? c.families
            : (c.watches && c.watches.length ? [{ name: 'General', watches: c.watches }] : [])
          familyGroups.forEach((fam) => {
            if (!fam || !fam.name) return
            let famId = findFam.get(collId, fam.name)?.id
            if (!famId) {
              famId = db.prepare('INSERT INTO families (collection_id,name,description,notes) VALUES (?,?,?,?)')
                .run(collId, fam.name, fam.description || null, fam.notes || null).lastInsertRowid
              counts.families++
            }
            ;(fam.watches || []).forEach((w) => {
              if (!w || !w.name) return
              const wId = db.prepare('INSERT INTO watches (collection_id,family_id,name,values_json,image_mode) VALUES (?,?,?,?,?)')
                .run(collId, famId, w.name, JSON.stringify(w.values || {}), cleanMode(w.image_mode)).lastInsertRowid
              const urls = (w.images || w.image_urls || []).map((u) => String(u).trim()).filter(Boolean)
              const insImg = db.prepare('INSERT INTO images (watch_id,filename,url,is_primary,sort) VALUES (?,?,?,?,?)')
              urls.forEach((u, i) => insImg.run(wId, null, u, i === 0 ? 1 : 0, i))
              counts.watches++
            })
          })
        })
      })
    })
    run()
    res.json({ ok: true, counts })
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

// ---------- Serve built frontend (production) ----------
const dist = path.join(__dirname, '..', 'dist')
if (fs.existsSync(dist)) {
  app.use(express.static(dist))
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')))
}

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Watch Directory running on :${PORT}`))
