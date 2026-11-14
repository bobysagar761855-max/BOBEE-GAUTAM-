import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import Razorpay from 'razorpay';
import {
  dbSaveUser,
  dbCreateTransaction,
  dbUpdateTransaction,
  dbCreateOrder
} from './src/lib/firestoreDb.ts';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());

// Razorpay Instance Initialization
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

let razorpayInstance: Razorpay | null = null;
if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
  try {
    razorpayInstance = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET
    });
    console.log('✅ Razorpay SDK initialized successfully with key_id:', RAZORPAY_KEY_ID.slice(0, 8) + '...');
  } catch (err) {
    console.error('❌ Failed to initialize Razorpay SDK:', err);
  }
} else {
  console.log('⚠️ Razorpay credentials not fully set in environment (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET). Live payments will require setting these env variables.');
}

// Security & Anti-Cache Headers for all API responses (prevents browser Back/Refresh session caching)
function setNoCacheHeaders(res: Response) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
}

app.use('/api', (_req: Request, res: Response, next: NextFunction) => {
  setNoCacheHeaders(res);
  next();
});

// Hanuman SMM Provider Configuration
let HANUMAN_API_URL = process.env.HANUMAN_API_URL || 'https://hanumansmm.in/api/v2';
let HANUMAN_API_KEY = process.env.HANUMAN_API_KEY || '2058d47f3d4169e18b08bfbd5bcdaba83eae0da6';

// Firebase OAuth Config for Google ID Token Verification
let FIREBASE_API_KEY = '';
try {
  const fbConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(fbConfigPath)) {
    const fbConfig = JSON.parse(fs.readFileSync(fbConfigPath, 'utf-8'));
    FIREBASE_API_KEY = fbConfig.apiKey || '';
  }
} catch (err) {
  console.error('Failed loading firebase-applet-config.json:', err);
}

// Curated 26 Initial Services provided by user
const initialServices = [
  { id: 4281, platform: 'Instagram', name: 'Instagram Real Indian Likes [🔝🇮🇳 Premium + ]100k/day [0-30min] R30', rate: 45.00, min: 100, max: 100000, category: 'Instagram Likes', desc: 'Top Premium Quality | 100% Indian | Non Drop Server' },
  { id: 2973, platform: 'Instagram', name: '🇮🇳 Instagram Indian Likes [HQ Profiles] [Cancel Enabled] [R30] [100k/day 🚀]', rate: 10.00, min: 100, max: 100000, category: 'Instagram Likes', desc: 'High Quality Profiles with cancel enabled button' },
  { id: 6085, platform: 'Instagram', name: 'Instagram Random Comments [Non Drop] [10k/day] [English]', rate: 37.44, min: 10, max: 10000, category: 'Instagram Comments', desc: 'Non drop random comments' },
  { id: 6472, platform: 'Instagram', name: 'Instagram Positive Emoji Comments [Non Drop] [20k/day] [Good Speed]', rate: 39.36, min: 10, max: 20000, category: 'Instagram Comments', desc: 'Positive Emoji comments 🥰👍❤️🥳🤩' },
  { id: 6087, platform: 'Instagram', name: 'Instagram Custom Comments [Non Drop] [10k/day] [Cheapest]', rate: 40.32, min: 10, max: 10000, category: 'Instagram Comments', desc: 'Custom comments low rate' },
  { id: 7530, platform: 'Instagram', name: 'Instagram Followers R365 [Cancel Enable] [Instant start] [Quality: 6+post] 100k/day🚀', rate: 95.00, min: 100, max: 100000, category: 'Instagram Followers', desc: 'Slow Drop | Unlimited Button Refill | 10-20% Drop' },
  { id: 7637, platform: 'Instagram', name: 'Instagram Video Views with Viewers [Instant | 10M/day🚀 | IGTV+Post | Premium]', rate: 5.00, min: 500, max: 10000000, category: 'Instagram Views', desc: 'Superfast IG Video & Reels Views' },
  { id: 7551, platform: 'Instagram', name: 'Instagram Followers [Max 50k | HQ | Low Drop | Instant Start | ♻️365 Days | 100k/day🔥]', rate: 75.00, min: 100, max: 50000, category: 'Instagram Followers', desc: 'Suggested HQ low drop service' },
  { id: 6230, platform: 'YouTube', name: 'YouTube Comment Likes [No Refill] [Max 50K] [Instant Start] [FAST]', rate: 20.16, min: 100, max: 50000, category: 'YouTube Likes', desc: 'Fast comment likes' },
  { id: 4073, platform: 'YouTube', name: 'YouTube Likes [Instant] [30 Days Refill] [100K Max] [50k/day]', rate: 22.08, min: 100, max: 100000, category: 'YouTube Likes', desc: '30 Days Refill enabled' },
  { id: 7652, platform: 'YouTube', name: 'YouTube Video Views [100k/day] [Bot Views] [Instant Start]', rate: 25.92, min: 1000, max: 1000000, category: 'YouTube Views', desc: 'Instant bot views' },
  { id: 7635, platform: 'YouTube', name: 'YouTube Views [HR] External Source [50k/day] [Instant Start] [R365] [No Drop]', rate: 32.64, min: 1000, max: 1000000, category: 'YouTube Views', desc: 'HR External source No drop' },
  { id: 7540, platform: 'YouTube', name: 'YouTube Likes [High Speed | R30] [20k/day] [Instant Start]', rate: 38.40, min: 100, max: 20000, category: 'YouTube Likes', desc: 'High speed R30' },
  { id: 3063, platform: 'YouTube', name: 'YouTube Views [3K+/day] [R120] [0–1hr Start] [Non Drop] [Best]', rate: 56.64, min: 1000, max: 100000, category: 'YouTube Views', desc: 'Best Non Drop service' },
  { id: 2387, platform: 'YouTube', name: 'YouTube Views Non Drop [10k+ 🚀/day] [R365] [0–2hr Start]', rate: 63.36, min: 1000, max: 500000, category: 'YouTube Views', desc: 'R365 Non drop speed' },
  { id: 7639, platform: 'YouTube', name: 'YouTube Views [Video/Shorts] [Max 1M] [High Quality] [Non Drop] [R365♻️] [50K/day 🚀]', rate: 63.36, min: 1000, max: 1000000, category: 'YouTube Views', desc: 'Video and Shorts supported' },
  { id: 7181, platform: 'YouTube', name: 'YouTube Views [High Quality] [0–30Min] [Max 1M] [R30] [Non Drop] [5k/day 🚀]', rate: 71.04, min: 1000, max: 1000000, category: 'YouTube Views', desc: 'HQ 0-30min start' },
  { id: 3421, platform: 'YouTube', name: 'YouTube Likes [Shorts/Normal] [50k/day] [Max 100K] [Non Drop] [R30]', rate: 74.88, min: 100, max: 100000, category: 'YouTube Likes', desc: 'Shorts and normal video likes' },
  { id: 7651, platform: 'YouTube', name: 'YouTube Random Comments [Instant] [10k+/day] [Cheapest]', rate: 144.00, min: 10, max: 10000, category: 'YouTube Comments', desc: 'Cheapest random comments' },
  { id: 6194, platform: 'YouTube', name: 'YouTube Custom Comments [Instant] [10k+/day] [Cheapest]', rate: 149.76, min: 10, max: 10000, category: 'YouTube Comments', desc: 'Cheapest custom comments' },
  { id: 6210, platform: 'YouTube', name: 'YouTube Watch Time [60-Min Duration Video] [1000 = 1000 Hrs] [Best Service] [R30]', rate: 1866.24, min: 1000, max: 4000, category: 'YouTube Watch Time', desc: '1000 quantity = 1000 Hours (60 Min video required)' },
  { id: 1342, platform: 'TikTok', name: 'TikTok Video Views | Stable Views [Best Seller | No Drops Since 1 Year] [1M/day 🚀]', rate: 5.09, min: 1000, max: 10000000, category: 'TikTok Views', desc: 'Stable Views No Drop 1 Year' },
  { id: 7610, platform: 'Facebook', name: 'Facebook Profile/Page Followers [High Quality] [Less Drop] [50k/day] NR [0–3hr]', rate: 35.00, min: 100, max: 50000, category: 'Facebook Followers', desc: 'High Quality less drop' },
  { id: 7611, platform: 'Facebook', name: 'Facebook Post/Photo Likes [Instant Start] [Non Drop] [50k/day]', rate: 15.00, min: 100, max: 50000, category: 'Facebook Likes', desc: 'Instant Facebook post & photo likes' },
  { id: 7612, platform: 'Facebook', name: 'Facebook Video/Reels Views [Instant | 100k/day | High Retention]', rate: 8.00, min: 500, max: 1000000, category: 'Facebook Views', desc: 'Fast Facebook video and reels views' },
  { id: 7553, platform: 'TikTok', name: 'TikTok Likes [Fast] Real Accounts [Cancel Button] [30k/day] [0–1min] [Europe + Brazil]', rate: 32.64, min: 100, max: 30000, category: 'TikTok Likes', desc: 'Real accounts fast start' },
  { id: 4620, platform: 'Instagram', name: 'Instagram Channel Members | Max 100K | Real & Active Users | Less Drop | 10K/day', rate: 120.00, min: 100, max: 100000, category: 'Instagram Members', desc: 'Real and active broadcast channel members' },
  { id: 6353, platform: 'Other', name: 'LinkedIn Company/Page Followers | Max 5K | NR | Daily 1K–3K', rate: 437.76, min: 100, max: 5000, category: 'LinkedIn', desc: 'Company page followers' }
];

