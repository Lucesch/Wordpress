import React, { useEffect, useState, createContext, useContext } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, NavLink, Link, useNavigate } from 'react-router-dom';
import { api } from './api.js';
import Login from './pages/Login.jsx';
import Home from './pages/Home.jsx';
import Insurance from './pages/Insurance.jsx';
import Boards from './pages/Boards.jsx';
import Notes from './pages/Notes.jsx';
import Admin from './pages/Admin.jsx';
import './style.css';

const Ctx = createContext(null);
export const useMe = () => useContext(Ctx);

const ICONS = { insurance: '🛡️', boards: '🗂️', notes: '📝' };
const NAMES = { insurance: 'Versicherungsfälle', boards: 'Boards', notes: 'Notizen' };

function Shell({ me, reload, children }) {
  const nav = useNavigate();
  const logout = async () => { await api('/auth/logout', { method: 'POST' }); reload(); nav('/'); };
  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="brand"><span className="logo">◆</span> Portal</Link>
        <nav>
          {me.apps.map(k => <NavLink key={k} to={'/' + k}>{ICONS[k]} {NAMES[k]}</NavLink>)}
          {me.isAdmin && <NavLink to="/admin">⚙️ Administration</NavLink>}
        </nav>
        <div className="user">
          <span className="avatar">{me.name.slice(0, 1).toUpperCase()}</span>
          <span className="uname">{me.name}</span>
          <button className="btn ghost" onClick={logout}>Abmelden</button>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}

function App() {
  const [me, setMe] = useState(undefined);
  const reload = () => api('/me').then(setMe).catch(() => setMe(null));
  useEffect(() => { reload(); }, []);
  if (me === undefined) return null;
  if (me === null) return <Login onLogin={reload} />;
  const guard = (key, el) => (me.apps.includes(key) ? el : <Navigate to="/" />);
  return (
    <Ctx.Provider value={me}>
      <Shell me={me} reload={reload}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/insurance" element={guard('insurance', <Insurance />)} />
          <Route path="/boards/*" element={guard('boards', <Boards />)} />
          <Route path="/notes" element={guard('notes', <Notes />)} />
          <Route path="/admin" element={me.isAdmin ? <Admin /> : <Navigate to="/" />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Shell>
    </Ctx.Provider>
  );
}

createRoot(document.getElementById('root')).render(<BrowserRouter><App /></BrowserRouter>);
