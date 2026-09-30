import { Router } from 'express';
import { InsuranceCase, CASE_STATUS } from '../models.js';
import { requireAuth, requireApp, wrap } from '../auth.js';

// Webhook für n8n (API-Key statt Login)
export const webhook = Router();
const pick = (o, ...keys) => { for (const k of keys) if (o[k] !== undefined && o[k] !== '') return o[k]; };
function mapCase(o) {
  const status = pick(o, 'status');
  return {
    externalId: String(pick(o, 'externalId', 'id', 'Id') ?? '') || undefined,
    caseNumber: pick(o, 'caseNumber', 'fallnummer', 'Fallnummer'),
    policyHolder: pick(o, 'policyHolder', 'versicherungsnehmer', 'Versicherungsnehmer', 'name', 'Name') || 'Unbekannt',
    insurer: pick(o, 'insurer', 'versicherung', 'Versicherung'),
    type: pick(o, 'type', 'schadenart', 'Schadenart'),
    status: CASE_STATUS.includes(status) ? status : undefined,
    amount: Number(pick(o, 'amount', 'schadenhoehe', 'Schadenhöhe')) || undefined,
    damageDate: pick(o, 'damageDate', 'schadendatum', 'Schadendatum'),
    description: pick(o, 'description', 'beschreibung', 'Beschreibung'),
  };
}
webhook.post('/insurance', wrap(async (req, res) => {
  if (!process.env.WEBHOOK_API_KEY || req.get('x-api-key') !== process.env.WEBHOOK_API_KEY) return res.status(401).json({ error: 'Ungültiger API-Key' });
  const items = Array.isArray(req.body) ? req.body : [req.body];
  let created = 0, updated = 0;
  for (const raw of items) {
    const data = mapCase(raw);
    Object.keys(data).forEach(k => data[k] === undefined && delete data[k]);
    if (data.externalId) {
      const r = await InsuranceCase.findOneAndUpdate({ externalId: data.externalId }, { $set: { ...data, raw }, $setOnInsert: { source: 'n8n' } }, { upsert: true, new: true, includeResultMetadata: true });
      r.lastErrorObject.updatedExisting ? updated++ : created++;
    } else { await InsuranceCase.create({ ...data, source: 'n8n', raw }); created++; }
  }
  res.json({ ok: true, created, updated });
}));

const r = Router();
r.use(requireAuth, requireApp('insurance'));
r.get('/', wrap(async (req, res) => {
  const { q, status } = req.query;
  const f = {};
  if (status) f.status = status;
  if (q) { const rx = new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'); f.$or = ['policyHolder', 'caseNumber', 'insurer', 'type'].map(k => ({ [k]: rx })); }
  res.json(await InsuranceCase.find(f).select('-raw').sort('-createdAt').limit(500));
}));
r.get('/stats', wrap(async (req, res) => {
  const rows = await InsuranceCase.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$amount' } } }]);
  res.json(rows);
}));
r.post('/', wrap(async (req, res) => { const { raw, notes, ...d } = req.body; res.json(await InsuranceCase.create(d)); }));
r.get('/:id', wrap(async (req, res) => res.json(await InsuranceCase.findById(req.params.id))));
r.put('/:id', wrap(async (req, res) => {
  const { raw, notes, _id, ...d } = req.body;
  res.json(await InsuranceCase.findByIdAndUpdate(req.params.id, d, { new: true, runValidators: true }));
}));
r.delete('/:id', wrap(async (req, res) => { await InsuranceCase.findByIdAndDelete(req.params.id); res.json({ ok: true }); }));
r.post('/:id/notes', wrap(async (req, res) => {
  res.json(await InsuranceCase.findByIdAndUpdate(req.params.id, { $push: { notes: { text: req.body.text, author: req.user.name } } }, { new: true }));
}));
export default r;
