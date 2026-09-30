import express from 'express';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { User } from './models.js';
import core from './routes/core.js';
import insurance, { webhook } from './routes/insurance.js';
import boards from './routes/boards.js';
import notes from './routes/notes.js';

const app = express();
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());

app.use('/api/webhooks', webhook);
app.use('/api/insurance', insurance);
app.use('/api/boards', boards);
app.use('/api/notes', notes);
app.use('/api', core);

const pub = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
if (fs.existsSync(pub)) {
  app.use(express.static(pub));
  app.get('*', (req, res) => res.sendFile(path.join(pub, 'index.html')));
}
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.name === 'ValidationError' || err.name === 'CastError' ? 400 : 500).json({ error: err.message });
});

await mongoose.connect(process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/portal');
if (!(await User.exists({ isAdmin: true }))) {
  const email = process.env.ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.ADMIN_PASSWORD || 'admin1234';
  await User.create({ name: 'Administrator', email, isAdmin: true, passwordHash: await bcrypt.hash(password, 10) });
  console.log(`Admin angelegt: ${email}`);
}
app.listen(process.env.PORT || 3000, () => console.log('Server läuft'));
