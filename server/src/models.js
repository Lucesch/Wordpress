import mongoose from 'mongoose';
const { Schema, model } = mongoose;
const oid = Schema.Types.ObjectId;

// Registry aller Anwendungen. Neue Tools hier eintragen + Route + Frontend-Seite.
export const APPS = [
  { key: 'insurance', name: 'Versicherungsfälle', icon: '🛡️', path: '/insurance', desc: 'Schadensfälle verwalten und verfolgen' },
  { key: 'boards', name: 'Boards', icon: '🗂️', path: '/boards', desc: 'Team-Boards im Kanban-Stil' },
  { key: 'notes', name: 'Notizen', icon: '📝', path: '/notes', desc: 'Persönliche Notizen', public: true },
];

export const User = model('User', new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  active: { type: Boolean, default: true },
  roles: [{ type: oid, ref: 'Role' }],
}, { timestamps: true }));

export const Role = model('Role', new Schema({
  name: { type: String, required: true, unique: true },
  description: String,
  apps: [String],
}, { timestamps: true }));

export const CASE_STATUS = ['neu', 'in_pruefung', 'rueckfrage', 'genehmigt', 'abgelehnt', 'abgeschlossen'];

export const InsuranceCase = model('InsuranceCase', new Schema({
  externalId: { type: String, index: { unique: true, sparse: true } },
  caseNumber: String,
  policyHolder: { type: String, required: true },
  insurer: String,
  type: String,
  status: { type: String, enum: CASE_STATUS, default: 'neu' },
  amount: Number,
  damageDate: Date,
  description: String,
  source: { type: String, default: 'manuell' },
  notes: [{ text: String, author: String, at: { type: Date, default: Date.now } }],
  raw: Schema.Types.Mixed,
}, { timestamps: true }));

export const Board = model('Board', new Schema({
  title: { type: String, required: true },
  owner: { type: oid, ref: 'User', required: true },
  members: [{ type: oid, ref: 'User' }],
  columns: [{ title: String }],
}, { timestamps: true }));

export const Card = model('Card', new Schema({
  board: { type: oid, ref: 'Board', index: true },
  column: oid,
  title: { type: String, required: true },
  description: String,
  assignee: { type: oid, ref: 'User' },
  position: { type: Number, default: 0 },
}, { timestamps: true }));

export const Note = model('Note', new Schema({
  owner: { type: oid, ref: 'User', index: true },
  title: String,
  content: String,
  color: { type: String, default: 'warm' },
  pinned: { type: Boolean, default: false },
}, { timestamps: true }));
