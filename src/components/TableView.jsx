import { useState, useEffect, useMemo } from 'react'
import { fmtValue } from '../util.js'
import { IcColumns } from './Icons.jsx'

const KEY = 'tableFields'

export default function TableView({ watches, fields, onOpen }) {
  const tableFields = fields.filter((f) => f.show_in_table)
  const [visible, setVisible] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY)) || tableFields.slice(0, 6).map((f) => f.key) }
    catch { return tableFields.slice(0, 6).map((f) => f.key) }
  })
  const [menu, setMenu] = useState(false)
  const [sort, setSort] = useState({ key: '_name', dir: 1 })
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(visible)) }, [visible])

  const shown = fields.filter((f) => visible.includes(f.key))

  const rows = useMemo(() => {
    const arr = [...watches]
    const { key, dir } = sort
    arr.sort((a, b) => {
      let av, bv
      if (key === '_name') { av = a.name; bv = b.name }
      else if (key === '_brand') { av = a._brandName; bv = b._brandName }
      else if (key === '_coll') { av = a._collName; bv = b._collName }
      else { av = a.values[key]; bv = b.values[key] }
      const na = Number(av), nb = Number(bv)
      if (Number.isFinite(na) && Number.isFinite(nb)) return (na - nb) * dir
      return String(av ?? '').localeCompare(String(bv ?? '')) * dir
    })
    return arr
  }, [watches, sort])

  const th = (key, label) => (
    <th onClick={() => setSort((s) => ({ key, dir: s.key === key ? -s.dir : 1 }))}>
      {label}{sort.key === key ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}
    </th>
  )

  return (
    <div>
      <div className="toolbar">
        <span className="title">Table</span>
        <div style={{ flex: 1 }} />
        <div style={{ position: 'relative' }}>
          <button className="btn ghost" onClick={() => setMenu((m) => !m)}><IcColumns size={15} /> Columns</button>
          {menu && (
            <div className="checkbox-menu" onMouseLeave={() => setMenu(false)}>
              {fields.map((f) => (
                <label key={f.key}>
                  <input type="checkbox" checked={visible.includes(f.key)}
                    onChange={() => setVisible((v) => v.includes(f.key) ? v.filter((x) => x !== f.key) : [...v, f.key])} />
                  {f.label}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {!watches.length ? (
        <div className="empty"><span className="kanji">空</span>No watches match your filters.</div>
      ) : (
        <div className="table-wrap">
          <table className="grid">
            <thead>
              <tr>
                <th></th>
                {th('_name', 'Watch')}
                {th('_brand', 'Brand')}
                {th('_coll', 'Collection')}
                {shown.map((f) => th(f.key, f.label))}
              </tr>
            </thead>
            <tbody>
              {rows.map((w) => {
                const img = w.images?.find((i) => i.is_primary) || w.images?.[0]
                return (
                  <tr key={w.id} onClick={() => onOpen(w)}>
                    <td>{img ? <img className="thumb" src={img.url} alt="" /> : <div className="thumb" />}</td>
                    <td className="name">{w.name}</td>
                    <td>{w._brandName}</td>
                    <td>{w._collName}</td>
                    {shown.map((f) => <td key={f.key}>{fmtValue(f, w.values[f.key])}</td>)}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
