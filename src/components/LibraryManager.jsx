import { useState } from 'react'
import Modal from './Modal.jsx'
import EntityForm from './EntityForm.jsx'
import { api } from '../api.js'
import { IcPlus, IcEdit, IcTrash } from './Icons.jsx'

export default function LibraryManager({ data, maps, reload, onClose, onImport }) {
  const [editor, setEditor] = useState(null) // { kind, item? }

  const collsFor = (bid) => data.collections.filter((c) => c.brand_id === bid)
  const famsFor = (cid) => (data.families || []).filter((f) => f.collection_id === cid)
  const wInFamily = (fid) => maps.watches.filter((w) => w._family?.id === fid).length
  const wInColl = (cid) => maps.watches.filter((w) => w._coll?.id === cid).length
  const wInBrand = (bid) => maps.watches.filter((w) => w._brand?.id === bid).length

  const delBrand = async (b) => {
    if (confirm(`Delete “${b.name}” and everything inside it (${collsFor(b.id).length} collections, ${wInBrand(b.id)} watches), including photos? This cannot be undone.`)) {
      await api.deleteBrand(b.id); await reload()
    }
  }
  const delColl = async (c) => {
    if (confirm(`Delete collection “${c.name}” and its ${famsFor(c.id).length} families / ${wInColl(c.id)} watches, including photos? This cannot be undone.`)) {
      await api.deleteCollection(c.id); await reload()
    }
  }
  const delFam = async (f) => {
    if (confirm(`Delete family “${f.name}” and its ${wInFamily(f.id)} watches, including photos? This cannot be undone.`)) {
      await api.deleteFamily(f.id); await reload()
    }
  }

  if (editor) {
    return <EntityForm kind={editor.kind} item={editor.item} data={data}
      onClose={() => setEditor(null)} onSaved={reload} />
  }

  return (
    <Modal wide sub="Manage" title="Library" onClose={onClose}
      footer={(
        <>
          <button className="btn ghost" onClick={onImport}>Import JSON…</button>
          <button className="btn gold" onClick={() => setEditor({ kind: 'brand' })}><IcPlus size={15} /> New Brand</button>
        </>
      )}>
      <p style={{ color: 'var(--text-dim)', marginTop: 0 }}>
        Brand › Collection › Family › Watch. Deleting any level removes everything beneath it.
      </p>

      {!data.brands.length && <div className="empty" style={{ padding: 30 }}>No brands yet.</div>}

      {data.brands.map((b) => (
        <div className="lib-brand" key={b.id}>
          <div className="lib-row lib-head">
            <div className="lib-name">{b.name}
              <span className="lib-meta">{collsFor(b.id).length} collections · {wInBrand(b.id)} watches</span>
            </div>
            <div className="lib-actions">
              <button className="btn icon ghost sm" title="Add collection" onClick={() => setEditor({ kind: 'collection', item: { brand_id: b.id } })}><IcPlus size={14} /></button>
              <button className="btn icon ghost sm" title="Edit brand" onClick={() => setEditor({ kind: 'brand', item: b })}><IcEdit size={14} /></button>
              <button className="btn icon ghost sm danger" title="Delete brand" onClick={() => delBrand(b)}><IcTrash size={14} /></button>
            </div>
          </div>

          {collsFor(b.id).map((c) => (
            <div key={c.id}>
              <div className="lib-row lib-sub">
                <div className="lib-name">{c.name}<span className="lib-meta">{famsFor(c.id).length} families</span></div>
                <div className="lib-actions">
                  <button className="btn icon ghost sm" title="Add family" onClick={() => setEditor({ kind: 'family', item: { collection_id: c.id } })}><IcPlus size={14} /></button>
                  <button className="btn icon ghost sm" title="Edit collection" onClick={() => setEditor({ kind: 'collection', item: c })}><IcEdit size={14} /></button>
                  <button className="btn icon ghost sm danger" title="Delete collection" onClick={() => delColl(c)}><IcTrash size={14} /></button>
                </div>
              </div>
              {famsFor(c.id).map((f) => (
                <div className="lib-row lib-sub2" key={f.id}>
                  <div className="lib-name">{f.name}<span className="lib-meta">{wInFamily(f.id)} watches</span></div>
                  <div className="lib-actions">
                    <button className="btn icon ghost sm" title="Edit family" onClick={() => setEditor({ kind: 'family', item: f })}><IcEdit size={14} /></button>
                    <button className="btn icon ghost sm danger" title="Delete family" onClick={() => delFam(f)}><IcTrash size={14} /></button>
                  </div>
                </div>
              ))}
              {!famsFor(c.id).length && <div className="lib-row lib-sub2" style={{ color: 'var(--text-faint)' }}>No families</div>}
            </div>
          ))}
          {!collsFor(b.id).length && <div className="lib-row lib-sub" style={{ color: 'var(--text-faint)' }}>No collections</div>}
        </div>
      ))}
    </Modal>
  )
}
