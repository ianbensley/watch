import { useEffect, useMemo, useRef, useState } from 'react'
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
  const [busy, setBusy] = useState(false)      // creating / adding images
  const [status, setStatus] = useState('')     // autosave status text
  const [dragIdx, setDragIdx] = useState(null)
  const fileRef = useRef(null)
  const firstRun = useRef(true)

  const groups = useMemo(() => {
    const g = {}
    fields.forEach((f) => { (g[f.group_name] = g[f.group_name] || []).push(f) })
    return g
  }, [fields])

  const set = (k, v) => setValues((s) => ({ ...s, [k]: v }))
  const payload = () => ({ family_id: Number(familyId), name: name.trim(), values, image_mode: imageMode })
  const canSave = name.trim() && familyId

  // ---- Auto-save while editing an existing watch ----
  const saveNow = async () => {
    if (!editing || !canSave) return
    setStatus('Saving…')
    try { await api.updateWatch(id, payload()); setStatus('Saved') }
    catch { setStatus('Save failed') }
  }
  useEffect(() => {
    if (!editing) return
    if (firstRun.current) { firstRun.current = false; return }
    if (!canSave) return
    setStatus('Editing…')
    const t = setTimeout(saveNow, 600)
    return () => clearTimeout(t)
  }, [name, familyId, values, imageMode]) // eslint-disable-line

  // Close: flush a final save (editing) then refresh the parent views
  const close = async () => {
    if (editing && canSave) { try { await api.updateWatch(id, payload()) } catch {} }
    await onSaved()
    onClose()
  }

  // ---- Images ----
  const pickFiles = async (files) => {
    if (!files?.length) return
    if (id) { setBusy(true); try { setImages((await api.uploadImages(id, files)).images) } finally { setBusy(false) } }
    else setQueued((q) => [...q, ...[...files].map((file) => ({ file, url: URL.createObjectURL(file) }))])
  }
  const addUrl = async () => {
    const u = urlInput.trim()
    if (!u) return
    setUrlInput('')
    if (id) { setBusy(true); try { setImages((await api.addImageUrls(id, [u])).images) } finally { setBusy(false) } }
    else setQueued((q) => [...q, { url: u, external: true }])
  }
  const removeImage = async (img) => { await api.deleteImage(img.id); setImages((a) => a.filter((i) => i.id !== img.id)) }
  const makePrimary = async (img) => { setImages((await api.setPrimaryImage(img.id)).images) }

  const reorder = async (from, to) => {
    if (from == null || from === to) return
    if (id) {
      const list = [...images]
      const [m] = list.splice(from, 1); list.splice(to, 0, m)
      setImages(list)
      try { await api.reorderImages(id, list.map((i) => i.id)) } catch {}
    } else {
      const list = [...queued]
      const [m] = list.splice(from, 1); list.splice(to, 0, m)
      setQueued(list)
    }
  }

  // ---- Create (new watch only) ----
  const create = async () => {
    if (!canSave) return
    setBusy(true)
    try {
      let saved = await api.createWatch(payload())
      setId(saved.id)
      const files = queued.filter((q) => q.file).map((q) => q.file)
      const urls = queued.filter((q) => q.external).map((q) => q.url)
      if (files.length) saved = await api.uploadImages(saved.id, files)
      if (urls.length) saved = await api.addImageUrls(saved.id, urls)
      await onSaved()
      onClose()
    } finally { setBusy(false) }
  }

  const del = async () => {
    if (confirm(`Delete "${name}"? This cannot be undone.`)) { await api.deleteWatch(id); await onSaved(); onClose() }
  }

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
    <Modal wide sub={editing ? 'Edit Watch' : 'New Watch'} title={name || 'Untitled Watch'} onClose={close}
      footer={editing ? (
        <>
          <button className="btn ghost danger" onClick={del}><IcTrash size={15} /> Delete</button>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ color: 'var(--text-faint)', fontSize: 12 }}>{status || 'All changes saved'}</span>
            <button className="btn gold" onClick={close}>Done</button>
          </div>
        </>
      ) : (
        <>
          <span />
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn ghost" onClick={onClose}>Cancel</button>
            <button className="btn primary" disabled={busy || !canSave} onClick={create}>
              {busy ? 'Creating…' : 'Create Watch'}
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
        {shownImages.length > 1 ? 'Drag thumbnails to reorder. ' : ''}Display mode sets how photos appear on the card; slideshow speed is in Settings.
      </div>

      <div className="img-strip">
        {shownImages.map((img, i) => (
          <div className={`img-thumb ${dragIdx === i ? 'dragging' : ''}`} key={img.id || i}
            draggable
            onDragStart={() => setDragIdx(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => { reorder(dragIdx, i); setDragIdx(null) }}
            onDragEnd={() => setDragIdx(null)}>
            <img src={img.url} alt="" draggable={false} />
            {(img.external || img.filename === null) && <span className="url-tag" title="Linked (not downloaded)">URL</span>}
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
        <button type="button" className="btn sm" onClick={addUrl} disabled={!urlInput.trim() || busy}>Add URL</button>
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
