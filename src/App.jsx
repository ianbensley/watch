import { useEffect, useMemo, useState, useCallback } from 'react'
import { api } from './api.js'
import { fieldByKey } from './util.js'
import Filters from './components/Filters.jsx'
import GalleryView from './components/GalleryView.jsx'
import TableView from './components/TableView.jsx'
import TreeView from './components/TreeView.jsx'
import WatchForm from './components/WatchForm.jsx'
import EntityForm from './components/EntityForm.jsx'
import FieldManager from './components/FieldManager.jsx'
import LibraryManager from './components/LibraryManager.jsx'
import WatchDetail from './components/WatchDetail.jsx'
import Login from './components/Login.jsx'
import { IcTree, IcGallery, IcTable, IcPlus, IcCog, IcMenu, IcWatch, IcColumns, IcLock } from './components/Icons.jsx'

const LS = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } }

export default function App() {
  const [authed, setAuthed] = useState(() => !!sessionStorage.getItem('appauth'))
  if (!authed) return <Login onAuthed={() => setAuthed(true)} />
  return <Directory onLogout={() => { sessionStorage.removeItem('appauth'); setAuthed(false) }} />
}

function Directory({ onLogout }) {
  const [data, setData] = useState(null)
  const [view, setView] = useState(() => LS('view', 'gallery'))
  const [search, setSearch] = useState('')
  const [sideOpen, setSideOpen] = useState(() => (typeof window !== 'undefined' ? window.innerWidth > 720 : true))
  const [filters, setFilters] = useState({ brands: [], collections: [], fields: {} })
  const [modal, setModal] = useState(null) // {type, item}
  const [detail, setDetail] = useState(null)

  const reload = useCallback(async () => setData(await api.data()), [])
  useEffect(() => { reload() }, [reload])
  useEffect(() => { localStorage.setItem('view', JSON.stringify(view)) }, [view])

  const maps = useMemo(() => {
    if (!data) return null
    const brandById = Object.fromEntries(data.brands.map((b) => [b.id, b]))
    const collById = Object.fromEntries(data.collections.map((c) => [c.id, c]))
    const fields = fieldByKey(data.fields)
    const watches = data.watches.map((w) => {
      const coll = collById[w.collection_id]
      const brand = coll ? brandById[coll.brand_id] : null
      return { ...w, _coll: coll, _brand: brand,
        _brandName: brand?.name || '—', _collName: coll?.name || '—' }
    })
    return { brandById, collById, fields, watches }
  }, [data])

  const filtered = useMemo(() => {
    if (!maps) return []
    const q = search.trim().toLowerCase()
    return maps.watches.filter((w) => {
      if (q) {
        const hay = `${w.name} ${w._brandName} ${w._collName} ${Object.values(w.values).join(' ')}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (filters.brands.length && !filters.brands.includes(w._brand?.id)) return false
      if (filters.collections.length && !filters.collections.includes(w.collection_id)) return false
      for (const [key, f] of Object.entries(filters.fields)) {
        const field = maps.fields[key]; if (!field) continue
        const v = w.values[key]
        if (field.type === 'number') {
          const n = Number(v)
          if (f.min != null && f.min !== '' && !(n >= Number(f.min))) return false
          if (f.max != null && f.max !== '' && !(n <= Number(f.max))) return false
        } else if (field.type === 'select') {
          if (f.length && !f.includes(v)) return false
        } else if (field.type === 'boolean') {
          if (f === 'yes' && !v) return false
          if (f === 'no' && v) return false
        } else if (f) {
          if (!String(v || '').toLowerCase().includes(String(f).toLowerCase())) return false
        }
      }
      return true
    })
  }, [maps, search, filters])

  if (!data) return <div className="empty" style={{ marginTop: 120 }}><span className="kanji">時計</span>Loading…</div>

  const openDetail = (w) => setDetail(w)

  return (
    <div className="app">
      <div className="topbar">
        <button className="btn icon ghost" onClick={() => setSideOpen((s) => !s)} title="Toggle filters"><IcMenu /></button>
        <div className="brand-mark">
          <span className="kanji">時計</span>
          <span className="en">Watch Directory<small>Japanese Horology Collection</small></span>
        </div>
        <div className="tabs">
          <button className={`tab ${view === 'tree' ? 'active' : ''}`} onClick={() => setView('tree')}><IcTree /> Tree</button>
          <button className={`tab ${view === 'gallery' ? 'active' : ''}`} onClick={() => setView('gallery')}><IcGallery /> Gallery</button>
          <button className={`tab ${view === 'table' ? 'active' : ''}`} onClick={() => setView('table')}><IcTable /> Table</button>
        </div>
        <div className="spacer" />
        <span className="count-chip">{filtered.length} / {maps.watches.length} watches</span>
        <button className="btn ghost" onClick={() => setModal({ type: 'library' })}><IcColumns size={15} /><span className="lbl"> Manage</span></button>
        <button className="btn ghost" onClick={() => setModal({ type: 'fields' })}><IcCog size={15} /><span className="lbl"> Fields</span></button>
        <button className="btn gold" onClick={() => setModal({ type: 'watch' })}><IcPlus size={15} /><span className="lbl"> Add Watch</span></button>
        <button className="btn icon ghost" onClick={onLogout} title="Lock"><IcLock size={16} /></button>
      </div>

      <div className="body">
        {sideOpen && <div className="sidebar-backdrop" onClick={() => setSideOpen(false)} />}
        <div className={`sidebar ${sideOpen ? '' : 'collapsed'}`}>
          <Filters
            data={data} maps={maps} search={search} setSearch={setSearch}
            filters={filters} setFilters={setFilters}
            onAddBrand={() => setModal({ type: 'brand' })}
            onAddCollection={() => setModal({ type: 'collection' })}
            onEditBrand={(b) => setModal({ type: 'brand', item: b })}
            onEditCollection={(c) => setModal({ type: 'collection', item: c })}
          />
        </div>

        <div className="main">
          {view === 'gallery' && (
            <GalleryView watches={filtered} fields={data.fields} onOpen={openDetail} />
          )}
          {view === 'table' && (
            <TableView watches={filtered} fields={data.fields} onOpen={openDetail} />
          )}
          {view === 'tree' && (
            <TreeView data={data} maps={maps} filtered={filtered}
              onOpenWatch={openDetail}
              onAddWatch={(collection_id) => setModal({ type: 'watch', item: { collection_id } })} />
          )}
        </div>
      </div>

      {modal?.type === 'watch' && (
        <WatchForm data={data} fields={data.fields} item={modal.item}
          onClose={() => setModal(null)} onSaved={reload} />
      )}
      {modal?.type === 'brand' && (
        <EntityForm kind="brand" item={modal.item} data={data}
          onClose={() => setModal(null)} onSaved={reload} />
      )}
      {modal?.type === 'collection' && (
        <EntityForm kind="collection" item={modal.item} data={data}
          onClose={() => setModal(null)} onSaved={reload} />
      )}
      {modal?.type === 'fields' && (
        <FieldManager fields={data.fields} onClose={() => setModal(null)} onSaved={reload} />
      )}
      {modal?.type === 'library' && (
        <LibraryManager data={data} maps={maps} reload={reload} onClose={() => setModal(null)} />
      )}

      {detail && (
        <WatchDetail watch={maps.watches.find((w) => w.id === detail.id) || detail}
          fields={data.fields}
          onClose={() => setDetail(null)}
          onEdit={() => { setModal({ type: 'watch', item: detail }); setDetail(null) }}
          onDeleted={() => { setDetail(null); reload() }} />
      )}
    </div>
  )
}
