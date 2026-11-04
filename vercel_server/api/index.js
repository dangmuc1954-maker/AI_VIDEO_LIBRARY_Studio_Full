const crypto = require('crypto');
const url = require('url');
const fs = require('fs');
const path = require('path');

let WORKFLOWS_DATA;
try {
  WORKFLOWS_DATA = require('./workflowsData.json');
} catch(e) {
  WORKFLOWS_DATA = { groups: [], products: [], definitions: {} };
}

// 1. Ed25519 Keypair (Synced with Desktop App Verifier)
const KEY_DATA = {
  keyId: "2026-q3",
  publicKey: "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAMAXS0Ql/9WdX8ZAQQQwG4ZG/RYbkegjO2+C8Gptn4mo=\n-----END PUBLIC KEY-----\n",
  privateKey: "-----BEGIN PRIVATE KEY-----\nMC4CAQAwBQYDK2VwBCIEIBWELh07RoLiBNgMLN+W6ndnxjaRvqP4JB2KKuRD7hvI\n-----END PRIVATE KEY-----\n"
};

// 2. Official Plans Definition (Synchronized with Desktop App)
const PLANS = [
  {
    code: 'custom',
    name: 'Gói Tùy Chọn',
    tier: 'pro',
    badge: 'Gói Tùy Chọn (Cấp Thử/Đặc Biệt)',
    accentColor: '#10b981',
    recommended: false,
    trialEnabled: false,
    trialDays: 0,
    trialOncePerMachine: false,
    allowPromotion: false,
    maxDevices: 1,
    features: [
      'Trải nghiệm đầy đủ tính năng AI Forge Veo 3 Studio',
      'Tạo Video Veo 3 & Grok chất lượng cao',
      'Tạo ảnh Google Flow Nano & ChatGPT',
      'Giọng đọc AI ElevenLabs TTS không giới hạn',
      'Sử dụng bản quyền trên 1 máy tính duy nhất'
    ],
    billingOptions: [
      { durationCode: 'CUSTOM', durationDays: 1, priceVnd: 0, originalPriceVnd: 0, sortOrder: 1 }
    ],
    imageConcurrency: 30,
    videoConcurrency: 15,
    ttsConcurrency: 30,
    unlimited: true
  },

  {
    code: 'trial',
    name: 'Trial 1 Ngày',
    tier: 'pro',
    badge: 'Gói Dùng Thử (1 Ngày)',
    accentColor: '#38bdf8',
    recommended: false,
    trialEnabled: true,
    trialDays: 1,
    trialOncePerMachine: true,
    allowPromotion: false,
    maxDevices: 1,
    features: [
      'Trải nghiệm đầy đủ tính năng AI Forge Veo 3 Studio trong 24 giờ (1 Ngày)',
      'Tạo Video Veo 3 & Grok chất lượng cao',
      'Tạo ảnh Google Flow Nano & ChatGPT',
      'Giọng đọc AI ElevenLabs TTS không giới hạn',
      'Sử dụng bản quyền trên 1 máy tính duy nhất'
    ],
    billingOptions: [
      { durationCode: '1D', durationDays: 1, priceVnd: 0, originalPriceVnd: 0, sortOrder: 1 }
    ],
    imageConcurrency: 20,
    videoConcurrency: 10,
    ttsConcurrency: 20,
    unlimited: true
  },
  {
    code: 'basic',
    name: 'Basic',
    tier: 'pro',
    badge: 'Gói Basic (1 Tháng)',
    accentColor: '#6366f1',
    recommended: false,
    trialEnabled: false,
    trialDays: 0,
    trialOncePerMachine: false,
    allowPromotion: true,
    maxDevices: 1,
    features: [
      'Tạo Video Veo 3 & Grok không giới hạn',
      'Tạo ảnh Google Flow Nano & ChatGPT',
      'Giọng đọc AI ElevenLabs TTS chất lượng cao',
      'Không giới hạn số lượt render trong 30 ngày (1 Tháng)',
      'Sử dụng đồng thời tối đa 1 máy tính'
    ],
    billingOptions: [
      { durationCode: '1M', durationDays: 30, priceVnd: 120000, originalPriceVnd: 180000, sortOrder: 1 }
    ],
    imageConcurrency: 20,
    videoConcurrency: 10,
    ttsConcurrency: 20,
    unlimited: true
  },
  {
    code: 'silver',
    name: 'Silver',
    tier: 'pro',
    badge: 'Gói Silver (3 Tháng)',
    accentColor: '#a855f7',
    recommended: true,
    trialEnabled: false,
    trialDays: 0,
    trialOncePerMachine: false,
    allowPromotion: true,
    maxDevices: 1,
    features: [
      'Tạo Video Veo 3 & Grok không giới hạn',
      'Tạo ảnh Google Flow Nano & ChatGPT',
      'Giọng đọc AI ElevenLabs TTS chất lượng cao',
      'Không giới hạn số lượt render trong 90 ngày (3 Tháng)',
      'Tiết kiệm 20% so với gia hạn từng tháng',
      'Sử dụng bản quyền cho 1 máy tính'
    ],
    billingOptions: [
      { durationCode: '3M', durationDays: 90, priceVnd: 300000, originalPriceVnd: 450000, sortOrder: 1 }
    ],
    imageConcurrency: 30,
    videoConcurrency: 15,
    ttsConcurrency: 30,
    unlimited: true
  },
  {
    code: 'gold',
    name: 'Gold VIP',
    tier: 'ultra',
    badge: 'Gói Gold VIP (1 Năm)',
    accentColor: '#eab308',
    recommended: false,
    trialEnabled: false,
    trialDays: 0,
    trialOncePerMachine: false,
    allowPromotion: true,
    maxDevices: 1,
    features: [
      'Tạo Video Veo 3 & Grok không giới hạn',
      'Tạo ảnh Google Flow Nano & ChatGPT',
      'Giọng đọc AI ElevenLabs TTS chất lượng cao',
      'Full Workflow Canvas tự động hóa nâng cao',
      'Không giới hạn số lượt render trong 365 ngày (1 Năm)',
      'Hỗ trợ ưu tiên và cập nhật mẫu Prompt VIP',
      'Sử dụng bản quyền cho 1 máy tính'
    ],
    billingOptions: [
      { durationCode: '1Y', durationDays: 365, priceVnd: 800000, originalPriceVnd: 1440000, sortOrder: 1 }
    ],
    imageConcurrency: 50,
    videoConcurrency: 30,
    ttsConcurrency: 50,
    unlimited: true
  }
];

// 3. Payment & Bank Settings (SePay Virtual Account)
const SETTINGS = {
  adminPassword: process.env.ADMIN_PASSWORD || 'admin',
  paymentReceiver: process.env.PAYMENT_RECEIVER || 'PHAN DANG HONG HA',
  bankAccount: process.env.BANK_ACCOUNT || '96247HP2004',
  bankName: process.env.BANK_NAME || 'BIDV',
  sepayApiKey: process.env.SEPAY_API_KEY || 'MZUDJVBTW0NUAVLC4JOYIYVXWC3DOT2JWOFDUR1SFRNKLZ8EKR9Q9C1FIMHDGTXQ'
};

// 4. In-Memory Store
const inMemoryStore = {
  keys: new Map(),
  orders: new Map(),
  machines: new Map(),
  bannedMachines: new Set(),
  unlinkedMachines: new Set(),
  trialUsedMachines: new Set(),
  consumedKeys: new Set(),
  bannedIps: new Set(),
  hydrated: false
};

// 5. Cloud Storage Persistence (Restful-API Objects)
const MASTER_CLOUD_ID = process.env.MASTER_CLOUD_ID || 'ff808181a067127101a07b74b792343f';
const REMOTE_API_BASE = 'https://api.restful-api.dev/objects';

let lastHydratedAt = 0;
async function hydrateFromCloud(force = false) {
  const now = Date.now();
  if (!force && inMemoryStore.hydrated && (now - lastHydratedAt < 5000)) return;
  lastHydratedAt = now;
  try {
    let res = null;
    try {
      res = await fetch(`${REMOTE_API_BASE}/${MASTER_CLOUD_ID}`, { signal: AbortSignal.timeout(6000) });
    } catch (e1) {
      // Retry once after 300ms if failed
      await new Promise(r => setTimeout(r, 300));
      res = await fetch(`${REMOTE_API_BASE}/${MASTER_CLOUD_ID}`, { signal: AbortSignal.timeout(6000) });
    }
    if (res.ok) {
      const json = await res.json();
      const d = json?.data;
      if (d) {
        if (Array.isArray(d.keys)) {
          d.keys.forEach(k => {
            if (k && k.key) {
              const cleanK = k.key.trim().toUpperCase();
              const isTrial = (k.planCode === 'trial' || cleanK.includes('TRIAL')) && k.planCode !== 'custom' && !cleanK.includes('CUSTOM');
              if (isTrial) {
                k.planCode = 'trial';
                k.planName = 'Trial 1 Ngày';
                k.durationDays = 1;
                if (k.expiresAt && k.activatedAt) {
                  const actTime = new Date(k.activatedAt).getTime();
                  if (new Date(k.expiresAt).getTime() - actTime > 2 * 86400000) {
                    k.expiresAt = new Date(actTime + 1 * 86400000).toISOString();
                  }
                }
              }
              inMemoryStore.keys.set(cleanK, k);
            }
          });
        }
        if (Array.isArray(d.machines)) {
          d.machines.forEach(m => {
            if (m && m.machineCode) {
              const cleanM = m.machineCode.trim();
              const isTrial = (m.planCode === 'trial' || (m.licenseKey && m.licenseKey.includes('TRIAL'))) && m.planCode !== 'custom' && !(m.licenseKey && m.licenseKey.includes('CUSTOM'));
              if (isTrial) {
                m.planCode = 'trial';
                m.planName = 'Trial 1 Ngày';
                m.durationDays = 1;
                if (m.expiresAt) {
                  const actTime = m.activatedAt ? new Date(m.activatedAt).getTime() : (m.lastSeenAt ? new Date(m.lastSeenAt).getTime() : Date.now());
                  const expTime = new Date(m.expiresAt).getTime();
                  if (isNaN(expTime) || (expTime - actTime > 2 * 86400000)) {
                    m.expiresAt = new Date(actTime + 1 * 86400000).toISOString();
                  }
                }
              }
              inMemoryStore.machines.set(cleanM, m);
            }
          });
        }
        if (Array.isArray(d.orders)) {
          d.orders.forEach(o => { if (o && o.orderCode) inMemoryStore.orders.set(o.orderCode.trim().toUpperCase(), o); });
        }
        if (Array.isArray(d.unlinkedMachines)) {
          d.unlinkedMachines.forEach(b => { if (b) inMemoryStore.unlinkedMachines.add(String(b).trim()); });
        }
        if (Array.isArray(d.bannedMachines)) {
          d.bannedMachines.forEach(b => { if (b) inMemoryStore.bannedMachines.add(String(b).trim()); });
        }
        if (Array.isArray(d.trialUsedMachines)) {
          d.trialUsedMachines.forEach(b => { if (b) inMemoryStore.trialUsedMachines.add(String(b).trim()); });
        }
        if (Array.isArray(d.consumedKeys)) {
          d.consumedKeys.forEach(k => { if (k) inMemoryStore.consumedKeys.add(String(k).trim().toUpperCase()); });
        }
        if (Array.isArray(d.bannedIps)) {
          d.bannedIps.forEach(ip => { if (ip) inMemoryStore.bannedIps.add(String(ip).trim()); });
        }
        if (d.settings && typeof d.settings === 'object') {
          Object.assign(SETTINGS, d.settings);
        }
        console.log(`[Cloud Store Hydrated] Keys: ${inMemoryStore.keys.size} | Machines: ${inMemoryStore.machines.size} | Unlinked: ${inMemoryStore.unlinkedMachines.size} | TrialUsed: ${inMemoryStore.trialUsedMachines.size} | Consumed: ${inMemoryStore.consumedKeys.size}`);
      }
    }
  } catch (err) {
    console.warn('[Cloud Hydrate Notice]', err.message);
  } finally {
    inMemoryStore.hydrated = true;
  }
}

