import { useMemo, useRef, useState } from 'react'
import Modal from './Modal.jsx'
import { api } from '../api.js'
import { IcTrash } from './Icons.jsx'

export default function WatchForm({ data, fields, item, onClose, onSaved }) {
  const editing = !!item?.id
  const [id, setId] = useState(item?.id || null)
  const [name, setName] = useState(item?.name || '')
  const [familyId, setFamilyId] = useState(item?.family_id || (data.families || [])[0]?.id || '')
  const [values, setValues] = useState(item?.values ? { ...item.values } : {})
  const [images, setImages] = useState(item?.images || [])
  const [queued, setQueued] = useState([]) // {file, url} for new watch
  const [saving, setSaving] = useState(false)
  const fileRef = useRef(null)

  const groups = useMemo(() => {
    const g = {}
    fields.forEach((f) => { (g[f.group_name] = g[f.group_name] || []).push(f) })
    return g
  }, [fields])

  const set = (k, v) => setValues((s) => ({ ...s, [k]: v }))

  const pickFiles = async (files) => {
    if (!files?.length) return
    if (id) {
      const updated = await api.uploadImages(id, files)
      setImages(updated.images)
    } else {
      setQueued((q) => [...q, ...[...files].map((file) => ({ file, url: URL.createObjectURL(file) }))])
    }
  }

  const save = async () => {
    if (!name.trim() || !familyId) return
    setSaving(true)
    try {
      const payload = { family_id: Number(familyId), name: name.trim(), values }
      let saved
      if (id) saved = await api.updateWatch(id, payload)
      else {
        saved = await api.createWatch(payload)
        setId(saved.id)
        if (queued.length) { const up = await api.uploadImages(saved.id, queued.map((q) => q.file)); saved = up }
      }
      await onSaved()
      onClose()
    } finally { setSaving(false) }
  }

  const removeImage = async (img) => { await api.deleteImage(img.id); setImages((a) => a.filter((i) => i.id !== img.id)) }
  const makePrimary = async (img) => { const up = await api.setPrimaryImage(img.id); setImages(up.images) }

  const renderField = (f) => {
    const v = values[f.key] ?? ''
    if (f.type === 'longtext') return <textarea value={v} onChange={(e) => set(f.key, e.target.value)} />
    if (f.type === 'boolean') return (
      <select value={v === true ? 'yes' : v === false ? 'no' : ''} onChange={(e) => set(f.key, e.target.value === '' ? '' : e.target.value === 'yes')}>
        <option value="">—</option><option value="yes">Yes</option><option value="no">No</option>
      </select>
    )
    if (f.type === 'select') return (
      <select value={v} onChange={(e) => set(f.key, e.target.value)}>
        <option value="">—</option>
        {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    )
    if (f.type === 'number') return (
      <div className="unit-in">
        <input type="number" value={v} onChange={(e) => set(f.key, e.target.value)} />
        {f.unit && <span>{f.unit}</span>}
      </div>
    )
    if (f.type === 'date') return <input type="date" value={v} onChange={(e) => set(f.key, e.target.value)} />
    if (f.type === 'url') return <input type="url" placeholder="https://…" value={v} onChange={(e) => set(f.key, e.target.value)} />
    return <input value={v} onChange={(e) => set(f.key, e.target.value)} />
  }

  const shownImages = id ? images : queued

  return (
    <Modal wide sub={editing ? 'Edit Watch' : 'New Watch'} title={name || 'Untitled Watch'} onClose={onClose}
      footer={(
        <>
          {editing ? (
            <button className="btn ghost danger" onClick={async () => {
              if (confirm(`Delete "${name}"? This cannot be undone.`)) { await api.deleteWatch(id); await onSaved(); onClose() }
            }}><IcTrash size={15} /> Delete</button>
          ) : <span />}
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn ghost" onClick={onClose}>Cancel</button>
            <button className="btn primary" disabled={saving || !name.trim() || !familyId} onClick={save}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Watch'}
            </button>
          </div>
        </>
      )}>
      <div className="grid2">
        <div className="field">
          <label>Name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. SRPD55 “Black Boy”" autoFocus />
        </div>
        <div className="field">
          <label>Brand › Collection › Family *</label>
          {(data.families || []).length ? (
            <select value={familyId} onChange={(e) => setFamilyId(e.target.value)}>
              {data.brands.map((b) => data.collections.filter((c) => c.brand_id === b.id).map((c) => {
                const fams = (data.families || []).filter((f) => f.collection_id === c.id)
                if (!fams.length) return null
                return (
                  <optgroup key={c.id} label={`${b.name} · ${c.name}`}>
                    {fams.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </optgroup>
                )
              }))}
            </select>
          ) : (
            <div style={{ color: 'var(--text-faint)', fontSize: 12.5 }}>
              Create a Family first (top bar → Manage) before adding watches.
            </div>
          )}
        </div>
      </div>

      <div className="group-title">Photos</div>
      <div className="img-strip">
        {shownImages.map((img, i) => (
          <div className="img-thumb" key={img.id || i}>
            <img src={img.url} alt="" />
            {id && <span className={`star ${img.is_primary ? 'on' : ''}`} title="Set as primary"
              onClick={() => makePrimary(img)}>★</span>}
            <span className="del" title="Remove"
              onClick={() => id ? removeImage(img) : setQueued((q) => q.filter((_, j) => j !== i))}>✕</span>
          </div>
        ))}
        <div className="dropzone" style={{ width: 84, height: 84, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => fileRef.current?.click()}>+ Add</div>
      </div>
      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => pickFiles(e.target.files)} />

      {Object.entries(groups).map(([group, gf]) => (
        <div key={group}>
          <div className="group-title">{group}</div>
          <div className="grid2">
            {gf.map((f) => (
              <div className="field" key={f.key} style={f.type === 'longtext' ? { gridColumn: '1 / -1' } : null}>
                <label>{f.label}{f.unit ? ` (${f.unit})` : ''}</label>
                {renderField(f)}
              </div>
            ))}
          </div>
        </div>
      ))}
    </Modal>
  )
}
