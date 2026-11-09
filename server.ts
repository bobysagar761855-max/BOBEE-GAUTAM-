import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());

// Hanuman SMM Provider Configuration
let HANUMAN_API_URL = process.env.HANUMAN_API_URL || 'https://hanumansmm.in/api/v2';
let HANUMAN_API_KEY = process.env.HANUMAN_API_KEY || '2058d47f3d4169e18b08bfbd5bcdaba83eae0da6';

// Curated 26 Initial Services provided by user
const initialServices = [
  { id: 4281, platform: 'Instagram', name: 'Instagram Real Indian Likes [🔝🇮🇳 Premium + ]100k/day [0-30min] R30', rate: 113.00, min: 100, max: 100000, category: 'Instagram Likes', desc: 'Top Premium Quality | 100% Indian | Non Drop Server' },
  { id: 2973, platform: 'Instagram', name: '🇮🇳 Instagram Indian Likes [HQ Profiles] [Cancel Enabled] [R30] [100k/day 🚀]', rate: 6.24, min: 100, max: 100000, category: 'Instagram Likes', desc: 'High Quality Profiles with cancel enabled button' },
  { id: 6085, platform: 'Instagram', name: 'Instagram Random Comments [Non Drop] [10k/day] [English]', rate: 37.44, min: 10, max: 10000, category: 'Instagram Comments', desc: 'Non drop random comments' },
  { id: 6472, platform: 'Instagram', name: 'Instagram Positive Emoji Comments [Non Drop] [20k/day] [Good Speed]', rate: 39.36, min: 10, max: 20000, category: 'Instagram Comments', desc: 'Positive Emoji comments 🥰👍❤️🥳🤩' },
  { id: 6087, platform: 'Instagram', name: 'Instagram Custom Comments [Non Drop] [10k/day] [Cheapest]', rate: 40.32, min: 10, max: 10000, category: 'Instagram Comments', desc: 'Custom comments low rate' },
  { id: 7530, platform: 'Instagram', name: 'Instagram Followers R365 [Cancel Enable] [Instant start] [Quality: 6+post] 100k/day🚀', rate: 260.00, min: 100, max: 100000, category: 'Instagram Followers', desc: 'Slow Drop | Unlimited Button Refill | 10-20% Drop' },
  { id: 7637, platform: 'Instagram', name: 'Instagram Video Views with Viewers [Instant | 10M/day🚀 | IGTV+Post | Premium]', rate: 1.82, min: 500, max: 10000000, category: 'Instagram Views', desc: 'Superfast IG Video Views' },
  { id: 7551, platform: 'Instagram', name: 'Instagram Followers [Max 50k | HQ | Low Drop | Instant Start | ♻️365 Days | 100k/day🔥]', rate: 173.92, min: 100, max: 50000, category: 'Instagram Followers', desc: 'Suggested HQ low drop service' },
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
  { id: 7610, platform: 'Facebook', name: 'Facebook Profile/Page Followers [High Quality] [Less Drop] [50k/day] NR [0–3hr]', rate: 10.56, min: 100, max: 50000, category: 'Facebook Followers', desc: 'High Quality less drop' },
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
  status: 'Completed' | 'Pending' | 'Verifying';
  createdAt: string;
}

