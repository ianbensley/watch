import { useRef, useState } from 'react'
import Modal from './Modal.jsx'
import { api } from '../api.js'

const EXAMPLE = {
  brands: [
    {
      name: 'Orient', country: 'Japan', founded: '1950', website: 'https://www.orientwatch.com',
      collections: [
        {
          name: 'Sports', description: 'Affordable mechanical sports watches.',
          families: [
            {
              name: 'Mako', description: 'Diver-style 200m watches.',
              watches: [
                { name: 'Mako II', values: { reference: 'FAA02005D9', status: 'Wishlist', movement: 'Automatic', case_size: 41.5, water_resistance: 200, dial_color: 'Blue', price: 180 } },
                { name: 'Mako USA', values: { reference: 'AA02004B', status: 'Considering', movement: 'Automatic', case_size: 41.5, water_resistance: 200, dial_color: 'Black' } },
              ],
            },
          ],
        },
      ],
    },
  ],
}

export default function ImportModal({ onClose, onSaved }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const [err, setErr] = useState('')
  const fileRef = useRef(null)

  const loadFile = (file) => {
    if (!file) return
    const r = new FileReader()
    r.onload = () => setText(String(r.result || ''))
    r.readAsText(file)
  }

  const downloadExample = () => {
    const blob = new Blob([JSON.stringify(EXAMPLE, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'watch-import-example.json'
    a.click()
  }

  const doImport = async () => {
    setErr(''); setMsg(null)
    let payload
    try { payload = JSON.parse(text) }
    catch (e) { setErr('That isn’t valid JSON: ' + e.message); return }
    if (!payload || !Array.isArray(payload.brands)) { setErr('JSON must have a top-level "brands" array.'); return }
    setBusy(true)
    try {
      const res = await api.importData(payload)
      const c = res.counts
      setMsg(`Imported ${c.brands} brands, ${c.collections} collections, ${c.families} families, ${c.watches} watches${c.fields ? `, ${c.fields} fields` : ''}.`)
      setText('')
      await onSaved()
    } catch (e) { setErr(e.message) }
    finally { setBusy(false) }
  }

  return (
    <Modal wide sub="Bulk import" title="Import from JSON" onClose={onClose}
      footer={(
        <>
          <button className="btn ghost" onClick={downloadExample}>Download example</button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn ghost" onClick={onClose}>Close</button>
            <button className="btn primary" disabled={busy || !text.trim()} onClick={doImport}>
              {busy ? 'Importing…' : 'Import'}
            </button>
          </div>
        </>
      )}>
      <p style={{ color: 'var(--text-dim)', marginTop: 0 }}>
        Paste JSON or upload a <code>.json</code> file with a <b>brands → collections → families → watches</b> structure.
        Existing brands, collections and families are matched by name (created if missing); watches are added.
        A collection may list <code>watches</code> directly and they’ll go into a “General” family.
      </p>
      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        <button className="btn ghost sm" onClick={() => fileRef.current?.click()}>Choose file…</button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => loadFile(e.target.files[0])} />
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} spellCheck={false}
        placeholder='{ "brands": [ { "name": "Orient", "collections": [ … ] } ] }'
        style={{ width: '100%', minHeight: 240, background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 8, color: 'var(--text)', padding: 12, fontFamily: 'monospace', fontSize: 13 }} />
      {err && <div className="login-err" style={{ marginTop: 10 }}>{err}</div>}
      {msg && <div style={{ marginTop: 10, color: 'var(--jade)' }}>{msg}</div>}
    </Modal>
  )
}
