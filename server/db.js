import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// DATA_DIR is where the SQLite file + uploaded images live.
// On Railway, mount a persistent volume and set DATA_DIR to its path (e.g. /data).
export const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data')
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads')

fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const db = new Database(path.join(DATA_DIR, 'watches.db'))
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
CREATE TABLE IF NOT EXISTS brands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  country TEXT,
  founded TEXT,
  website TEXT,
  notes TEXT,
  logo TEXT,
  sort INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS collections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  brand_id INTEGER NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  notes TEXT,
  sort INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS watches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  values_json TEXT DEFAULT '{}',
  sort INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS field_defs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text',
  options_json TEXT DEFAULT '[]',
  unit TEXT,
  group_name TEXT DEFAULT 'General',
  sort INTEGER DEFAULT 0,
  show_in_gallery INTEGER DEFAULT 1,
  show_in_table INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  watch_id INTEGER NOT NULL REFERENCES watches(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  is_primary INTEGER DEFAULT 0,
  sort INTEGER DEFAULT 0
);
`)

// ---- Seed on first run ----
const seeded = db.prepare('SELECT COUNT(*) AS n FROM field_defs').get().n > 0
if (!seeded) seed()

function seed() {
  const fields = [
    // Core specs
    { key: 'reference', label: 'Reference No.', type: 'text', group: 'Core Specs' },
    { key: 'status', label: 'Status', type: 'select', group: 'Core Specs', options: ['Wishlist', 'Owned', 'Sold', 'Considering'] },
    { key: 'rating', label: 'My Rating', type: 'select', group: 'Core Specs', options: ['★', '★★', '★★★', '★★★★', '★★★★★'] },
    { key: 'movement', label: 'Movement', type: 'select', group: 'Core Specs', options: ['Automatic', 'Manual', 'Quartz', 'Solar', 'Spring Drive', 'Eco-Drive', 'Kinetic'] },
    { key: 'caliber', label: 'Caliber', type: 'text', group: 'Core Specs' },
    { key: 'power_reserve', label: 'Power Reserve', type: 'number', unit: 'h', group: 'Core Specs' },
    { key: 'water_resistance', label: 'Water Resistance', type: 'number', unit: 'm', group: 'Core Specs' },
    { key: 'price', label: 'Price', type: 'number', unit: '£', group: 'Core Specs' },
    { key: 'year', label: 'Release Year', type: 'number', group: 'Core Specs' },
    // Physical details
    { key: 'case_size', label: 'Case Diameter', type: 'number', unit: 'mm', group: 'Physical' },
    { key: 'thickness', label: 'Thickness', type: 'number', unit: 'mm', group: 'Physical' },
    { key: 'lug_width', label: 'Lug Width', type: 'number', unit: 'mm', group: 'Physical' },
    { key: 'lug_to_lug', label: 'Lug-to-Lug', type: 'number', unit: 'mm', group: 'Physical' },
    { key: 'case_material', label: 'Case Material', type: 'select', group: 'Physical', options: ['Stainless Steel', 'Titanium', 'Gold', 'Ceramic', 'Bronze', 'Resin', 'PVD/DLC'] },
    { key: 'crystal', label: 'Crystal', type: 'select', group: 'Physical', options: ['Sapphire', 'Hardlex', 'Mineral', 'Acrylic'] },
    { key: 'dial_color', label: 'Dial Colour', type: 'text', group: 'Physical' },
    { key: 'strap', label: 'Strap / Bracelet', type: 'text', group: 'Physical' },
    { key: 'notes', label: 'Notes', type: 'longtext', group: 'Notes', gallery: 0, table: 0 },
  ]

  const insF = db.prepare(`INSERT INTO field_defs (key,label,type,options_json,unit,group_name,sort,show_in_gallery,show_in_table)
    VALUES (@key,@label,@type,@options,@unit,@group,@sort,@gallery,@table)`)
  fields.forEach((f, i) => insF.run({
    key: f.key, label: f.label, type: f.type,
    options: JSON.stringify(f.options || []),
    unit: f.unit || null, group: f.group, sort: i,
    gallery: f.gallery === 0 ? 0 : 1, table: f.table === 0 ? 0 : 1,
  }))

  const insB = db.prepare('INSERT INTO brands (name,country,founded,website,notes,sort) VALUES (?,?,?,?,?,?)')
  const insC = db.prepare('INSERT INTO collections (brand_id,name,description,sort) VALUES (?,?,?,?)')
  const insW = db.prepare('INSERT INTO watches (collection_id,name,values_json,sort) VALUES (?,?,?,?)')

  const data = [
    {
      brand: ['Seiko', 'Japan', '1881', 'https://www.seikowatches.com', 'Founded by Kintarō Hattori in Tokyo.'],
      collections: [
        { name: '5 Sports', desc: 'Affordable automatic sports watches.', watches: [
          { name: 'SRPD55 "Black Boy"', v: { reference: 'SRPD55K1', status: 'Owned', movement: 'Automatic', caliber: '4R36', water_resistance: 100, case_size: 42.5, case_material: 'Stainless Steel', crystal: 'Hardlex', dial_color: 'Black', price: 210, rating: '★★★★', year: 2019 } },
          { name: 'SRPK model "GMT"', v: { reference: 'SRPK21', status: 'Wishlist', movement: 'Automatic', caliber: '4R34', water_resistance: 100, case_size: 42.5, case_material: 'Stainless Steel', crystal: 'Hardlex', dial_color: 'Blue/Grey', price: 400 } },
        ]},
        { name: 'Prospex', desc: 'Professional dive & sports line.', watches: [
          { name: '"Turtle" SRPE05', v: { reference: 'SRPE05K1', status: 'Wishlist', movement: 'Automatic', caliber: '4R35', water_resistance: 200, case_size: 45, case_material: 'Stainless Steel', crystal: 'Hardlex', dial_color: 'Black', price: 380, rating: '★★★★★' } },
        ]},
      ],
    },
    {
      brand: ['Citizen', 'Japan', '1918', 'https://www.citizenwatch.com', 'Known for Eco-Drive light-powered movements.'],
      collections: [
        { name: 'Promaster', desc: 'Air, land and sea tool watches.', watches: [
          { name: 'Diver BN0150 "Fugu"', v: { reference: 'BN0150-28E', status: 'Considering', movement: 'Eco-Drive', water_resistance: 200, case_size: 44, case_material: 'Stainless Steel', crystal: 'Mineral', dial_color: 'Black', price: 250 } },
        ]},
        { name: 'Tsuyosa', desc: 'Integrated-bracelet automatics.', watches: [
          { name: 'NJ0150 Green', v: { reference: 'NJ0150-81X', status: 'Wishlist', movement: 'Automatic', caliber: '8210', water_resistance: 50, case_size: 40, case_material: 'Stainless Steel', crystal: 'Mineral', dial_color: 'Green', price: 320 } },
        ]},
      ],
    },
    {
      brand: ['Casio', 'Japan', '1946', 'https://www.casio.com', 'Electronics maker; home of G-Shock.'],
      collections: [
        { name: 'G-Shock', desc: 'Shock-resistant digital & analog.', watches: [
          { name: 'GA-2100 "CasiOak"', v: { reference: 'GA-2100-1A1', status: 'Owned', movement: 'Quartz', water_resistance: 200, case_size: 45.4, case_material: 'Resin', crystal: 'Mineral', dial_color: 'Black', price: 99, rating: '★★★★' } },
        ]},
        { name: 'Lineage', desc: 'Slim solar radio-controlled dress watches.', watches: [
          { name: 'LCW-M100', v: { reference: 'LCW-M100TSE-1A', status: 'Wishlist', movement: 'Solar', water_resistance: 50, case_size: 40, case_material: 'Titanium', crystal: 'Sapphire', dial_color: 'Silver', price: 300 } },
        ]},
      ],
    },
    {
      brand: ['Grand Seiko', 'Japan', '1960', 'https://www.grand-seiko.com', 'Seiko’s luxury division; Zaratsu polishing & Spring Drive.'],
      collections: [
        { name: 'Heritage', desc: 'Nature-of-time dials.', watches: [
          { name: 'SBGA211 "Snowflake"', v: { reference: 'SBGA211', status: 'Wishlist', movement: 'Spring Drive', caliber: '9R65', power_reserve: 72, water_resistance: 100, case_size: 41, case_material: 'Titanium', crystal: 'Sapphire', dial_color: 'White', price: 5600, rating: '★★★★★' } },
        ]},
      ],
    },
  ]

  const tx = db.transaction(() => {
    data.forEach((b, bi) => {
      const bId = insB.run(...b.brand, bi).lastInsertRowid
      b.collections.forEach((c, ci) => {
        const cId = insC.run(bId, c.name, c.desc || null, ci).lastInsertRowid
        c.watches.forEach((w, wi) => {
          insW.run(cId, w.name, JSON.stringify(w.v || {}), wi)
        })
      })
    })
  })
  tx()
  console.log('Seeded starter data.')
}

export default db
