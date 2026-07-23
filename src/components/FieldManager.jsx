import { useState } from 'react'
import Modal from './Modal.jsx'
import { api } from '../api.js'
import { IcTrash, IcPlus, IcEdit, IcChevron } from './Icons.jsx'

const TYPES = ['text', 'longtext', 'number', 'select', 'boolean', 'date', 'url']
const blank = { label: '', type: 'text', unit: '', group_name: 'Custom', options: [], show_in_gallery: true, show_in_table: true }

export default function FieldManager({ fields, onClose, onSaved }) {
  const [editing, setEditing] = useState(null) // field object or 'new'
  const [form, setForm] = useState(blank)
  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }))

  // Distinct groups in their current display order (fields arrive sorted by `sort`).
  const groupsOrder = []
  fields.forEach((f) => { if (!groupsOrder.includes(f.group_name)) groupsOrder.push(f.group_name) })

  const startNew = () => { setForm(blank); setEditing('new') }
  const startEdit = (f) => { setForm({ ...f, options: f.options || [], show_in_gallery: !!f.show_in_gallery, show_in_table: !!f.show_in_table }); setEditing(f) }

  const save = async () => {
    if (!form.label.trim()) return
    const payload = { ...form, group_name: (form.group_name || 'Custom').trim() || 'Custom', options: form.type === 'select' ? form.options.filter(Boolean) : [] }
    if (editing === 'new') await api.createField(payload)
    else await api.updateField(editing.id, payload)
    await onSaved(); setEditing(null)
  }
  const del = async (f) => {
    if (confirm(`Delete field "${f.label}"? Existing values for it are kept in the data but hidden.`)) {
      await api.deleteField(f.id); await onSaved()
    }
  }

  const moveGroup = async (idx, dir) => {
    const gs = [...groupsOrder]
    const t = idx + dir
    if (t < 0 || t >= gs.length) return
    ;[gs[idx], gs[t]] = [gs[t], gs[idx]]
    const order = []
    gs.forEach((g) => fields.filter((f) => f.group_name === g).forEach((f) => order.push(f.id)))
    await api.reorderFields(order); await onSaved()
  }

  if (editing) {
    return (
      <Modal sub={editing === 'new' ? 'New Field' : 'Edit Field'} title={form.label || 'Field'} onClose={() => setEditing(null)}
        footer={(
          <>
            <span />
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn primary" onClick={save} disabled={!form.label.trim()}>Save Field</button>
            </div>
          </>
        )}>
        <div className="grid2">
          <div className="field"><label>Label *</label>
            <input value={form.label} onChange={(e) => set('label', e.target.value)} autoFocus placeholder="e.g. Bezel Type" /></div>
          <div className="field"><label>Type</label>
            <select value={form.type} onChange={(e) => set('type', e.target.value)}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select></div>
        </div>
        <div className="grid2">
          <div className="field"><label>Group</label>
            <input list="fm-groups" value={form.group_name} onChange={(e) => set('group_name', e.target.value)}
              placeholder="Pick or type a new group" />
            <datalist id="fm-groups">
              {groupsOrder.map((g) => <option key={g} value={g} />)}
            </datalist>
          </div>
          <div className="field"><label>Unit (optional)</label>
            <input value={form.unit || ''} onChange={(e) => set('unit', e.target.value)} placeholder="mm, m, £, h…" /></div>
        </div>
        {form.type === 'select' && (
          <div className="field"><label>Options (one per line)</label>
            <textarea value={(form.options || []).join('\n')}
              onChange={(e) => set('options', e.target.value.split('\n'))} placeholder={'Option A\nOption B'} /></div>
        )}
        <div className="fm-checks">
          <label>
            <input type="checkbox" checked={form.show_in_gallery} onChange={(e) => set('show_in_gallery', e.target.checked)} /> Available in gallery cards
          </label>
          <label>
            <input type="checkbox" checked={form.show_in_table} onChange={(e) => set('show_in_table', e.target.checked)} /> Available in table columns
          </label>
        </div>
      </Modal>
    )
  }

  return (
    <Modal wide sub="Customise" title="Fields & Specs" onClose={onClose}
      footer={<><span /><button className="btn gold" onClick={startNew}><IcPlus size={15} /> New Field</button></>}>
      <p style={{ color: 'var(--text-dim)', marginTop: 0 }}>
        Define the spec fields on every watch. Use the arrows to reorder groups — that order is used in the watch form.
      </p>

      {groupsOrder.map((g, gi) => (
        <div className="fm-group" key={g}>
          <div className="fm-group-head">
            <span className="fm-group-name">{g}</span>
            <div className="lib-actions">
              <button className="btn icon ghost sm" disabled={gi === 0} title="Move group up"
                onClick={() => moveGroup(gi, -1)}><span style={{ display: 'inline-flex', transform: 'rotate(-90deg)' }}><IcChevron size={14} /></span></button>
              <button className="btn icon ghost sm" disabled={gi === groupsOrder.length - 1} title="Move group down"
                onClick={() => moveGroup(gi, 1)}><span style={{ display: 'inline-flex', transform: 'rotate(90deg)' }}><IcChevron size={14} /></span></button>
            </div>
          </div>
          {fields.filter((f) => f.group_name === g).map((f) => (
            <div className="field-row" key={f.id}>
              <div className="fname">{f.label}</div>
              <span className="ftype">{f.type}{f.unit ? ` (${f.unit})` : ''}</span>
              <span className={`tag ${f.show_in_gallery ? 'on' : ''}`}>gallery</span>
              <span className={`tag ${f.show_in_table ? 'on' : ''}`}>table</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn icon ghost sm" onClick={() => startEdit(f)}><IcEdit size={14} /></button>
                <button className="btn icon ghost sm danger" onClick={() => del(f)}><IcTrash size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </Modal>
  )
}
