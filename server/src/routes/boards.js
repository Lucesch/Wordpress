import { Router } from 'express';
import { Board, Card } from '../models.js';
import { requireAuth, requireApp, wrap } from '../auth.js';

const r = Router();
r.use(requireAuth, requireApp('boards'));

const mine = req => ({ $or: [{ owner: req.user._id }, { members: req.user._id }] });
async function load(req, res) {
  const b = await Board.findOne({ _id: req.params.id, ...mine(req) });
  if (!b) res.status(404).json({ error: 'Board nicht gefunden' });
  return b;
}

r.get('/', wrap(async (req, res) => res.json(await Board.find(mine(req)).populate('members', 'name').populate('owner', 'name').sort('-updatedAt'))));
r.post('/', wrap(async (req, res) => {
  const b = await Board.create({ title: req.body.title, owner: req.user._id, members: req.body.members || [],
    columns: [{ title: 'Offen' }, { title: 'In Arbeit' }, { title: 'Erledigt' }] });
  res.json(b);
}));
r.get('/:id', wrap(async (req, res) => {
  const b = await load(req, res); if (!b) return;
  await b.populate('members owner', 'name email');
  res.json({ board: b, cards: await Card.find({ board: b._id }).sort('position') });
}));
r.put('/:id', wrap(async (req, res) => {
  const b = await load(req, res); if (!b) return;
  if (req.body.title) b.title = req.body.title;
  if (req.body.members && b.owner.equals(req.user._id)) b.members = req.body.members;
  await b.save(); res.json(b);
}));
r.delete('/:id', wrap(async (req, res) => {
  const b = await load(req, res); if (!b) return;
  if (!b.owner.equals(req.user._id) && !req.user.isAdmin) return res.status(403).json({ error: 'Nur der Ersteller kann löschen' });
  await Card.deleteMany({ board: b._id }); await b.deleteOne(); res.json({ ok: true });
}));
r.post('/:id/columns', wrap(async (req, res) => {
  const b = await load(req, res); if (!b) return;
  b.columns.push({ title: req.body.title }); await b.save(); res.json(b);
}));
r.put('/:id/columns/:cid', wrap(async (req, res) => {
  const b = await load(req, res); if (!b) return;
  b.columns.id(req.params.cid).title = req.body.title; await b.save(); res.json(b);
}));
r.delete('/:id/columns/:cid', wrap(async (req, res) => {
  const b = await load(req, res); if (!b) return;
  b.columns.pull(req.params.cid); await b.save();
  await Card.deleteMany({ board: b._id, column: req.params.cid }); res.json(b);
}));
r.post('/:id/cards', wrap(async (req, res) => {
  const b = await load(req, res); if (!b) return;
  const last = await Card.findOne({ board: b._id, column: req.body.column }).sort('-position');
  res.json(await Card.create({ board: b._id, column: req.body.column, title: req.body.title, position: (last?.position ?? 0) + 1 }));
}));
r.put('/:id/cards/:cid', wrap(async (req, res) => {
  const b = await load(req, res); if (!b) return;
  const { title, description, assignee, column, position } = req.body;
  const set = Object.fromEntries(Object.entries({ title, description, assignee: assignee || undefined, column, position }).filter(([, v]) => v !== undefined));
  res.json(await Card.findOneAndUpdate({ _id: req.params.cid, board: b._id }, set, { new: true }));
}));
r.delete('/:id/cards/:cid', wrap(async (req, res) => {
  const b = await load(req, res); if (!b) return;
  await Card.deleteOne({ _id: req.params.cid, board: b._id }); res.json({ ok: true });
}));
export default r;
