import { useEffect, useState } from 'react'
import { IcWatch } from './Icons.jsx'

// Renders a watch's images according to its display mode.
// mode: 'single' | 'collage' | 'slideshow'. speed is seconds per slide.
// forcedUrl (optional) overrides the mode and shows just that one image.
export default function WatchImages({ images = [], mode = 'single', speed = 3, forcedUrl = null }) {
  const imgs = images.filter((i) => i.url)
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (mode !== 'slideshow' || forcedUrl || imgs.length < 2) return
    const ms = Math.max(0.5, Number(speed) || 3) * 1000
    const t = setInterval(() => setIdx((i) => (i + 1) % imgs.length), ms)
    return () => clearInterval(t)
  }, [mode, speed, forcedUrl, imgs.length])

  useEffect(() => { if (idx >= imgs.length) setIdx(0) }, [imgs.length, idx])

  if (!imgs.length) return <span className="placeholder"><IcWatch size={46} /></span>
  if (forcedUrl) return <img src={forcedUrl} alt="" className="wi-single" />

  if (mode === 'collage' && imgs.length > 1) {
    const tiles = imgs.slice(0, 4)
    return (
      <div className={`wi-collage n${tiles.length}`}>
        {tiles.map((im, i) => <img key={i} src={im.url} alt="" loading="lazy" />)}
      </div>
    )
  }

  if (mode === 'slideshow' && imgs.length > 1) {
    return (
      <div className="wi-slideshow">
        {imgs.map((im, i) => <img key={i} src={im.url} alt="" className={i === idx ? 'on' : ''} loading="lazy" />)}
        <div className="wi-dots">{imgs.map((_, i) => <span key={i} className={i === idx ? 'on' : ''} />)}</div>
      </div>
    )
  }

  const primary = imgs.find((i) => i.is_primary) || imgs[0]
  return <img src={primary.url} alt="" className="wi-single" loading="lazy" />
}