// Persistent files paths
const ORDERS_FILE = path.join(process.cwd(), 'orders_data.json');
const USERS_FILE = path.join(process.cwd(), 'users_data.json');
const DEPOSITS_FILE = path.join(process.cwd(), 'deposits_data.json');

export interface DepositRecord {
  id: string;
  depositId: string;
  userId?: string;
  userEmail?: string;
  amount: number;
  bonus: number;
  totalCredited: number;
  method: string;
  methodTitle: string;
  utrNumber?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  status: 'Completed' | 'Pending' | 'Verifying' | 'Success' | 'Failed';
  createdAt: string;
}

export interface UserRecord {
  id: string;
  googleUid?: string;
  username: string;
  name: string;
  email: string;
  photoUrl?: string;
  passwordHash?: string;
  salt?: string;
  password?: string;
  role: 'admin' | 'reseller' | 'client';
  balance: number;
  apiKey: string;
  token?: string;
  phone?: string;
  referralCode?: string;
  referredBy?: string;
  referralEarnings?: number;
  createdAt: string;
}

// Password cryptographic helpers (PBKDF2-SHA512)
function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

function verifyPassword(password: string, user: UserRecord): boolean {
  if (user.passwordHash && user.salt) {
    const computed = hashPassword(password, user.salt);
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(user.passwordHash));
  }
  // Plain text fallback with auto-upgrade
  if (user.password && user.password === password) {
    user.salt = crypto.randomBytes(16).toString('hex');
    user.passwordHash = hashPassword(password, user.salt);
    delete user.password;
    saveUsers(storedUsers);
    return true;
  }
  return false;
}

// Rate limiting for brute-force protection
interface LoginAttempt {
  count: number;
  lastAttempt: number;
}
const loginAttempts = new Map<string, LoginAttempt>();

function checkRateLimit(key: string): { allowed: boolean; waitSeconds?: number } {
  const record = loginAttempts.get(key);
  const now = Date.now();
  if (!record) return { allowed: true };

  if (record.count >= 5) {
    const elapsed = (now - record.lastAttempt) / 1000;
    if (elapsed < 60) {
      return { allowed: false, waitSeconds: Math.ceil(60 - elapsed) };
    }
    loginAttempts.delete(key);
    return { allowed: true };
  }
  return { allowed: true };
}

function recordFailedAttempt(key: string) {
  const now = Date.now();
  const record = loginAttempts.get(key) || { count: 0, lastAttempt: now };
  record.count += 1;
  record.lastAttempt = now;
  loginAttempts.set(key, record);
}

function clearFailedAttempts(key: string) {
  loginAttempts.delete(key);
}

// Password Reset Data Structure
interface PasswordResetRecord {
  token: string;
  code: string;
  userId: string;
  email: string;
  username: string;
  createdAt: number;
  expiresAt: number;
  used: boolean;
}

const passwordResetStore = new Map<string, PasswordResetRecord>();

function maskEmail(email: string): string {
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const [local, domain] = parts;
  if (local.length <= 2) return `${local[0]}*@${domain}`;
  const maskedLocal = local[0] + '*'.repeat(Math.max(2, local.length - 2)) + local[local.length - 1];
  return `${maskedLocal}@${domain}`;
}

interface OrderRecord {
  id: number;
  orderId: number | string;
  userId?: string;
  userEmail?: string;
  serviceId: number;
  serviceName: string;
  category: string;
  link: string;
  quantity: number;
  charge: number;
  status: string;
  startCount: number;
  remains: number;
  isLive: boolean;
  createdAt: string;
}

