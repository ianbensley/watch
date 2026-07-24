import { useState } from 'react'
import Modal from './Modal.jsx'
import { api } from '../api.js'
import { fmtValue, statusColor } from '../util.js'
import { IcEdit, IcTrash } from './Icons.jsx'
import WatchImages from './WatchImages.jsx'

export default function WatchDetail({ watch, fields, onClose, onEdit, onDeleted, speed = 3 }) {
  const imgs = watch.images || []
  const [active, setActive] = useState(null) // forced image url, or null to follow the display mode
  const status = watch.values.status

  const withVal = fields.filter((f) => f.key !== 'notes' && watch.values[f.key] !== undefined && watch.values[f.key] !== '')
  const notes = watch.values.notes

  return (
    <Modal wide sub={`${watch._brandName || ''} › ${watch._collName || ''} › ${watch._familyName || ''}`} title={watch.name} onClose={onClose}
      footer={(
        <>
          <button className="btn ghost danger" onClick={async () => {
            if (confirm(`Delete “${watch.name}”, including its photos? This cannot be undone.`)) {
              await api.deleteWatch(watch.id); onDeleted && onDeleted()
            }
          }}><IcTrash size={15} /> Delete</button>
          <button className="btn primary" onClick={onEdit}><IcEdit size={15} /> Edit</button>
        </>
      )}>
      <div className="detail-hero">
        <div className="photo">
          <div className="detail-photo-box">
            <WatchImages images={imgs} mode={watch.image_mode} speed={speed} forcedUrl={active} />
          </div>
          {imgs.length > 1 && (
            <div className="img-strip" style={{ marginTop: 10 }}>
              {watch.image_mode !== 'single' && (
                <div className={`img-thumb auto ${active === null ? 'sel' : ''}`} title="Follow display mode"
                  onClick={() => setActive(null)}>Auto</div>
              )}
              {imgs.map((im) => (
                <div className="img-thumb" key={im.id} style={{ width: 52, height: 52, outline: active === im.url ? '2px solid var(--gold)' : 'none' }}
                  onClick={() => setActive(im.url)}>
                  <img src={im.url} alt="" />
                </div>
              ))}
            </div>
          )}
          {status && <div style={{ marginTop: 12, color: statusColor(status), fontWeight: 600 }}>● {status}</div>}
        </div>
        <div style={{ flex: 1 }}>
          <div className="detail-specs">
            {withVal.map((f) => (
              <div className="row" key={f.key}>
                <span className="k">{f.label}</span>
                <span className="v">{fmtValue(f, watch.values[f.key])}</span>
              </div>
            ))}
          </div>
          {notes && (
            <div style={{ marginTop: 18 }}>
              <div className="group-title">Notes</div>
              <p style={{ color: 'var(--text-dim)', whiteSpace: 'pre-wrap', margin: 0 }}>{notes}</p>
            </div>
          )}
          {!withVal.length && !notes && <p style={{ color: 'var(--text-faint)' }}>No specs recorded yet — click Edit to add them.</p>}
        </div>
      </div>
    </Modal>
  )
}
