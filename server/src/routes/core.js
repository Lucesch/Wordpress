import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { User, Role, APPS } from '../models.js';
import { requireAuth, requireAdmin, signIn, wrap } from '../auth.js';

const r = Router();
const pub = (u, apps) => ({ id: u.id, name: u.name, email: u.email, isAdmin: u.isAdmin, apps });

r.post('/auth/login', wrap(async (req, res) => {
  const user = await User.findOne({ email: String(req.body.email || '').toLowerCase() });
  if (!user || !user.active || !(await bcrypt.compare(req.body.password || '', user.passwordHash)))
    return res.status(401).json({ error: 'E-Mail oder Passwort falsch' });
  signIn(res, user);
  res.json({ ok: true });
}));
r.post('/auth/logout', (req, res) => { res.clearCookie('token'); res.json({ ok: true }); });

r.use(requireAuth);
r.get('/me', wrap(async (req, res) => res.json(pub(req.user, req.apps))));
r.get('/apps', (req, res) => res.json(APPS.filter(a => req.apps.includes(a.key))));
r.get('/directory', wrap(async (req, res) =>
  res.json((await User.find({ active: true }).select('name email')).map(u => ({ id: u.id, name: u.name, email: u.email })))));

r.post('/auth/password', wrap(async (req, res) => {
  if (!(await bcrypt.compare(req.body.current || '', req.user.passwordHash))) return res.status(400).json({ error: 'Aktuelles Passwort falsch' });
  if ((req.body.next || '').length < 8) return res.status(400).json({ error: 'Mindestens 8 Zeichen' });
  req.user.passwordHash = await bcrypt.hash(req.body.next, 10);
  await req.user.save();
  res.json({ ok: true });
}));

// ---- Admin: Benutzer & Rollen ----
r.use('/admin', requireAdmin);
r.get('/admin/users', wrap(async (req, res) => res.json(await User.find().select('-passwordHash').sort('name'))));
r.post('/admin/users', wrap(async (req, res) => {
  const { name, email, password, isAdmin, roles } = req.body;
  if (!name || !email || (password || '').length < 8) return res.status(400).json({ error: 'Name, E-Mail und Passwort (min. 8 Zeichen) nötig' });
  const u = await User.create({ name, email, isAdmin: !!isAdmin, roles: roles || [], passwordHash: await bcrypt.hash(password, 10) });
  res.json({ id: u.id });
}));
r.put('/admin/users/:id', wrap(async (req, res) => {
  const u = await User.findById(req.params.id);
  if (!u) return res.sendStatus(404);
  const { name, email, password, isAdmin, active, roles } = req.body;
  if (u.id === req.user.id && (isAdmin === false || active === false)) return res.status(400).json({ error: 'Du kannst dir selbst nicht die Adminrechte entziehen' });
  Object.assign(u, { name: name ?? u.name, email: email ?? u.email, isAdmin: isAdmin ?? u.isAdmin, active: active ?? u.active, roles: roles ?? u.roles });
  if (password) u.passwordHash = await bcrypt.hash(password, 10);
  await u.save();
  res.json({ ok: true });
}));
r.delete('/admin/users/:id', wrap(async (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'Nicht selbst löschen' });
  await User.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));
r.get('/admin/roles', wrap(async (req, res) => res.json(await Role.find().sort('name'))));
r.post('/admin/roles', wrap(async (req, res) => res.json(await Role.create({ name: req.body.name, description: req.body.description, apps: req.body.apps || [] }))));
r.put('/admin/roles/:id', wrap(async (req, res) =>
  res.json(await Role.findByIdAndUpdate(req.params.id, { name: req.body.name, description: req.body.description, apps: req.body.apps || [] }, { new: true }))));
r.delete('/admin/roles/:id', wrap(async (req, res) => {
  await Role.findByIdAndDelete(req.params.id);
  await User.updateMany({}, { $pull: { roles: req.params.id } });
  res.json({ ok: true });
}));
r.get('/admin/apps', (req, res) => res.json(APPS));

export default r;
