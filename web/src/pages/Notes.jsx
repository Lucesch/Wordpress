import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Modal, Field } from '../ui.jsx';

const COLORS = ['warm', 'gold', 'teal', 'white'];

export default function Notes() {
  const [notes, setNotes] = useState([]);
  const [edit, setEdit] = useState(null);
  const load = () => api('/notes').then(setNotes);
  useEffect(() => { load(); }, []);
  const save = async e => {
    e.preventDefault();
    edit._id ? await api('/notes/' + edit._id, { method: 'PUT', body: edit }) : await api('/notes', { method: 'POST', body: edit });
    setEdit(null); load();
  };
  const del = async () => { await api('/notes/' + edit._id, { method: 'DELETE' }); setEdit(null); load(); };
  return (
    <>
      <div className="page-head"><div><h1>Notizen</h1><p className="sub">Nur für dich sichtbar</p></div>
        <button className="btn gold" onClick={() => setEdit({ title: '', content: '', color: 'warm' })}>+ Neue Notiz</button></div>
      <div className="notes">
        {notes.map(n => (
          <div key={n._id} className={'note c-' + n.color} onClick={() => setEdit(n)}>
            <h4>{n.pinned && '📌 '}{n.title || 'Ohne Titel'}</h4><p>{n.content}</p>
          </div>
        ))}
      </div>
      {!notes.length && <p className="sub">Noch keine Notizen.</p>}
      {edit && (
        <Modal onClose={() => setEdit(null)}>
          <form onSubmit={save}>
            <Field label="Titel"><input autoFocus value={edit.title || ''} onChange={e => setEdit({ ...edit, title: e.target.value })} /></Field>
            <Field label="Inhalt"><textarea rows="8" value={edit.content || ''} onChange={e => setEdit({ ...edit, content: e.target.value })} /></Field>
            <div className="row" style={{ marginBottom: 14 }}>
              {COLORS.map(c => <span key={c} className={'note c-' + c} style={{ width: 28, height: 28, padding: 0, margin: 0, outline: edit.color === c ? '2px solid var(--petrol-dark)' : '1px solid var(--line)' }} onClick={() => setEdit({ ...edit, color: c })} />)}
              <label style={{ margin: '0 0 0 auto', display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" style={{ width: 'auto' }} checked={!!edit.pinned} onChange={e => setEdit({ ...edit, pinned: e.target.checked })} />Anheften</label>
            </div>
            <div className="row"><button className="btn">Speichern</button>
              {edit._id && <button type="button" className="btn danger small" style={{ marginLeft: 'auto' }} onClick={del}>Löschen</button>}</div>
          </form>
        </Modal>
      )}
    </>
  );
}
