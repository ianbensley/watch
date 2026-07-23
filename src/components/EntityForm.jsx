import { useState } from 'react'
import Modal from './Modal.jsx'
import { api } from '../api.js'
import { IcTrash } from './Icons.jsx'

export default function EntityForm({ kind, item, data, onClose, onSaved }) {
  const editing = !!item?.id
  const [form, setForm] = useState(() => item ? { ...item } : (
    kind === 'brand'
      ? { name: '', country: 'Japan', founded: '', website: '', notes: '' }
      : { name: '', brand_id: data.brands[0]?.id || '', description: '', notes: '' }
  ))
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }))
  const label = kind === 'brand' ? 'Brand' : 'Collection'

  const save = async () => {
    if (!form.name?.trim()) return
    setSaving(true)
    try {
      if (kind === 'brand') editing ? await api.updateBrand(item.id, form) : await api.createBrand(form)
      else editing ? await api.updateCollection(item.id, form) : await api.createCollection({ ...form, brand_id: Number(form.brand_id) })
      await onSaved(); onClose()
    } finally { setSaving(false) }
  }

  const del = async () => {
    const warn = kind === 'brand'
      ? 'Delete this brand? All its collections and watches will be removed.'
      : 'Delete this collection? All its watches will be removed.'
    if (!confirm(warn)) return
    if (kind === 'brand') await api.deleteBrand(item.id); else await api.deleteCollection(item.id)
    await onSaved(); onClose()
  }

  return (
    <Modal sub={`${editing ? 'Edit' : 'New'} ${label}`} title={form.name || `New ${label}`} onClose={onClose}
      footer={(
        <>
          {editing ? <button className="btn ghost danger" onClick={del}><IcTrash size={15} /> Delete</button> : <span />}
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn ghost" onClick={onClose}>Cancel</button>
            <button className="btn primary" disabled={saving || !form.name?.trim()} onClick={save}>
              {saving ? 'Saving…' : editing ? 'Save' : `Create ${label}`}
            </button>
          </div>
        </>
      )}>
      <div className="field"><label>Name *</label>
        <input value={form.name} onChange={(e) => set('name', e.target.value)} autoFocus /></div>

      {kind === 'brand' ? (
        <>
          <div className="grid2">
            <div className="field"><label>Country</label>
              <input value={form.country || ''} onChange={(e) => set('country', e.target.value)} /></div>
            <div className="field"><label>Founded</label>
              <input value={form.founded || ''} onChange={(e) => set('founded', e.target.value)} placeholder="e.g. 1881" /></div>
          </div>
          <div className="field"><label>Website</label>
            <input value={form.website || ''} onChange={(e) => set('website', e.target.value)} placeholder="https://…" /></div>
          <div className="field"><label>Notes</label>
            <textarea value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} /></div>
        </>
      ) : (
        <>
          <div className="field"><label>Brand *</label>
            <select value={form.brand_id} onChange={(e) => set('brand_id', e.target.value)}>
              {data.brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select></div>
          <div className="field"><label>Description</label>
            <textarea value={form.description || ''} onChange={(e) => set('description', e.target.value)} /></div>
          <div className="field"><label>Notes</label>
            <textarea value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} /></div>
        </>
      )}
    </Modal>
  )
}
