import { useState } from 'react'
import Modal from './Modal.jsx'
import EntityForm from './EntityForm.jsx'
import { api } from '../api.js'
import { IcPlus, IcEdit, IcTrash } from './Icons.jsx'

export default function LibraryManager({ data, maps, reload, onClose }) {
  const [editor, setEditor] = useState(null) // { kind:'brand'|'collection', item? }

  const collsFor = (bid) => data.collections.filter((c) => c.brand_id === bid)
  const watchesInColl = (cid) => maps.watches.filter((w) => w.collection_id === cid).length
  const watchesInBrand = (bid) => maps.watches.filter((w) => w._brand?.id === bid).length

  const delBrand = async (b) => {
    const c = collsFor(b.id).length, w = watchesInBrand(b.id)
    if (confirm(`Delete “${b.name}” and everything inside it?\n\nThis also removes ${c} collection(s) and ${w} watch(es), including their photos. This cannot be undone.`)) {
      await api.deleteBrand(b.id); await reload()
    }
  }
  const delColl = async (c) => {
    const w = watchesInColl(c.id)
    if (confirm(`Delete collection “${c.name}” and its ${w} watch(es), including photos?\n\nThis cannot be undone.`)) {
      await api.deleteCollection(c.id); await reload()
    }
  }

  if (editor) {
    return <EntityForm kind={editor.kind} item={editor.item} data={data}
      onClose={() => setEditor(null)} onSaved={reload} />
  }

  return (
    <Modal wide sub="Manage" title="Library" onClose={onClose}
      footer={<><span />
        <button className="btn gold" onClick={() => setEditor({ kind: 'brand' })}><IcPlus size={15} /> New Brand</button></>}>
      <p style={{ color: 'var(--text-dim)', marginTop: 0 }}>
        Edit or delete brands and collections. Deleting a brand removes all its collections and watches; deleting a collection removes all its watches.
      </p>

      {!data.brands.length && <div className="empty" style={{ padding: 30 }}>No brands yet.</div>}

      {data.brands.map((b) => (
        <div className="lib-brand" key={b.id}>
          <div className="lib-row lib-head">
            <div className="lib-name">{b.name}
              <span className="lib-meta">{collsFor(b.id).length} collections · {watchesInBrand(b.id)} watches</span>
            </div>
            <div className="lib-actions">
              <button className="btn icon ghost sm" title="Add collection" onClick={() => setEditor({ kind: 'collection', item: { brand_id: b.id } })}><IcPlus size={14} /></button>
              <button className="btn icon ghost sm" title="Edit brand" onClick={() => setEditor({ kind: 'brand', item: b })}><IcEdit size={14} /></button>
              <button className="btn icon ghost sm danger" title="Delete brand" onClick={() => delBrand(b)}><IcTrash size={14} /></button>
            </div>
          </div>
          {collsFor(b.id).map((c) => (
            <div className="lib-row lib-sub" key={c.id}>
              <div className="lib-name">{c.name}<span className="lib-meta">{watchesInColl(c.id)} watches</span></div>
              <div className="lib-actions">
                <button className="btn icon ghost sm" title="Edit collection" onClick={() => setEditor({ kind: 'collection', item: c })}><IcEdit size={14} /></button>
                <button className="btn icon ghost sm danger" title="Delete collection" onClick={() => delColl(c)}><IcTrash size={14} /></button>
              </div>
            </div>
          ))}
          {!collsFor(b.id).length && <div className="lib-row lib-sub" style={{ color: 'var(--text-faint)' }}>No collections</div>}
        </div>
      ))}
    </Modal>
  )
}
