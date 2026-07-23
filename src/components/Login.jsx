import { useState } from 'react'

export default function Login({ onAuthed }) {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setErr('')
    try {
      const r = await fetch('/api/data', { headers: { 'x-app-password': pw } })
      if (r.ok) { sessionStorage.setItem('appauth', pw); onAuthed() }
      else setErr('Incorrect password')
    } catch { setErr('Could not reach the server') }
    finally { setBusy(false) }
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={submit}>
        <div className="login-mark">
          <span className="kanji">時計</span>
          <span className="en">Watch Directory</span>
        </div>
        <p className="login-sub">Enter the password to continue</p>
        <input type="password" value={pw} autoFocus placeholder="Password"
          onChange={(e) => setPw(e.target.value)} />
        {err && <div className="login-err">{err}</div>}
        <button className="btn gold" type="submit" disabled={busy || !pw}>
          {busy ? 'Checking…' : 'Enter'}
        </button>
      </form>
    </div>
  )
}
