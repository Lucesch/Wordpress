import React, { useEffect, useState, useCallback } from 'react';
import { api, fmtDate, fmtMoney } from '../api.js';
import { Modal, Field, STATUS } from '../ui.jsx';

const empty = { policyHolder: '', caseNumber: '', insurer: '', type: '', status: 'neu', amount: '', damageDate: '', description: '' };

function CaseForm({ item, onClose, onSaved }) {
  const [f, setF] = useState(item ? { ...item, damageDate: item.damageDate?.slice(0, 10) || '' } : empty);
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const save = async e => {
    e.preventDefault();
    const body = { ...f, amount: f.amount === '' ? undefined : Number(f.amount), damageDate: f.damageDate || undefined };
    try { item ? await api('/insurance/' + item._id, { method: 'PUT', body }) : await api('/insurance', { method: 'POST', body }); onSaved(); } catch (x) { setErr(x.message); }
  };
  const addNote = async () => {
    if (!note.trim()) return;
    const u = await api(`/insurance/${item._id}/notes`, { method: 'POST', body: { text: note } });
    setF({ ...f, notes: u.notes }); setNote('');
  };
  const del = async () => { if (confirm('Fall wirklich löschen?')) { await api('/insurance/' + item._id, { method: 'DELETE' }); onSaved(); } };
  return (
    <Modal drawer onClose={onClose}>
      <h2 style={{ marginBottom: 16 }}>{item ? 'Fall bearbeiten' : 'Neuer Fall'}</h2>
      <form onSubmit={save}>
        <Field label="Versicherungsnehmer *"><input required value={f.policyHolder} onChange={set('policyHolder')} /></Field>
        <div className="grid2">
          <Field label="Fallnummer"><input value={f.caseNumber || ''} onChange={set('caseNumber')} /></Field>
          <Field label="Status"><select value={f.status} onChange={set('status')}>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <Field label="Versicherung"><input value={f.insurer || ''} onChange={set('insurer')} /></Field>
          <Field label="Schadenart"><input value={f.type || ''} onChange={set('type')} /></Field>
          <Field label="Schadenhöhe (€)"><input type="number" step="0.01" value={f.amount ?? ''} onChange={set('amount')} /></Field>
          <Field label="Schadendatum"><input type="date" value={f.damageDate} onChange={set('damageDate')} /></Field>
        </div>
        <Field label="Beschreibung"><textarea rows="4" value={f.description || ''} onChange={set('description')} /></Field>
        {err && <p className="err">{err}</p>}
        <div className="row"><button className="btn">Speichern</button>
          <button type="button" className="btn ghost" style={{ color: 'var(--muted)' }} onClick={onClose}>Abbrechen</button>
          {item && <button type="button" className="btn danger small" style={{ marginLeft: 'auto' }} onClick={del}>Löschen</button>}</div>
      </form>
      {item && <>
        <h3 style={{ margin: '28px 0 8px' }}>Verlauf &amp; Notizen</h3>
        {(f.notes || []).map((n, i) => <div key={i} className="notes-log">{n.text}<br /><small>{n.author} · {new Date(n.at).toLocaleString('de-DE')}</small></div>)}
        <div className="row"><input placeholder="Notiz hinzufügen…" value={note} onChange={e => setNote(e.target.value)} style={{ flex: 1 }} /><button className="btn small" onClick={addNote}>Hinzufügen</button></div>
        <p className="sub" style={{ marginTop: 16, fontSize: 12 }}>Quelle: {item.source}{item.externalId ? ` · ID ${item.externalId}` : ''}</p>
      </>}
    </Modal>
  );
}

export default function Insurance() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [edit, setEdit] = useState(null);
  const load = useCallback(() => {
    api(`/insurance?q=${encodeURIComponent(q)}&status=${status}`).then(setItems);
    api('/insurance/stats').then(setStats);
  }, [q, status]);
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [load]);
  const s = k => stats.find(x => x._id === k);
  const saved = () => { setEdit(null); load(); };
  return (
    <>
      <div className="page-head">
        <div><h1>Versicherungsfälle</h1><p className="sub">{items.length} Fälle</p></div>
        <div className="row"><input placeholder="Suchen…" value={q} onChange={e => setQ(e.target.value)} style={{ width: 240 }} />
          <button className="btn gold" onClick={() => setEdit({})}>+ Neuer Fall</button></div>
      </div>
      <div className="stats">
        {Object.entries(STATUS).map(([k, v]) => (
          <div key={k} className={'stat' + (status === k ? ' on' : '')} onClick={() => setStatus(status === k ? '' : k)}>
            <b>{s(k)?.count || 0}</b><span>{v} · {fmtMoney(s(k)?.amount || 0)}</span>
          </div>
        ))}
      </div>
      <div className="card" style={{ padding: 8, overflowX: 'auto' }}>
        <table>
          <thead><tr><th>Fall</th><th>Versicherungsnehmer</th><th>Versicherung</th><th>Art</th><th>Datum</th><th>Höhe</th><th>Status</th></tr></thead>
          <tbody>
            {items.map(c => (
              <tr key={c._id} className="click" onClick={() => setEdit(c)}>
                <td>{c.caseNumber || '–'}</td><td><b>{c.policyHolder}</b></td><td>{c.insurer || '–'}</td><td>{c.type || '–'}</td>
                <td>{fmtDate(c.damageDate)}</td><td>{fmtMoney(c.amount)}</td><td><span className={'badge ' + c.status}>{STATUS[c.status]}</span></td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan="7" className="sub">Keine Fälle gefunden.</td></tr>}
          </tbody>
        </table>
      </div>
      {edit && <CaseForm item={edit._id ? edit : null} onClose={() => setEdit(null)} onSaved={saved} />}
    </>
  );
}
