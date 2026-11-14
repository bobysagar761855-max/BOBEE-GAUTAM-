import firebaseConfig from '../../firebase-applet-config.json';
import fs from 'fs';
import path from 'path';

// Types mirroring the user's database schema
export interface DbUser {
  id: string;
  google_id?: string;
  email: string;
  password?: string;
  passwordHash?: string;
  salt?: string;
  wallet_balance: number;
  role: 'user' | 'admin' | 'reseller' | 'client';
  username?: string;
  name?: string;
  photoUrl?: string;
  apiKey?: string;
  token?: string;
  phone?: string;
  referralCode?: string;
  referredBy?: string;
  referralEarnings?: number;
  created_at: string;
}

export interface DbTransaction {
  id: string;
  user_id: string;
  order_id?: string;
  payment_id?: string;
  amount: number;
  bonus?: number;
  totalCredited?: number;
  status: 'pending' | 'success' | 'failed' | 'cancelled' | 'Completed';
  gateway: string;
  method?: string;
  methodTitle?: string;
  utrNumber?: string;
  created_at: string;
}

export interface DbOrder {
  id: string | number;
  user_id?: string;
  orderId?: string;
  service_id: number;
  serviceName?: string;
  category?: string;
  link: string;
  quantity: number;
  charge: number;
  status: 'Pending' | 'Processing' | 'Completed' | 'Partial' | 'Cancelled' | 'In Progress';
  provider_order_id?: string;
  startCount?: number;
  remains?: number;
  isLive?: boolean;
  created_at: string;
}

const PROJECT_ID = firebaseConfig.projectId;
const DATABASE_ID = firebaseConfig.firestoreDatabaseId || '(default)';
const API_KEY = firebaseConfig.apiKey;
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(PROJECT_ID)}/databases/${encodeURIComponent(DATABASE_ID)}/documents`;

function stripUndefined<T extends Record<string, any>>(obj: T): Record<string, any> {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

function toFirestoreValue(val: any): Record<string, any> {
  if (val === null || val === undefined) {
    return { nullValue: null };
  }
  if (typeof val === 'boolean') {
    return { booleanValue: val };
  }
  if (typeof val === 'number') {
    if (Number.isInteger(val)) {
      return { integerValue: String(val) };
    }
    return { doubleValue: val };
  }
  if (typeof val === 'string') {
    return { stringValue: val };
  }
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.map((item) => toFirestoreValue(item))
      }
    };
  }
  if (typeof val === 'object') {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) {
        fields[k] = toFirestoreValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function fromFirestoreValue(val: any): any {
  if (!val || typeof val !== 'object') return undefined;
  if ('nullValue' in val) return null;
  if ('booleanValue' in val) return Boolean(val.booleanValue);
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('stringValue' in val) return String(val.stringValue);
  if ('timestampValue' in val) return String(val.timestampValue);
  if ('arrayValue' in val) {
    return Array.isArray(val.arrayValue?.values)
      ? val.arrayValue.values.map((v: any) => fromFirestoreValue(v))
      : [];
  }
  if ('mapValue' in val) {
    const out: Record<string, any> = {};
    const fields = val.mapValue?.fields || {};
    for (const [k, v] of Object.entries(fields)) {
      out[k] = fromFirestoreValue(v);
    }
    return out;
  }
  return undefined;
}

function toFirestoreFields(data: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      fields[key] = toFirestoreValue(value);
    }
  }
  return fields;
}

function fromFirestoreDoc(doc: any): Record<string, any> | null {
  if (!doc || !doc.fields) return null;
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(doc.fields)) {
    out[k] = fromFirestoreValue(v);
  }
  return out;
}

async function firestorePatchDoc(
  collection: string,
  docId: string,
  data: Record<string, any>,
  firebaseIdToken?: string,
  mergeFields = true
): Promise<boolean> {
  if (!firebaseIdToken || !PROJECT_ID || !API_KEY) {
    return false;
  }
  const cleanData = stripUndefined(data);
  const keys = Object.keys(cleanData);
  if (keys.length === 0) return false;

  const maskParams = mergeFields
    ? keys.map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&')
    : '';
  const url = `${FIRESTORE_BASE_URL}/${encodeURIComponent(collection)}/${encodeURIComponent(docId)}?key=${encodeURIComponent(API_KEY)}${maskParams ? `&${maskParams}` : ''}`;

  try {
    const resp = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${firebaseIdToken}`
      },
      body: JSON.stringify({ fields: toFirestoreFields(cleanData) })
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.warn(`[Firestore REST] PATCH ${collection}/${docId} skipped (${resp.status}):`, errText.slice(0, 220));
      return false;
    }
    return true;
  } catch (err) {
    console.warn(`[Firestore REST] Network issue on ${collection}/${docId}:`, err);
    return false;
  }
}

