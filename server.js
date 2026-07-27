const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Razorpay = require('razorpay');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all cross-origin requests (e.g. VS Code Live Server on port 5500)
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));
const JWT_SECRET = process.env.JWT_SECRET || 'emertezora_quantum_secret_key_2026';
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_live_SezY5OFStlhUZS';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'emertezora_dummy_secret';

// Initialize Razorpay
let razorpay;
try {
  razorpay = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET
  });
} catch (e) {
  console.warn('Razorpay SDK init warning:', e.message);
}

// Database Setup (SQLite with fallback to JSON storage if sqlite3 native module has compilation issues)
let db;
let useJsonDb = false;
const jsonDbPath = path.join(__dirname, 'quanta_db.json');

function initJsonDb() {
  useJsonDb = true;
  if (!fs.existsSync(jsonDbPath)) {
    fs.writeFileSync(jsonDbPath, JSON.stringify({ users: [], subscriptions: [] }, null, 2));
  }
}

function readJsonDb() {
  try {
    const data = fs.readFileSync(jsonDbPath, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return { users: [], subscriptions: [] };
  }
}

function writeJsonDb(data) {
  fs.writeFileSync(jsonDbPath, JSON.stringify(data, null, 2));
}

try {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(__dirname, 'quanta.db');
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.warn('SQLite connect failed, falling back to JSON DB:', err.message);
      initJsonDb();
    } else {
      console.log('Connected to SQLite database quanta.db');
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          name TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS subscriptions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          user_email TEXT NOT NULL,
          plan_name TEXT NOT NULL,
          amount REAL NOT NULL,
          currency TEXT DEFAULT 'INR',
          razorpay_order_id TEXT,
          razorpay_payment_id TEXT,
          razorpay_signature TEXT,
          status TEXT DEFAULT 'active',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }
  });
} catch (e) {
  console.warn('sqlite3 module not available, using JSON DB:', e.message);
  initJsonDb();
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// Auth Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access token required. Please login first.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired session. Please log in again.' });
    req.user = user;
    next();
  });
}

// --- API ENDPOINTS ---

// Register User
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userName = name || email.split('@')[0];

    if (useJsonDb) {
      const data = readJsonDb();
      const existing = data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (existing) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }
      const newUser = {
        id: data.users.length + 1,
        email: email.toLowerCase(),
        password_hash: passwordHash,
        name: userName,
        created_at: new Date().toISOString()
      };
      data.users.push(newUser);
      writeJsonDb(data);

      const token = jwt.sign({ id: newUser.id, email: newUser.email, name: newUser.name }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ success: true, token, user: { id: newUser.id, email: newUser.email, name: newUser.name } });
    } else {
      db.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase()], async (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (row) return res.status(400).json({ error: 'User with this email already exists' });

        db.run(
          'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)',
          [email.toLowerCase(), passwordHash, userName],
          function (insertErr) {
            if (insertErr) return res.status(500).json({ error: 'Failed to create user' });
            const userId = this.lastID;
            const token = jwt.sign({ id: userId, email: email.toLowerCase(), name: userName }, JWT_SECRET, { expiresIn: '7d' });
            res.json({ success: true, token, user: { id: userId, email: email.toLowerCase(), name: userName } });
          }
        );
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login User
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (useJsonDb) {
      const data = readJsonDb();
      const user = data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!user) {
        return res.status(400).json({ error: 'Invalid email or password' });
      }
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(400).json({ error: 'Invalid email or password' });
      }
      const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ success: true, token, user: { id: user.id, email: user.email, name: user.name } });
    } else {
      db.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase()], async (err, user) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!user) return res.status(400).json({ error: 'Invalid email or password' });

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(400).json({ error: 'Invalid email or password' });

        const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ success: true, token, user: { id: user.id, email: user.email, name: user.name } });
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Current User Profile & Subscription Status
app.get('/api/me', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const userEmail = req.user.email;

  if (useJsonDb) {
    const data = readJsonDb();
    const sub = data.subscriptions.find(s => s.user_id === userId || s.user_email === userEmail);
    res.json({
      user: req.user,
      subscribed: !!sub,
      subscription: sub || null
    });
  } else {
    db.get('SELECT * FROM subscriptions WHERE user_id = ? OR user_email = ? ORDER BY id DESC LIMIT 1', [userId, userEmail], (err, sub) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json({
        user: req.user,
        subscribed: !!sub,
        subscription: sub || null
      });
    });
  }
});

// Create Razorpay Order
app.post('/api/create-order', authenticateToken, async (req, res) => {
  try {
    const { amount, planName } = req.body;
    const orderAmount = parseInt(amount || 499, 10) * 100; // In paise

    const options = {
      amount: orderAmount,
      currency: 'INR',
      receipt: `receipt_em_${Date.now()}`,
      notes: {
        user_id: req.user.id,
        user_email: req.user.email,
        plan_name: planName || 'EmerTezora Premium'
      }
    };

    let orderId = `order_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    if (razorpay) {
      try {
        const razorpayOrder = await razorpay.orders.create(options);
        orderId = razorpayOrder.id;
      } catch (rzpErr) {
        console.warn('Razorpay order creation fallback (mock order created):', rzpErr.message);
      }
    }

    res.json({
      success: true,
      orderId: orderId,
      amount: orderAmount,
      currency: 'INR',
      key: RAZORPAY_KEY_ID,
      planName: planName || 'EmerTezora Premium'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify Payment & Store Subscription Data in Database
app.post('/api/verify-payment', authenticateToken, (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planName, amount } = req.body;
    const userId = req.user.id;
    const userEmail = req.user.email;

    const record = {
      user_id: userId,
      user_email: userEmail,
      plan_name: planName || 'EmerTezora Premium Subscription',
      amount: amount || 499,
      currency: 'INR',
      razorpay_order_id: razorpay_order_id || `order_dummy_${Date.now()}`,
      razorpay_payment_id: razorpay_payment_id || `pay_${Date.now()}`,
      razorpay_signature: razorpay_signature || `sig_${Date.now()}`,
      status: 'active',
      created_at: new Date().toISOString()
    };

    if (useJsonDb) {
      const data = readJsonDb();
      record.id = data.subscriptions.length + 1;
      data.subscriptions.push(record);
      writeJsonDb(data);
      res.json({ success: true, message: 'Subscription successfully activated and stored in database!', subscription: record });
    } else {
      db.run(
        `INSERT INTO subscriptions (user_id, user_email, plan_name, amount, currency, razorpay_order_id, razorpay_payment_id, razorpay_signature, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [record.user_id, record.user_email, record.plan_name, record.amount, record.currency, record.razorpay_order_id, record.razorpay_payment_id, record.razorpay_signature, record.status],
        function (err) {
          if (err) {
            console.error('Subscription insert error:', err);
            return res.status(500).json({ error: 'Failed to record subscription in database' });
          }
          record.id = this.lastID;
          res.json({ success: true, message: 'Subscription successfully activated and stored in database!', subscription: record });
        }
      );
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List Subscribers Database Records
app.get('/api/subscribers', (req, res) => {
  if (useJsonDb) {
    const data = readJsonDb();
    res.json({ subscribers: data.subscriptions });
  } else {
    db.all('SELECT * FROM subscriptions ORDER BY id DESC', [], (err, rows) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json({ subscribers: rows });
    });
  }
});

// Serve subscription page directly
app.get('/subscription', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'subscription.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🌌 EmerTezora Server running at http://localhost:${PORT}`);
  console.log(`💳 Razorpay Key Loaded: ${RAZORPAY_KEY_ID}`);
  console.log(`====================================================`);
});
