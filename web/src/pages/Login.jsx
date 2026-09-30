import React, { useState } from 'react';
import { api } from '../api.js';

export default function Login({ onLogin }) {
  const [f, setF] = useState({ email: '', password: '' });
  const [err, setErr] = useState('');
  const submit = async e => {
    e.preventDefault();
    try { await api('/auth/login', { method: 'POST', body: f }); onLogin(); } catch (x) { setErr(x.message); }
  };
  return (
    <div className="login">
      <form className="card" onSubmit={submit}>
        <h1>◆ Portal</h1>
        <p className="sub" style={{ marginBottom: 20 }}>Bitte melde dich an</p>
        <div className="field"><label>E-Mail</label><input type="email" autoFocus value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></div>
        <div className="field"><label>Passwort</label><input type="password" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} /></div>
        {err && <p className="err">{err}</p>}
        <button className="btn gold" style={{ width: '100%' }}>Anmelden</button>
      </form>
    </div>
  );
}
