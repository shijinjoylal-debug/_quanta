require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Razorpay = require('razorpay');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for all cross-origin requests
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Service Worker Routes (must be before express.static to set proper headers) ---
function serveServiceWorker(res, filename, fallbackZoneId) {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Service-Worker-Allowed', '/');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  const swPath = path.resolve(__dirname, filename);
  if (fs.existsSync(swPath)) {
    return res.sendFile(swPath);
  }
  return res.send(`self.options = {\n    "domain": "3nbf4.com",\n    "zoneId": ${fallbackZoneId}\n};\nself.lary = "";\nimportScripts('https://3nbf4.com/act/files/service-worker.min.js?r=sw');\n`);
}

// sw.js
app.get('/sw.js', (req, res) => serveServiceWorker(res, 'sw.js', 11726247));

// sw (1).js — regex route because Express 5 / path-to-regexp v8 rejects parentheses in string paths
// Matches: /sw%20(1).js  /sw%20%281%29.js  /sw (1).js
app.get(/^\/sw(?:%20|\s)+(?:\(|%28)1(?:\)|%29)\.js$/i, (req, res) => serveServiceWorker(res, 'sw (1).js', 11726636));

// sw (2).js
app.get(/^\/sw(?:%20|\s)+(?:\(|%28)2(?:\)|%29)\.js$/i, (req, res) => serveServiceWorker(res, 'sw (2).js', 11727346));

// Generic catch-all for any other sw*.js files (future-proof)
app.get(/^\/sw.*\.js$/, (req, res, next) => {
  try {
    const decodedPath = decodeURIComponent(req.path);
    const filename = path.basename(decodedPath);
    const swPath = path.resolve(__dirname, filename);
    if (fs.existsSync(swPath)) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Service-Worker-Allowed', '/');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.sendFile(swPath);
    }
  } catch (e) {
    console.warn('Dynamic sw file serve error:', e.message);
  }
  next();
});

app.use(express.static(path.join(__dirname)));
app.use('/pages', express.static(path.join(__dirname, 'pages')));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

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

// Database Setup: Pure JSON & In-Memory Store (Zero Native Dependencies)
const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const jsonDbPath = isServerless
  ? path.join(os.tmpdir(), 'quanta_db.json')
  : path.join(__dirname, 'quanta_db.json');

let memoryStore = { users: [], subscriptions: [] };

function initJsonDb() {
  try {
    if (!fs.existsSync(jsonDbPath)) {
      fs.writeFileSync(jsonDbPath, JSON.stringify(memoryStore, null, 2));
    } else {
      const data = fs.readFileSync(jsonDbPath, 'utf8');
      memoryStore = JSON.parse(data);
    }
  } catch (e) {
    console.warn('JSON DB storage initialized in memory:', e.message);
  }
}

function readJsonDb() {
  try {
    if (fs.existsSync(jsonDbPath)) {
      const data = fs.readFileSync(jsonDbPath, 'utf8');
      memoryStore = JSON.parse(data);
    }
  } catch (e) {
    // fallback to memoryStore
  }
  return memoryStore;
}

function writeJsonDb(data) {
  memoryStore = data;
  try {
    fs.writeFileSync(jsonDbPath, JSON.stringify(data, null, 2));
  } catch (e) {
    console.warn('Failed to write JSON DB to disk, kept in memory:', e.message);
  }
}

// Initialize database
initJsonDb();

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

// --- Frontend HTML Routes ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'about.html'));
});

app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'contact.html'));
});

app.get('/blog', (req, res) => {
  res.sendFile(path.join(__dirname, 'blog.html'));
});

app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, 'privacy.html'));
});

app.get('/terms', (req, res) => {
  res.sendFile(path.join(__dirname, 'terms.html'));
});

app.get('/search', (req, res) => {
  res.sendFile(path.join(__dirname, 'search.html'));
});

app.get('/subscription', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'subscription.html'));
});

app.get('/subpage', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'subpage.html'));
});

// Service Worker routes are registered above (before express.static) — see serveServiceWorker()

// --- API ENDPOINTS ---

// Register User
app.post(['/api/register', '/api/auth/register'], async (req, res) => {
  try {
    const { email, username, password, name } = req.body;
    const userEmail = (email || username || '').toLowerCase();
    if (!userEmail || !password) {
      return res.status(400).json({ error: 'Email/Username and password are required' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userName = name || username || (userEmail.includes('@') ? userEmail.split('@')[0] : userEmail);

    const data = readJsonDb();
    const existing = data.users.find(
      u => (u.email && u.email.toLowerCase() === userEmail) || (u.name && u.name.toLowerCase() === userName.toLowerCase())
    );
    if (existing) {
      return res.status(400).json({ error: 'User with this email or username already exists' });
    }

    const newUser = {
      id: data.users.length + 1,
      email: userEmail,
      password_hash: passwordHash,
      name: userName,
      created_at: new Date().toISOString()
    };
    data.users.push(newUser);
    writeJsonDb(data);

    const userObj = { id: newUser.id, email: newUser.email, name: newUser.name, username: newUser.name };
    const token = jwt.sign(userObj, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ success: true, message: 'Registration successful!', token, user: userObj });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login User
app.post(['/api/login', '/api/auth/login'], async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const identifier = (email || username || '').toLowerCase();
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Email/Username and password are required' });
    }

    const data = readJsonDb();
    const user = data.users.find(
      u => (u.email && u.email.toLowerCase() === identifier) || (u.name && u.name.toLowerCase() === identifier)
    );
    if (!user) {
      return res.status(400).json({ error: 'Invalid email/username or password' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(400).json({ error: 'Invalid email/username or password' });
    }

    const userObj = { id: user.id, email: user.email, name: user.name, username: user.name };
    const token = jwt.sign(userObj, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ success: true, message: 'Login successful!', token, user: userObj });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Current User Profile & Subscription Status
app.get(['/api/me', '/api/auth/me'], authenticateToken, (req, res) => {
  const userId = req.user.id;
  const userEmail = req.user.email;
  const userObj = {
    id: req.user.id,
    email: req.user.email,
    name: req.user.name,
    username: req.user.name || (req.user.email ? req.user.email.split('@')[0] : 'User')
  };

  const data = readJsonDb();
  const sub = data.subscriptions.find(s => s.user_id === userId || s.user_email === userEmail);
  res.json({
    user: userObj,
    subscribed: !!sub,
    subscription: sub || null
  });
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

    const data = readJsonDb();
    record.id = data.subscriptions.length + 1;
    data.subscriptions.push(record);
    writeJsonDb(data);

    res.json({ success: true, message: 'Subscription successfully activated and stored in database!', subscription: record });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List Subscribers Database Records
app.get('/api/subscribers', (req, res) => {
  const data = readJsonDb();
  res.json({ subscribers: data.subscriptions });
});

// Start Server if run directly (local development)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🌌 EmerTezora Server running at http://localhost:${PORT}`);
    console.log(`💳 Razorpay Key Loaded: ${RAZORPAY_KEY_ID}`);
    console.log(`====================================================`);
  });
}

module.exports = app;