// Load or Seed Users
function loadUsers(): UserRecord[] {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf-8');
      const loaded: UserRecord[] = JSON.parse(data);
      // Ensure existing users have username, hash, referralCode, and no leftover fake 999999 balance
      let modified = false;
      loaded.forEach(u => {
        if (!u.username) {
          u.username = u.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
          modified = true;
        }
        if (u.password && !u.passwordHash) {
          u.salt = crypto.randomBytes(16).toString('hex');
          u.passwordHash = hashPassword(u.password, u.salt);
          delete u.password;
          modified = true;
        }
        if (typeof u.balance !== 'number' || Number.isNaN(u.balance) || u.balance >= 999999) {
          u.balance = 0.00;
          modified = true;
        }
        if (!u.referralCode) {
          u.referralCode = `BOBY${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
          modified = true;
        }
        if (typeof u.referralEarnings !== 'number') {
          u.referralEarnings = 0;
          modified = true;
        }
      });
      if (modified) saveUsers(loaded);
      return loaded;
    }
  } catch (err) {
    console.error('Failed reading users file:', err);
  }

  const salt1 = crypto.randomBytes(16).toString('hex');
  const salt2 = crypto.randomBytes(16).toString('hex');
  const salt3 = crypto.randomBytes(16).toString('hex');

  const defaultUsers: UserRecord[] = [
    {
      id: 'usr-admin-1',
      username: 'bobysagar',
      name: 'Boby Sagar',
      email: 'bobysagar761855@gmail.com',
      passwordHash: hashPassword('password123', salt1),
      salt: salt1,
      role: 'admin',
      balance: 2500.00,
      apiKey: 'hn_live_admin_89a3f2d1e4',
      token: 'hn_sess_admin_seed',
      phone: '+91 98765 43210',
      createdAt: new Date().toISOString()
    },
    {
      id: 'usr-reseller-2',
      username: 'rohitverma',
      name: 'Rohit Verma',
      email: 'rohit@smmreseller.in',
      passwordHash: hashPassword('password123', salt2),
      salt: salt2,
      role: 'reseller',
      balance: 1450.00,
      apiKey: 'hn_live_reseller_9901bd4e',
      token: 'hn_sess_reseller_seed',
      phone: '+91 98111 22334',
      createdAt: new Date().toISOString()
    },
    {
      id: 'usr-client-3',
      username: 'democlient',
      name: 'Demo Client',
      email: 'demo@client.com',
      passwordHash: hashPassword('password123', salt3),
      salt: salt3,
      role: 'client',
      balance: 650.00,
      apiKey: 'hn_client_33f81e2b',
      token: 'hn_sess_client_seed',
      phone: '+91 99988 77665',
      createdAt: new Date().toISOString()
    }
  ];

  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(defaultUsers, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed creating default users file:', e);
  }

  return defaultUsers;
}

function saveUsers(users: UserRecord[]) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed saving users file:', err);
  }
}

let storedUsers: UserRecord[] = loadUsers();

// Load local orders
function loadOrders(): OrderRecord[] {
  try {
    if (fs.existsSync(ORDERS_FILE)) {
      const data = fs.readFileSync(ORDERS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Failed reading orders file:', err);
  }
  return [
    {
      id: 1,
      orderId: 'HN-89421',
      serviceId: 2973,
      serviceName: '🇮🇳 Instagram Indian Likes [HQ Profiles] [Cancel Enabled] [R30] [100k/day 🚀]',
      category: 'Instagram Likes',
      link: 'https://www.instagram.com/p/C3mK912vXQ/',
      quantity: 1000,
      charge: 6.24,
      status: 'Completed',
      startCount: 450,
      remains: 0,
      isLive: false,
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString()
    },
    {
      id: 2,
      orderId: 'HN-91204',
      serviceId: 7637,
      serviceName: 'Instagram Video Views with Viewers [Instant | 10M/day🚀 | IGTV+Post | Premium]',
      category: 'Instagram Views',
      link: 'https://www.instagram.com/reel/C8qZ912aA/',
      quantity: 5000,
      charge: 9.10,
      status: 'In Progress',
      startCount: 1200,
      remains: 1800,
      isLive: false,
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
    }
  ];
}

function saveOrders(orders: OrderRecord[]) {
  try {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed saving orders file:', err);
  }
}

let storedOrders: OrderRecord[] = loadOrders();

// Load or Seed Deposits History
function loadDeposits(): DepositRecord[] {
  try {
    if (fs.existsSync(DEPOSITS_FILE)) {
      const data = fs.readFileSync(DEPOSITS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Failed reading deposits file:', err);
  }
  const defaultDeposits: DepositRecord[] = [
    {
      id: 'dep-101',
      depositId: 'DEP-981240',
      userId: 'usr-admin-1',
      userEmail: 'bobysagar761855@gmail.com',
      amount: 2000,
      bonus: 60,
      totalCredited: 2060,
      method: 'paytm_qr',
      methodTitle: 'Paytm UPI QR (bobeegautam1@ptaxis)',
      utrNumber: '412389104821',
      status: 'Completed',
      createdAt: new Date(Date.now() - 3600000 * 3).toISOString()
    },
    {
      id: 'dep-102',
      depositId: 'DEP-981180',
      userId: 'usr-reseller-2',
      userEmail: 'rohit@smmreseller.in',
      amount: 1400,
      bonus: 42,
      totalCredited: 1442,
      method: 'phonepe',
      methodTitle: 'PhonePe UPI',
      utrNumber: '409182746194',
      status: 'Completed',
      createdAt: new Date(Date.now() - 3600000 * 20).toISOString()
    },
    {
      id: 'dep-103',
      depositId: 'DEP-980992',
      userId: 'usr-client-3',
      userEmail: 'demo@client.com',
      amount: 500,
      bonus: 0,
      totalCredited: 500,
      method: 'gpay',
      methodTitle: 'Google Pay UPI',
      utrNumber: '408291048291',
      status: 'Completed',
      createdAt: new Date(Date.now() - 3600000 * 48).toISOString()
    }
  ];

  try {
    fs.writeFileSync(DEPOSITS_FILE, JSON.stringify(defaultDeposits, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed creating default deposits file:', e);
  }
  return defaultDeposits;
}

function saveDeposits(deposits: DepositRecord[]) {
  try {
    fs.writeFileSync(DEPOSITS_FILE, JSON.stringify(deposits, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed saving deposits file:', err);
  }
}

let storedDeposits: DepositRecord[] = loadDeposits();

// In-memory cache for live services (5 minutes TTL)
let cachedLiveServices: any[] | null = null;
let cachedServicesAt = 0;
const SERVICES_CACHE_TTL_MS = 5 * 60 * 1000;

// Helper to call Hanuman SMM API v2
async function callHanumanAPI(payload: Record<string, string | number>, timeoutMs = 12000): Promise<any> {
  const params = new URLSearchParams();
  params.append('key', HANUMAN_API_KEY);
  for (const [key, value] of Object.entries(payload)) {
    params.append(key, String(value));
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(HANUMAN_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: params.toString(),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      return { raw: text };
    }
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error?.name === 'AbortError') {
      throw new Error(`Upstream API request timed out after ${timeoutMs}ms`);
    }
    throw error;
  }
}

// 1. Balance Endpoint
app.get('/api/balance', async (_req: Request, res: Response) => {
  try {
    const data = await callHanumanAPI({ action: 'balance' });
    if (data && (data.balance !== undefined || data.error === undefined)) {
      return res.json({
        success: true,
        balance: data.balance || '0.00',
        currency: data.currency || 'INR',
        provider: 'HanumanSMM',
        status: 'online'
      });
    }
    // Return error if provider answered with error
    return res.json({
      success: false,
      balance: '0.00',
      currency: 'INR',
      error: data?.error || 'Provider returned unexpected format',
      status: 'auth_error'
    });
  } catch (err: any) {
    return res.status(502).json({
      success: false,
      balance: '0.00',
      currency: 'INR',
      error: err.message || 'Provider connection timeout',
      status: 'offline_cached'
    });
  }
});

// 2. Services Endpoint
app.get('/api/services', async (req: Request, res: Response) => {
  const forceRefresh = req.query.refresh === 'true';
  const now = Date.now();

  if (!forceRefresh && cachedLiveServices && (now - cachedServicesAt) < SERVICES_CACHE_TTL_MS) {
    return res.json({
      success: true,
      source: 'live',
      cached: true,
      count: cachedLiveServices.length,
      services: cachedLiveServices
    });
  }

  try {
    const liveServices = await callHanumanAPI({ action: 'services' }, 20000);
    if (Array.isArray(liveServices) && liveServices.length > 0) {
      const panelRateOverrides: Record<number, number> = {
        7551: 75.00, // IG Followers 1K - ₹75
        7530: 95.00,
        2973: 10.00, // IG Likes 1K - ₹10
        4281: 45.00,
        7637: 5.00,  // IG Views 1K - ₹5
        7610: 35.00, // FB Followers 1K - ₹35
        7611: 15.00, // FB Likes 1K - ₹15
        7612: 8.00   // FB Views 1K - ₹8
      };

      // Map live services to standard format with custom panel pricing
      const formatted = liveServices.map((s: any) => {
        const sid = Number(s.service || s.id);
        return {
          id: sid,
          platform: determinePlatform(s.name, s.category),
          name: s.name,
          rate: panelRateOverrides[sid] ?? parseFloat(s.rate || '0'),
          min: parseInt(s.min || '10', 10),
          max: parseInt(s.max || '100000', 10),
          category: s.category || 'General',
          desc: s.desc || s.type || 'Standard High Speed SMM Service',
          refill: Boolean(s.refill),
          cancel: Boolean(s.cancel)
        };
      });

      cachedLiveServices = formatted;
      cachedServicesAt = now;

      return res.json({
        success: true,
        source: 'live',
        count: formatted.length,
        services: formatted
      });
    }
  } catch (err: any) {
    console.log(`[Services] Upstream unavailable (${err?.message || 'timeout'}), serving fallback catalog.`);
  }

  // Fallback to stale cache if available, otherwise initial 26 curated services
  if (cachedLiveServices && cachedLiveServices.length > 0) {
    return res.json({
      success: true,
      source: 'live_cached',
      count: cachedLiveServices.length,
      services: cachedLiveServices
    });
  }

  return res.json({
    success: true,
    source: 'catalog',
    count: initialServices.length,
    services: initialServices
  });
});

function determinePlatform(name: string = '', category: string = ''): string {
  const text = `${name} ${category}`.toLowerCase();
  if (text.includes('instagram') || text.includes('ig ') || text.includes('reels')) return 'Instagram';
  if (text.includes('youtube') || text.includes('yt ') || text.includes('shorts')) return 'YouTube';
  if (text.includes('tiktok') || text.includes('tik tok')) return 'TikTok';
  if (text.includes('facebook') || text.includes('fb ')) return 'Facebook';
  if (text.includes('telegram') || text.includes('tg ')) return 'Telegram';
  if (text.includes('twitter') || text.includes('x.com')) return 'Twitter';
  if (text.includes('linkedin')) return 'LinkedIn';
  if (text.includes('spotify')) return 'Spotify';
  return 'Other';
}

// Session Authentication Helper & Middleware
interface AuthenticatedRequest extends Request {
  authUser?: UserRecord;
}

function extractSessionToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const headerToken = req.headers['x-auth-token'];
  if (typeof headerToken === 'string' && headerToken.trim()) {
    return headerToken.trim();
  }
  if (typeof req.query.token === 'string' && req.query.token.trim()) {
    return req.query.token.trim();
  }
  return null;
}

// Verify Firebase / Google ID Token via Google Identity Toolkit
async function verifyFirebaseIdToken(idToken: string): Promise<{
  uid: string;
  email: string;
  name: string;
  photoUrl?: string;
}> {
  if (!FIREBASE_API_KEY) {
    throw new Error('Firebase API key not configured on server.');
  }
  const resp = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(FIREBASE_API_KEY)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    }
  );
  const data = await resp.json();
  if (!resp.ok || !Array.isArray(data.users) || data.users.length === 0) {
    throw new Error(data?.error?.message || 'Invalid or expired Google authentication token.');
  }
  const fbUser = data.users[0];
  if (!fbUser.localId || !fbUser.email) {
    throw new Error('Google account did not return a verified UID and email.');
  }
  return {
    uid: String(fbUser.localId),
    email: String(fbUser.email).toLowerCase(),
    name: String(fbUser.displayName || fbUser.email.split('@')[0]),
    photoUrl: fbUser.photoUrl ? String(fbUser.photoUrl) : undefined
  };
}

// Cache verified user Firebase ID tokens in memory for Firestore REST persistence
const userFirebaseTokens = new Map<string, string>();

async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = extractSessionToken(req);
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please Sign in with Google to continue.'
    });
  }

  let user = storedUsers.find(u => u.token && u.token === token);

  // Also support direct Firebase ID token verification bound to Google UID
  if (!user && token.includes('.')) {
    try {
      const verified = await verifyFirebaseIdToken(token);
      user = storedUsers.find(u => u.googleUid && u.googleUid === verified.uid);
      if (user) {
        userFirebaseTokens.set(user.id, token);
      }
    } catch {
      // Invalid ID token
    }
  }

  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Session expired or invalid. Please Sign in with Google again.'
    });
  }

  const headerFbToken = req.headers['x-firebase-token'];
  if (typeof headerFbToken === 'string' && headerFbToken.includes('.')) {
    userFirebaseTokens.set(user.id, headerFbToken.trim());
  }

  req.authUser = user;
  next();
}

// 3. Place Live Order Endpoint (Strictly scoped to logged-in session user with real balance deduction)
app.post('/api/order', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { service, link, quantity, comments, rate, category, serviceName } = req.body;
  const matchedUser = req.authUser!;

  if (!service || !link || !quantity) {
    return res.status(400).json({ success: false, error: 'Missing service, link, or quantity' });
  }

  const numericQty = parseInt(quantity, 10);
  const numericRate = parseFloat(rate || '0');
  const estimatedCharge = (numericQty * numericRate) / 1000;

  if (numericQty <= 0 || Number.isNaN(numericQty)) {
    return res.status(400).json({ success: false, error: 'Invalid order quantity.' });
  }

  if (matchedUser.balance < estimatedCharge) {
    return res.status(400).json({
      success: false,
      error: `Insufficient wallet balance. Required: ₹${estimatedCharge.toFixed(2)}, Available: ₹${matchedUser.balance.toFixed(2)}. Please add funds first.`
    });
  }

  try {
    const payload: Record<string, string | number> = {
      action: 'add',
      service,
      link,
      quantity: numericQty
    };
    if (comments) {
      payload.comments = comments;
    }

    const providerResp = await callHanumanAPI(payload);

    if (providerResp && providerResp.order) {
      matchedUser.balance = Math.max(0, Number((matchedUser.balance - estimatedCharge).toFixed(2)));
      saveUsers(storedUsers);

      const realOrder: OrderRecord = {
        id: Date.now(),
        orderId: providerResp.order,
        userId: matchedUser.id,
        userEmail: matchedUser.email,
        serviceId: Number(service),
        serviceName: serviceName || `Service #${service}`,
        category: category || 'General',
        link,
        quantity: numericQty,
        charge: estimatedCharge,
        status: 'Pending',
        startCount: 0,
        remains: numericQty,
        isLive: true,
        createdAt: new Date().toISOString()
      };

      storedOrders.unshift(realOrder);
      saveOrders(storedOrders);

      const fbToken = userFirebaseTokens.get(matchedUser.id);

      // Persist to database
      dbCreateOrder({
        id: realOrder.id,
        user_id: matchedUser.id,
        orderId: String(realOrder.orderId),
        service_id: realOrder.serviceId,
        serviceName: realOrder.serviceName,
        category: realOrder.category,
        link: realOrder.link,
        quantity: realOrder.quantity,
        charge: realOrder.charge,
        status: 'Pending',
        provider_order_id: String(providerResp.order),
        startCount: 0,
        remains: realOrder.remains,
        isLive: true,
        created_at: realOrder.createdAt
      }, fbToken).catch(e => console.error('[DB] Failed saving order to database:', e));

      dbSaveUser({
        id: matchedUser.id,
        google_id: matchedUser.googleUid,
        email: matchedUser.email,
        wallet_balance: matchedUser.balance,
        role: matchedUser.role === 'admin' ? 'admin' : 'user',
        username: matchedUser.username,
        name: matchedUser.name,
        photoUrl: matchedUser.photoUrl,
        token: matchedUser.token,
        referralCode: matchedUser.referralCode,
        referredBy: matchedUser.referredBy,
        referralEarnings: matchedUser.referralEarnings,
        created_at: matchedUser.createdAt
      }, fbToken).catch(e => console.error('[DB] Failed syncing deducted balance to database:', e));

      return res.json({
        success: true,
        orderId: providerResp.order,
        isLive: true,
        updatedBalance: matchedUser.balance,
        message: 'Order successfully dispatched to HanumanSMM!'
      });
    }

    // If provider returned an error message like "Not enough funds" or "Invalid link"
    if (providerResp && providerResp.error) {
      return res.status(400).json({
        success: false,
        error: providerResp.error
      });
    }

    throw new Error('Unknown response from HanumanSMM');
  } catch (err: any) {
    return res.status(502).json({
      success: false,
      error: err.message || 'Failed to dispatch order to upstream provider'
    });
  }
});

