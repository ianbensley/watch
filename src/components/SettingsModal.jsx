import { useState } from 'react'
import Modal from './Modal.jsx'

export default function SettingsModal({ settings, onSave, onClose }) {
  const [speed, setSpeed] = useState(settings.slideshowSpeed ?? 3)

  const save = () => {
    onSave({ ...settings, slideshowSpeed: Math.max(0.5, Number(speed) || 3) })
    onClose()
  }

  return (
    <Modal sub="Settings" title="Settings" onClose={onClose}
      footer={<><span />
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={save}>Save</button>
        </div></>}>
      <div className="field">
        <label>Slideshow speed (seconds per image)</label>
        <div className="unit-in">
          <input type="number" min="0.5" step="0.5" value={speed} onChange={(e) => setSpeed(e.target.value)} />
          <span>sec</span>
        </div>
      </div>
      <p style={{ color: 'var(--text-faint)', fontSize: 12.5, marginTop: 4 }}>
        Applies to any watch whose photo display mode is set to <b>Slideshow</b>. Set a watch’s mode in its edit form under Photos.
      </p>
    </Modal>
  )
}
