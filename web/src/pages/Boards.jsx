import React, { useEffect, useState, useCallback } from 'react';
import { Routes, Route, Link, useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useMe } from '../main.jsx';
import { Modal, Field } from '../ui.jsx';

function MemberPicker({ value, onChange, exclude }) {
  const [dir, setDir] = useState([]);
  useEffect(() => { api('/directory').then(setDir); }, []);
  return (
    <div className="row">
      {dir.filter(u => u.id !== exclude).map(u => {
        const on = value.includes(u.id);
        return <span key={u.id} className="chip" style={{ cursor: 'pointer', background: on ? 'var(--petrol-light)' : undefined, fontWeight: on ? 700 : 400 }}
          onClick={() => onChange(on ? value.filter(x => x !== u.id) : [...value, u.id])}>{on ? '✓ ' : ''}{u.name}</span>;
      })}
    </div>
  );
}

function List() {
  const me = useMe();
  const [boards, setBoards] = useState([]);
  const [neu, setNeu] = useState(null);
  const nav = useNavigate();
  useEffect(() => { api('/boards').then(setBoards); }, []);
  const create = async e => { e.preventDefault(); const b = await api('/boards', { method: 'POST', body: neu }); nav('/boards/' + b._id); };
  return (
    <>
      <div className="page-head"><div><h1>Boards</h1><p className="sub">Deine Boards und Team-Boards</p></div>
        <button className="btn gold" onClick={() => setNeu({ title: '', members: [] })}>+ Neues Board</button></div>
      <div className="board-list">
        {boards.map(b => (
          <Link key={b._id} to={'/boards/' + b._id} className="board-tile">
            <h3>{b.title}</h3><small>{b.owner?._id === me.id || b.owner === me.id ? 'Von dir' : 'Von ' + b.owner?.name} · {b.members.length + 1} Mitglieder</small>
          </Link>
        ))}
      </div>
      {!boards.length && <p className="sub">Noch keine Boards.</p>}
      {neu && <Modal onClose={() => setNeu(null)}><h2 style={{ marginBottom: 14 }}>Neues Board</h2>
        <form onSubmit={create}>
          <Field label="Titel"><input required autoFocus value={neu.title} onChange={e => setNeu({ ...neu, title: e.target.value })} /></Field>
          <Field label="Team (wer darf mitarbeiten?)"><MemberPicker exclude={me.id} value={neu.members} onChange={members => setNeu({ ...neu, members })} /></Field>
          <button className="btn">Erstellen</button>
        </form></Modal>}
    </>
  );
}

