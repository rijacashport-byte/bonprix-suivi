const express    = require('express');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const cors       = require('cors');
const path       = require('path');
const fs         = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'bonprix_secret_2026_change_me_in_prod';

// ── MIDDLEWARE ────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── SIMPLE JSON DATABASE ──────────────────────────────────────────
const DB_FILE   = path.join(__dirname, 'db.json');
const DATA_FILE = path.join(__dirname, 'data.json');

function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    const defaultDB = {
      users: [
        {
          id: 1,
          username: 'admin',
          password: bcrypt.hashSync('bonprix2026', 10),
          role: 'admin',
          name: 'Administrateur',
          createdAt: new Date().toISOString()
        },
        {
          id: 2,
          username: 'superviseur',
          password: bcrypt.hashSync('superv2026', 10),
          role: 'superviseur',
          name: 'Superviseur',
          createdAt: new Date().toISOString()
        },
        {
          id: 3,
          username: 'consultation',
          password: bcrypt.hashSync('consult2026', 10),
          role: 'consultation',
          name: 'Consultation',
          createdAt: new Date().toISOString()
        }
      ]
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultDB, null, 2));
    return defaultDB;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    const empty = { treated: {}, extra: {} };
    fs.writeFileSync(DATA_FILE, JSON.stringify(empty, null, 2));
    return empty;
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ── AUTH MIDDLEWARE ───────────────────────────────────────────────
function authRequired(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' });
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}

function canWrite(req, res, next) {
  if (req.user.role === 'consultation') {
    return res.status(403).json({ error: 'Accès en lecture seule' });
  }
  next();
}

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Réservé à l\'administrateur' });
  }
  next();
}

// ── AUTH ROUTES ───────────────────────────────────────────────────

// Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Identifiants manquants' });

  const db = readDB();
  const user = db.users.find(u => u.username === username.toLowerCase().trim());
  if (!user) return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '12h' }
  );

  res.json({ token, user: { id: user.id, username: user.username, role: user.role, name: user.name } });
});

// Who am I
app.get('/api/auth/me', authRequired, (req, res) => {
  res.json({ user: req.user });
});

// ── USER MANAGEMENT (admin only) ─────────────────────────────────

// List users
app.get('/api/users', authRequired, adminOnly, (req, res) => {
  const db = readDB();
  res.json(db.users.map(u => ({ id: u.id, username: u.username, role: u.role, name: u.name, createdAt: u.createdAt })));
});

// Create user
app.post('/api/users', authRequired, adminOnly, (req, res) => {
  const { username, password, role, name } = req.body;
  if (!username || !password || !role || !name) return res.status(400).json({ error: 'Champs manquants' });
  if (!['admin', 'superviseur', 'consultation'].includes(role)) return res.status(400).json({ error: 'Rôle invalide' });

  const db = readDB();
  if (db.users.find(u => u.username === username.toLowerCase())) return res.status(409).json({ error: 'Identifiant déjà utilisé' });

  const newUser = {
    id: Math.max(0, ...db.users.map(u => u.id)) + 1,
    username: username.toLowerCase().trim(),
    password: bcrypt.hashSync(password, 10),
    role,
    name,
    createdAt: new Date().toISOString()
  };
  db.users.push(newUser);
  writeDB(db);
  res.json({ id: newUser.id, username: newUser.username, role: newUser.role, name: newUser.name });
});

// Delete user
app.delete('/api/users/:id', authRequired, adminOnly, (req, res) => {
  const id = parseInt(req.params.id);
  if (id === req.user.id) return res.status(400).json({ error: 'Impossible de se supprimer soi-même' });
  const db = readDB();
  db.users = db.users.filter(u => u.id !== id);
  writeDB(db);
  res.json({ ok: true });
});

// Change password
app.put('/api/users/:id/password', authRequired, (req, res) => {
  const id = parseInt(req.params.id);
  if (req.user.role !== 'admin' && req.user.id !== id) return res.status(403).json({ error: 'Non autorisé' });
  const { password } = req.body;
  if (!password || password.length < 6) return res.status(400).json({ error: 'Mot de passe trop court (6 car. min)' });
  const db = readDB();
  const user = db.users.find(u => u.id === id);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
  user.password = bcrypt.hashSync(password, 10);
  writeDB(db);
  res.json({ ok: true });
});

// ── DATA ROUTES ───────────────────────────────────────────────────

app.get('/api/data', authRequired, (req, res) => {
  res.json(readData());
});

app.post('/api/data', authRequired, canWrite, (req, res) => {
  try {
    const body = req.body;
    if (!body || typeof body !== 'object') return res.status(400).json({ error: 'Données invalides' });
    writeData(body);
    res.json({ ok: true, savedAt: new Date().toISOString(), savedBy: req.user.name });
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── HEALTH ────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '2.0.0', time: new Date().toISOString() });
});

// ── SPA FALLBACK ──────────────────────────────────────────────────
app.get('*', (req, res) => {
  const loginPage = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(loginPage)) res.sendFile(loginPage);
  else res.status(404).send('Not found');
});

// ── START ─────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  const db = readDB();
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║   BONPRIX — Suivi Expéditions v2.0   ║');
  console.log('╠══════════════════════════════════════╣');
  console.log(`║  Local  : http://localhost:${PORT}      ║`);
  Object.values(nets).flat()
    .filter(n => n.family === 'IPv4' && !n.internal)
    .forEach(n => console.log(`║  Réseau : http://${n.address}:${PORT}   ║`));
  console.log('╠══════════════════════════════════════╣');
  console.log('║  Comptes par défaut :                ║');
  console.log('║  admin       / bonprix2026           ║');
  console.log('║  superviseur / superv2026            ║');
  console.log('║  consultation/ consult2026           ║');
  console.log('╚══════════════════════════════════════╝\n');
});