// 4. Live Order Status Endpoint
app.get('/api/status/:orderId', async (req: Request, res: Response) => {
  const { orderId } = req.params;

  try {
    const data = await callHanumanAPI({ action: 'status', order: orderId });
    if (data && data.status) {
      // Update local storage record if found
      const local = storedOrders.find(o => String(o.orderId) === String(orderId));
      if (local) {
        local.status = data.status;
        if (data.start_count !== undefined) local.startCount = parseInt(data.start_count, 10);
        if (data.remains !== undefined) local.remains = parseInt(data.remains, 10);
        saveOrders(storedOrders);
      }
      return res.json(data);
    }
    return res.json({ status: 'Processing', start_count: '0', remains: '0', currency: 'INR' });
  } catch (err: any) {
    return res.json({ status: 'Unknown', error: err.message });
  }
});

// 5. Orders List Endpoint (Strictly scoped to logged-in user: WHERE user_id = req.authUser.id)
app.get('/api/orders', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const loggedInUser = req.authUser!;
  const userOrders = storedOrders.filter(o => o.userId === loggedInUser.id);
  res.json({
    success: true,
    orders: userOrders
  });
});

// 6. Secure Google OAuth 2.0 Authentication Routes
app.post('/api/auth/google', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const idToken = (authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null) || req.body?.idToken;

  if (!idToken) {
    return res.status(400).json({
      success: false,
      error: 'Google ID token is required.'
    });
  }

  try {
    const verified = await verifyFirebaseIdToken(String(idToken));

    // Strictly match user by their unique Google UID (never allow cross-account takeover)
    let user = storedUsers.find(u => u.googleUid && u.googleUid === verified.uid);
    let isNewUser = false;

    const sessionToken = `hn_sess_${crypto.randomBytes(24).toString('hex')}`;

    if (!user) {
      isNewUser = true;
      const baseUsername = verified.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 14) || 'user';
      const uniqueSuffix = verified.uid.slice(-4).toLowerCase();
      const username = `${baseUsername}_${uniqueSuffix}`;
      const incomingRef = String(req.body?.referralCode || '').trim().toUpperCase();
      const referrer = incomingRef
        ? storedUsers.find(u => u.referralCode && u.referralCode.toUpperCase() === incomingRef)
        : undefined;

      user = {
        id: `usr-${verified.uid}`,
        googleUid: verified.uid,
        username,
        name: verified.name,
        email: verified.email,
        photoUrl: verified.photoUrl,
        role: 'client',
        balance: 0.00, // Real wallet starts at ₹0.00
        apiKey: `hn_user_${crypto.randomBytes(8).toString('hex')}`,
        token: sessionToken,
        referralCode: `BOBY${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
        referredBy: referrer?.id,
        referralEarnings: 0,
        createdAt: new Date().toISOString()
      };

      storedUsers.push(user);
    } else {
      user.name = verified.name || user.name;
      user.email = verified.email;
      if (verified.photoUrl) user.photoUrl = verified.photoUrl;
      if (!user.referralCode) {
        user.referralCode = `BOBY${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      }
      if (typeof user.referralEarnings !== 'number') {
        user.referralEarnings = 0;
      }
      user.token = sessionToken;
    }

    saveUsers(storedUsers);
    userFirebaseTokens.set(user.id, String(idToken));

    dbSaveUser({
      id: user.id,
      google_id: user.googleUid,
      email: user.email,
      wallet_balance: user.balance,
      role: user.role === 'admin' ? 'admin' : 'user',
      username: user.username,
      name: user.name,
      photoUrl: user.photoUrl,
      token: user.token,
      referralCode: user.referralCode,
      referredBy: user.referredBy,
      referralEarnings: user.referralEarnings,
      created_at: user.createdAt
    }, String(idToken)).catch(e => console.error('[DB] Failed saving user to database:', e));

    const { passwordHash: _h, salt: _s, password: _p, ...safeUser } = user;
    return res.json({
      success: true,
      isNewUser,
      user: safeUser,
      token: sessionToken,
      message: isNewUser
        ? 'Account created with ₹0.00 balance. Please add funds to place orders.'
        : `Welcome back, ${safeUser.name}!`
    });
  } catch (err: any) {
    return res.status(401).json({
      success: false,
      error: err?.message || 'Google authentication verification failed.'
    });
  }
});