function BoardView() {
  const { id } = useParams();
  const me = useMe();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [drag, setDrag] = useState(null);
  const [over, setOver] = useState(null);
  const [card, setCard] = useState(null);
  const [team, setTeam] = useState(null);
  const load = useCallback(() => api('/boards/' + id).then(setData).catch(() => nav('/boards')), [id]);
  useEffect(() => { load(); }, [load]);
  if (!data) return null;
  const { board, cards } = data;
  const isOwner = board.owner._id === me.id;
  const cardsOf = c => cards.filter(x => x.column === c._id).sort((a, b) => a.position - b.position);

  const drop = async (col, before) => {
    if (!drag) return;
    const list = cardsOf(col).filter(x => x._id !== drag);
    const idx = before ? list.findIndex(x => x._id === before) : list.length;
    const prev = list[idx - 1], next = list[idx];
    const position = prev && next ? (prev.position + next.position) / 2 : prev ? prev.position + 1 : next ? next.position - 1 : 1;
    setData({ ...data, cards: cards.map(x => x._id === drag ? { ...x, column: col._id, position } : x) });
    setDrag(null); setOver(null);
    await api(`/boards/${id}/cards/${drag}`, { method: 'PUT', body: { column: col._id, position } });
  };
  const addCard = async (col, e) => {
    e.preventDefault(); const title = e.target.t.value.trim(); if (!title) return;
    await api(`/boards/${id}/cards`, { method: 'POST', body: { column: col._id, title } }); e.target.reset(); load();
  };
  const addCol = async () => { const t = prompt('Name der Spalte'); if (t) { await api(`/boards/${id}/columns`, { method: 'POST', body: { title: t } }); load(); } };
  const renCol = async c => { const t = prompt('Neuer Name', c.title); if (t) { await api(`/boards/${id}/columns/${c._id}`, { method: 'PUT', body: { title: t } }); load(); } };
  const delCol = async c => { if (confirm(`Spalte "${c.title}" samt Karten löschen?`)) { await api(`/boards/${id}/columns/${c._id}`, { method: 'DELETE' }); load(); } };
  const saveCard = async e => { e.preventDefault(); await api(`/boards/${id}/cards/${card._id}`, { method: 'PUT', body: card }); setCard(null); load(); };
  const delCard = async () => { await api(`/boards/${id}/cards/${card._id}`, { method: 'DELETE' }); setCard(null); load(); };
  const delBoard = async () => { if (confirm('Board löschen?')) { await api('/boards/' + id, { method: 'DELETE' }); nav('/boards'); } };
  const saveTeam = async () => { await api('/boards/' + id, { method: 'PUT', body: { members: team } }); setTeam(null); load(); };
  const people = [board.owner, ...board.members];

  return (
    <>
      <div className="page-head">
        <div><Link to="/boards" className="sub">← Alle Boards</Link><h1>{board.title}</h1>
          <div className="row" style={{ marginTop: 8 }}>{people.map(p => <span key={p._id} className="chip">{p.name}</span>)}</div></div>
        <div className="row">
          {isOwner && <button className="btn ghost small" style={{ color: 'var(--petrol-dark)' }} onClick={() => setTeam(board.members.map(m => m._id))}>👥 Team</button>}
          {(isOwner || me.isAdmin) && <button className="btn danger small" onClick={delBoard}>Löschen</button>}
        </div>
      </div>
      <div className="kanban">
        {board.columns.map(col => (
          <div key={col._id} className={'col' + (over === col._id ? ' over' : '')}
            onDragOver={e => { e.preventDefault(); setOver(col._id); }} onDrop={e => { e.preventDefault(); drop(col); }}>
            <h4><span>{col.title} <small>({cardsOf(col).length})</small></span>
              <span><button className="btn ghost small" style={{ border: 0, color: 'inherit' }} onClick={() => renCol(col)}>✎</button>
                <button className="btn ghost small" style={{ border: 0, color: 'inherit' }} onClick={() => delCol(col)}>✕</button></span></h4>
            {cardsOf(col).map(c => (
              <div key={c._id} className="kcard" draggable onDragStart={() => setDrag(c._id)}
                onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); e.stopPropagation(); drop(col, c._id); }}
                onClick={() => setCard(c)}>
                {c.title}{c.assignee && <small>👤 {people.find(p => p._id === c.assignee)?.name}</small>}
              </div>
            ))}
            <form onSubmit={e => addCard(col, e)}><input name="t" placeholder="+ Karte hinzufügen" /></form>
          </div>
        ))}
        <button className="btn ghost" style={{ flex: 'none', color: 'var(--petrol-dark)' }} onClick={addCol}>+ Spalte</button>
      </div>
      {card && <Modal onClose={() => setCard(null)}>
        <form onSubmit={saveCard}>
          <Field label="Titel"><input required value={card.title} onChange={e => setCard({ ...card, title: e.target.value })} /></Field>
          <Field label="Beschreibung"><textarea rows="5" value={card.description || ''} onChange={e => setCard({ ...card, description: e.target.value })} /></Field>
          <Field label="Zugewiesen an"><select value={card.assignee || ''} onChange={e => setCard({ ...card, assignee: e.target.value })}>
            <option value="">–</option>{people.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}</select></Field>
          <div className="row"><button className="btn">Speichern</button><button type="button" className="btn danger small" style={{ marginLeft: 'auto' }} onClick={delCard}>Löschen</button></div>
        </form></Modal>}
      {team && <Modal onClose={() => setTeam(null)}><h2 style={{ marginBottom: 14 }}>Team</h2>
        <MemberPicker exclude={me.id} value={team} onChange={setTeam} />
        <button className="btn" style={{ marginTop: 16 }} onClick={saveTeam}>Speichern</button></Modal>}
    </>
  );
}

export default function Boards() {
  return <Routes><Route index element={<List />} /><Route path=":id" element={<BoardView />} /></Routes>;
}