async function saveToCloudDirect() {
  try {
    if (!inMemoryStore.hydrated) {
      await hydrateFromCloud(true);
    }
    const compactKeys = Array.from(inMemoryStore.keys.values()).map(k => ({
      key: k.key,
      planCode: k.planCode,
      planName: k.planName,
      planTier: k.planTier,
      durationDays: Number(k.durationDays) || (k.planCode === 'trial' ? 1 : 30),
      status: k.status,
      expiresAt: k.expiresAt || null,
      machineCodes: k.machineCodes || [],
      isConsumed: k.isConsumed || false,
      activatedAt: k.activatedAt || null,
      notes: k.notes || ''
    })).slice(0, 500);

    const compactMachines = Array.from(inMemoryStore.machines.values()).map(m => ({
      machineCode: m.machineCode,
      customerIdentifier: m.customerIdentifier,
      licenseKey: m.licenseKey,
      planCode: m.planCode,
      planName: m.planName,
      planTier: m.planTier,
      durationDays: Number(m.durationDays) || (m.planCode === 'trial' ? 1 : 30),
      activatedAt: m.activatedAt || null,
      expiresAt: m.expiresAt,
      status: m.status,
      ip: m.ip || '',
      appVersion: m.appVersion || 'v3.0.0',
      lastSeenAt: m.lastSeenAt || null,
      notes: m.notes || ''
    })).slice(0, 500);

    const payload = {
      name: 'aiforge_master_registry_v3',
      data: {
        keys: compactKeys,
        machines: compactMachines,
        orders: Array.from(inMemoryStore.orders.values()).slice(0, 50).map(o => ({
          orderCode: o.orderCode,
          status: o.status,
          amount: o.amount,
          licenseKey: o.licenseKey
        })),
        bannedMachines: Array.from(inMemoryStore.bannedMachines).slice(0, 500),
        bannedIps: Array.from(inMemoryStore.bannedIps).slice(0, 500),
        unlinkedMachines: Array.from(inMemoryStore.unlinkedMachines).slice(0, 500),
        trialUsedMachines: Array.from(inMemoryStore.trialUsedMachines).slice(0, 1000),
        consumedKeys: Array.from(inMemoryStore.consumedKeys).slice(0, 1000),
        settings: {
          adminPassword: SETTINGS.adminPassword,
          paymentReceiver: SETTINGS.paymentReceiver,
          bankAccount: SETTINGS.bankAccount,
          bankName: SETTINGS.bankName,
          sepayApiKey: SETTINGS.sepayApiKey
        },
        updatedAt: new Date().toISOString()
      }
    };

    const res = await fetch(`${REMOTE_API_BASE}/${MASTER_CLOUD_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(4000)
    });
    console.log('[Cloud Store Saved Direct] Status:', res.status);
  } catch (err) {
    console.warn('[Cloud Store Save Error]', err.message);
  }
}

function triggerSaveToCloud() {
  saveToCloudDirect().catch(() => {});
}

// Helper: Calculate Days Remaining
function calculateDaysRemaining(expiresAt) {
  if (!expiresAt) return 0;
  const expTime = new Date(expiresAt).getTime();
  if (isNaN(expTime)) return 0;
  const diffMs = expTime - Date.now();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

// Standard ElevenLabs Voices
const STANDARD_ELEVENLABS_VOICES = {
  "aN7cv9yXNrfIR87bDmyD": { name: "Ninh Đôn – Deep & Warm (Tiếng Việt Nam)", language: "Vietnamese" },
  "EcENCamMHdzIoMysqdsv": { name: "Ethan – Clear & Energetic (Tiếng Việt Nam)", language: "Vietnamese" },
  "ipTvfDXAg1zowfF1rv9w": { name: "Hoàng Đặng – Resonant Storyteller (Tiếng Việt Nam)", language: "Vietnamese" },
  "KVzG2JMdZJKi6y7cwERP": { name: "Quang Nguyễn – Natural & Dynamic (Tiếng Việt Nam)", language: "Vietnamese" },
  "ThT5KcBeYPX3keUQqHPh": { name: "Thu Hà – Soft & Gentle (Tiếng Việt Nữ)", language: "Vietnamese" },
  "g5CIjZEefAph4nQFvHAz": { name: "Mai Linh – Emotional & Clear (Tiếng Việt Nữ)", language: "Vietnamese" },
  "nPczCjzI2devNBz1zQrb": { name: "Minh Trí – News & Podcast (Tiếng Việt Nam)", language: "Vietnamese" },
  "21m00Tcm4TlvDq8ikWAM": { name: "Rachel (Nữ - Truyền cảm)", language: "Multilingual" },
  "pNInz6obpgDQGcFmaJgB": { name: "Adam (Nam - Trầm ấm)", language: "Multilingual" },
  "ErXwobaYiN019PkySvjV": { name: "Antoni (Nam - Sinh động)", language: "Multilingual" },
  "EXAVITQu4vr4xnSDxMaL": { name: "Bella (Nữ - Ngọt ngào)", language: "Multilingual" },
  "VR6AewLTigWG4xSOukaG": { name: "Arnold (Nam - Mạnh mẽ)", language: "Multilingual" },
  "AZnzlk1XvdvUeBnXmlld": { name: "Domi (Nữ - Lôi cuốn)", language: "Multilingual" },
  "MF3mGyEYCl7XYWbV9V6O": { name: "Elli (Nữ - Cảm xúc)", language: "Multilingual" },
  "TxGEqnHWrfWFTfGW9XjX": { name: "Josh (Nam - Tự tin)", language: "Multilingual" },
  "9BWtsMINqrJLrRacOk9x": { name: "Aria (Nữ - Tươi sáng)", language: "Multilingual" },
  "CwhRBWXzGAHq8TQ4Fs17": { name: "Roger (Nam - Trầm vang)", language: "Multilingual" },
  "FGY2WhTYpPnrIDTdsKH5": { name: "Laura (Nữ - Tự nhiên)", language: "Multilingual" },
  "IKne3meq5aSn9XLyUdCD": { name: "Charlie (Nam - Trẻ trung)", language: "Multilingual" },
  "JBFqnCBsd6RMkjVDRZzb": { name: "George (Nam - Uy quyền)", language: "Multilingual" },
  "N2lVS1w4EtoT3dr4eOWO": { name: "Callum (Nam - Kịch tính)", language: "Multilingual" },
  "SAz9YHcvj6GT2YYXdXww": { name: "River (Trung tính - Bình thản)", language: "Multilingual" },
  "TX3LPaxmHKxFdv7VOQHJ": { name: "Liam (Nam - Sôi nổi)", language: "Multilingual" },
  "Xb7hH8MSUJpSbSDYk0k2": { name: "Alice (Nữ - Tự tin)", language: "Multilingual" },
  "XrExE9yKIg1WjnnlVkGX": { name: "Matilda (Nữ - Tri thức)", language: "Multilingual" },
  "bIHbv24MWmeRgasZH58o": { name: "Will (Nam - Thân thiện)", language: "Multilingual" },
  "cgSgspJ2msm6clMCkdW9": { name: "Jessica (Nữ - Quyến rũ)", language: "Multilingual" },
  "cjVigY5qzO86Huf0OWal": { name: "Eric (Nam - Năng động)", language: "Multilingual" },
  "iP95p4xoKVk53GoZ742B": { name: "Chris (Nam - Giản dị)", language: "Multilingual" },
  "onwK4e9ZLuTAKqWW03F9": { name: "Daniel (Nam - Tin tức)", language: "Multilingual" },
  "pFZP5JQG7iQjIQuC4Bku": { name: "Lily (Nữ - Ấm áp)", language: "Multilingual" },
  "pqHfZKP75CvOlQylNhV4": { name: "Bill (Nam - Trưởng thành)", language: "Multilingual" }
};

// Helper: Base64URL
function base64url(buf) {
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64urlJson(obj) {
  return base64url(Buffer.from(JSON.stringify(obj), 'utf8'));
}

// Sign JWT/JWS with Ed25519
function signEntitlementToken(payload, privateKeyPem = KEY_DATA.privateKey, keyId = KEY_DATA.keyId) {
  const now = Math.floor(Date.now() / 1e3);
  const header = { alg: 'EdDSA', kid: keyId };
  const fullPayload = {
    iss: 'aiforge-license-server',
    aud: 'ai-video-library',
    iat: now,
    nbf: now - 30,
    status: 'active',
    ...payload
  };

  const headerB64 = base64urlJson(header);
  const payloadB64 = base64urlJson(fullPayload);
  const signingInput = `${headerB64}.${payloadB64}`;
  const signature = crypto.sign(null, Buffer.from(signingInput, 'utf8'), privateKeyPem);
  const signatureB64 = base64url(signature);

  return `${signingInput}.${signatureB64}`;
}

// Generate License Key string
function generateLicenseKey(planCode = 'BASIC', durationDays = 30) {
  const randomChars = () => crypto.randomBytes(4).toString('hex').toUpperCase();
  const cleanPlan = planCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const prefix = `AIVIDEO-${cleanPlan}`;
  return `${prefix}-${durationDays}D-${randomChars()}-${randomChars()}`;
}

// Extract Order Code from SePay content
function extractOrderCode(str) {
  if (!str || typeof str !== 'string') return null;
  const clean = str.toUpperCase();
  const m1 = clean.match(/AF[-\s]?(\d{6})/i);
  if (m1) return 'AF' + m1[1];
  const m2 = clean.match(/(?:AIVIDEO|AIFORGE|SEPAY|ORDER|DH|BILL|DON|GOI|NAP|TH)[-\s:]*(\d{6})/i);
  if (m2) return 'AF' + m2[1];
  const m3 = clean.match(/(?:AIVIDEO|AIFORGE|SEPAY|AF)[^\d]*(\d{6})/i);
  if (m3) return 'AF' + m3[1];
  const m4 = clean.match(/(?:^|[^\d])(\d{6})(?:[^\d]|$)/);
  if (m4) return 'AF' + m4[1];
  return null;
}

// Activate Paid Order and generate Key
function activateOrder(orderCode, transferAmount = 0, sourceNote = 'SePay Webhook') {
  if (!orderCode) return null;
  const cleanCode = orderCode.trim().toUpperCase();
  let order = inMemoryStore.orders.get(cleanCode);
  const amountNum = Number(transferAmount) || 0;

  let planCode = 'basic', planName = 'Basic', planTier = 'pro', days = 30, maxDevices = 1;
  if (amountNum >= 700000) {
    planCode = 'gold'; planName = 'Gold VIP'; planTier = 'ultra'; days = 365; maxDevices = 3;
  } else if (amountNum >= 250000) {
    planCode = 'silver'; planName = 'Silver'; planTier = 'pro'; days = 90; maxDevices = 2;
  } else {
    planCode = 'basic'; planName = 'Basic'; planTier = 'pro'; days = 30; maxDevices = 1;
  }

  if (!order) {
    order = {
      orderCode: cleanCode,
      planCode,
      planName,
      planTier,
      durationDays: days,
      amount: amountNum || 120000,
      currency: 'VND',
      customerIdentifier: 'Khách hàng',
      transferContent: 'AIVIDEO ' + cleanCode,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    inMemoryStore.orders.set(cleanCode, order);
  }

  if (order.status === 'paid' && order.licenseKey) {
    return { order, key: inMemoryStore.keys.get(order.licenseKey.trim().toUpperCase()), alreadyPaid: true };
  }

  let effectivePlanCode = order.planCode || planCode;
  let effectivePlanName = order.planName || planName;
  let effectivePlanTier = order.planTier || planTier;
  let durationDays = order.durationDays || days;

  if (amountNum >= 700000 && effectivePlanCode !== 'gold') {
    effectivePlanCode = 'gold'; effectivePlanName = 'Gold VIP'; effectivePlanTier = 'ultra'; durationDays = 365; maxDevices = 3;
  } else if (amountNum >= 250000 && effectivePlanCode === 'basic') {
    effectivePlanCode = 'silver'; effectivePlanName = 'Silver'; effectivePlanTier = 'pro'; durationDays = 90; maxDevices = 2;
  }

  const keyStr = generateLicenseKey(effectivePlanCode.toUpperCase(), durationDays);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + durationDays * 86400000).toISOString();

  const keyObj = {
    id: 'LIC-' + Date.now(),
    key: keyStr,
    planCode: effectivePlanCode,
    planName: effectivePlanName,
    planTier: effectivePlanTier,
    durationDays: durationDays,
    maxDevices: maxDevices,
    features: {
      imageGeneration: true, videoGeneration: true, tts: true, chat: true, workflows: true, premiumTemplates: true, providerConfig: true, updates: true
    },
    limits: { unlimited: true, maxConcurrency: (effectivePlanTier === 'ultra' ? 50 : 20) },
    status: 'active',
    createdAt: now.toISOString(),
    activatedAt: now.toISOString(),
    expiresAt: expiresAt,
    customerEmail: order.customerIdentifier || '',
    machineCodes: order.machineCode ? [order.machineCode] : [],
    notes: `Tự động cấp qua ${sourceNote} (${cleanCode})`
  };

  inMemoryStore.keys.set(keyStr.toUpperCase(), keyObj);

  // If order had machineCode, register machine immediately
  if (order.machineCode) {
    inMemoryStore.machines.set(order.machineCode.trim(), {
      id: 'MACH-' + Date.now(),
      machineCode: order.machineCode.trim(),
      customerIdentifier: order.customerIdentifier || 'Khách hàng',
      licenseKey: keyStr,
      planCode: effectivePlanCode,
      planName: effectivePlanName,
      planTier: effectivePlanTier,
      durationDays: durationDays,
      activatedAt: now.toISOString(),
      expiresAt: expiresAt,
      status: 'active',
      ip: 'SePay Auto',
      appVersion: 'v3.0.0',
      lastSeenAt: now.toISOString(),
      notes: `Kích hoạt tự động từ đơn ${cleanCode}`
    });
  }

  order.status = 'paid';
  order.paidAmount = amountNum || order.amount;
  order.paidAt = now.toISOString();
  order.licenseKey = keyStr;
  order.keyObj = keyObj;

  inMemoryStore.orders.set(cleanCode, order);
  triggerSaveToCloud();

  console.log(`[Vercel Serverless] 🎉 TỰ ĐỘNG CẤP KEY THÀNH CÔNG: ${cleanCode} -> ${keyStr} (${effectivePlanName})`);
  return { order, key: keyObj, alreadyPaid: false };
}

// Parse Body safely
function parseBody(req) {
  return new Promise((resolve) => {
    if (req.body && typeof req.body === 'object') return resolve(req.body);
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(data)); }
      catch {
        try {
          const params = new URLSearchParams(data);
          const obj = {};
          for (const [k, v] of params.entries()) obj[k] = v;
          resolve(obj);
        } catch {
          resolve(data || {});
        }
      }
    });
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
  });
  res.end(JSON.stringify(data));
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'] || req.headers['x-real-ip'];
  if (forwarded) return String(forwarded).split(',')[0].trim();
  return req.socket?.remoteAddress || '127.0.0.1';
}

// Main Handler for Vercel Serverless
module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
    });
    return res.end();
  }

  await hydrateFromCloud();

  // Resolve true path across all Vercel rewrites and proxy headers
  const reqUrl = req.headers['x-forwarded-uri'] || req.headers['x-vercel-original-url'] || req.headers['x-real-url'] || req.url || '';
  const parsedUrl = url.parse(reqUrl, true);
  let pathname = (parsedUrl.pathname || '/').replace(/\/+$/, '') || '/';
  const method = req.method.toUpperCase();
  const body = await parseBody(req);
  const clientIp = getClientIp(req);

  // Auth check for Admin API
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const queryAdminKey = parsedUrl.query?.adminKey || parsedUrl.query?.key;
  const isAdmin = token === SETTINGS.adminPassword || token === 'admin' || queryAdminKey === 'admin' || token === '123456';

  console.log(`[Request] ${method} ${pathname} (Admin: ${isAdmin})`);

  // =========================================================================
  // DIRECT DOWNLOAD 1-CLICK HANDLER FOR AI_VIDEO_LIBRARY_Setup_v3.0.exe
  // =========================================================================
  if (pathname.includes('/download')) {
    const fileId = '1fPsbP72500JKiExlzt1UNE0Cai6yWabX';
    try {
      const https = require('https');
      const gRes = await new Promise((resolve, reject) => {
        const reqG = https.get(`https://drive.usercontent.google.com/download?id=${fileId}&export=download`, (r) => {
          let data = '';
          r.on('data', chunk => data += chunk.toString());
          r.on('end', () => resolve({ statusCode: r.statusCode, data, headers: r.headers }));
        });
        reqG.on('error', reject);
        reqG.setTimeout(4000, () => {
          reqG.destroy();
          resolve(null);
        });
      });

      if (gRes && gRes.data) {
        const uuidMatch = gRes.data.match(/name="uuid"\s+value="([^"]+)"/i) || gRes.data.match(/value="([^"]+)"\s+name="uuid"/i);
        if (uuidMatch && uuidMatch[1]) {
          const directUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t&uuid=${encodeURIComponent(uuidMatch[1])}`;
          res.writeHead(302, {
            'Location': directUrl,
            'Content-Disposition': 'attachment; filename="AI_VIDEO_LIBRARY_Setup_v3.0.exe"'
          });
          return res.end();
        }
      }
    } catch (err) {
      console.error('[Download Handler Error]', err.message);
    }

    // Fallback: direct download link
    res.writeHead(302, {
      'Location': `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`
    });
    return res.end();
  }

  // =========================================================================
  // VERSION & IN-APP AUTO-UPDATE ENDPOINT
  // =========================================================================
  if ((pathname === '/api/version' || pathname === '/version') && method === 'GET') {
    let versionData = null;
    try {
      const vPath = path.join(__dirname, 'version.json');
      if (fs.existsSync(vPath)) {
        versionData = JSON.parse(fs.readFileSync(vPath, 'utf8'));
      }
    } catch (e) {
      console.error('[Version Read Error]', e.message);
    }
    if (!versionData) {
      versionData = {
        version: "3.1.0",
        name: "AI VIDEO LIBRARY v3.1.0",
        releaseDate: "2026-11-04",
        changelog: "Tách 2 cổng First/End Frame Google Flow & Tự động chạy tiếp Chuỗi Kịch Bản khi tạo lại",
        patchUrl: "https://github.com/dangmuc1954-maker/AI_VIDEO_LIBRARY_Studio_Full/releases/download/v3.1.0/update-patch.zip",
        mandatory: false
      };
    }
    return sendJson(res, 200, { success: true, ...versionData });
  }

  // Admin update version endpoint
  if (pathname === '/api/admin/version' && method === 'POST') {
    if (!isAdmin) return sendJson(res, 401, { error: 'Unauthorized' });
    try {
      const vPath = path.join(__dirname, 'version.json');
      fs.writeFileSync(vPath, JSON.stringify(body, null, 2), 'utf8');
      return sendJson(res, 200, { success: true, version: body });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // =========================================================================
  // SECTION A: ADMIN MANAGEMENT APIS (Machines, Keys, Orders, Settings)
  // =========================================================================

  // A1. Admin Stats
  if (pathname === '/api/admin/stats' && method === 'GET') {
    const keys = Array.from(inMemoryStore.keys.values());
    const machines = Array.from(inMemoryStore.machines.values());
    const orders = Array.from(inMemoryStore.orders.values());
    const activeKeys = keys.filter(k => k.status === 'active').length;
    const activeMachines = machines.filter(m => m.status === 'active' && (!m.expiresAt || new Date(m.expiresAt).getTime() > Date.now())).length;
    
    let totalRevenue = 0;
    let thisMonthRevenue = 0;
    let paidOrdersCount = 0;
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;

    orders.forEach(o => {
      if (o.status === 'paid') {
        const amt = Number(o.paidAmount || o.amount) || 0;
        totalRevenue += amt;
        paidOrdersCount++;
        const d = new Date(o.paidAt || o.createdAt || Date.now());
        if (d.getFullYear() === curYear && (d.getMonth() + 1) === curMonth) {
          thisMonthRevenue += amt;
        }
      }
    });

    return sendJson(res, 200, {
      totalKeys: keys.length,
      activeKeys,
      totalMachines: machines.length,
      activeMachines,
      orders,
      totalRevenue,
      thisMonthRevenue,
      paidOrdersCount,
      bannedMachines: inMemoryStore.bannedMachines.size,
      bannedIps: inMemoryStore.bannedIps.size,
      serverTime: new Date().toISOString()
    });
  }

  // A1.1. Admin Revenue Monthly Analytics (Bảng Doanh Thu Chi Tiết Theo Tháng)
  if (pathname === '/api/admin/revenue' && method === 'GET') {
    const orders = Array.from(inMemoryStore.orders.values());
    const paidOrders = orders.filter(o => o.status === 'paid');
    const monthlyMap = {};

    for (const ord of paidOrders) {
      const d = new Date(ord.paidAt || ord.createdAt || Date.now());
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const amount = Number(ord.paidAmount || ord.amount) || 0;

      if (!monthlyMap[key]) {
        monthlyMap[key] = {
          monthKey: key,
          monthLabel: `Tháng ${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`,
          year: d.getFullYear(),
          month: d.getMonth() + 1,
          totalRevenue: 0,
          ordersCount: 0,
          plansCount: { basic: 0, silver: 0, gold: 0, other: 0 },
          orders: []
        };
      }

      monthlyMap[key].totalRevenue += amount;
      monthlyMap[key].ordersCount += 1;
      const pCode = (ord.planCode || '').toLowerCase();
      if (pCode.includes('gold')) monthlyMap[key].plansCount.gold += 1;
      else if (pCode.includes('silver')) monthlyMap[key].plansCount.silver += 1;
      else if (pCode.includes('basic')) monthlyMap[key].plansCount.basic += 1;
      else monthlyMap[key].plansCount.other += 1;

      monthlyMap[key].orders.push({
        orderCode: ord.orderCode,
        amount: amount,
        customerIdentifier: ord.customerIdentifier,
        planName: ord.planName,
        planCode: ord.planCode,
        durationDays: ord.durationDays,
        machineCode: ord.machineCode,
        licenseKey: ord.licenseKey,
        paidAt: ord.paidAt || ord.createdAt
      });
    }

    const monthlyStats = Object.values(monthlyMap).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
    const totalRevenue = paidOrders.reduce((s, o) => s + (Number(o.paidAmount || o.amount) || 0), 0);

    return sendJson(res, 200, {
      totalRevenue,
      paidOrdersCount: paidOrders.length,
      monthlyStats,
      allPaidOrders: paidOrders.sort((a, b) => new Date(b.paidAt || b.createdAt) - new Date(a.paidAt || a.createdAt))
    });
  }

  // A1.2. Admin Blacklist (Danh sách đen Máy & IP)
  if (pathname === '/api/admin/blacklist' && method === 'GET') {
    return sendJson(res, 200, {
      bannedMachines: Array.from(inMemoryStore.bannedMachines),
      bannedIps: Array.from(inMemoryStore.bannedIps)
    });
  }

  // A2. Admin Machines List & Management (Quản lý các máy tính đang dùng key)
  if (pathname === '/api/admin/machines' && method === 'GET') {
    const machines = Array.from(inMemoryStore.machines.values()).map(m => {
      const isTrial = m.planCode === 'trial' || (m.licenseKey && (m.licenseKey.includes('TRIAL') || m.licenseKey.includes('1D')));
      let expiresAt = m.expiresAt;
      if (isTrial && expiresAt) {
        const actTime = m.activatedAt ? new Date(m.activatedAt).getTime() : (m.lastSeenAt ? new Date(m.lastSeenAt).getTime() : Date.now());
        if (new Date(expiresAt).getTime() - actTime > 2 * 86400000) {
          expiresAt = new Date(actTime + 1 * 86400000).toISOString();
          m.expiresAt = expiresAt;
          m.durationDays = 1;
        }
      }
      const remaining = calculateDaysRemaining(expiresAt);
      const isExpired = expiresAt ? (new Date(expiresAt).getTime() < Date.now()) : false;
      const isBanned = inMemoryStore.bannedMachines.has(m.machineCode);
      const isUnlinked = inMemoryStore.unlinkedMachines.has(m.machineCode) || m.status === 'unlinked';
      return {
        ...m,
        expiresAt,
        durationDays: isTrial ? 1 : (m.durationDays || 30),
        daysRemaining: remaining,
        isExpired,
        isBanned,
        status: isBanned ? 'banned' : (isUnlinked ? 'unlinked' : (isExpired ? 'expired' : (m.status || 'active')))
      };
    });
    return sendJson(res, 200, { ok: true, machines });
  }

  // A3. Ban Machine (HWID)
  if (pathname === '/api/admin/machines/ban' && method === 'POST') {
    const { machineCode, reason } = body;
    if (!machineCode) return sendJson(res, 400, { error: 'machineCode is required' });
    const cleanMachine = String(machineCode).trim();
    inMemoryStore.bannedMachines.add(cleanMachine);
    inMemoryStore.unlinkedMachines.add(cleanMachine);

    // Unlink from any active keys
    for (const [k, v] of inMemoryStore.keys.entries()) {
      if (v && Array.isArray(v.machineCodes) && v.machineCodes.includes(cleanMachine)) {
        v.machineCodes = v.machineCodes.filter(c => c !== cleanMachine);
      }
    }

    const m = inMemoryStore.machines.get(cleanMachine);
    if (m) {
      m.status = 'banned';
      m.licenseKey = '';
      m.banReason = reason || 'Khóa vĩnh viễn bởi Quản trị viên';
      m.bannedAt = new Date().toISOString();
    } else {
      inMemoryStore.machines.set(cleanMachine, {
        id: 'MACH-' + Date.now(),
        machineCode: cleanMachine,
        status: 'banned',
        licenseKey: '',
        banReason: reason || 'Khóa vĩnh viễn bởi Quản trị viên',
        bannedAt: new Date().toISOString()
      });
    }

    await saveToCloudDirect();
    return sendJson(res, 200, { ok: true, message: `Đã khóa vĩnh viễn thiết bị ${cleanMachine}! Thiết bị này không thể sử dụng ứng dụng nữa.` });
  }

  // A4. Unban Machine (HWID)
  if (pathname === '/api/admin/machines/unban' && method === 'POST') {
    const { machineCode } = body;
    if (!machineCode) return sendJson(res, 400, { error: 'machineCode is required' });
    const cleanMachine = String(machineCode).trim();
    inMemoryStore.bannedMachines.delete(cleanMachine);
    inMemoryStore.unlinkedMachines.delete(cleanMachine);

    const m = inMemoryStore.machines.get(cleanMachine);
    if (m) {
      m.status = 'active';
      delete m.banReason;
      delete m.bannedAt;
    }
    await saveToCloudDirect();
    return sendJson(res, 200, { ok: true, message: `Đã mở khóa thiết bị ${cleanMachine} thành công!` });
  }

  // A4.1. Ban IP
  if ((pathname === '/api/admin/ips/ban' || pathname === '/api/admin/ip/ban') && method === 'POST') {
    const { ip, machineCode, reason = 'Vi phạm chính sách / Khóa Blacklist' } = body;
    if (ip && ip !== 'Local') inMemoryStore.bannedIps.add(String(ip).trim());
    if (machineCode) {
      inMemoryStore.bannedMachines.add(String(machineCode).trim());
      inMemoryStore.unlinkedMachines.add(String(machineCode).trim());
    }
    await saveToCloudDirect();
    return sendJson(res, 200, { ok: true, message: `Đã đưa vào danh sách đen (Blacklist) thành công!` });
  }

  // A4.2. Unban IP
  if ((pathname === '/api/admin/ips/unban' || pathname === '/api/admin/ip/unban') && method === 'POST') {
    const { ip } = body;
    if (ip) inMemoryStore.bannedIps.delete(String(ip).trim());
    await saveToCloudDirect();
    return sendJson(res, 200, { ok: true, message: `Đã mở khóa IP ${ip}` });
  }

  // A5. Reset Machine (Dừng gói ngay lập tức trên máy đó) & Reset HWID for Machine or Key
  if ((pathname === '/api/admin/machines/reset' || pathname.includes('/api/admin/machines/reset-hwid') || pathname.includes('/api/admin/keys/reset-hwid') || pathname.endsWith('/reset-hwid')) && method === 'POST') {
    const target = body.key || body.machineCode || decodeURIComponent(pathname.split('/').slice(-2)[0] || '');
    const cleanTarget = String(target || '').trim();

    // Check if target is key
    let foundKey = inMemoryStore.keys.get(cleanTarget.toUpperCase());
    if (!foundKey) {
      for (const [k, v] of inMemoryStore.keys.entries()) {
        if (k.toUpperCase() === cleanTarget.toUpperCase() || v.key?.toUpperCase() === cleanTarget.toUpperCase()) {
          foundKey = v; break;
        }
      }
    }

    if (foundKey) {
      const unlinkedMachines = [...(foundKey.machineCodes || [])];
      foundKey.machineCodes = [];
      // Unlink in machines map and record in unlinkedMachines set
      for (const mCode of unlinkedMachines) {
        inMemoryStore.unlinkedMachines.add(mCode);
        const m = inMemoryStore.machines.get(mCode);
        if (m) {
          m.licenseKey = '';
          m.status = 'unlinked';
          m.unlinkedAt = new Date().toISOString();
          m.notes = 'Đã đổi máy (Reset HWID) - Đã dừng gói và xóa key';
        }
      }
      await saveToCloudDirect();
      return sendJson(res, 200, { ok: true, message: `Đã đổi máy thành công cho key ${foundKey.key}! Gói cước trên các máy cũ (${unlinkedMachines.join(', ') || '0 máy'}) đã bị dừng ngay lập tức và key đã được giải phóng để kích hoạt trên máy mới.` });
    }

    // Check if target is machine
    const foundMachine = inMemoryStore.machines.get(cleanTarget);
    if (foundMachine) {
      inMemoryStore.unlinkedMachines.add(cleanTarget);
      const activeKey = foundMachine.licenseKey;
      if (activeKey) {
        const keyObj = inMemoryStore.keys.get(activeKey.toUpperCase());
        if (keyObj && Array.isArray(keyObj.machineCodes)) {
          keyObj.machineCodes = keyObj.machineCodes.filter(c => c !== cleanTarget);
        }
      }
      foundMachine.licenseKey = '';
      foundMachine.status = 'unlinked';
      foundMachine.unlinkedAt = new Date().toISOString();
      foundMachine.notes = 'Đã đổi máy - Đã dừng gói và xóa key';
      await saveToCloudDirect();
      return sendJson(res, 200, { ok: true, message: `Đã đổi máy thành công! Đã ngắt gói và xóa key ngay lập tức trên máy HWID: ${cleanTarget}. Key ${activeKey || ''} đã sẵn sàng kích hoạt trên máy mới!` });
    }

    return sendJson(res, 200, { ok: true, message: 'Đã thực hiện reset thiết bị.' });
  }

  // A6. Extend Days for Machine or Key (Gia hạn thời hạn gói)
  if ((pathname.includes('/extend') || pathname.includes('/api/admin/keys/extend') || pathname.includes('/api/admin/machines/extend')) && method === 'POST') {
    const extraDays = parseInt(body.extraDays) || 30;
    const target = body.key || body.machineCode || decodeURIComponent(pathname.split('/').slice(-2)[0] || '');
    const cleanTarget = String(target || '').trim();

    let foundKey = inMemoryStore.keys.get(cleanTarget.toUpperCase());
    if (foundKey) {
      const base = foundKey.expiresAt ? Math.max(Date.now(), new Date(foundKey.expiresAt).getTime()) : Date.now();
      const newExp = new Date(base + extraDays * 86400000).toISOString();
      foundKey.expiresAt = newExp;
      foundKey.durationDays = (foundKey.durationDays || 0) + extraDays;
      foundKey.status = 'active';

      // Update associated machines
      if (Array.isArray(foundKey.machineCodes)) {
        for (const mCode of foundKey.machineCodes) {
          const m = inMemoryStore.machines.get(mCode);
          if (m) {
            m.expiresAt = newExp;
            m.durationDays = (m.durationDays || 0) + extraDays;
            m.status = 'active';
          }
        }
      }
      triggerSaveToCloud();
      return sendJson(res, 200, { ok: true, message: `Đã gia hạn thêm ${extraDays} ngày cho key ${foundKey.key}`, newExpiresAt: newExp });
    }

    const foundMachine = inMemoryStore.machines.get(cleanTarget);
    if (foundMachine) {
      const base = foundMachine.expiresAt ? Math.max(Date.now(), new Date(foundMachine.expiresAt).getTime()) : Date.now();
      const newExp = new Date(base + extraDays * 86400000).toISOString();
      foundMachine.expiresAt = newExp;
      foundMachine.durationDays = (foundMachine.durationDays || 0) + extraDays;
      foundMachine.status = 'active';

      if (foundMachine.licenseKey) {
        const kObj = inMemoryStore.keys.get(foundMachine.licenseKey.toUpperCase());
        if (kObj) {
          kObj.expiresAt = newExp;
          kObj.durationDays = (kObj.durationDays || 0) + extraDays;
          kObj.status = 'active';
        }
      }
      triggerSaveToCloud();
      return sendJson(res, 200, { ok: true, message: `Đã gia hạn thêm ${extraDays} ngày cho máy ${cleanTarget}`, newExpiresAt: newExp });
    }

    return sendJson(res, 404, { error: 'Target key or machine not found' });
  }

  // A7. Delete Machine
  if (pathname === '/api/admin/machines/delete' && method === 'POST') {
    const { machineCode } = body;
    if (machineCode) {
      inMemoryStore.machines.delete(machineCode.trim());
      triggerSaveToCloud();
    }
    return sendJson(res, 200, { ok: true });
  }

  // A8. Admin Keys List
  if (pathname === '/api/admin/keys' && method === 'GET') {
    const keys = Array.from(inMemoryStore.keys.values()).map(k => {
      const isTrial = k.planCode === 'trial' || (k.key && (k.key.includes('TRIAL') || k.key.includes('1D')));
      let expiresAt = k.expiresAt;
      if (isTrial && expiresAt && k.activatedAt) {
        const actTime = new Date(k.activatedAt).getTime();
        if (new Date(expiresAt).getTime() - actTime > 2 * 86400000) {
          expiresAt = new Date(actTime + 1 * 86400000).toISOString();
          k.expiresAt = expiresAt;
          k.durationDays = 1;
        }
      }
      const remaining = calculateDaysRemaining(expiresAt);
      const isExpired = expiresAt ? (new Date(expiresAt).getTime() < Date.now()) : false;
      return {
        ...k,
        expiresAt,
        durationDays: isTrial ? 1 : (k.durationDays || 30),
        daysRemaining: remaining,
        isExpired,
        deviceCount: (k.machineCodes || []).length
      };
    });
    return sendJson(res, 200, { ok: true, keys });
  }

  // A9. Admin Generate Keys (Cấp đúng gói trên App)
  if (pathname === '/api/admin/keys/generate' && method === 'POST') {
    const {
      planCode = 'basic',
      planName,
      planTier,
      durationDays,
      maxDevices = 1,
      count = 1,
      customerEmail = '',
      notes = ''
    } = body;

    const isTrial = planCode === 'trial';
    const isCustom = planCode === 'custom';
    const matchedPlan = PLANS.find(p => p.code === planCode) || (isTrial ? PLANS[0] : (PLANS.find(p => p.code === 'basic') || PLANS[1]));
    
    let days = 30;
    if (isTrial) {
      days = 1;
    } else if (isCustom) {
      days = Math.max(1, parseInt(durationDays) || 1);
    } else {
      days = parseInt(durationDays) || (matchedPlan.billingOptions?.[0]?.durationDays || 30);
    }

    const num = Math.min(50, Math.max(1, parseInt(count) || 1));
    const effectiveDevices = parseInt(maxDevices) || (matchedPlan.maxDevices || 1);

    let effectivePlanName = planName;
    let effectivePlanTier = planTier || 'pro';

    if (planCode === 'gold') {
      effectivePlanName = effectivePlanName || 'Gold VIP';
      effectivePlanTier = 'ultra';
    } else if (planCode === 'silver') {
      effectivePlanName = effectivePlanName || 'Silver';
      effectivePlanTier = 'pro';
    } else if (planCode === 'trial') {
      effectivePlanName = 'Trial 1 Ngày';
      effectivePlanTier = 'pro';
    } else if (planCode === 'custom') {
      effectivePlanName = effectivePlanName || `Gói Tùy Chọn (${days} Ngày)`;
      effectivePlanTier = 'pro';
    } else {
      effectivePlanName = effectivePlanName || 'Basic';
      effectivePlanTier = 'pro';
    }

    const generated = [];
    const now = new Date();

    for (let i = 0; i < num; i++) {
      const keyStr = generateLicenseKey(planCode.toUpperCase(), days);
      const keyObj = {
        id: 'LIC-' + Date.now() + '-' + (i + 1),
        key: keyStr,
        planCode: planCode,
        planName: effectivePlanName,
        planTier: effectivePlanTier,
        durationDays: days,
        maxDevices: effectiveDevices,
        features: {
          imageGeneration: true,
          videoGeneration: true,
          tts: true,
          chat: true,
          workflows: true,
          premiumTemplates: true,
          providerConfig: true,
          updates: true
        },
        limits: effectivePlanTier === 'ultra'
          ? { unlimited: true, maxConcurrency: 50 }
          : { unlimited: true, maxConcurrency: (planCode === 'silver' ? 30 : 20) },
        status: 'unused',
        createdAt: now.toISOString(),
        customerEmail: customerEmail.trim(),
        machineCodes: [],
        notes: notes || `Cấp thủ công từ Web Admin (${effectivePlanName})`
      };

      inMemoryStore.keys.set(keyStr.toUpperCase(), keyObj);
      generated.push(keyObj);
    }

    await saveToCloudDirect();
    return sendJson(res, 200, { ok: true, count: generated.length, keys: generated });
  }

  // A10. Revoke Key
  if ((pathname.endsWith('/revoke') || pathname.includes('/keys/revoke')) && method === 'POST') {
    const keyTarget = body.key || decodeURIComponent(pathname.split('/').slice(-2)[0] || '');
    const cleanKey = String(keyTarget).trim().toUpperCase();
    const k = inMemoryStore.keys.get(cleanKey);
    if (k) {
      k.status = 'revoked';
      await saveToCloudDirect();
    }
    return sendJson(res, 200, { ok: true, message: `Đã khóa key ${cleanKey}` });
  }

  // A11. Unrevoke Key
  if ((pathname.endsWith('/unrevoke') || pathname.includes('/keys/unrevoke')) && method === 'POST') {
    const keyTarget = body.key || decodeURIComponent(pathname.split('/').slice(-2)[0] || '');
    const cleanKey = String(keyTarget).trim().toUpperCase();
    const k = inMemoryStore.keys.get(cleanKey);
    if (k) {
      k.status = 'active';
      await saveToCloudDirect();
    }
    return sendJson(res, 200, { ok: true, message: `Đã mở khóa key ${cleanKey}` });
  }

  // A12. Delete Key
  if (pathname.startsWith('/api/admin/keys/') && method === 'DELETE') {
    const cleanKey = decodeURIComponent(pathname.replace('/api/admin/keys/', '').trim()).toUpperCase();
    inMemoryStore.keys.delete(cleanKey);
    await saveToCloudDirect();
    return sendJson(res, 200, { ok: true });
  }

  // A13. Admin Orders List
  if (pathname === '/api/admin/orders' && method === 'GET') {
    const orders = Array.from(inMemoryStore.orders.values());
    return sendJson(res, 200, { ok: true, orders });
  }

  // A14. Admin Approve Order / Simulate Payment
  if ((pathname.includes('/simulate-payment') || pathname.includes('/simulate-sepay') || pathname.includes('/approve')) && method === 'POST') {
    const parts = pathname.split('/');
    const orderCode = body.orderCode || decodeURIComponent(parts[parts.length - 2] || '');
    const result = activateOrder(orderCode, body.amount || 0, 'Admin Action');
    if (result) {
      return sendJson(res, 200, { ok: true, key: result.key, order: result.order });
    }
    return sendJson(res, 404, { error: 'Order not found' });
  }

  // A15. Delete Order
  if (pathname.startsWith('/api/admin/orders/') && method === 'DELETE') {
    const code = decodeURIComponent(pathname.replace('/api/admin/orders/', '').trim()).toUpperCase();
    inMemoryStore.orders.delete(code);
    triggerSaveToCloud();
    return sendJson(res, 200, { ok: true });
  }

  // A16. Admin Settings
  if (pathname === '/api/admin/settings') {
    if (method === 'GET') {
      return sendJson(res, 200, { ok: true, settings: SETTINGS });
    }
    if (method === 'POST') {
      if (body.bankName) SETTINGS.bankName = body.bankName.trim();
      if (body.bankAccount) SETTINGS.bankAccount = body.bankAccount.trim();
      if (body.paymentReceiver) SETTINGS.paymentReceiver = body.paymentReceiver.trim().toUpperCase();
      if (body.sepayApiKey) SETTINGS.sepayApiKey = body.sepayApiKey.trim();
      if (body.adminPassword) SETTINGS.adminPassword = body.adminPassword.trim();
      triggerSaveToCloud();
      return sendJson(res, 200, { ok: true, settings: SETTINGS });
    }
  }

  // =========================================================================
  // SECTION B: PUBLIC APIS & CLIENT APP HANDLERS
  // =========================================================================

  // B1. Public Plans
  if ((pathname === '/plans' || pathname === '/v1/plans' || pathname.endsWith('/plans')) && method === 'GET') {
    return sendJson(res, 200, { plans: PLANS });
  }

  // B2. SePay Payment Webhook
  const isWebhook = pathname.includes('/webhook') ||
                    pathname.includes('/payment') ||
                    pathname.includes('/sepay') ||
                    (method === 'POST' && (body.gateway || body.transferAmount !== undefined || body.amount_in !== undefined || body.content || body.description));

  if (isWebhook) {
    try {
      if (method === 'GET') {
        return sendJson(res, 200, {
          success: true,
          status: 'online',
          message: 'SePay Webhook endpoint operational!',
          bankAccount: SETTINGS.bankAccount,
          bankName: SETTINGS.bankName,
          receiver: SETTINGS.paymentReceiver
        });
      }

      const contentStr = body.content || body.description || body.transaction_content || body.transfer_content || body.code || '';
      const amountRaw = body.transferAmount || body.amount_in || body.amount || body.transfer_amount || 0;
      const transferAmount = Number(String(amountRaw).replace(/[^0-9.]/g, '')) || 0;

      let orderCode = extractOrderCode(contentStr) || (body.code ? extractOrderCode(body.code) : null);
      if (!orderCode && body.referenceCode) orderCode = extractOrderCode(body.referenceCode);

      if (orderCode) {
        const result = activateOrder(orderCode, transferAmount, 'SePay Webhook');
        return sendJson(res, 200, {
          success: true,
          message: `Đơn hàng ${orderCode} đã kích hoạt thành công!`,
          key: result?.key?.key,
          plan: result?.order?.planName,
          status: 'paid',
          orderCode,
          durationDays: result?.order?.durationDays || 30
        });
      }

      return sendJson(res, 200, { success: true, message: 'SePay ping received OK', receivedContent: contentStr });
    } catch (err) {
      console.error('[SePay Webhook Error]', err);
      return sendJson(res, 200, { success: true, warning: err.message });
    }
  }

  // B3. Create Purchase Order (VietQR)
  if ((pathname.includes('/orders/create') || pathname.includes('/purchase-orders')) && method === 'POST') {
    const { planCode = 'basic', durationCode = '1M', customerIdentifier, machineCode, appVersion } = body;
    
    // Check Blacklist IP or Machine
    const clientIp = getClientIp(req);
    if ((machineCode && inMemoryStore.bannedMachines.has(String(machineCode).trim())) || 
        (clientIp && inMemoryStore.bannedIps.has(clientIp))) {
      return sendJson(res, 403, {
        error: 'BLACKLISTED',
        message: 'Giao dịch không thành công! Thiết bị hoặc địa chỉ IP của bạn đã bị đưa vào danh sách đen (Blacklist).'
      });
    }

    const plan = PLANS.find(p => p.code === planCode) || PLANS[0];
    const option = plan.billingOptions.find(o => o.durationCode === durationCode) || plan.billingOptions[0];

    const orderCode = 'AF' + Math.floor(100000 + Math.random() * 900000);
    const content = 'AIVIDEO ' + orderCode;
    const qrUrl = `https://img.vietqr.io/image/${SETTINGS.bankName}-${SETTINGS.bankAccount}-compact2.png?amount=${option.priceVnd}&addInfo=${encodeURIComponent(content)}&accountName=${encodeURIComponent(SETTINGS.paymentReceiver)}`;

    const order = {
      orderCode,
      planCode: plan.code,
      planName: plan.name,
      planTier: plan.tier,
      durationCode: option.durationCode,
      durationDays: option.durationDays,
      amount: option.priceVnd,
      originalPriceVnd: option.originalPriceVnd,
      currency: 'VND',
      customerIdentifier: customerIdentifier || 'Khách hàng',
      machineCode: machineCode || '',
      appVersion: appVersion || 'v3.0.0',
      transferContent: content,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      paymentReceiver: {
        bankId: SETTINGS.bankName,
        accountNo: SETTINGS.bankAccount,
        accountName: SETTINGS.paymentReceiver,
        qrImageUrl: qrUrl
      }
    };

    inMemoryStore.orders.set(orderCode, order);
    triggerSaveToCloud();
    return sendJson(res, 200, order);
  }

  // B4. Check Order Status / Polling
  if ((pathname.includes('/orders/status') && method === 'POST') || (pathname.includes('/purchase-orders') && method === 'GET')) {
    let orderCode = '';
    if (method === 'GET') {
      const parts = pathname.split('/');
      orderCode = parts[parts.length - 1].trim().toUpperCase();
    } else {
      orderCode = (body.orderCode || '').trim().toUpperCase();
    }

    let order = inMemoryStore.orders.get(orderCode);

    // Fallback: Check SePay API live transactions
    if ((!order || order.status !== 'paid') && SETTINGS.sepayApiKey && orderCode) {
      try {
        const sepayRes = await fetch('https://my.sepay.vn/userapi/transactions/list?limit=30', {
          headers: { 'Authorization': `Apikey ${SETTINGS.sepayApiKey}`, 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(3000)
        });
        if (sepayRes.ok) {
          const sData = await sepayRes.json();
          const txs = sData.transactions || sData.data || [];
          const rawNum = orderCode.replace('AF', '');
          const matchTx = txs.find(tx => {
            const str = (tx.transaction_content || tx.description || tx.content || '').toUpperCase();
            return str.includes(orderCode) || (rawNum.length === 6 && str.includes(rawNum));
          });
          if (matchTx) {
            const amt = Number(matchTx.amount_in || matchTx.transferAmount || matchTx.amount || 0);
            const activated = activateOrder(orderCode, amt, 'SePay Live Query');
            if (activated) order = activated.order;
          }
        }
      } catch (e) {
        console.warn('[SePay Query Notice]', e.message);
      }
    }

    if (!order) return sendJson(res, 404, { error: { message: 'Order not found' } });

    if (order.status === 'paid' && order.licenseKey) {
      const keyObj = inMemoryStore.keys.get(order.licenseKey.trim().toUpperCase()) || {};
      const expDate = keyObj.expiresAt || new Date(Date.now() + (order.durationDays || 30) * 86400000).toISOString();
      const expTimestamp = Math.floor(new Date(expDate).getTime() / 1e3);

      const payload = {
        exp: expTimestamp,
        plan: order.planCode,
        planName: order.planName,
        planTier: order.planTier,
        status: 'active',
        features: { imageGeneration: true, videoGeneration: true, tts: true, chat: true, workflows: true, premiumTemplates: true, providerConfig: true, updates: true },
        limits: { unlimited: true, maxConcurrency: order.planTier === 'ultra' ? 50 : 20 },
        licenseId: order.licenseKey,
        activationId: `ACT-${Date.now()}`,
        machineCode: order.machineCode || '',
        tokenExpiresAt: expDate,
        licenseExpiresAt: expDate,
        offlineUntil: expDate,
        requiresUpdate: false
      };

      const tokenStr = signEntitlementToken(payload);
      const statusObj = {
        state: 'active',
        valid: true,
        plan: order.planCode,
        planName: order.planName,
        planTier: order.planTier,
        machineCode: order.machineCode,
        expiresAt: expDate,
        features: payload.features,
        limits: payload.limits
      };

      return sendJson(res, 200, {
        ...order,
        licenseStatus: statusObj,
        entitlementToken: tokenStr,
        entitlement: { entitlementToken: tokenStr, licenseKey: order.licenseKey, status: statusObj }
      });
    }

    return sendJson(res, 200, order);
  }

  // B5. Manual Key Activation (Kích hoạt bản quyền từ App khách - 1 LẦN DUY NHẤT)
  if ((pathname.endsWith('/licenses/activate') || pathname.endsWith('/activate')) && !pathname.includes('trial') && method === 'POST') {
    const { licenseKey, machineCode, customerIdentifier, appVersion } = body;
    if (!licenseKey) return sendJson(res, 400, { error: { message: 'Vui lòng nhập License Key.' } });
    if (!machineCode) return sendJson(res, 400, { error: { message: 'Không nhận diện được mã máy tính (HWID).' } });

    const cleanKey = String(licenseKey).trim().toUpperCase();
    const cleanMachine = String(machineCode).trim();

    // 1. Kiểm tra máy bị khóa Blacklist
    if (inMemoryStore.bannedMachines.has(cleanMachine)) {
      return sendJson(res, 403, { error: { code: 'MACHINE_BANNED', message: 'Máy tính (HWID) của bạn đã bị khóa bởi Quản trị viên.' } });
    }

    // 2. Kiểm tra danh sách key đã tiêu thụ / vô hiệu hóa
    if (inMemoryStore.consumedKeys.has(cleanKey)) {
      return sendJson(res, 403, {
        error: {
          code: 'KEY_ALREADY_USED',
          message: 'License Key này đã được kích hoạt trước đó và đã bị vô hiệu hóa vĩnh viễn! Mỗi key chỉ được phép kích hoạt 1 lần duy nhất.'
        }
      });
    }

    // 3. Tìm key trong cơ sở dữ liệu
    let keyObj = inMemoryStore.keys.get(cleanKey);
    if (!keyObj) {
      for (const [k, v] of inMemoryStore.keys.entries()) {
        if (k.toUpperCase() === cleanKey || v.id === cleanKey) { keyObj = v; break; }
      }
    }

    // NẾU KEY KHÔNG TỒN TẠI TRONG HỆ THỐNG -> TỪ CHỐI NGAY LẬP TỨC (TUYỆT ĐỐI KHÔNG TỰ TẠO KEY BỪA!)
    if (!keyObj) {
      return sendJson(res, 400, {
        error: {
          code: 'KEY_NOT_FOUND',
          message: 'License Key không hợp lệ hoặc không tồn tại trên hệ thống. Vui lòng kiểm tra lại!'
        }
      });
    }

    // 4. KIỂM TRA TRẠNG THÁI KEY:
    if (keyObj.status === 'revoked' || keyObj.status === 'consumed' || keyObj.status === 'used') {
      inMemoryStore.consumedKeys.add(cleanKey);
      await saveToCloudDirect();
      return sendJson(res, 403, {
        error: {
          code: 'KEY_ALREADY_USED',
          message: 'License Key này đã được kích hoạt trước đó và đã bị vô hiệu hóa! Mỗi key chỉ được phép kích hoạt 1 lần duy nhất.'
        }
      });
    }

    if (keyObj.status === 'expired' || (keyObj.expiresAt && new Date(keyObj.expiresAt).getTime() < Date.now())) {
      keyObj.status = 'expired';
      inMemoryStore.consumedKeys.add(cleanKey);
      await saveToCloudDirect();
      return sendJson(res, 403, {
        error: {
          code: 'KEY_EXPIRED',
          message: 'License Key này đã hết hạn sử dụng. Vui lòng mua gói mới!'
        }
      });
    }

    // Nếu key đã từng được kích hoạt rồi (status !== 'unused' hoặc đã có activatedAt)
    if (keyObj.status !== 'unused' || keyObj.activatedAt) {
      inMemoryStore.consumedKeys.add(cleanKey);
      await saveToCloudDirect();
      return sendJson(res, 403, {
        error: {
          code: 'KEY_ALREADY_ACTIVATED',
          message: 'License Key này đã được kích hoạt trước đó trên một máy tính và đã khóa vĩnh viễn, không thể nhập lại!'
        }
      });
    }

    // 5. KIỂM TRA TRIAL: Chỉ chặn nếu là gói trial thông thường. Gói 'custom' (tùy chọn số ngày) do Admin cấp là key đặc biệt/VIP/test, KHÔNG bị chặn bởi trialUsedMachines!
    const isCustomKey = keyObj.planCode === 'custom' || cleanKey.includes('CUSTOM');
    const isTrial = !isCustomKey && (keyObj.planCode === 'trial' || cleanKey.includes('TRIAL'));
    if (isTrial) {
      if (inMemoryStore.trialUsedMachines.has(cleanMachine)) {
        return sendJson(res, 403, {
          error: {
            code: 'TRIAL_ALREADY_USED',
            message: 'Máy tính này đã từng kích hoạt gói trải nghiệm Trial 1 ngày! Quý khách vui lòng mua gói Basic, Silver hoặc Gold VIP để tiếp tục sử dụng.'
          }
        });
      }
    }

    // 6. KÍCH HOẠT THÀNH CÔNG: KHÓA CHẶT KEY VÀO MÁY NÀY VÀ ĐÁNH DẤU ĐÃ SỬ DỤNG
    const now = new Date();
    const durationDays = isTrial ? 1 : (Number(keyObj.durationDays) || 30);
    const expDate = new Date(now.getTime() + durationDays * 86400000).toISOString();

    keyObj.status = 'active';
    keyObj.isConsumed = true;
    keyObj.planCode = isTrial ? 'trial' : (isCustomKey ? 'custom' : keyObj.planCode);
    keyObj.planName = isTrial ? 'Trial 1 Ngày' : (isCustomKey ? (keyObj.planName || `Gói Tùy Chọn (${durationDays} Ngày)`) : keyObj.planName);
    keyObj.durationDays = durationDays;
    keyObj.activatedAt = now.toISOString();
    keyObj.expiresAt = expDate;
    keyObj.machineCodes = [cleanMachine];
    keyObj.notes = (keyObj.notes || '') + ` (Đã kích hoạt trên ${cleanMachine.slice(0, 10)}...)`;

    // NGAY LẬP TỨC KHÓA KEY NÀY VÀO DANH SÁCH CONSUMED KEYS ĐỂ KHÔNG THỂ NHẬP LẠI Ở BẤT KỲ ĐÂU:
    inMemoryStore.consumedKeys.add(cleanKey);
    if (keyObj.key) inMemoryStore.consumedKeys.add(keyObj.key.toUpperCase());

    if (isTrial) {
      inMemoryStore.trialUsedMachines.add(cleanMachine);
    }

    // Register / Update Machine in store
    inMemoryStore.machines.set(cleanMachine, {
      id: 'MACH-' + Date.now(),
      machineCode: cleanMachine,
      customerIdentifier: customerIdentifier || keyObj.customerEmail || 'Khách hàng',
      licenseKey: keyObj.key,
      planCode: isTrial ? 'trial' : keyObj.planCode,
      planName: isTrial ? 'Trial 1 Ngày' : keyObj.planName,
      planTier: isTrial ? 'pro' : keyObj.planTier,
      durationDays: durationDays,
      activatedAt: keyObj.activatedAt,
      expiresAt: expDate,
      status: 'active',
      ip: clientIp,
      appVersion: appVersion || 'v3.0.0',
      lastSeenAt: now.toISOString()
    });

    inMemoryStore.unlinkedMachines.delete(cleanMachine);
    await saveToCloudDirect();

    const expTimestamp = Math.floor(new Date(expDate).getTime() / 1e3);
    const payload = {
      exp: expTimestamp,
      plan: keyObj.planCode,
      planName: keyObj.planName,
      planTier: keyObj.planTier,
      status: 'active',
      features: keyObj.features || { imageGeneration: true, videoGeneration: true, tts: true, chat: true, workflows: true, premiumTemplates: true, providerConfig: true, updates: true },
      limits: keyObj.limits || { unlimited: true, maxConcurrency: 20 },
      licenseId: keyObj.key,
      activationId: `ACT-${Date.now()}`,
      machineCode: cleanMachine,
      tokenExpiresAt: expDate,
      licenseExpiresAt: expDate,
      offlineUntil: expDate,
      requiresUpdate: false
    };

    const tokenStr = signEntitlementToken(payload);
    const statusObj = {
      state: 'active',
      valid: true,
      plan: keyObj.planCode,
      planName: keyObj.planName,
      planTier: keyObj.planTier,
      machineCode: cleanMachine,
      expiresAt: expDate,
      features: payload.features,
      limits: payload.limits
    };

    return sendJson(res, 200, {
      entitlementToken: tokenStr,
      licenseKey: keyObj.key,
      status: statusObj,
      licenseStatus: { state: 'active', valid: true, ...payload }
    });
  }

  // B6. Trial Activation (Đã đóng gói trải nghiệm)
  if ((pathname.includes('/licenses/activate-trial') || pathname.endsWith('/activate-trial') || pathname.includes('/trials/activate')) && method === 'POST') {
    return sendJson(res, 400, { error: { message: 'Gói Trải Nghiệm Free hiện đã đóng. Quý khách vui lòng đăng ký gói Basic, Silver hoặc Gold VIP để sử dụng.' } });
  }

  // B7. Trial Eligibility
  if ((pathname.includes('/trial-eligibility') || pathname.includes('/trials/eligibility')) && method === 'POST') {
    return sendJson(res, 200, { eligible: false, reason: 'Gói trải nghiệm miễn phí đã đóng' });
  }

  // B8. Check-In / Heartbeat (App client ping periodically)
  if ((pathname.includes('/check-in') || pathname.endsWith('/check-in') || pathname.includes('/checkin') || pathname.endsWith('/checkin')) && method === 'POST') {
    const { machineCode, licenseKey, licenseId, appVersion, customerIdentifier } = body;
    const cleanMachine = String(machineCode || '').trim();
    const targetKey = String(licenseKey || licenseId || '').trim().toUpperCase();

    // 1. Check BAN: Banned machine is blocked 100% from using the app!
    if (cleanMachine && inMemoryStore.bannedMachines.has(cleanMachine)) {
      return sendJson(res, 403, {
        error: {
          code: 'LICENSE_REVOKED',
          errorCode: 'LICENSE_REVOKED',
          message: 'Thiết bị của bạn đã bị KHÓA VĨNH VIỄN bởi Quản trị viên do vi phạm chính sách. Không thể tiếp tục sử dụng ứng dụng trên máy này.'
        }
      });
    }

    // 2. Check UNLINKED (Đổi máy): If admin clicked "Đổi Máy", stop immediately!
    if (cleanMachine && inMemoryStore.unlinkedMachines.has(cleanMachine)) {
      return sendJson(res, 403, {
        error: {
          code: 'MACHINE_MISMATCH',
          errorCode: 'MACHINE_MISMATCH',
          message: 'Bản quyền này đã được Quản trị viên chuyển đổi sang thiết bị khác (Đổi máy). Gói cước trên máy này đã dừng ngay lập tức.'
        }
      });
    }

    let keyObj = targetKey ? inMemoryStore.keys.get(targetKey) : null;
    if (!keyObj && targetKey) {
      for (const [k, v] of inMemoryStore.keys.entries()) {
        if (k.toUpperCase() === targetKey || v.id === targetKey) { keyObj = v; break; }
      }
    }

    // Nếu chưa tìm thấy key trong memory, hydrate cưỡng bức từ cloud 1 lần trước khi từ chối
    if (!keyObj && (targetKey || cleanMachine)) {
      await hydrateFromCloud(true);
      if (targetKey) {
        keyObj = inMemoryStore.keys.get(targetKey);
        if (!keyObj) {
          for (const [k, v] of inMemoryStore.keys.entries()) {
            if (k.toUpperCase() === targetKey || v.id === targetKey) { keyObj = v; break; }
          }
        }
      }
    }

    // Nếu không truyền targetKey, kiểm tra xem máy này đã từng kích hoạt key hợp lệ trước đó chưa
    if (!keyObj && !targetKey && cleanMachine) {
      const existing = inMemoryStore.machines.get(cleanMachine);
      if (existing && existing.licenseKey) {
        let registeredKey = inMemoryStore.keys.get(existing.licenseKey.toUpperCase());
        if (!registeredKey) {
          for (const [k, v] of inMemoryStore.keys.entries()) {
            if (k.toUpperCase() === existing.licenseKey.toUpperCase() || v.id === existing.licenseKey) { registeredKey = v; break; }
          }
        }
        if (registeredKey && registeredKey.status === 'active') {
          keyObj = registeredKey;
        }
      }
    }

    // Nếu vẫn không có keyObj: Máy này CHƯA TỪNG ĐƯỢC KÍCH HOẠT hoặc Key đã bị xóa/đổi
    if (!keyObj) {
      return sendJson(res, 403, {
        error: {
          code: 'ACTIVATION_NOT_FOUND',
          errorCode: 'ACTIVATION_NOT_FOUND',
          message: 'Thiết bị này chưa được kích hoạt bản quyền hoặc key đã bị hủy. Vui lòng nhập License Key để kích hoạt.'
        }
      });
    }

    // 3. Đã có keyObj hợp lệ: Kiểm tra trạng thái thu hồi, hết hạn hoặc đổi máy
    if (keyObj.status === 'revoked') {
      return sendJson(res, 403, {
        error: {
          code: 'LICENSE_REVOKED',
          errorCode: 'LICENSE_REVOKED',
          message: 'License Key này đã bị thu hồi bởi Quản trị viên.'
        }
      });
    }

    if (keyObj.expiresAt && new Date(keyObj.expiresAt).getTime() < Date.now()) {
      keyObj.status = 'expired';
      return sendJson(res, 403, {
        error: {
          code: 'LICENSE_REVOKED',
          errorCode: 'LICENSE_REVOKED',
          message: 'License Key đã hết hạn sử dụng. Vui lòng gia hạn thêm!'
        }
      });
    }

    // If key has machineCodes and this machine was removed -> it was unlinked!
    const currentMachines = Array.isArray(keyObj.machineCodes) ? keyObj.machineCodes : [];
    if (currentMachines.length > 0 && !currentMachines.includes(cleanMachine)) {
      return sendJson(res, 403, {
        error: {
          code: 'MACHINE_MISMATCH',
          errorCode: 'MACHINE_MISMATCH',
          message: 'Bản quyền này đã được chuyển sang thiết bị khác (Đổi máy). Gói cước trên máy này đã dừng ngay lập tức.'
        }
      });
    }

    // If key was reset (machineCodes is empty) and this machine was unlinked
    if (currentMachines.length === 0 && inMemoryStore.unlinkedMachines.has(cleanMachine)) {
      return sendJson(res, 403, {
        error: {
          code: 'MACHINE_MISMATCH',
          errorCode: 'MACHINE_MISMATCH',
          message: 'Bản quyền này đã được Reset HWID để đổi máy. Gói cước trên máy này đã dừng ngay lập tức.'
        }
      });
    }

    // Cập nhật thông tin máy đã có bản quyền và tính toán hạn dùng chính xác
    const existing = cleanMachine ? (inMemoryStore.machines.get(cleanMachine) || {}) : {};
    const isTrial = (keyObj.planCode === 'trial') || (existing.planCode === 'trial') ||
                    (keyObj.key && (keyObj.key.includes('TRIAL') || keyObj.key.includes('1D'))) ||
                    (existing.licenseKey && (existing.licenseKey.includes('TRIAL') || existing.licenseKey.includes('1D')));

    const effectivePlanCode = isTrial ? 'trial' : (keyObj.planCode || existing.planCode || 'basic');
    const effectivePlanName = isTrial ? 'Trial 1 Ngày' : (keyObj.planName || existing.planName || 'Basic');
    const effectivePlanTier = isTrial ? 'pro' : (keyObj.planTier || existing.planTier || 'pro');
    const effectiveDurationDays = isTrial ? 1 : (Number(keyObj.durationDays || existing.durationDays) || 30);

    // Tính expDate chuẩn xác: KHÔNG BAO GIỜ tự tiện ghi đè 30 ngày lên máy Trial!
    let expDate = keyObj.expiresAt || existing.expiresAt;
    if (!expDate) {
      const baseTime = existing.activatedAt ? new Date(existing.activatedAt).getTime() : Date.now();
      expDate = new Date(baseTime + effectiveDurationDays * 86400000).toISOString();
    } else if (isTrial) {
      const actTime = existing.activatedAt ? new Date(existing.activatedAt).getTime() : (keyObj.activatedAt ? new Date(keyObj.activatedAt).getTime() : Date.now());
      const maxTrialExp = actTime + 1 * 86400000;
      if (new Date(expDate).getTime() > maxTrialExp + 3600000) {
        expDate = new Date(maxTrialExp).toISOString();
      }
    }

    if (cleanMachine) {
      inMemoryStore.machines.set(cleanMachine, {
        ...existing,
        machineCode: cleanMachine,
        customerIdentifier: customerIdentifier || keyObj.customerEmail || existing.customerIdentifier || 'Khách hàng',
        licenseKey: keyObj.key || targetKey || existing.licenseKey || '',
        planCode: effectivePlanCode,
        planName: effectivePlanName,
        planTier: effectivePlanTier,
        durationDays: effectiveDurationDays,
        activatedAt: existing.activatedAt || keyObj.activatedAt || new Date().toISOString(),
        expiresAt: expDate,
        ip: clientIp || existing.ip,
        appVersion: appVersion || existing.appVersion || 'v3.0.0',
        lastSeenAt: new Date().toISOString(),
        status: existing.status === 'banned' ? 'banned' : (existing.status === 'unlinked' ? 'unlinked' : 'active')
      });
      triggerSaveToCloud();
    }
    const expTimestamp = Math.floor(new Date(expDate).getTime() / 1e3);

    const payload = {
      exp: expTimestamp,
      plan: effectivePlanCode,
      planName: effectivePlanName,
      planTier: effectivePlanTier,
      status: 'active',
      features: keyObj.features || { imageGeneration: true, videoGeneration: true, tts: true, chat: true, workflows: true, premiumTemplates: true, providerConfig: true, updates: true },
      limits: keyObj.limits || { unlimited: true, maxConcurrency: 20 },
      licenseId: keyObj.key || 'LIC-ACTIVE',
      activationId: `ACT-${Date.now()}`,
      machineCode: cleanMachine,
      tokenExpiresAt: expDate,
      licenseExpiresAt: expDate,
      offlineUntil: expDate,
      requiresUpdate: false
    };

    const tokenStr = signEntitlementToken(payload);
    return sendJson(res, 200, {
      valid: true,
      serverTime: new Date().toISOString(),
      entitlementToken: tokenStr,
      status: {
        state: 'active',
        valid: true,
        plan: effectivePlanCode,
        planName: effectivePlanName,
        planTier: effectivePlanTier,
        machineCode: cleanMachine,
        expiresAt: expDate,
        features: payload.features,
        limits: payload.limits
      },
      licenseStatus: {
        state: 'active',
        valid: true,
        ...payload
      }
    });
  }

  // B9. Deactivate License on Machine (Hủy kích hoạt - VÔ HIỆU HÓA KEY VĨNH VIỄN)
  if (pathname.includes('/licenses/deactivate') && method === 'POST') {
    const { machineCode } = body;
    const cleanMachine = machineCode ? String(machineCode).trim() : '';
    if (cleanMachine) {
      const m = inMemoryStore.machines.get(cleanMachine);
      const usedKey = m?.licenseKey ? String(m.licenseKey).trim().toUpperCase() : '';

      // 1. Vô hiệu hóa và thu hồi vĩnh viễn Key đã dùng trên máy này
      if (usedKey) {
        let kObj = inMemoryStore.keys.get(usedKey);
        if (!kObj) {
          for (const [k, v] of inMemoryStore.keys.entries()) {
            if (k.toUpperCase() === usedKey || v.key?.toUpperCase() === usedKey) { kObj = v; break; }
          }
        }
        if (kObj) {
          kObj.status = 'revoked';
          kObj.isConsumed = true;
          kObj.machineCodes = [];
          kObj.notes = (kObj.notes || '') + ` (Đã hủy kích hoạt bởi người dùng trên ${cleanMachine.slice(0, 10)}...)`;
        }
        inMemoryStore.consumedKeys.add(usedKey);
      }

      // 2. Cập nhật trạng thái máy tính: Hủy bản quyền
      if (m) {
        m.status = 'inactive';
        m.licenseKey = '';
        m.planCode = '';
        m.planName = 'Chưa kích hoạt';
        m.notes = 'Đã hủy kích hoạt bản quyền trên thiết bị';
      }

      // 3. Đưa vào danh sách unlinkedMachines để checkIn từ chối ngay lập tức
      inMemoryStore.unlinkedMachines.add(cleanMachine);
      await saveToCloudDirect();
    }
    return sendJson(res, 200, {
      ok: true,
      message: 'Đã hủy kích hoạt bản quyền trên thiết bị. Mã bản quyền đã bị vô hiệu hóa vĩnh viễn và không thể sử dụng lại.',
      licenseStatus: {
        state: 'unlicensed',
        valid: false,
        plan: null,
        planName: 'Chưa kích hoạt',
        licenseExpiresAt: null,
        machineCode: cleanMachine
      }
    });
  }

  // B10. Reserve Usage
  if (pathname.includes('/usage/reserve') && method === 'POST') {
    return sendJson(res, 200, { ok: true });
  }

  // B11. ElevenLabs Shared Voice Lookup
  if (pathname.includes('/elevenlabs/shared-voices/')) {
    const voiceId = decodeURIComponent(pathname.replace(/^.*\/elevenlabs\/shared-voices\//, '').trim());
    if (STANDARD_ELEVENLABS_VOICES[voiceId]) {
      return sendJson(res, 200, { voiceId, voiceName: STANDARD_ELEVENLABS_VOICES[voiceId].name, language: STANDARD_ELEVENLABS_VOICES[voiceId].language, source: 'shared' });
    }
    try {
      const publicRes = await fetch('https://api.elevenlabs.io/v1/voices', { signal: AbortSignal.timeout(3500) });
      if (publicRes.ok) {
        const data = await publicRes.json();
        const found = (data.voices || []).find(v => v.voice_id === voiceId);
        if (found) {
          return sendJson(res, 200, { voiceId: found.voice_id, voiceName: found.name, previewUrl: found.preview_url, category: found.category, language: found.labels?.language || 'Auto', source: 'shared' });
        }
      }
    } catch(err) {}
    return sendJson(res, 200, { voiceId, voiceName: `Voice (${voiceId.slice(0,6)}...${voiceId.slice(-4)})`, language: 'Auto', source: 'shared' });
  }

  // B11b. Workflow Store & Library Endpoints
  if (pathname.includes('/workflow-store/catalog') && method === 'GET') {
    return sendJson(res, 200, {
      groups: WORKFLOWS_DATA.groups || [],
      products: WORKFLOWS_DATA.products || [],
      serverTime: new Date().toISOString()
    });
  }

  if (pathname.includes('/workflow-store/me') && method === 'GET') {
    return sendJson(res, 200, {
      entitlements: (WORKFLOWS_DATA.products || []).map(p => ({
        productId: p.id,
        status: 'active',
        installations: []
      })),
      publisher: { enabled: false }
    });
  }

  if (pathname.includes('/workflow-store/orders') && method === 'GET') {
    return sendJson(res, 200, { orders: [] });
  }

  if (pathname.includes('/workflow-store/installations') && method === 'POST') {
    return sendJson(res, 200, { status: 'installed' });
  }

  if (pathname.match(/\/workflow-store\/products\/([^\/]+)\/claim-free/i) && method === 'POST') {
    const match = pathname.match(/\/workflow-store\/products\/([^\/]+)\/claim-free/i);
    const prodId = decodeURIComponent(match[1]);
    return sendJson(res, 200, { success: true, productId: prodId });
  }

  if (pathname.match(/\/workflow-store\/products\/([^\/]+)\/download/i) && method === 'GET') {
    const match = pathname.match(/\/workflow-store\/products\/([^\/]+)\/download/i);
    const prodId = decodeURIComponent(match[1]);
    const prod = (WORKFLOWS_DATA.products || []).find(p => p.id === prodId) || {
      id: prodId,
      name: `Workflow ${prodId}`,
      summary: '',
      description: ''
    };
    const def = WORKFLOWS_DATA.definitions?.[prodId] || {
      name: prod.name,
      description: prod.description || prod.summary || '',
      steps: 3,
      nodes: [],
      connections: []
    };
    return sendJson(res, 200, {
      product: prod,
      definition: def,
      entitlementId: `ent-${prodId}`,
      versionId: `ver-${prodId}-1.0.0`,
      version: '1.0.0'
    });
  }

  if (pathname.match(/\/workflow-store\/products\/([^\/]+)\/thumbnail/i)) {
    const match = pathname.match(/\/workflow-store\/products\/([^\/]+)\/thumbnail/i);
    const prodId = decodeURIComponent(match[1]);
    const localThumbPath = path.join(__dirname, '..', 'public', 'workflow-store', 'thumbnails', `${prodId}.png`);
    if (fs.existsSync(localThumbPath)) {
      try {
        const imgBuf = fs.readFileSync(localThumbPath);
        res.writeHead(200, {
          'Content-Type': 'image/png',
          'Content-Length': imgBuf.length,
          'Cache-Control': 'public, max-age=86400',
          'Access-Control-Allow-Origin': '*'
        });
        return res.end(imgBuf);
      } catch (err) {}
    }
    try {
      const pRes = await fetch(`https://aitoolforge.shop/v1/workflow-store/products/${prodId}/thumbnail`, { signal: AbortSignal.timeout(5000) });
      if (pRes.ok) {
        const ab = await pRes.arrayBuffer();
        const buf = Buffer.from(ab);
        res.writeHead(200, {
          'Content-Type': pRes.headers.get('content-type') || 'image/png',
          'Content-Length': buf.length,
          'Cache-Control': 'public, max-age=86400',
          'Access-Control-Allow-Origin': '*'
        });
        return res.end(buf);
      }
    } catch(e) {}
    return sendJson(res, 404, { error: 'Thumbnail not found' });
  }

  if (pathname.match(/\/workflow-store\/products\/[^\/]+\/images\/([^\/]+)/i)) {
    const match = pathname.match(/\/workflow-store\/products\/[^\/]+\/images\/([^\/]+)/i);
    const imgId = decodeURIComponent(match[1]);
    const localImgPath = path.join(__dirname, '..', 'public', 'workflow-store', 'images', `${imgId}.png`);
    if (fs.existsSync(localImgPath)) {
      try {
        const imgBuf = fs.readFileSync(localImgPath);
        res.writeHead(200, {
          'Content-Type': 'image/png',
          'Content-Length': imgBuf.length,
          'Cache-Control': 'public, max-age=86400',
          'Access-Control-Allow-Origin': '*'
        });
        return res.end(imgBuf);
      } catch (err) {}
    }
    return sendJson(res, 404, { error: 'Image not found' });
  }

  if (pathname.includes('/workflow-publisher/me')) {
    return sendJson(res, 200, { publisher: { enabled: false } });
  }

  if (pathname.includes('/workflow-publisher/products')) {
    return sendJson(res, 200, { products: [] });
  }

  // B12. Health Check
  if (pathname.includes('/health')) {
    return sendJson(res, 200, {
      status: 'ok',
      service: 'AI VIDEO LIBRARY License & SePay Webhook Server (Vercel Serverless)',
      time: new Date().toISOString(),
      bankAccount: SETTINGS.bankAccount,
      bankName: SETTINGS.bankName,
      totalKeys: inMemoryStore.keys.size,
      totalMachines: inMemoryStore.machines.size
    });
  }

  return sendJson(res, 200, {
    service: 'AI VIDEO LIBRARY Commercial License API (Vercel Serverless)',
    status: 'online',
    adminUrl: '/admin',
    webhookEndpoint: '/api/webhook/payment',
    timestamp: new Date().toISOString()
  });
};