// Manual email/password signup & login are disabled
app.post('/api/auth/register', (_req: Request, res: Response) => {
  return res.status(403).json({
    success: false,
    error: 'Manual email/password registration is disabled. Please use Sign in with Google.'
  });
});

app.post('/api/auth/login', (_req: Request, res: Response) => {
  return res.status(403).json({
    success: false,
    error: 'Manual email/password login is disabled. Please use Sign in with Google.'
  });
});

// 6.b Password Reset Flow Endpoints

// Step 1: Request Password Reset Code (Forgot Password Email Request)
app.post('/api/auth/forgot-password', (req: Request, res: Response) => {
  const { identifier, email } = req.body;
  const lookup = String(email || identifier || '').trim().toLowerCase();

  if (!lookup) {
    return res.status(400).json({
      success: false,
      error: 'Please enter your registered email address or username.'
    });
  }

  // Find user by email or username
  const user = storedUsers.find(u =>
    (u.email && u.email.toLowerCase() === lookup) ||
    (u.username && u.username.toLowerCase() === lookup)
  );

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'No registered account found with that email address or username.'
    });
  }

  // Generate 6-digit verification code and secure token
  const code = crypto.randomInt(100000, 999999).toString();
  const token = `hn_rst_${crypto.randomBytes(24).toString('hex')}`;
  const now = Date.now();
  const expiresAt = now + 15 * 60 * 1000; // 15 minutes validity

  const record: PasswordResetRecord = {
    token,
    code,
    userId: user.id,
    email: user.email,
    username: user.username,
    createdAt: now,
    expiresAt,
    used: false
  };

  // Store in memory by token AND code for fast verification
  passwordResetStore.set(token, record);
  passwordResetStore.set(code, record);

  console.log(`[AUTH] Password reset requested for ${user.email}. Verification Code: ${code}, Token: ${token}`);

  return res.json({
    success: true,
    message: `A 6-digit recovery code has been sent to ${maskEmail(user.email)}.`,
    email: user.email,
    maskedEmail: maskEmail(user.email),
    previewCode: code, // Simulated email inbox preview for instant testing
    resetToken: token,
    expiresInSeconds: 900
  });
});

