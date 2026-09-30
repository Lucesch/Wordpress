import jwt from 'jsonwebtoken';
import { User, Role, APPS } from './models.js';

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export function signIn(res, user) {
  const token = jwt.sign({ id: user.id }, SECRET, { expiresIn: '7d' });
  res.cookie('token', token, { httpOnly: true, sameSite: 'lax', secure: process.env.COOKIE_SECURE === 'true', maxAge: 7 * 864e5 });
}

export async function appsFor(user) {
  const pub = APPS.filter(a => a.public).map(a => a.key);
  if (user.isAdmin) return APPS.map(a => a.key);
  const roles = await Role.find({ _id: { $in: user.roles } });
  return [...new Set([...pub, ...roles.flatMap(r => r.apps)])];
}

export async function requireAuth(req, res, next) {
  try {
    const { id } = jwt.verify(req.cookies.token || '', SECRET);
    const user = await User.findById(id);
    if (!user || !user.active) return res.status(401).json({ error: 'Nicht angemeldet' });
    req.user = user;
    req.apps = await appsFor(user);
    next();
  } catch { res.status(401).json({ error: 'Nicht angemeldet' }); }
}

export const requireAdmin = (req, res, next) =>
  req.user.isAdmin ? next() : res.status(403).json({ error: 'Nur für Admins' });

export const requireApp = key => (req, res, next) =>
  req.apps.includes(key) ? next() : res.status(403).json({ error: 'Kein Zugriff auf diese Anwendung' });

export const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);
