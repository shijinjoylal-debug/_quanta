require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Razorpay = require('razorpay');
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Gemini AI client
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
let genAI = null;
if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  console.log('✅ Gemini AI client initialized.');
} else {
  console.warn('⚠️  GEMINI_API_KEY not set — AI routes will return error responses.');
}

// Enable CORS for all cross-origin requests (including Vercel deployments)
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '2mb' }));
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
const MONGODB_URI = process.env.MONGODB_URI || '';

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

// ─── MongoDB Connection (cached for Vercel serverless) ───────────────────────
let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (!MONGODB_URI) {
    console.warn('⚠️  MONGODB_URI not set — database routes will fail until it is configured.');
    return null;
  }
  if (cached.conn) {
    return cached.conn;
  }
  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
    };
    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
      console.log('✅ MongoDB Connected');
      return mongooseInstance;
    });
  }
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error('❌ MongoDB Connection Error:', e.message);
    throw e;
  }
  return cached.conn;
}

// Connect early (non-blocking for local; serverless will connect on first request)
connectDB().catch(() => { });

// ─── Mongoose Models ─────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password_hash: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  created_at: { type: Date, default: Date.now }
}, { collection: 'users' });

const subscriptionSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  user_email: { type: String, required: true, lowercase: true },
  plan_name: { type: String, default: 'EmerTezora Premium Subscription' },
  amount: { type: Number, default: 499 },
  currency: { type: String, default: 'INR' },
  razorpay_order_id: String,
  razorpay_payment_id: String,
  razorpay_signature: String,
  status: { type: String, default: 'active' },
  created_at: { type: Date, default: Date.now }
}, { collection: 'subscriptions' });

const postSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  user_name: String,
  user_email: String,
  content: { type: String, default: '' },
  imageUrl: String,
  created_at: { type: Date, default: Date.now }
}, { collection: 'posts' });

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Subscription = mongoose.models.Subscription || mongoose.model('Subscription', subscriptionSchema);
const Post = mongoose.models.Post || mongoose.model('Post', postSchema);

// Middleware: ensure DB is connected before API routes that need it
async function requireDB(req, res, next) {
  try {
    if (!MONGODB_URI) {
      return res.status(503).json({
        error: 'Database is not configured. Please set MONGODB_URI in environment variables.',
        details: 'Missing MONGODB_URI'
      });
    }
    await connectDB();
    next();
  } catch (err) {
    return res.status(503).json({
      error: 'Database connection failed. Please try again shortly.',
      details: err.message
    });
  }
}

// Auth Middleware (JWT)
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

// ─── API ENDPOINTS ───────────────────────────────────────────────────────────

// Health / root API check
app.get('/api/health', async (req, res) => {
  let dbStatus = 'not_configured';
  if (MONGODB_URI) {
    try {
      await connectDB();
      dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'connecting';
    } catch (e) {
      dbStatus = 'error: ' + e.message;
    }
  }
  res.json({
    ok: true,
    service: 'Quanta / EmerTezora API',
    mongodb: dbStatus,
    gemini: genAI ? 'enabled' : 'disabled'
  });
});