// Step 2: Verify Recovery Token / Code
app.post('/api/auth/verify-reset-token', (req: Request, res: Response) => {
  const { tokenOrCode, email } = req.body;
  const inputCode = String(tokenOrCode || '').trim();

  if (!inputCode) {
    return res.status(400).json({
      success: false,
      error: 'Verification code or token is required.'
    });
  }

  const record = passwordResetStore.get(inputCode);
  const now = Date.now();

  if (!record) {
    return res.status(400).json({
      success: false,
      error: 'Invalid recovery code. Please check your email or request a new code.'
    });
  }

  if (record.used) {
    return res.status(400).json({
      success: false,
      error: 'This recovery code has already been used. Please request a new one.'
    });
  }

  if (now > record.expiresAt) {
    return res.status(400).json({
      success: false,
      error: 'This recovery code has expired (15-minute limit). Please request a fresh code.'
    });
  }

  // If email was provided, ensure it matches
  if (email && String(email).trim().toLowerCase() !== record.email.toLowerCase()) {
    return res.status(400).json({
      success: false,
      error: 'This recovery code was issued for a different email address.'
    });
  }

  return res.json({
    success: true,
    valid: true,
    email: record.email,
    username: record.username,
    message: 'Verification code confirmed. You may now choose a new password.'
  });
});

// Step 3: Complete Password Reset with Verified Token
app.post('/api/auth/reset-password', (req: Request, res: Response) => {
  const { tokenOrCode, email, newPassword } = req.body;
  const inputCode = String(tokenOrCode || '').trim();
  const rawPassword = String(newPassword || '');

  if (!inputCode || !rawPassword) {
    return res.status(400).json({
      success: false,
      error: 'Verification code and new password are required.'
    });
  }

  if (rawPassword.length < 8) {
    return res.status(400).json({
      success: false,
      error: 'New password must be at least 8 characters long.'
    });
  }

  const record = passwordResetStore.get(inputCode);
  const now = Date.now();

  if (!record || record.used || now > record.expiresAt) {
    return res.status(400).json({
      success: false,
      error: 'Invalid, used, or expired recovery code. Please request a new code.'
    });
  }

  const user = storedUsers.find(u => u.id === record.userId || u.email.toLowerCase() === record.email.toLowerCase());
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'Target user account could not be found.'
    });
  }

  // Update password with fresh cryptographic salt & PBKDF2 hash
  const salt = crypto.randomBytes(16).toString('hex');
  user.salt = salt;
  user.passwordHash = hashPassword(rawPassword, salt);
  delete user.password;

  // Mark token as used
  record.used = true;
  passwordResetStore.set(record.token, record);
  passwordResetStore.set(record.code, record);

  // Generate new authenticated session token
  const sessionToken = `hn_sess_${crypto.randomBytes(24).toString('hex')}`;
  user.token = sessionToken;
  saveUsers(storedUsers);

  // Clear rate limits for this user
  clearFailedAttempts(`${req.ip || 'local'}_${user.username.toLowerCase()}`);
  clearFailedAttempts(`${req.ip || 'local'}_${user.email.toLowerCase()}`);

  const { passwordHash: _h, salt: _s, password: _p, ...safeUser } = user;
  return res.json({
    success: true,
    message: 'Password reset successfully! You are now logged in with your new credentials.',
    user: safeUser,
    token: sessionToken
  });
});

app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.authUser!;
  const { passwordHash: _h, salt: _s, password: _p, ...safeUser } = user;
  return res.json({ success: true, user: safeUser });
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  const token = extractSessionToken(req);
  if (token) {
    const user = storedUsers.find(u => u.token && u.token === token);
    if (user) {
      user.token = undefined;
      saveUsers(storedUsers);
    }
  }

  // Strict anti-cache & browser storage clearing headers
  setNoCacheHeaders(res);
  res.setHeader('Clear-Site-Data', '"cache", "storage"');

  return res.json({
    success: true,
    loggedOut: true,
    redirectTo: '/login',
    message: 'Session destroyed and browser cache cleared.'
  });
});

