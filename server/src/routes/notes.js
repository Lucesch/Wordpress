import { Router } from 'express';
import { Note } from '../models.js';
import { requireAuth, requireApp, wrap } from '../auth.js';

const r = Router();
r.use(requireAuth, requireApp('notes'));
r.get('/', wrap(async (req, res) => res.json(await Note.find({ owner: req.user._id }).sort('-pinned -updatedAt'))));
r.post('/', wrap(async (req, res) => res.json(await Note.create({ owner: req.user._id, title: req.body.title, content: req.body.content, color: req.body.color }))));
r.put('/:id', wrap(async (req, res) => {
  const { title, content, color, pinned } = req.body;
  res.json(await Note.findOneAndUpdate({ _id: req.params.id, owner: req.user._id }, { title, content, color, pinned }, { new: true }));
}));
r.delete('/:id', wrap(async (req, res) => { await Note.deleteOne({ _id: req.params.id, owner: req.user._id }); res.json({ ok: true }); }));
export default r;