async function firestoreGetDoc(
  collection: string,
  docId: string,
  firebaseIdToken?: string
): Promise<Record<string, any> | null> {
  if (!firebaseIdToken || !PROJECT_ID || !API_KEY) {
    return null;
  }
  const url = `${FIRESTORE_BASE_URL}/${encodeURIComponent(collection)}/${encodeURIComponent(docId)}?key=${encodeURIComponent(API_KEY)}`;
  try {
    const resp = await fetch(url, {
      headers: {
        Authorization: `Bearer ${firebaseIdToken}`
      }
    });
    if (!resp.ok) return null;
    const json = await resp.json();
    return fromFirestoreDoc(json);
  } catch {
    return null;
  }
}

// Disk cache fallbacks
const USERS_CACHE_FILE = path.join(process.cwd(), 'users_data.json');
const TRANSACTIONS_CACHE_FILE = path.join(process.cwd(), 'deposits_data.json');
const ORDERS_CACHE_FILE = path.join(process.cwd(), 'orders_data.json');

// --- User Operations ---

export async function dbGetUserById(userId: string, firebaseIdToken?: string): Promise<DbUser | null> {
  const remoteUser = await firestoreGetDoc('users', userId, firebaseIdToken);
  if (remoteUser) {
    return remoteUser as DbUser;
  }

  // Fallback to cache file
  try {
    if (fs.existsSync(USERS_CACHE_FILE)) {
      const users: any[] = JSON.parse(fs.readFileSync(USERS_CACHE_FILE, 'utf-8'));
      const u = users.find((x) => x.id === userId);
      if (u) {
        return {
          id: u.id,
          google_id: u.googleUid,
          email: u.email,
          wallet_balance: u.balance ?? 0,
          role: u.role === 'admin' ? 'admin' : 'user',
          username: u.username,
          name: u.name,
          photoUrl: u.photoUrl,
          token: u.token,
          referralCode: u.referralCode,
          referredBy: u.referredBy,
          referralEarnings: u.referralEarnings,
          created_at: u.createdAt || new Date().toISOString()
        };
      }
    }
  } catch {}
  return null;
}

export async function dbGetUserByEmail(email: string): Promise<DbUser | null> {
  const normEmail = email.toLowerCase().trim();
  try {
    if (fs.existsSync(USERS_CACHE_FILE)) {
      const users: any[] = JSON.parse(fs.readFileSync(USERS_CACHE_FILE, 'utf-8'));
      const u = users.find((x) => x.email && x.email.toLowerCase() === normEmail);
      if (u) {
        return {
          id: u.id,
          google_id: u.googleUid,
          email: u.email,
          wallet_balance: u.balance ?? 0,
          role: u.role === 'admin' ? 'admin' : 'user',
          username: u.username,
          name: u.name,
          photoUrl: u.photoUrl,
          token: u.token,
          referralCode: u.referralCode,
          referredBy: u.referredBy,
          referralEarnings: u.referralEarnings,
          created_at: u.createdAt || new Date().toISOString()
        };
      }
    }
  } catch {}
  return null;
}

