import { useMemo } from 'react'
import { IcSearch, IcPlus, IcEdit } from './Icons.jsx'

export default function Filters({ data, maps, search, setSearch, filters, setFilters, onAddBrand, onAddCollection, onEditBrand, onEditCollection }) {
  const toggle = (arr, id) => arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]

  const setField = (key, val) => setFilters((f) => {
    const fields = { ...f.fields }
    if (val == null || (Array.isArray(val) && !val.length) || val === '') delete fields[key]
    else fields[key] = val
    return { ...f, fields }
  })

  // Only show collections belonging to selected brands (or all if none selected)
  const visibleCollections = useMemo(() => {
    if (!filters.brands.length) return data.collections
    return data.collections.filter((c) => filters.brands.includes(c.brand_id))
  }, [data.collections, filters.brands])

  const filterableFields = data.fields.filter((f) => ['select', 'number', 'boolean'].includes(f.type))
  const active = filters.brands.length || filters.collections.length || Object.keys(filters.fields).length || search

  return (
    <div>
      <div className="side-section">
        <div className="search-box">
          <IcSearch size={15} />
          <input placeholder="Search watches…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {active ? (
          <button className="btn ghost sm" style={{ marginTop: 10 }}
            onClick={() => { setSearch(''); setFilters({ brands: [], collections: [], fields: {} }) }}>
            Clear all filters
          </button>
        ) : null}
      </div>

      <div className="side-section">
        <div className="side-head"><span>Brands</span>
          <button className="btn icon ghost sm" onClick={onAddBrand} title="Add brand"><IcPlus size={13} /></button>
        </div>
        <div className="chip-row">
          {data.brands.map((b) => (
            <span key={b.id} className={`chip ${filters.brands.includes(b.id) ? 'on' : ''}`}
              onClick={() => setFilters((f) => ({ ...f, brands: toggle(f.brands, b.id) }))}>
              {b.name}
            </span>
          ))}
        </div>
      </div>

      <div className="side-section">
        <div className="side-head"><span>Collections</span>
          <button className="btn icon ghost sm" onClick={onAddCollection} title="Add collection"><IcPlus size={13} /></button>
        </div>
        <div className="chip-row">
          {visibleCollections.map((c) => (
            <span key={c.id} className={`chip ${filters.collections.includes(c.id) ? 'on' : ''}`}
              onClick={() => setFilters((f) => ({ ...f, collections: toggle(f.collections, c.id) }))}>
              {c.name}
            </span>
          ))}
          {!visibleCollections.length && <span className="filter-label">No collections yet</span>}
        </div>
      </div>

      <div className="side-section">
        <div className="side-head"><span>Specs</span></div>
        {filterableFields.map((f) => (
          <div className="filter-group" key={f.key}>
            <label className="filter-label">{f.label}{f.unit ? ` (${f.unit})` : ''}</label>
            {f.type === 'select' && (
              <div className="chip-row">
                {f.options.map((o) => {
                  const cur = filters.fields[f.key] || []
                  return (
                    <span key={o} className={`chip ${cur.includes(o) ? 'on' : ''}`}
                      onClick={() => setField(f.key, toggle(cur, o))}>{o}</span>
                  )
                })}
              </div>
            )}
            {f.type === 'number' && (
              <div className="range-row">
                <input type="number" placeholder="min" value={filters.fields[f.key]?.min ?? ''}
                  onChange={(e) => setField(f.key, { ...filters.fields[f.key], min: e.target.value })} />
                <span>–</span>
                <input type="number" placeholder="max" value={filters.fields[f.key]?.max ?? ''}
                  onChange={(e) => setField(f.key, { ...filters.fields[f.key], max: e.target.value })} />
              </div>
            )}
            {f.type === 'boolean' && (
              <div className="chip-row">
                {['yes', 'no'].map((o) => (
                  <span key={o} className={`chip ${filters.fields[f.key] === o ? 'on' : ''}`}
                    onClick={() => setField(f.key, filters.fields[f.key] === o ? null : o)}>{o}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