app.get('/api/auth/users', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (req.authUser!.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  const safeList = storedUsers.map(({ passwordHash: _h, salt: _s, password: _p, token: _t, ...u }) => u);
  return res.json({ success: true, users: safeList });
});

// 6.c Payment Gateway API (Razorpay Only)
app.get('/api/payment-methods', (_req: Request, res: Response) => {
  res.json({
    success: true,
    methods: [
      {
        id: 'razorpay',
        name: 'Razorpay Payment Gateway (Instant Auto)',
        category: 'razorpay',
        tag: 'Instant Auto',
        minAmount: 10,
        maxAmount: 10000,
        feePercent: 0,
        bonusPercent: 0,
        description: 'Pay securely via Razorpay using UPI, Debit/Credit Cards, NetBanking, or Wallets.'
      }
    ]
  });
});

// Deposits list (Strictly scoped to logged-in user)
app.get('/api/deposits', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const loggedInUser = req.authUser!;
  const userDeposits = storedDeposits.filter(d => d.userId === loggedInUser.id);
  return res.json({ success: true, deposits: userDeposits });
});

// ==========================================
// 6.c.1 Razorpay Payment Gateway Endpoints
// ==========================================

const MIN_DEPOSIT = 10;
const MAX_DEPOSIT = 10000;

// Create Razorpay Order (supports /api/wallet/create-order, /api/razorpay/create-order, and /api/payment/create-order)
const handleCreateRazorpayOrder = async (req: AuthenticatedRequest, res: Response) => {
  const { amount } = req.body;
  const numAmount = Number(amount);
  const targetUser = req.authUser!;

  if (Number.isNaN(numAmount) || numAmount < MIN_DEPOSIT || numAmount > MAX_DEPOSIT) {
    return res.status(400).json({
      success: false,
      error: `Invalid deposit amount. Must be between ₹${MIN_DEPOSIT} and ₹${MAX_DEPOSIT}.`,
      message: `Invalid deposit amount. Must be between ₹${MIN_DEPOSIT} and ₹${MAX_DEPOSIT}.`
    });
  }

  const activeKeyId = process.env.RAZORPAY_KEY_ID || RAZORPAY_KEY_ID;
  const activeKeySecret = process.env.RAZORPAY_KEY_SECRET || RAZORPAY_KEY_SECRET;

  if (!activeKeyId || !activeKeySecret) {
    return res.status(503).json({
      success: false,
      error: 'Razorpay payment gateway is not yet configured on the server. Please configure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in the server environment.',
      message: 'Razorpay payment gateway is not yet configured on the server.'
    });
  }

  const amountInPaise = Math.round(numAmount * 100);
  const receipt = `boby_rcpt_${targetUser.id.replace(/[^a-zA-Z0-9]/g, '').slice(-8)}_${Date.now().toString().slice(-6)}`;

  try {
    const rzp = razorpayInstance || new Razorpay({
      key_id: activeKeyId,
      key_secret: activeKeySecret
    });

    const order = await rzp.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: receipt,
      notes: {
        userId: targetUser.id,
        userEmail: targetUser.email,
        username: targetUser.username
      }
    });

    // Record pending transaction record in deposits ledger
    const pendingDeposit: DepositRecord = {
      id: `dep-${Date.now()}`,
      depositId: `RZP-${Date.now().toString().slice(-6)}`,
      userId: targetUser.id,
      userEmail: targetUser.email,
      amount: numAmount,
      bonus: 0,
      totalCredited: numAmount,
      method: 'razorpay',
      methodTitle: 'Razorpay Gateway (UPI/Card/NetBanking)',
      razorpayOrderId: order.id,
      status: 'Pending',
      createdAt: new Date().toISOString()
    };

    storedDeposits.unshift(pendingDeposit);
    saveDeposits(storedDeposits);

    dbCreateTransaction({
      id: pendingDeposit.id,
      user_id: targetUser.id,
      order_id: order.id,
      amount: numAmount,
      bonus: 0,
      totalCredited: numAmount,
      status: 'pending',
      gateway: 'razorpay',
      method: 'razorpay',
      methodTitle: pendingDeposit.methodTitle,
      created_at: pendingDeposit.createdAt
    }, userFirebaseTokens.get(targetUser.id)).catch(e => console.error('[DB] Failed saving pending transaction:', e));

    return res.json({
      success: true,
      order,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: activeKeyId,
      user: {
        name: targetUser.name,
        email: targetUser.email,
        phone: targetUser.phone || ''
      }
    });
  } catch (err: any) {
    console.error('Error creating Razorpay order:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to create Razorpay order.'
    });
  }
};

app.post('/api/wallet/create-order', requireAuth, handleCreateRazorpayOrder);
app.post('/api/razorpay/create-order', requireAuth, handleCreateRazorpayOrder);
app.post('/api/payment/create-order', requireAuth, handleCreateRazorpayOrder);