export async function dbSaveUser(user: DbUser, firebaseIdToken?: string): Promise<void> {
  const cleanUser = stripUndefined(user);
  await firestorePatchDoc('users', user.id, cleanUser, firebaseIdToken, true);

  // Sync to local cache file
  try {
    let users: any[] = [];
    if (fs.existsSync(USERS_CACHE_FILE)) {
      users = JSON.parse(fs.readFileSync(USERS_CACHE_FILE, 'utf-8'));
    }
    const idx = users.findIndex((u) => u.id === user.id);
    const diskUser = stripUndefined({
      id: user.id,
      googleUid: user.google_id,
      email: user.email,
      balance: user.wallet_balance,
      role: user.role,
      username: user.username,
      name: user.name,
      photoUrl: user.photoUrl,
      token: user.token,
      referralCode: user.referralCode,
      referredBy: user.referredBy,
      referralEarnings: user.referralEarnings,
      createdAt: user.created_at
    });
    if (idx >= 0) {
      users[idx] = { ...users[idx], ...diskUser };
    } else {
      users.push(diskUser);
    }
    fs.writeFileSync(USERS_CACHE_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed syncing user to disk cache:', e);
  }
}

// --- Transactions Operations ---

export async function dbCreateTransaction(tx: DbTransaction, firebaseIdToken?: string): Promise<void> {
  const cleanTx = stripUndefined(tx);
  await firestorePatchDoc('transactions', tx.id, cleanTx, firebaseIdToken, false);

  // Sync to deposits cache file
  try {
    let txs: any[] = [];
    if (fs.existsSync(TRANSACTIONS_CACHE_FILE)) {
      txs = JSON.parse(fs.readFileSync(TRANSACTIONS_CACHE_FILE, 'utf-8'));
    }
    const diskTx = stripUndefined({
      id: tx.id,
      depositId: tx.order_id || tx.id,
      userId: tx.user_id,
      amount: tx.amount,
      bonus: tx.bonus || 0,
      totalCredited: tx.totalCredited || tx.amount,
      method: tx.gateway,
      methodTitle: tx.methodTitle || `${tx.gateway.toUpperCase()} Gateway`,
      razorpayOrderId: tx.order_id,
      razorpayPaymentId: tx.payment_id,
      utrNumber: tx.payment_id || tx.utrNumber,
      status: tx.status === 'success' ? 'Success' : tx.status === 'failed' ? 'Failed' : 'Pending',
      createdAt: tx.created_at
    });
    const idx = txs.findIndex((t) => t.id === tx.id || (tx.order_id && t.razorpayOrderId === tx.order_id));
    if (idx >= 0) {
      txs[idx] = { ...txs[idx], ...diskTx };
    } else {
      txs.unshift(diskTx);
    }
    fs.writeFileSync(TRANSACTIONS_CACHE_FILE, JSON.stringify(txs, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed syncing transaction to disk cache:', e);
  }
}

export async function dbUpdateTransaction(
  orderId: string,
  updates: Partial<DbTransaction>,
  firebaseIdToken?: string
): Promise<void> {
  const cleanUpdates = stripUndefined(updates);
  let targetDocId: string | undefined;

  try {
    if (fs.existsSync(TRANSACTIONS_CACHE_FILE)) {
      const txs: any[] = JSON.parse(fs.readFileSync(TRANSACTIONS_CACHE_FILE, 'utf-8'));
      const target = txs.find((t) => t.razorpayOrderId === orderId || t.depositId === orderId);
      if (target) {
        targetDocId = target.id;
        if (updates.status) {
          target.status = updates.status === 'success' ? 'Success' : updates.status === 'failed' ? 'Failed' : 'Pending';
        }
        if (updates.payment_id) {
          target.razorpayPaymentId = updates.payment_id;
          target.utrNumber = updates.payment_id;
        }
        if (updates.bonus !== undefined) target.bonus = updates.bonus;
        if (updates.totalCredited !== undefined) target.totalCredited = updates.totalCredited;
        fs.writeFileSync(TRANSACTIONS_CACHE_FILE, JSON.stringify(txs, null, 2), 'utf-8');
      }
    }
  } catch (e) {
    console.error('Failed updating transaction in disk cache:', e);
  }

  if (targetDocId && Object.keys(cleanUpdates).length > 0) {
    await firestorePatchDoc('transactions', targetDocId, cleanUpdates, firebaseIdToken, true);
  }
}

// --- Orders Operations ---

export async function dbCreateOrder(order: DbOrder, firebaseIdToken?: string): Promise<void> {
  const docId = String(order.id);
  const cleanOrder = stripUndefined(order);
  await firestorePatchDoc('orders', docId, cleanOrder, firebaseIdToken, false);

  try {
    let orders: any[] = [];
    if (fs.existsSync(ORDERS_CACHE_FILE)) {
      orders = JSON.parse(fs.readFileSync(ORDERS_CACHE_FILE, 'utf-8'));
    }
    orders.unshift(order);
    fs.writeFileSync(ORDERS_CACHE_FILE, JSON.stringify(orders, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed syncing order to disk cache:', e);
  }
}

export async function dbGetUserOrders(userId: string): Promise<DbOrder[]> {
  try {
    if (fs.existsSync(ORDERS_CACHE_FILE)) {
      const orders: any[] = JSON.parse(fs.readFileSync(ORDERS_CACHE_FILE, 'utf-8'));
      return orders.filter((o) => !o.userId || o.userId === userId);
    }
  } catch {}
  return [];
}
