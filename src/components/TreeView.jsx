import { useMemo, useRef, useState, useEffect } from 'react'
import Tree from 'react-d3-tree'

const COLORS = { root: '#c8a24a', brand: '#c8a24a', collection: '#b8402f', family: '#5b8bb0', watch: '#4a9d6e' }

export default function TreeView({ data, maps, filtered, onOpenWatch }) {
  const wrap = useRef(null)
  const [translate, setTranslate] = useState({ x: 180, y: 300 })

  useEffect(() => {
    if (wrap.current) {
      const { height } = wrap.current.getBoundingClientRect()
      setTranslate({ x: 170, y: height / 2 })
    }
  }, [])

  const tree = useMemo(() => {
    const ids = new Set(filtered.map((w) => w.id))
    const useAll = filtered.length === data.watches.length
    const inFilter = (w) => useAll || ids.has(w.id)

    const brands = data.brands.map((b) => {
      const colls = data.collections.filter((c) => c.brand_id === b.id).map((c) => {
        const fams = (data.families || []).filter((f) => f.collection_id === c.id).map((f) => {
          const ws = data.watches.filter((w) => w.family_id === f.id && inFilter(w))
            .map((w) => ({ name: w.name, _type: 'watch', _watch: w }))
          return { name: f.name, _type: 'family', children: ws }
        }).filter((f) => f.children.length || useAll)
        return { name: c.name, _type: 'collection', children: fams }
      }).filter((c) => c.children.length || useAll)
      return { name: b.name, _type: 'brand', children: colls }
    }).filter((b) => b.children.length)

    return { name: 'All Brands', _type: 'root', children: brands }
  }, [data, filtered])

  const renderNode = ({ nodeDatum, toggleNode }) => {
    const t = nodeDatum._type
    const color = COLORS[t] || '#8a8577'
    const isWatch = t === 'watch'
    const r = t === 'root' ? 9 : t === 'brand' ? 8 : t === 'collection' ? 7 : t === 'family' ? 6 : 5.5
    const size = t === 'root' ? 15 : t === 'brand' ? 14 : t === 'collection' ? 13 : t === 'family' ? 12 : 11.5
    const count = nodeDatum.children?.length
    return (
      <g style={{ cursor: 'pointer' }}
        onClick={(e) => { e.stopPropagation(); isWatch ? onOpenWatch(nodeDatum._watch) : toggleNode() }}>
        <circle r={r} fill={nodeDatum.__rd3t?.collapsed ? '#221f1b' : color} stroke={color} strokeWidth={1.6} />
        <text x={r + 8} dy={4} fill={isWatch ? '#ece7dc' : color}
          style={{ fontFamily: isWatch ? 'Inter, sans-serif' : "'Shippori Mincho', serif",
            fontSize: size, fontWeight: isWatch ? 400 : 600, strokeWidth: 0 }}>
          {nodeDatum.name}{!isWatch && count != null ? `  (${count})` : ''}
        </text>
      </g>
    )
  }

  return (
    <div className="tree-wrap" ref={wrap}>
      <div className="tree-hint">Scroll to zoom · drag to pan · click a node to expand · click a watch to open</div>
      {tree.children.length ? (
        <Tree
          data={tree}
          orientation="horizontal"
          translate={translate}
          renderCustomNodeElement={renderNode}
          pathClassFunc={() => 'tree-link'}
          separation={{ siblings: 0.65, nonSiblings: 0.9 }}
          nodeSize={{ x: 220, y: 30 }}
          zoom={0.8}
          scaleExtent={{ min: 0.15, max: 2.5 }}
          enableLegacyTransitions
        />
      ) : (
        <div className="empty" style={{ marginTop: 100 }}><span className="kanji">空</span>Nothing to show.</div>
      )}
      <div className="tree-legend">
        <div className="row"><span className="swatch" style={{ background: COLORS.brand }} /> Brand</div>
        <div className="row"><span className="swatch" style={{ background: COLORS.collection }} /> Collection</div>
        <div className="row"><span className="swatch" style={{ background: COLORS.family }} /> Family</div>
        <div className="row"><span className="swatch" style={{ background: COLORS.watch }} /> Watch</div>
      </div>
      <style>{`.tree-link{stroke:#34302a;stroke-width:1.3px;fill:none;}`}</style>
    </div>
  )
}