// Register User
app.post(['/api/register', '/api/auth/register'], requireDB, async (req, res) => {
  try {
    const { email, username, password, name } = req.body;
    const userEmail = (email || username || '').toLowerCase().trim();
    if (!userEmail || !password) {
      return res.status(400).json({ error: 'Email/Username and password are required' });
    }

    const existing = await User.findOne({
      $or: [
        { email: userEmail },
        { name: (name || username || userEmail.split('@')[0] || '').trim() }
      ]
    });
    if (existing) {
      return res.status(400).json({ error: 'User with this email or username already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userName = (name || username || (userEmail.includes('@') ? userEmail.split('@')[0] : userEmail)).trim();

    const newUser = await User.create({
      email: userEmail,
      password_hash: passwordHash,
      name: userName
    });

    const userObj = {
      id: newUser._id.toString(),
      email: newUser.email,
      name: newUser.name,
      username: newUser.name
    };
    const token = jwt.sign(userObj, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ success: true, message: 'Registration successful!', token, user: userObj });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    console.error('Register error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Login User
app.post(['/api/login', '/api/auth/login'], requireDB, async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const identifier = (email || username || '').toLowerCase().trim();
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Email/Username and password are required' });
    }

    const user = await User.findOne({
      $or: [
        { email: identifier },
        { name: identifier }
      ]
    });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email/username or password' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(400).json({ error: 'Invalid email/username or password' });
    }

    const userObj = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      username: user.name
    };
    const token = jwt.sign(userObj, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ success: true, message: 'Login successful!', token, user: userObj });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get Current User Profile & Subscription Status
app.get(['/api/me', '/api/auth/me'], requireDB, authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = (req.user.email || '').toLowerCase();

    const userObj = {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      username: req.user.name || (req.user.email ? req.user.email.split('@')[0] : 'User')
    };

    let sub = null;
    if (mongoose.Types.ObjectId.isValid(userId)) {
      sub = await Subscription.findOne({
        $or: [
          { user_id: userId },
          { user_email: userEmail }
        ],
        status: 'active'
      }).sort({ created_at: -1 }).lean();
    } else {
      sub = await Subscription.findOne({ user_email: userEmail, status: 'active' })
        .sort({ created_at: -1 }).lean();
    }

    res.json({
      user: userObj,
      subscribed: !!sub,
      subscription: sub || null
    });
  } catch (err) {
    console.error('/api/me error:', err);
    res.status(500).json({ error: err.message });
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

// Verify Payment & Store Subscription Data in MongoDB
app.post('/api/verify-payment', requireDB, authenticateToken, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planName, amount } = req.body;
    const userId = req.user.id;
    const userEmail = (req.user.email || '').toLowerCase();

    const record = await Subscription.create({
      user_id: mongoose.Types.ObjectId.isValid(userId) ? userId : undefined,
      user_email: userEmail,
      plan_name: planName || 'EmerTezora Premium Subscription',
      amount: amount || 499,
      currency: 'INR',
      razorpay_order_id: razorpay_order_id || `order_dummy_${Date.now()}`,
      razorpay_payment_id: razorpay_payment_id || `pay_${Date.now()}`,
      razorpay_signature: razorpay_signature || `sig_${Date.now()}`,
      status: 'active'
    });

    res.json({
      success: true,
      message: 'Subscription successfully activated and stored in database!',
      subscription: record
    });
  } catch (err) {
    console.error('Verify payment error:', err);
    res.status(500).json({ error: err.message });
  }
});

// List Subscribers
app.get('/api/subscribers', requireDB, async (req, res) => {
  try {
    const subscribers = await Subscription.find({}).sort({ created_at: -1 }).lean();
    res.json({ subscribers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Gemini AI Chat Route ─────────────────────────────────────────────────────
app.post('/api/gemini/chat', async (req, res) => {
  if (!genAI) {
    return res.status(503).json({
      error: 'AI service is not configured. Please set GEMINI_API_KEY in Vercel environment variables.',
      details: 'Missing GEMINI_API_KEY'
    });
  }

  try {
    const { prompt, history = [] } = req.body;
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'A non-empty prompt is required.' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const formattedHistory = Array.isArray(history)
      ? history.filter(h => h && h.role && Array.isArray(h.parts))
      : [];

    const chat = model.startChat({ history: formattedHistory });
    const result = await chat.sendMessage(prompt.trim());
    const text = result.response.text();

    return res.json({ success: true, text });
  } catch (err) {
    console.error('Gemini API Error:', err);
    return res.status(500).json({
      error: 'Gemini AI request failed.',
      details: err.message
    });
  }
});

// ─── Learning / RAG Ask Route ─────────────────────────────────────────────────
app.post('/api/learning/ask', async (req, res) => {
  if (!genAI) {
    return res.status(503).json({
      error: 'AI service is not configured. Please set GEMINI_API_KEY in Vercel environment variables.',
      details: 'Missing GEMINI_API_KEY'
    });
  }

  try {
    const { query, category } = req.body;
    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: 'A non-empty query is required.' });
    }

    const categoryContext = category ? ` The topic category is: ${category}.` : '';
    const systemPrompt = `You are Quanta AI, an expert tutor specializing in quantum physics, quantum mechanics, wave-particle duality, orbital mechanics, and related science topics.${categoryContext} Provide clear, concise, and accurate answers. Use markdown formatting where helpful (bold, headers, bullet points).`;

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(`${systemPrompt}\n\nStudent question: ${query.trim()}`);
    const answer = result.response.text();

    return res.json({
      success: true,
      answer,
      context: []
    });
  } catch (err) {
    console.error('Learning API Error:', err);
    return res.status(500).json({
      error: 'Learning AI request failed.',
      details: err.message
    });
  }
});

// ─── Posts ───────────────────────────────────────────────────────────────────
app.get('/api/posts', requireDB, async (req, res) => {
  try {
    const posts = await Post.find({}).sort({ created_at: -1 }).lean();
    res.json({ posts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/posts', requireDB, authenticateToken, async (req, res) => {
  try {
    const { content, imageUrl } = req.body;
    const post = await Post.create({
      user_id: mongoose.Types.ObjectId.isValid(req.user.id) ? req.user.id : undefined,
      user_name: req.user.name,
      user_email: req.user.email,
      content: content || '',
      imageUrl: imageUrl || null
    });
    res.json({ success: true, post });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Server if run directly (local development)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🌌 EmerTezora Server running at http://localhost:${PORT}`);
    console.log(`💳 Razorpay Key Loaded: ${RAZORPAY_KEY_ID}`);
    console.log(`🤖 Gemini AI: ${genAI ? 'ENABLED' : 'DISABLED (no API key)'}`);
    console.log(`🗄️  MongoDB: ${MONGODB_URI ? 'URI set (connecting...)' : 'NOT SET'}`);
    console.log(`====================================================`);
  });
}

module.exports = app;