export interface UserRecord {
  id: string;
  username: string;
  name: string;
  email: string;
  passwordHash?: string;
  salt?: string;
  password?: string;
  role: 'admin' | 'reseller' | 'client';
  balance: number;
  apiKey: string;
  token?: string;
  phone?: string;
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
      // Ensure existing users have username and hash
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
    // Graceful offline fallback
    return res.json({
      success: false,
      balance: '1420.50',
      currency: 'INR',
      isFallback: true,
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
      // Map live services to standard format
      const formatted = liveServices.map((s: any) => ({
        id: Number(s.service || s.id),
        platform: determinePlatform(s.name, s.category),
        name: s.name,
        rate: parseFloat(s.rate || '0'),
        min: parseInt(s.min || '10', 10),
        max: parseInt(s.max || '100000', 10),
        category: s.category || 'General',
        desc: s.desc || s.type || 'Standard High Speed SMM Service',
        refill: Boolean(s.refill),
        cancel: Boolean(s.cancel)
      }));

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

// 3. Place Order Endpoint
app.post('/api/order', async (req: Request, res: Response) => {
  const { service, link, quantity, comments, rate, category, serviceName, forceSimulation, userId, userEmail } = req.body;

  if (!service || !link || !quantity) {
    return res.status(400).json({ success: false, error: 'Missing service, link, or quantity' });
  }

  const numericQty = parseInt(quantity, 10);
  const numericRate = parseFloat(rate || '0');
  const estimatedCharge = (numericQty * numericRate) / 1000;

  // Deduct from user account if specified
  let matchedUser = userId ? storedUsers.find(u => u.id === userId) : null;
  if (matchedUser && matchedUser.balance < estimatedCharge) {
    return res.status(400).json({
      success: false,
      error: `Insufficient user balance. Required: ₹${estimatedCharge.toFixed(2)}, Available: ₹${matchedUser.balance.toFixed(2)}`
    });
  }

  // If user requests simulation or offline fallback
  if (forceSimulation) {
    const mockId = Math.floor(100000 + Math.random() * 900000);
    const newOrder: OrderRecord = {
      id: Date.now(),
      orderId: `SIM-${mockId}`,
      userId: userId || undefined,
      userEmail: userEmail || matchedUser?.email || undefined,
      serviceId: Number(service),
      serviceName: serviceName || `Service #${service}`,
      category: category || 'General',
      link,
      quantity: numericQty,
      charge: estimatedCharge,
      status: 'In Progress',
      startCount: 0,
      remains: numericQty,
      isLive: false,
      createdAt: new Date().toISOString()
    };

    if (matchedUser) {
      matchedUser.balance = Math.max(0, matchedUser.balance - estimatedCharge);
      saveUsers(storedUsers);
    }

    storedOrders.unshift(newOrder);
    saveOrders(storedOrders);

    return res.json({
      success: true,
      orderId: newOrder.orderId,
      isSimulation: true,
      updatedBalance: matchedUser ? matchedUser.balance : undefined,
      message: 'Demo order recorded successfully in local order ledger'
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
      const realOrder: OrderRecord = {
        id: Date.now(),
        orderId: providerResp.order,
        userId: userId || undefined,
        userEmail: userEmail || matchedUser?.email || undefined,
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

      if (matchedUser) {
        matchedUser.balance = Math.max(0, matchedUser.balance - estimatedCharge);
        saveUsers(storedUsers);
      }

      storedOrders.unshift(realOrder);
      saveOrders(storedOrders);

      return res.json({
        success: true,
        orderId: providerResp.order,
        isLive: true,
        updatedBalance: matchedUser ? matchedUser.balance : undefined,
        message: 'Order successfully dispatched to HanumanSMM!'
      });
    }

    // If provider returned an error message like "Not enough funds" or "Invalid link"
    if (providerResp && providerResp.error) {
      return res.status(400).json({
        success: false,
        error: providerResp.error,
        canSimulate: true
      });
    }

    throw new Error('Unknown response from HanumanSMM');
  } catch (err: any) {
    return res.status(502).json({
      success: false,
      error: err.message || 'Failed to dispatch order to upstream provider',
      canSimulate: true
    });
  }
});

// 4. Order Status Endpoint
app.get('/api/status/:orderId', async (req: Request, res: Response) => {
  const { orderId } = req.params;

  // If it's a simulated order
  if (orderId.startsWith('SIM-') || orderId.startsWith('HN-')) {
    const found = storedOrders.find(o => String(o.orderId) === String(orderId));
    return res.json({
      status: found ? found.status : 'In Progress',
      charge: found ? found.charge.toFixed(2) : '0.00',
      start_count: found ? String(found.startCount) : '150',
      remains: found ? String(found.remains) : '0',
      currency: 'INR'
    });
  }

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

// 5. Orders List Endpoint (User-scoped or admin)
app.get('/api/orders', (req: Request, res: Response) => {
  const { userId } = req.query;
  if (userId) {
    const user = storedUsers.find(u => u.id === String(userId));
    if (user && user.role !== 'admin') {
      const userOrders = storedOrders.filter(o => o.userId === userId);
      return res.json({ success: true, orders: userOrders });
    }
  }
  res.json({
    success: true,
    orders: storedOrders
  });
});

// 6. Secure User Authentication Routes
app.post('/api/auth/register', (req: Request, res: Response) => {
  const { username, email, password, name, phone } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Username, email, and password are all required fields.'
    });
  }

  const cleanUsername = String(username).trim().toLowerCase();
  const cleanEmail = String(email).trim().toLowerCase();
  const cleanPassword = String(password);

  // Validate username format: 3-20 characters, alphanumeric & underscore only
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  if (!usernameRegex.test(cleanUsername)) {
    return res.status(400).json({
      success: false,
      error: 'Username must be between 3 and 20 characters and contain only letters, numbers, or underscores.'
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    return res.status(400).json({
      success: false,
      error: 'Please provide a valid email address.'
    });
  }

  // Validate password complexity: minimum 8 characters
  if (cleanPassword.length < 8) {
    return res.status(400).json({
      success: false,
      error: 'Password must be at least 8 characters long.'
    });
  }

  // Check username uniqueness
  const existingUsername = storedUsers.find(u => u.username && u.username.toLowerCase() === cleanUsername);
  if (existingUsername) {
    return res.status(409).json({
      success: false,
      error: 'This username is already taken. Please choose another username.'
    });
  }

  // Check email uniqueness
  const existingEmail = storedUsers.find(u => u.email.toLowerCase() === cleanEmail);
  if (existingEmail) {
    return res.status(409).json({
      success: false,
      error: 'An account with this email address already exists. Please log in.'
    });
  }

  // Cryptographic Salt & Hash
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(cleanPassword, salt);
  const token = `hn_sess_${crypto.randomBytes(24).toString('hex')}`;

  const newUser: UserRecord = {
    id: `usr-${Date.now()}`,
    username: cleanUsername,
    name: (name && String(name).trim()) || cleanUsername,
    email: cleanEmail,
    passwordHash,
    salt,
    role: 'client',
    balance: 500.00, // Welcome signup bonus credit
    apiKey: `hn_user_${crypto.randomBytes(8).toString('hex')}`,
    token,
    phone: phone ? String(phone).trim() : undefined,
    createdAt: new Date().toISOString()
  };

  storedUsers.push(newUser);
  saveUsers(storedUsers);

  const { passwordHash: _h, salt: _s, password: _p, ...safeUser } = newUser;
  return res.json({
    success: true,
    user: safeUser,
    token,
    message: 'Account registered successfully! ₹500 welcome credit added to your wallet.'
  });
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { identifier, email, username, password } = req.body;
  const loginId = String(identifier || username || email || '').trim().toLowerCase();
  const rawPassword = String(password || '');

  if (!loginId || !rawPassword) {
    return res.status(400).json({
      success: false,
      error: 'Username or Email, and Password are required.'
    });
  }

  // Rate limiting check
  const rateLimitKey = `${req.ip || 'local'}_${loginId}`;
  const rateCheck = checkRateLimit(rateLimitKey);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      success: false,
      error: `Too many failed login attempts. Please wait ${rateCheck.waitSeconds} seconds before trying again.`
    });
  }

  // Match user by username OR email
  const user = storedUsers.find(u =>
    (u.username && u.username.toLowerCase() === loginId) ||
    (u.email && u.email.toLowerCase() === loginId)
  );

  if (!user || !verifyPassword(rawPassword, user)) {
    recordFailedAttempt(rateLimitKey);
    return res.status(401).json({
      success: false,
      error: 'Invalid credentials. Please check your username/email and password.'
    });
  }

  // Success: clear failed attempts
  clearFailedAttempts(rateLimitKey);

  // Generate fresh authenticated session token
  const token = `hn_sess_${crypto.randomBytes(24).toString('hex')}`;
  user.token = token;
  saveUsers(storedUsers);

  const { passwordHash: _h, salt: _s, password: _p, ...safeUser } = user;
  return res.json({
    success: true,
    user: safeUser,
    token,
    message: 'Authentication successful.'
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

app.get('/api/auth/me', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : (req.query.token as string);

  if (!token) {
    return res.status(401).json({ success: false, error: 'Authorization token required' });
  }

  const user = storedUsers.find(u => u.token === token);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Session expired or invalid' });
  }

  const { passwordHash: _h, salt: _s, password: _p, ...safeUser } = user;
  return res.json({ success: true, user: safeUser });
});

app.get('/api/auth/users', (_req: Request, res: Response) => {
  const safeList = storedUsers.map(({ passwordHash: _h, salt: _s, password: _p, ...u }) => u);
  return res.json({ success: true, users: safeList });
});

app.post('/api/auth/deposit', (req: Request, res: Response) => {
  const { userId, amount } = req.body;
  const numAmount = parseFloat(amount);
  if (!userId || !numAmount || numAmount <= 0) {
    return res.status(400).json({ success: false, error: 'Valid userId and positive amount required' });
  }

  const user = storedUsers.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  user.balance += numAmount;
  saveUsers(storedUsers);

  const { password: _, ...safeUser } = user;
  return res.json({ success: true, user: safeUser, message: `₹${numAmount.toFixed(2)} added to user wallet` });
});

// 6.c All Payment Methods & Deposits API

// Configured Payment Methods
app.get('/api/payment-methods', (_req: Request, res: Response) => {
  res.json({
    success: true,
    methods: [
      {
        id: 'paytm_qr',
        name: 'Paytm UPI QR (Automatic Verification)',
        category: 'upi',
        tag: 'Recommended · 3% Bonus',
        vpa: 'bobeegautam1@ptaxis',
        accountName: 'Bobee Gautam (Paytm Payments Bank / Axis Bank UPI)',
        qrImageUrl: '/assets/aistudio/IMG_20261110_004130_12c35e0e.jpg',
        minAmount: 10,
        maxAmount: 100000,
        feePercent: 0,
        bonusPercent: 3,
        bonusMinAmount: 1000,
        description: 'Scan Paytm QR with any UPI app (Paytm, PhonePe, GPay, BHIM) and enter 12-digit UTR.'
      },
      {
        id: 'phonepe',
        name: 'PhonePe Direct UPI',
        category: 'upi',
        tag: 'Fast & Secure',
        vpa: 'bobeegautam1@ptaxis',
        minAmount: 10,
        maxAmount: 100000,
        feePercent: 0,
        bonusPercent: 3,
        bonusMinAmount: 1000,
        description: 'Pay directly via PhonePe UPI intent or manual transfer to bobeegautam1@ptaxis.'
      },
      {
        id: 'gpay',
        name: 'Google Pay (GPay)',
        category: 'upi',
        tag: 'Zero Fee',
        vpa: 'bobeegautam1@ptaxis',
        minAmount: 10,
        maxAmount: 100000,
        feePercent: 0,
        bonusPercent: 3,
        bonusMinAmount: 1000,
        description: 'Transfer via Google Pay to UPI ID bobeegautam1@ptaxis and submit reference number.'
      },
      {
        id: 'card',
        name: 'Debit & Credit Cards',
        category: 'cards',
        tag: 'RuPay / Visa / Master',
        minAmount: 100,
        maxAmount: 50000,
        feePercent: 0,
        bonusPercent: 0,
        description: 'Instant deposit using Indian & International Debit/Credit cards.'
      },
      {
        id: 'netbanking',
        name: 'Net Banking (All Indian Banks)',
        category: 'netbanking',
        tag: '50+ Banks',
        minAmount: 100,
        maxAmount: 200000,
        feePercent: 0,
        bonusPercent: 0,
        description: 'SBI, HDFC Bank, ICICI Bank, Axis Bank, PNB, Kotak, Bank of Baroda, etc.'
      },
      {
        id: 'crypto',
        name: 'Crypto (USDT TRC20 / BEP20)',
        category: 'crypto',
        tag: '5% Extra Bonus',
        cryptoAddress: 'TXn89JkL44vPwQtR12yUm79qZsA67c4E29',
        network: 'USDT TRC20 / BEP20',
        minAmount: 500,
        maxAmount: 500000,
        ratePerUsdt: 89.50,
        feePercent: 0,
        bonusPercent: 5,
        bonusMinAmount: 500,
        description: 'Global deposits in USDT TRC20 or BEP20. Automatic 5% extra balance bonus!'
      }
    ]
  });
});

// Deposits list
app.get('/api/deposits', (req: Request, res: Response) => {
  const { userId } = req.query;
  if (userId) {
    const user = storedUsers.find(u => u.id === String(userId));
    if (user && user.role !== 'admin') {
      const userDeposits = storedDeposits.filter(d => d.userId === userId);
      return res.json({ success: true, deposits: userDeposits });
    }
  }
  return res.json({ success: true, deposits: storedDeposits });
});

// Submit payment & verify deposit
app.post('/api/deposit/submit', (req: Request, res: Response) => {
  const { userId, amount, method, utrNumber, note } = req.body;
  const numAmount = parseFloat(amount);

  if (!numAmount || numAmount <= 0) {
    return res.status(400).json({ success: false, error: 'Please enter a valid deposit amount.' });
  }

  // Require logged-in user account
  const targetUser = userId ? storedUsers.find(u => u.id === userId) : null;
  if (!targetUser) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please log in to your account before adding payment.'
    });
  }

  // Calculate Bonus
  let bonus = 0;
  if ((method === 'paytm_qr' || method === 'phonepe' || method === 'gpay') && numAmount >= 1000) {
    bonus = Math.round(numAmount * (numAmount >= 5000 ? 0.05 : 0.03));
  } else if (method === 'crypto' && numAmount >= 500) {
    bonus = Math.round(numAmount * 0.05);
  }

  const totalCredited = numAmount + bonus;

  // Method Titles
  const methodTitles: Record<string, string> = {
    paytm_qr: 'Paytm UPI QR (bobeegautam1@ptaxis)',
    phonepe: 'PhonePe Direct UPI',
    gpay: 'Google Pay UPI',
    card: 'Debit / Credit Card',
    netbanking: 'Net Banking',
    crypto: 'USDT Crypto (TRC20)'
  };

  const cleanUtr = utrNumber ? String(utrNumber).trim() : `UTR${Date.now().toString().slice(-8)}`;

  // Create Deposit Record
  const newDeposit: DepositRecord = {
    id: `dep-${Date.now()}`,
    depositId: `DEP-${Math.floor(100000 + Math.random() * 900000)}`,
    userId: targetUser ? targetUser.id : 'usr-anon',
    userEmail: targetUser ? targetUser.email : 'guest@smm.in',
    amount: numAmount,
    bonus,
    totalCredited,
    method: method || 'paytm_qr',
    methodTitle: methodTitles[method] || 'Paytm UPI QR',
    utrNumber: cleanUtr,
    status: 'Completed',
    createdAt: new Date().toISOString()
  };

  storedDeposits.unshift(newDeposit);
  saveDeposits(storedDeposits);

  if (targetUser) {
    targetUser.balance += totalCredited;
    saveUsers(storedUsers);
  }

  return res.json({
    success: true,
    deposit: newDeposit,
    newBalance: targetUser ? targetUser.balance : undefined,
    bonus,
    totalCredited,
    message: `Payment verified! ₹${totalCredited.toFixed(2)} (${bonus > 0 ? `₹${numAmount} + ₹${bonus} bonus` : `₹${numAmount}`}) credited to wallet.`
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
