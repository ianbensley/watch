import { IcClose } from './Icons.jsx'

export default function Modal({ title, sub, onClose, children, footer, wide }) {
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`}>
        <div className="modal-head">
          <div>
            {sub && <div className="sub">{sub}</div>}
            <h2>{title}</h2>
          </div>
          <button className="btn icon ghost" onClick={onClose}><IcClose /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}
