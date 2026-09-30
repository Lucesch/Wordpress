import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useMe } from '../main.jsx';

export default function Home() {
  const me = useMe();
  const [apps, setApps] = useState([]);
  useEffect(() => { api('/apps').then(setApps); }, []);
  return (
    <>
      <h1>Hallo {me.name} 👋</h1>
      <p className="sub">Deine Anwendungen</p>
      <div className="launcher">
        {apps.map(a => (
          <Link key={a.key} to={a.path} className="tile">
            <div className="ico">{a.icon}</div><h3>{a.name}</h3><p>{a.desc}</p>
          </Link>
        ))}
        {me.isAdmin && <Link to="/admin" className="tile"><div className="ico">⚙️</div><h3>Administration</h3><p>Benutzer &amp; Rollen verwalten</p></Link>}
      </div>
      {!apps.length && !me.isAdmin && <p className="sub">Dir wurde noch keine Anwendung zugewiesen.</p>}
    </>
  );
}
