import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Modal, Field } from '../ui.jsx';

function Users({ roles }) {
  const [users, setUsers] = useState([]);
  const [edit, setEdit] = useState(null);
  const [err, setErr] = useState('');
  const load = () => api('/admin/users').then(setUsers);
  useEffect(() => { load(); }, []);
  const save = async e => {
    e.preventDefault(); setErr('');
    try {
      edit._id ? await api('/admin/users/' + edit._id, { method: 'PUT', body: edit }) : await api('/admin/users', { method: 'POST', body: edit });
      setEdit(null); load();
    } catch (x) { setErr(x.message); }
  };
  const del = async () => { try { await api('/admin/users/' + edit._id, { method: 'DELETE' }); setEdit(null); load(); } catch (x) { setErr(x.message); } };
  const toggle = (id) => setEdit({ ...edit, roles: edit.roles.includes(id) ? edit.roles.filter(r => r !== id) : [...edit.roles, id] });
  return (
    <>
      <div className="page-head"><h3>Benutzer</h3><button className="btn gold" onClick={() => setEdit({ name: '', email: '', password: '', isAdmin: false, active: true, roles: [] })}>+ Benutzer</button></div>
      <div className="card" style={{ padding: 8 }}><table>
        <thead><tr><th>Name</th><th>E-Mail</th><th>Rollen</th><th>Status</th></tr></thead>
        <tbody>{users.map(u => (
          <tr key={u._id} className="click" onClick={() => setEdit({ ...u, password: '' })}>
            <td><b>{u.name}</b> {u.isAdmin && <span className="badge neu">Admin</span>}</td><td>{u.email}</td>
            <td>{u.roles.map(r => roles.find(x => x._id === r)?.name).filter(Boolean).join(', ') || '–'}</td>
            <td>{u.active ? 'Aktiv' : 'Deaktiviert'}</td></tr>))}</tbody></table></div>
      {edit && <Modal onClose={() => setEdit(null)}><form onSubmit={save}>
        <Field label="Name"><input required value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} /></Field>
        <Field label="E-Mail"><input required type="email" value={edit.email} onChange={e => setEdit({ ...edit, email: e.target.value })} /></Field>
        <Field label={edit._id ? 'Neues Passwort (leer = unverändert)' : 'Passwort (min. 8 Zeichen)'}><input type="password" value={edit.password} onChange={e => setEdit({ ...edit, password: e.target.value })} /></Field>
        <Field label="Rollen"><div className="row">{roles.map(r => <span key={r._id} className="chip" style={{ cursor: 'pointer', background: edit.roles.includes(r._id) ? 'var(--petrol-light)' : undefined }} onClick={() => toggle(r._id)}>{edit.roles.includes(r._id) ? '✓ ' : ''}{r.name}</span>)}
          {!roles.length && <span className="sub">Erst Rollen anlegen</span>}</div></Field>
        <div className="row" style={{ marginBottom: 14 }}>
          <label className="row"><input type="checkbox" style={{ width: 'auto' }} checked={edit.isAdmin} onChange={e => setEdit({ ...edit, isAdmin: e.target.checked })} />Administrator</label>
          <label className="row"><input type="checkbox" style={{ width: 'auto' }} checked={edit.active} onChange={e => setEdit({ ...edit, active: e.target.checked })} />Aktiv</label></div>
        {err && <p className="err">{err}</p>}
        <div className="row"><button className="btn">Speichern</button>{edit._id && <button type="button" className="btn danger small" style={{ marginLeft: 'auto' }} onClick={del}>Löschen</button>}</div>
      </form></Modal>}
    </>
  );
}

function Roles({ roles, apps, reload }) {
  const [edit, setEdit] = useState(null);
  const save = async e => {
    e.preventDefault();
    edit._id ? await api('/admin/roles/' + edit._id, { method: 'PUT', body: edit }) : await api('/admin/roles', { method: 'POST', body: edit });
    setEdit(null); reload();
  };
  const del = async () => { if (confirm('Rolle löschen?')) { await api('/admin/roles/' + edit._id, { method: 'DELETE' }); setEdit(null); reload(); } };
  const toggle = k => setEdit({ ...edit, apps: edit.apps.includes(k) ? edit.apps.filter(a => a !== k) : [...edit.apps, k] });
  return (
    <>
      <div className="page-head"><h3>Rollen &amp; Anwendungszugriff</h3><button className="btn gold" onClick={() => setEdit({ name: '', description: '', apps: [] })}>+ Rolle</button></div>
      <div className="card" style={{ padding: 8 }}><table>
        <thead><tr><th>Rolle</th><th>Beschreibung</th><th>Anwendungen</th></tr></thead>
        <tbody>{roles.map(r => <tr key={r._id} className="click" onClick={() => setEdit(r)}><td><b>{r.name}</b></td><td>{r.description}</td>
          <td>{r.apps.map(k => apps.find(a => a.key === k)?.name).filter(Boolean).join(', ') || '–'}</td></tr>)}</tbody></table></div>
      {edit && <Modal onClose={() => setEdit(null)}><form onSubmit={save}>
        <Field label="Name"><input required value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} /></Field>
        <Field label="Beschreibung"><input value={edit.description || ''} onChange={e => setEdit({ ...edit, description: e.target.value })} /></Field>
        <Field label="Zugriff auf Anwendungen">{apps.map(a => (
          <label key={a.key} className="row" style={{ marginBottom: 6, color: 'var(--text)', fontSize: 14 }}>
            <input type="checkbox" style={{ width: 'auto' }} checked={edit.apps.includes(a.key) || !!a.public} disabled={a.public} onChange={() => toggle(a.key)} />
            {a.icon} {a.name}{a.public && <small className="sub"> (für alle)</small>}</label>))}</Field>
        <div className="row"><button className="btn">Speichern</button>{edit._id && <button type="button" className="btn danger small" style={{ marginLeft: 'auto' }} onClick={del}>Löschen</button>}</div>
      </form></Modal>}
    </>
  );
}

export default function Admin() {
  const [tab, setTab] = useState('users');
  const [roles, setRoles] = useState([]);
  const [apps, setApps] = useState([]);
  const reload = () => api('/admin/roles').then(setRoles);
  useEffect(() => { reload(); api('/admin/apps').then(setApps); }, []);
  return (
    <>
      <h1 style={{ marginBottom: 16 }}>Administration</h1>
      <div className="tabs"><button className={tab === 'users' ? 'on' : ''} onClick={() => setTab('users')}>Benutzer</button>
        <button className={tab === 'roles' ? 'on' : ''} onClick={() => setTab('roles')}>Rollen</button></div>
      {tab === 'users' ? <Users roles={roles} /> : <Roles roles={roles} apps={apps} reload={reload} />}
    </>
  );
}
