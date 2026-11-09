export interface SMMService {
  id: number;
  platform: 'Instagram' | 'YouTube' | 'TikTok' | 'Facebook' | 'LinkedIn' | 'Other';
  name: string;
  rate: number;
  min: number;
  max: number;
  category: string;
  desc: string;
  speed?: string;
  refill?: boolean;
  cancel?: boolean;
}

export interface PlacedOrder {
  id: number;
  orderId: number | string;
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

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
}

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: 'admin' | 'reseller' | 'client';
  balance: number;
  apiKey: string;
  token?: string;
  phone?: string;
  createdAt: string;
}

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

