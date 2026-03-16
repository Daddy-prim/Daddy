import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-dev';

// Trust the proxy to get the correct client IP
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json());

// --- Database Simulation ---
// In a real app, this would be Redis
interface OtpEntry {
  otp: string;
  expiresAt: number;
  attempts: number;
}
const otpCache = new Map<string, OtpEntry>();

// In a real app, this would be PostgreSQL/MongoDB
interface User {
  id: string;
  phone_number: string;
  display_name: string | null;
  profile_picture_url: string | null;
  created_at: number;
  last_login: number;
}
const usersDb = new Map<string, User>();

// --- Rate Limiting ---
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Limit each IP to 3 requests per windowMs
  message: { error: 'Too many OTP requests from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// --- API Routes ---

// API 1: Request OTP
app.post('/api/auth/request-otp', otpLimiter, (req, res) => {
  const { phone_number } = req.body;

  if (!phone_number || typeof phone_number !== 'string') {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  // Validate Nigerian phone number format (+234 followed by 10 digits)
  const phoneRegex = /^\+234\d{10}$/;
  if (!phoneRegex.test(phone_number)) {
    return res.status(400).json({ error: 'Invalid Nigerian phone number format. Expected +234XXXXXXXXXX' });
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Save to cache with 5-minute TTL
  otpCache.set(phone_number, {
    otp,
    expiresAt: Date.now() + 5 * 60 * 1000,
    attempts: 0
  });

  // Simulate sending SMS
  console.log(`[SMS Gateway Mock] Sending OTP ${otp} to ${phone_number}`);

  res.json({ message: 'OTP sent successfully', success: true });
});

// API 2: Verify OTP
app.post('/api/auth/verify-otp', (req, res) => {
  const { phone_number, otp, device_id } = req.body;

  if (!phone_number || !otp) {
    return res.status(400).json({ error: 'Phone number and OTP are required' });
  }

  const cacheEntry = otpCache.get(phone_number);

  if (!cacheEntry) {
    return res.status(400).json({ error: 'OTP expired or not requested' });
  }

  if (Date.now() > cacheEntry.expiresAt) {
    otpCache.delete(phone_number);
    return res.status(400).json({ error: 'OTP has expired' });
  }

  if (cacheEntry.attempts >= 3) {
    otpCache.delete(phone_number);
    return res.status(400).json({ error: 'Too many failed attempts. Request a new OTP.' });
  }

  if (cacheEntry.otp !== otp) {
    cacheEntry.attempts += 1;
    return res.status(400).json({ error: 'Invalid OTP' });
  }

  // OTP is valid
  otpCache.delete(phone_number);

  // Check if user exists
  let user = Array.from(usersDb.values()).find(u => u.phone_number === phone_number);
  let isNewUser = false;

  if (!user) {
    // Create new user
    isNewUser = true;
    user = {
      id: uuidv4(),
      phone_number,
      display_name: null,
      profile_picture_url: null,
      created_at: Date.now(),
      last_login: Date.now()
    };
    usersDb.set(user.id, user);
  } else {
    // Update last login
    user.last_login = Date.now();
  }

  // Generate Session Token
  const token = jwt.sign(
    { userId: user.id, phone_number: user.phone_number, device_id },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    success: true,
    isNewUser,
    token,
    user
  });
});

// Middleware to verify JWT
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access denied' });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// API 3: Update Profile
app.post('/api/user/profile', authenticateToken, (req: any, res: any) => {
  const { name, avatar_url } = req.body;
  const userId = req.user.userId;

  const user = usersDb.get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Display name is required' });
  }

  user.display_name = name;
  if (avatar_url) {
    user.profile_picture_url = avatar_url;
  }

  res.json({ success: true, user });
});

// Get current user
app.get('/api/user/me', authenticateToken, (req: any, res: any) => {
  const userId = req.user.userId;
  const user = usersDb.get(userId);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json({ user });
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
