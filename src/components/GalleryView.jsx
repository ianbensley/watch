import { useState, useEffect } from 'react'
import { fmtValue, statusColor } from '../util.js'
import { IcColumns } from './Icons.jsx'
import WatchImages from './WatchImages.jsx'

const KEY = 'galleryFields'

export default function GalleryView({ watches, fields, onOpen, speed = 3 }) {
  const galleryFields = fields.filter((f) => f.show_in_gallery)
  const [visible, setVisible] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY)) || galleryFields.slice(0, 4).map((f) => f.key) }
    catch { return galleryFields.slice(0, 4).map((f) => f.key) }
  })
  const [menu, setMenu] = useState(false)
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(visible)) }, [visible])

  const shown = fields.filter((f) => visible.includes(f.key))

  return (
    <div>
      <div className="toolbar">
        <span className="title">Gallery</span>
        <div className="spacer" style={{ flex: 1 }} />
        <div style={{ position: 'relative' }}>
          <button className="btn ghost" onClick={() => setMenu((m) => !m)}><IcColumns size={15} /> Card fields</button>
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
        <div className="gallery">
          {watches.map((w) => {
            const status = w.values.status
            return (
              <div className="card" key={w.id} onClick={() => onOpen(w)}>
                <div className="card-img">
                  <WatchImages images={w.images} mode={w.image_mode} speed={speed} />
                  {status && <span className="status-dot" style={{ color: statusColor(status) }}>{status}</span>}
                </div>
                <div className="card-body">
                  <span className="card-brand">{w._brandName} · {w._collName} · {w._familyName}</span>
                  <span className="card-name">{w.name}</span>
                  <div className="card-specs">
                    {shown.map((f) => (
                      <div className="spec-line" key={f.key}>
                        <span className="k">{f.label}</span>
                        <span className="v">{fmtValue(f, w.values[f.key])}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