// Verify Razorpay Payment Signature and Credit Wallet Balance (supports both /api/razorpay/verify-payment and /api/payment/verify)
const handleVerifyRazorpayPayment = async (req: AuthenticatedRequest, res: Response) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;
  const targetUser = req.authUser!;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({
      success: false,
      error: 'Missing required Razorpay verification credentials.',
      message: 'Invalid payment parameters.'
    });
  }

  const activeKeySecret = process.env.RAZORPAY_KEY_SECRET || RAZORPAY_KEY_SECRET;

  if (!activeKeySecret) {
    return res.status(500).json({
      success: false,
      error: 'Server configuration error: RAZORPAY_KEY_SECRET not set.'
    });
  }

  // 1. Verify HMAC SHA256 Signature
  const body = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac('sha256', activeKeySecret)
    .update(body.toString())
    .digest('hex');

  const expectedBuf = Buffer.from(expectedSignature);
  const sigBuf = Buffer.from(String(razorpay_signature));
  const isSignatureValid = expectedBuf.length === sigBuf.length && crypto.timingSafeEqual(expectedBuf, sigBuf);

  if (!isSignatureValid) {
    console.warn(`[Razorpay Security Alert] Invalid signature for payment ${razorpay_payment_id} on order ${razorpay_order_id}`);
    
    // Mark pending deposit as failed if found
    const failedRecord = storedDeposits.find(d => d.razorpayOrderId === razorpay_order_id);
    if (failedRecord) {
      failedRecord.status = 'Failed';
      saveDeposits(storedDeposits);
      dbUpdateTransaction(razorpay_order_id, { status: 'failed' }, userFirebaseTokens.get(targetUser.id)).catch(() => {});
    }

    return res.status(400).json({
      success: false,
      error: 'Payment signature verification failed.',
      message: 'Payment signature verification failed.'
    });
  }

  // 2. Prevent Duplicate Credit Attack: Check if payment_id has already been credited
  const alreadyProcessed = storedDeposits.find(
    d => d.razorpayPaymentId === razorpay_payment_id && (d.status === 'Completed' || d.status === 'Success')
  );

  if (alreadyProcessed) {
    return res.json({
      success: true,
      alreadyProcessed: true,
      newBalance: targetUser.balance,
      message: 'Payment already credited to wallet.'
    });
  }

  // 3. Determine amount and bonus & validate ownership
  let depositAmount = parseFloat(amount || '0');
  let depositRecord = storedDeposits.find(d => d.razorpayOrderId === razorpay_order_id);

  if (depositRecord && depositRecord.userId && depositRecord.userId !== targetUser.id) {
    return res.status(403).json({
      success: false,
      error: 'Unauthorized transaction access.',
      message: 'Unauthorized transaction access.'
    });
  }

  if (depositRecord && depositRecord.amount > 0) {
    depositAmount = depositRecord.amount;
  }

  if (!depositAmount || depositAmount <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Invalid deposit amount for verified payment.'
    });
  }

  const bonus = 0;
  const totalCredited = Number(depositAmount.toFixed(2));

  // 4. Update or create deposit record as Success/Completed
  if (depositRecord) {
    depositRecord.status = 'Success';
    depositRecord.amount = depositAmount;
    depositRecord.bonus = bonus;
    depositRecord.totalCredited = totalCredited;
    depositRecord.razorpayPaymentId = razorpay_payment_id;
    depositRecord.utrNumber = razorpay_payment_id;
  } else {
    depositRecord = {
      id: `dep-${Date.now()}`,
      depositId: `RZP-${Date.now().toString().slice(-6)}`,
      userId: targetUser.id,
      userEmail: targetUser.email,
      amount: depositAmount,
      bonus,
      totalCredited,
      method: 'razorpay',
      methodTitle: 'Razorpay Gateway (UPI/Card/NetBanking)',
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      utrNumber: razorpay_payment_id,
      status: 'Success',
      createdAt: new Date().toISOString()
    };
    storedDeposits.unshift(depositRecord);
  }
  saveDeposits(storedDeposits);

  // 5. Securely credit wallet balance to logged-in user
  targetUser.balance = Number((targetUser.balance + totalCredited).toFixed(2));

  // 6. Handle referral commission if user was referred
  if (targetUser.referredBy) {
    const referrer = storedUsers.find(u => u.id === targetUser.referredBy);
    if (referrer) {
      const commission = Number((depositAmount * 0.05).toFixed(2));
      referrer.balance = Number((referrer.balance + commission).toFixed(2));
      referrer.referralEarnings = Number(((referrer.referralEarnings || 0) + commission).toFixed(2));
    }
  }

  saveUsers(storedUsers);

  const fbToken = userFirebaseTokens.get(targetUser.id);

  // Sync transaction status to database
  dbUpdateTransaction(razorpay_order_id, {
    payment_id: razorpay_payment_id,
    status: 'success',
    bonus,
    totalCredited
  }, fbToken).catch(e => console.error('[DB] Failed updating transaction in database:', e));

  // Sync credited wallet balance to database
  dbSaveUser({
    id: targetUser.id,
    google_id: targetUser.googleUid,
    email: targetUser.email,
    wallet_balance: targetUser.balance,
    role: targetUser.role === 'admin' ? 'admin' : 'user',
    username: targetUser.username,
    name: targetUser.name,
    photoUrl: targetUser.photoUrl,
    token: targetUser.token,
    referralCode: targetUser.referralCode,
    referredBy: targetUser.referredBy,
    referralEarnings: targetUser.referralEarnings,
    created_at: targetUser.createdAt
  }, fbToken).catch(e => console.error('[DB] Failed syncing credited wallet balance to database:', e));

  console.log(`[Razorpay Success] ₹${totalCredited} credited to user ${targetUser.email} (Payment ID: ${razorpay_payment_id})`);

  return res.json({
    success: true,
    verified: true,
    paymentId: razorpay_payment_id,
    orderId: razorpay_order_id,
    amount: depositAmount,
    bonus,
    totalCredited,
    newBalance: targetUser.balance,
    message: `Successfully credited ₹${totalCredited.toFixed(2)} to your wallet.`
  });
};

app.post('/api/wallet/verify-payment', requireAuth, handleVerifyRazorpayPayment);
app.post('/api/razorpay/verify-payment', requireAuth, handleVerifyRazorpayPayment);
app.post('/api/payment/verify', requireAuth, handleVerifyRazorpayPayment);

// Project Zip Download Endpoint
app.get('/api/download-zip', (_req: Request, res: Response) => {
  const zipPath = path.resolve(process.cwd(), 'public', 'boby-smm-panel.zip');
  if (!fs.existsSync(zipPath)) {
    return res.status(404).json({ success: false, error: 'Project zip archive not found.' });
  }
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="boby-smm-panel.zip"');
  return res.sendFile(zipPath);
});

// 6.d Referral / Invite Stats & Tracking API
app.get('/api/referrals', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const loggedInUser = req.authUser!;
  if (!loggedInUser.referralCode) {
    loggedInUser.referralCode = `BOBY${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    saveUsers(storedUsers);
  }

  const referredUsers = storedUsers.filter(u => u.referredBy === loggedInUser.id);
  const referrals = referredUsers.map(refUser => {
    const userDeposits = storedDeposits.filter(d => d.userId === refUser.id);
    const totalDeposited = userDeposits.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
    const commissionEarned = Number((totalDeposited * 0.05).toFixed(2));
    return {
      id: refUser.id,
      name: refUser.name,
      maskedEmail: maskEmail(refUser.email),
      joinedAt: refUser.createdAt,
      totalDeposited,
      commissionEarned
    };
  });

  return res.json({
    success: true,
    referralCode: loggedInUser.referralCode,
    referralEarnings: loggedInUser.referralEarnings || 0,
    totalReferrals: referrals.length,
    referrals
  });
});

// 7. Config & Health Endpoint
app.get('/api/config', (_req: Request, res: Response) => {
  res.json({
    apiUrl: HANUMAN_API_URL,
    maskedKey: HANUMAN_API_KEY.slice(0, 6) + '...' + HANUMAN_API_KEY.slice(-4),
    rawKey: HANUMAN_API_KEY,
    totalInitialServices: initialServices.length,
    activeOrdersCount: storedOrders.length,
    usersCount: storedUsers.length
  });
});

app.post('/api/config', (req: Request, res: Response) => {
  const { apiKey, apiUrl } = req.body;
  if (apiKey) HANUMAN_API_KEY = apiKey.trim();
  if (apiUrl) HANUMAN_API_URL = apiUrl.trim();
  res.json({ success: true, message: 'Provider API configuration updated' });
});

// Server initialization & Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`⚡ Hanuman SMM Panel server active on http://localhost:${PORT}`);
  });
}

startServer();
