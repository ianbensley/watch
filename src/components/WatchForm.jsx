import { useMemo, useRef, useState } from 'react'
import Modal from './Modal.jsx'
import { api } from '../api.js'
import { IcTrash } from './Icons.jsx'

const MODES = [['single', 'Single'], ['collage', 'Collage'], ['slideshow', 'Slideshow']]

export default function WatchForm({ data, fields, item, onClose, onSaved }) {
  const editing = !!item?.id
  const [id, setId] = useState(item?.id || null)
  const [name, setName] = useState(item?.name || '')
  const [familyId, setFamilyId] = useState(item?.family_id || (data.families || [])[0]?.id || '')
  const [values, setValues] = useState(item?.values ? { ...item.values } : {})
  const [images, setImages] = useState(item?.images || [])
  const [queued, setQueued] = useState([]) // { file?, url, external? } for a not-yet-saved watch
  const [imageMode, setImageMode] = useState(item?.image_mode || 'single')
  const [urlInput, setUrlInput] = useState('')
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
    if (id) setImages((await api.uploadImages(id, files)).images)
    else setQueued((q) => [...q, ...[...files].map((file) => ({ file, url: URL.createObjectURL(file) }))])
  }

  const addUrl = async () => {
    const u = urlInput.trim()
    if (!u) return
    setUrlInput('')
    if (id) setImages((await api.addImageUrls(id, [u])).images)
    else setQueued((q) => [...q, { url: u, external: true }])
  }

  const save = async () => {
    if (!name.trim() || !familyId) return
    setSaving(true)
    try {
      const payload = { family_id: Number(familyId), name: name.trim(), values, image_mode: imageMode }
      let saved = id ? await api.updateWatch(id, payload) : await api.createWatch(payload)
      if (!id) {
        setId(saved.id)
        const files = queued.filter((q) => q.file).map((q) => q.file)
        const urls = queued.filter((q) => q.external).map((q) => q.url)
        if (files.length) saved = await api.uploadImages(saved.id, files)
        if (urls.length) saved = await api.addImageUrls(saved.id, urls)
      }
      await onSaved()
      onClose()
    } finally { setSaving(false) }
  }

  const removeImage = async (img) => { await api.deleteImage(img.id); setImages((a) => a.filter((i) => i.id !== img.id)) }
  const makePrimary = async (img) => { setImages((await api.setPrimaryImage(img.id)).images) }

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

      <div className="group-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Photos</span>
        <span className="seg">
          {MODES.map(([m, lbl]) => (
            <button key={m} type="button" className={imageMode === m ? 'on' : ''} onClick={() => setImageMode(m)}>{lbl}</button>
          ))}
        </span>
      </div>
      <div style={{ color: 'var(--text-faint)', fontSize: 11.5, marginTop: -6, marginBottom: 8 }}>
        How this watch’s multiple photos are shown on its card. Slideshow speed is in Settings.
      </div>

      <div className="img-strip">
        {shownImages.map((img, i) => (
          <div className="img-thumb" key={img.id || i}>
            <img src={img.url} alt="" />
            {(img.external || img.filename === null) && <span className="url-tag" title="Linked URL">URL</span>}
            {id && <span className={`star ${img.is_primary ? 'on' : ''}`} title="Set as primary" onClick={() => makePrimary(img)}>★</span>}
            <span className="del" title="Remove"
              onClick={() => id ? removeImage(img) : setQueued((q) => q.filter((_, j) => j !== i))}>✕</span>
          </div>
        ))}
        <div className="dropzone" style={{ width: 84, height: 84, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => fileRef.current?.click()}>+ Upload</div>
      </div>
      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => pickFiles(e.target.files)} />

      <div className="url-add">
        <input type="url" placeholder="Paste an image URL…" value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addUrl() } }} />
        <button type="button" className="btn sm" onClick={addUrl} disabled={!urlInput.trim()}>Add URL</button>
      </div>

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
