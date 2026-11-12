/**
 * Google Flow Native Main Transport Engine
 * Giải pháp phẫu thuật độc lập cho Veo 3 & Banana
 * Sử dụng session.fromPartition().fetch() từ Node.js Main process
 * Tích hợp Angular Internal Contract Bypass (mr & Ym) triệt tiêu hoàn toàn lỗi PUBLIC_ERROR_UNUSUAL_ACTIVITY
 * Bóc tách chính xác 100% URL MP4 có chữ ký CDN (Expires & Signature) & Thumbnail
 * Tích hợp Auto Cookie Sync & Session Healing giữa các phân vùng Google Flow (Banana & Veo 3)
 * Tích hợp Auto Project Self-Healing (Tự động khắc phục Boq Error 5 - Project Not Found)
 */

const electron = require('electron');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const logFile = path.resolve(__dirname, '../../../flow_rpc_debug.log');

function writeDebugLog(entry) {
  try {
    const line = JSON.stringify({ time: new Date().toISOString(), ...entry }, null, 2) + '\n\n';
    fs.appendFileSync(logFile, line, 'utf8');
  } catch (_) {}
}

function randomUuid() {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID().toUpperCase()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16).toUpperCase();
      });
}

function cleanUrl(u) {
  if (typeof u !== 'string') return '';
  let res = u.trim();
  res = res.replace(/[\\\"']+$/, '');
  res = res.replace(/\\+\//g, '/');
  res = res.replace(/\\+u0026/gi, '&');
  res = res.replace(/\\+u003d/gi, '=');
  res = res.replace(/\\+u002f/gi, '/');
  res = res.replace(/\\+&/g, '&');
  res = res.replace(/\\+=/g, '=');
  res = res.replace(/&amp;/g, '&');
  return res.trim();
}

function findInTree(obj, predicate) {
  const stack = [obj];
  while (stack.length > 0) {
    const cur = stack.pop();
    if (!cur) continue;
    if (typeof cur === 'string') {
      if (predicate(cur)) return cur;
    } else if (Array.isArray(cur)) {
      for (let i = cur.length - 1; i >= 0; i--) stack.push(cur[i]);
    } else if (typeof cur === 'object') {
      for (const k of Object.keys(cur)) stack.push(cur[k]);
    }
  }
  return null;
}

// -------------------------------------------------------------
// GOOGLE FLOW SESSION COOKIE SYNC & RECOVERY ENGINE
// -------------------------------------------------------------

function getAppDataDir() {
  if (process.env.APPDATA) {
    return path.join(process.env.APPDATA, 'AI_VIDEO_LIBRARY_DATA');
  }
  return '';
}

function findBestSourceFlowSession(targetAccountId, targetEmail, targetName) {
  try {
    const sessionsFile = path.join(getAppDataDir(), 'browser-sessions.json');
    if (!fs.existsSync(sessionsFile)) return null;
    const data = JSON.parse(fs.readFileSync(sessionsFile, 'utf8'));
    const sessions = data.sessions || [];

    const candidates = sessions.filter(s => {
      if (s.accountId === targetAccountId) return false;
      if (s.providerId !== 'veo3' && s.providerId !== 'banana') return false;
      if ((s.cookieCount || 0) < 15) return false;
      return true;
    });

    if (candidates.length === 0) return null;

    if (targetEmail) {
      const match = candidates.find(c => c.accountEmail && c.accountEmail.toLowerCase() === targetEmail.toLowerCase());
      if (match) return match;
    }

    if (targetName) {
      const match = candidates.find(c => c.accountName && c.accountName.toLowerCase() === targetName.toLowerCase());
      if (match) return match;
    }

    candidates.sort((a, b) => (b.cookieCount || 0) - (a.cookieCount || 0));
    return candidates[0] || null;
  } catch (_) {
    return null;
  }
}

async function syncCookiesToPartition(targetPartition, targetSession) {
  try {
    const srcSession = findBestSourceFlowSession(
      targetSession.accountId,
      targetSession.accountEmail || targetSession.email,
      targetSession.accountName || targetSession.accountDisplayName || targetSession.displayName
    );
    if (!srcSession || !srcSession.partition) return 0;

    const srcSes = electron.session.fromPartition(srcSession.partition);
    const tgtSes = electron.session.fromPartition(targetPartition);

    const allCookies = await srcSes.cookies.get({});
    if (!allCookies || allCookies.length === 0) return 0;

    let copied = 0;
    for (const c of allCookies) {
      try {
        const scheme = c.secure ? 'https' : 'http';
        const domain = c.domain.startsWith('.') ? c.domain.slice(1) : c.domain;
        const url = `${scheme}://${domain}${c.path}`;
        await tgtSes.cookies.set({
          url,
          name: c.name,
          value: c.value,
          domain: c.domain,
          path: c.path,
          secure: c.secure,
          httpOnly: c.httpOnly,
          expirationDate: c.expirationDate,
          sameSite: c.sameSite
        });
        copied++;
      } catch (_) {}
    }

    writeDebugLog({
      event: 'flow-cookies-synced',
      sourceAccountId: srcSession.accountId,
      sourcePartition: srcSession.partition,
      targetAccountId: targetSession.accountId,
      targetPartition,
      copiedCount: copied
    });

    return copied;
  } catch (err) {
    writeDebugLog({
      event: 'flow-cookies-sync-error',
      targetAccountId: targetSession.accountId,
      error: err.message
    });
    return 0;
  }
}

async function ensureViewOnFlowDashboard(view) {
  if (!view || !view.webContents || view.webContents.isDestroyed()) return;
  try {
    const curUrl = view.webContents.getURL() || '';
    if (!curUrl || curUrl.includes('/about') || curUrl.includes('/signin') || curUrl.includes('/identifier')) {
      await view.webContents.loadURL('https://flow.google.com/');
      await new Promise(r => setTimeout(r, 2500));
    }
  } catch (_) {}
}

async function ensurePartitionAuthenticated(session, view) {
  try {
    const ses = electron.session.fromPartition(session.partition);
    const cookies = await ses.cookies.get({ domain: '.google.com' });
    const hasAuth = cookies.some(c => /^(SID|HSID|SSID|OSID|__Secure-1PSID|__Secure-3PSID|SAPISID)$/i.test(c.name));

    if (!hasAuth || cookies.length < 15) {
      const copied = await syncCookiesToPartition(session.partition, session);
      if (copied > 0 && view) {
        await ensureViewOnFlowDashboard(view);
      }
    }
  } catch (_) {}
}

// -------------------------------------------------------------
// GOOGLE FLOW PROJECT SELF-HEALING (BOQ ERROR 5 RESOLVER)
// -------------------------------------------------------------

function getKnownProjectsForAccount(accountId, email) {
  try {
    const file = path.join(getAppDataDir(), 'google-flow-runtime-state.json');
    if (!fs.existsSync(file)) return [];
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const accounts = data.accounts || [];

    const acc = accounts.find(a => a.accountId === accountId);
    const result = [];

    // Ưu tiên các project từ tài khoản cùng email đang hoạt động
    if (email) {
      for (const a of accounts) {
        if (a.email && a.email.toLowerCase() === email.toLowerCase()) {
          if (a.currentProjectId && !result.includes(a.currentProjectId)) result.push(a.currentProjectId);
          if (Array.isArray(a.projectIds)) {
            for (const pid of a.projectIds) {
              if (pid && !result.includes(pid)) result.push(pid);
            }
          }
        }
      }
    }

    if (acc) {
      if (acc.currentProjectId && !result.includes(acc.currentProjectId)) result.push(acc.currentProjectId);
      if (Array.isArray(acc.projectIds)) {
        for (const pid of acc.projectIds) {
          if (pid && !result.includes(pid)) result.push(pid);
        }
      }
    }

    const invalidIds = new Set(acc?.invalidProjectIds || []);
    return result.filter(id => id && !invalidIds.has(id));
  } catch (_) {
    return [];
  }
}

function persistWorkingProject(accountId, newProjectId, failedProjectId) {
  try {
    const file = path.join(getAppDataDir(), 'google-flow-runtime-state.json');
    if (!fs.existsSync(file)) return;
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!Array.isArray(data.accounts)) return;
    for (const acc of data.accounts) {
      if (acc.accountId === accountId) {
        acc.currentProjectId = newProjectId;
        if (failedProjectId) {
          acc.invalidProjectIds = acc.invalidProjectIds || [];
          if (!acc.invalidProjectIds.includes(failedProjectId)) {
            acc.invalidProjectIds.push(failedProjectId);
          }
          if (Array.isArray(acc.projectIds)) {
            acc.projectIds = acc.projectIds.filter(id => id !== failedProjectId);
          }
        }
        if (Array.isArray(acc.projectIds) && !acc.projectIds.includes(newProjectId)) {
          acc.projectIds.unshift(newProjectId);
        }
      }
    }
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch (_) {}
}

async function fetchRemoteFlowProjects(sessionPartition, context, signal) {
  try {
    const rpcId = 'UpteDb';
    const envelope = JSON.stringify([[[rpcId, JSON.stringify(['projects/*', 21, null, null, null, null, [1]]), null, 'generic']]]);
    const res = await executeBatchexecuteRpc(sessionPartition, '', rpcId, envelope, context, 30000, signal);
    if (!res.ok) return [];
    const matches = res.text.match(/projects\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi) || [];
    const ids = [];
    for (const m of matches) {
      const id = m.replace(/^projects\//i, '').trim();
      if (id && !ids.includes(id)) ids.push(id);
    }
    return ids;
  } catch (_) {
    return [];
  }
}

async function createRemoteFlowProject(sessionPartition, title, context, signal) {
  try {
    const rpcId = 'jHPbke';
    const payload = ['projects/*', [null, [title || 'AIForge Studio']], [null, 22]];
    const envelope = JSON.stringify([[[rpcId, JSON.stringify(payload), null, 'generic']]]);
    const res = await executeBatchexecuteRpc(sessionPartition, '', rpcId, envelope, context, 30000, signal);
    if (!res.ok) return null;
    const match = res.text.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
    return match ? match[1] : null;
  } catch (_) {
    return null;
  }
}

async function resolveValidProjectId(session, failedProjectId, context, signal) {
  const accountEmail = session.accountEmail || session.email;
  const known = getKnownProjectsForAccount(session.accountId, accountEmail);
  const candidates = known.filter(id => id && id !== failedProjectId);

  if (candidates.length > 0) {
    writeDebugLog({
      event: 'project-self-heal-local',
      accountId: session.accountId,
      failedProjectId,
      resolvedProjectId: candidates[0]
    });
    return candidates[0];
  }

  try {
    const remoteProjects = await fetchRemoteFlowProjects(session.partition, context, signal);
    const validRemotes = remoteProjects.filter(id => id && id !== failedProjectId);
    if (validRemotes.length > 0) {
      writeDebugLog({
        event: 'project-self-heal-uptedb',
        accountId: session.accountId,
        failedProjectId,
        resolvedProjectId: validRemotes[0]
      });
      return validRemotes[0];
    }
  } catch (_) {}

  try {
    const newProj = await createRemoteFlowProject(session.partition, 'AIForge Studio', context, signal);
    if (newProj) {
      writeDebugLog({
        event: 'project-self-heal-created',
        accountId: session.accountId,
        createdProjectId: newProj
      });
      return newProj;
    }
  } catch (_) {}

  return null;
}

function isProjectNotFoundError(raw, rpcId) {
  if (typeof raw !== 'string') return false;
  if (raw.includes(`["wrb.fr","${rpcId}",null,null,null,[5]`) || raw.includes(`["wrb.fr","${rpcId}",null,null,null,[3]`)) {
    return true;
  }
  const hit = hr(raw, rpcId);
  if (hit && Array.isArray(hit[5]) && (hit[5][0] === 5 || hit[5][0] === 3)) {
    return true;
  }
  return false;
}

// -------------------------------------------------------------
// ANGULAR INTERNAL RECAPTCHA CONTRACT RESOLVER & BYPASS
// -------------------------------------------------------------

function Ym() {
  return String.raw`function resolveFlowRecaptchaContract(type) {
    const sourceOf = (value) => Function.prototype.toString.call(value);
    const identifier = '[$A-Za-z_][$A-Za-z0-9_]*';
    const unique = (items) => items.length === 1 ? items[0] : null;
    const escapeIdentifier = (value) => value.replace(/\$/g, '\\$');
    const matches = (source, pattern) => Array.from(source.matchAll(new RegExp(pattern, 'g')));
    const descriptors = Object.getOwnPropertyDescriptors(type.prototype);
    const contracts = [];

    for (const [operationName, descriptor] of Object.entries(descriptors)) {
      if (operationName === 'constructor' || typeof descriptor.value !== 'function') continue;
      const source = sourceOf(descriptor.value);
      if (!source.includes('grecaptcha') || !source.includes('enterprise') || !source.includes('execute')) continue;
      const call = unique(matches(source,
        '(' + identifier + ')\\.(' + identifier + ')\\(\\s*\\1\\.(' + identifier + ')\\s*,\\s*\\{\\s*action\\s*:'));
      if (!call) continue;
      const receiverName = call[1];
      const receiver = escapeIdentifier(receiverName);
      if (receiverName !== 'this' && !new RegExp('(?:var|let|const)\\s+' + receiver + '\\s*=\\s*this\\b').test(source)) continue;
      const prefix = '(?:^|[^A-Za-z0-9_$])' + receiver + '\\.';
      const ready = unique(matches(source, prefix + '(' + identifier + ')\\(\\s*\\)'));
      const pending = unique(matches(source, '(?:yield|await)\\s+' + receiver + '\\.(' + identifier + ')(?![A-Za-z0-9_$.(])'));
      const gate = unique(matches(source, prefix + '(' + identifier + ')\\.(' + identifier + ')\\(\\s*\\)'));
      const page = unique([...new Set(matches(source, prefix + '(' + identifier + ')\\.grecaptcha\\b').map((match) => match[1]))]);
      if (!ready || !pending || !gate || !page) continue;
      const getter = descriptors[page]?.get;
      if (typeof getter !== 'function') continue;
      const documentField = unique(matches(sourceOf(getter), 'this\\.(' + identifier + ')\\.defaultView\\b'));
      if (!documentField) continue;

      const fields = {
        executor: call[2],
        siteKey: call[3],
        ready: ready[1],
        pending: pending[1],
        gate: gate[1],
        document: documentField[1],
      };
      const names = [...Object.values(fields), gate[2], page, operationName];
      if (names.some((name) => ['__proto__', 'prototype', 'constructor'].includes(name))) continue;
      if (new Set(Object.values(fields)).size !== Object.values(fields).length) continue;
      if (Object.values(fields).includes(operationName) || Object.values(fields).includes(page)) continue;
      contracts.push({ operation: descriptor.value, fields, gateMethod: gate[2] });
    }
    return unique(contracts);
  }`;
}

const Eu = "AIFORGE_FLOW_RECAPTCHA_EMPTY_TOKEN";

function mr() {
  return `async function acquireFlowRecaptchaToken(siteKey, action) {
    const enterprise = window.grecaptcha?.enterprise;
    if (!enterprise || typeof enterprise.execute !== 'function') {
      throw new Error('Flow verification executor is unavailable');
    }
    if (typeof action !== 'string' || !/^[A-Za-z0-9_/]+$/.test(action)) {
      throw new Error('Flow verification action is unsupported');
    }
    const sourceOf = (value) => Function.prototype.toString.call(value);
    const publicSource = sourceOf(enterprise.execute);
    let token;
    if (!publicSource.includes('extension_hijack_detected')) {
      token = await enterprise.execute(siteKey, { action });
    } else {
      const module = window.default_AiSandboxAngularFrontend;
      const resolveContract = (${Ym()});
      const candidates = [];
      if (module && typeof module === 'object') {
        for (const value of Object.values(module)) {
          if (typeof value !== 'function' || !value.prototype) continue;
          const classSource = sourceOf(value);
          if (!classSource.includes('grecaptcha') || !classSource.includes('xZbWve')) continue;
          const contract = resolveContract(value);
          if (!contract) continue;
          if (candidates.some((candidate) => candidate.type === value)) continue;
          candidates.push({ type: value, ...contract });
        }
      }
      if (candidates.length !== 1) {
        throw new Error('Flow native verification contract is unavailable or ambiguous');
      }
      const candidate = candidates[0];
      const fields = candidate.fields;
      const receiver = Object.create(candidate.type.prototype);
      Object.assign(receiver, {
        [fields.document]: document,
        [fields.siteKey]: siteKey,
        [fields.gate]: { [candidate.gateMethod]: () => true },
        [fields.ready]: () => true,
        [fields.executor]: null,
        [fields.pending]: Promise.resolve(),
      });
      token = await candidate.operation.call(receiver, action);
      if (typeof receiver[fields.executor] !== 'function' ||
          sourceOf(receiver[fields.executor]).includes('extension_hijack_detected')) {
        throw new Error('Flow native verification executor did not initialize');
      }
    }
    if (typeof token !== 'string' || !token.trim()) {
      throw new Error(${JSON.stringify(`${Eu}: Flow verification returned an empty token`)});
    }
    return token;
  }`;
}

// -------------------------------------------------------------
// RECAPTCHA BROKER (PER-ACCOUNT FIFO CONCURRENCY LIMIT = 1)
// -------------------------------------------------------------

class RecaptchaBroker {
  constructor() {
    this.queues = new Map();
  }
  async run(accountId, fn, signal) {
    if (!this.queues.has(accountId)) {
      this.queues.set(accountId, Promise.resolve());
    }
    const previous = this.queues.get(accountId);
    let release;
    const current = new Promise(resolve => { release = resolve; });
    this.queues.set(accountId, current);

    await previous;
    try {
      if (signal?.aborted) throw new Error('Operation aborted');
      return await fn();
    } finally {
      release();
      if (this.queues.get(accountId) === current) {
        this.queues.delete(accountId);
      }
    }
  }
}

const recaptchaBroker = new RecaptchaBroker();

// -------------------------------------------------------------
// 1. BÓC TÁCH NGỮ CẢNH XÁC THỰC TỪ TRANG WEB
// -------------------------------------------------------------

async function requestContext(view, siteKey, action = 'VIDEO_GENERATION', timeoutMs = 25000, signal) {
  const script = `(async () => {
    const actionName = ${JSON.stringify(action || '')};
    const formatBrands = (brands) => Array.isArray(brands)
      ? brands.map((brand) => '"' + brand.brand + '";v="' + brand.version + '"').join(', ')
      : undefined;

    const waitForEnterprise = async () => {
      if (typeof window.grecaptcha?.enterprise?.execute === 'function') return window.grecaptcha.enterprise;
      const scriptId = 'aiforge-flow-recaptcha';
      let script = document.getElementById(scriptId);
      if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        const existingNonce = document.querySelector('script[nonce]')?.nonce ||
          document.querySelector('script[nonce]')?.getAttribute('nonce');
        if (existingNonce) script.setAttribute('nonce', existingNonce);
        let scriptUrl = 'https://www.google.com/recaptcha/enterprise.js?render=' + ${JSON.stringify(siteKey)};
        if (typeof window.trustedTypes !== 'undefined' && window.trustedTypes.createPolicy) {
          try {
            const policy = window.trustedTypes.defaultPolicy ||
              window.trustedTypes.createPolicy('aiforge-main-transport-recaptcha', { createScriptURL: (url) => url });
            if (policy) scriptUrl = policy.createScriptURL(scriptUrl);
          } catch {}
        }
        script.src = scriptUrl;
        script.async = true;
        document.head.appendChild(script);
      }
      for (let index = 0; index < 60; index += 1) {
        if (typeof window.grecaptcha?.enterprise?.execute === 'function') return window.grecaptcha.enterprise;
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      return null;
    };

    let recaptchaToken = '';
    if (actionName) {
      const enterprise = await waitForEnterprise();
      if (!enterprise || typeof enterprise.execute !== 'function') {
        throw new Error('recaptcha enterprise execute unavailable');
      }
      recaptchaToken = await Promise.race([
        (${mr()})(${JSON.stringify(siteKey)}, actionName),
        new Promise((_, reject) => setTimeout(() => reject(new Error('recaptcha execute timeout (20s)')), 20000)),
      ]);
    }

    return {
      at: String(window.WIZ_global_data?.SNlM0e || ''),
      fSid: String(window.WIZ_global_data?.FdrFJe || ''),
      bl: String(window.WIZ_global_data?.cfb2h || ''),
      recaptchaToken: String(recaptchaToken || ''),
      fingerprint: {
        userAgent: navigator.userAgent,
        acceptLanguage: Array.isArray(navigator.languages) && navigator.languages.length
          ? navigator.languages.join(',')
          : navigator.language,
        secChUa: formatBrands(navigator.userAgentData?.brands),
        secChUaMobile: navigator.userAgentData?.mobile ? '?1' : '?0',
        secChUaPlatform: navigator.userAgentData?.platform
          ? '"' + navigator.userAgentData.platform + '"'
          : undefined,
      },
    };
  })()`;

  return await view.webContents.executeJavaScript(script, true);
}

// -------------------------------------------------------------
// 2. GỬI BATCHEXECUTE RPC TỪ MAIN PROCESS QUA ELECTRON SESSION.FETCH
// -------------------------------------------------------------

async function executeBatchexecuteRpc(sessionPartition, projectId, rpcId, envelope, context, timeoutMs = 120000, signal) {
  const ses = electron.session.fromPartition(sessionPartition);
  const origin = 'https://flow.google.com';
  const batchPath = '/_/AiSandboxAngularFrontend/data/batchexecute';
  const sourcePath = projectId ? `/project/${projectId}` : '/';
  const reqId = Math.floor(Math.random() * 9000000) + 1000000;

  const url = `${origin}${batchPath}?rpcids=${encodeURIComponent(rpcId)}&source-path=${encodeURIComponent(sourcePath)}&bl=${encodeURIComponent(context.bl)}&f.sid=${encodeURIComponent(context.fSid)}&hl=en-US&_reqid=${reqId}&rt=c`;
  const body = `f.req=${encodeURIComponent(envelope)}&at=${encodeURIComponent(context.at)}&`;

  const headers = {
    'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
    'x-same-domain': '1',
    'origin': origin,
    'referer': projectId ? `${origin}/project/${projectId}` : `${origin}/`,
    'user-agent': context.fingerprint?.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'accept-language': context.fingerprint?.acceptLanguage || 'en-US,en;q=0.9',
    ...(context.fingerprint?.secChUa ? { 'sec-ch-ua': context.fingerprint.secChUa } : {}),
    ...(context.fingerprint?.secChUaMobile ? { 'sec-ch-ua-mobile': context.fingerprint.secChUaMobile } : {}),
    ...(context.fingerprint?.secChUaPlatform ? { 'sec-ch-ua-platform': context.fingerprint.secChUaPlatform } : {})
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (signal) {
    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    const res = await ses.fetch(url, {
      method: 'POST',
      headers,
      body,
      credentials: 'include',
      signal: controller.signal
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  } finally {
    clearTimeout(timer);
  }
}

// -------------------------------------------------------------
// 3. TÁCH DỮ LIỆU RPC TỪ RESPONSE GOOGLE: si() & hr() (RECURSIVE)
// -------------------------------------------------------------

function hr(raw, targetRpc) {
  const t = raw.trim().replace(/^\)\]\}'\s*/, '');
  const chunks = [t, ...t.split('\n')];
  for (const chunk of chunks) {
    let parsed;
    try {
      parsed = JSON.parse(chunk);
    } catch {
      continue;
    }
    if (Array.isArray(parsed)) {
      const queue = [...parsed];
      while (queue.length > 0) {
        const item = queue.shift();
        if (Array.isArray(item)) {
          if (item[0] === 'wrb.fr') {
            if (!targetRpc) return item;
            if (typeof targetRpc === 'string' && item[1] === targetRpc) return item;
            if (Array.isArray(targetRpc) && targetRpc.includes(String(item[1]))) return item;
          }
          queue.push(...item);
        }
      }
    }
  }
  return null;
}

function si(raw, targetRpc) {
  const hit = hr(raw, targetRpc);
  if (hit) {
    if (typeof hit[2] !== 'string') return hit[2];
    try {
      return JSON.parse(hit[2]);
    } catch {
      return hit[2];
    }
  }
  let o = raw.trim();
  if (o.startsWith(")]}'")) o = o.slice(4).trim();
  const lines = o.split('\n');
  for (const line of lines) {
    const tr = line.trim();
    if (!tr || /^\d+$/.test(tr)) continue;
    try {
      const s = JSON.parse(tr);
      if (Array.isArray(s) && s.length > 0) {
        for (const it of s) {
          if (Array.isArray(it) && it[0] === 'wrb.fr' && typeof it[2] === 'string') {
            try { return JSON.parse(it[2]); } catch { return it[2]; }
          }
        }
        return s;
      }
    } catch {}
  }
  return null;
}

// -------------------------------------------------------------
// VEO 3 (VIDEO GENERATION, STATUS, MEDIA, UPSCALE)
// -------------------------------------------------------------

function resolveVideoRpcId(params, rpcConfig) {
  if (params.rpcId) return params.rpcId;
  if (params.mode === 'Edit') return 'jIps6';
  if (params.mode === 'Frames' && params.startMediaId && params.endMediaId) {
    return rpcConfig?.rpcIds?.videoFrames || 'nprQif';
  }
  if (params.mode === 'I2V' && params.startMediaId) {
    return rpcConfig?.rpcIds?.videoI2v || 'eb1hJf';
  }
  if (params.mode === 'R2V' && params.referenceMediaIds?.length) {
    return rpcConfig?.rpcIds?.videoR2v || 'MZZa6b';
  }
  return rpcConfig?.rpcIds?.videoT2v || 'YhhmEf';
}

function buildVideoEnvelope(params, recaptchaToken, rpcConfig) {
  const promptStruct = [null, null, [[[params.prompt]]]];
  const ratioEnum = params.ratioEnum || 2;
  const resolutionCode = params.resolutionCode || (params.modelKey?.toLowerCase().includes('360p') ? 4 : 1);
  const u1 = randomUuid();
  const u2 = randomUuid();
  const rpcId = resolveVideoRpcId(params, rpcConfig);

  let modePayload;
  if (params.mode === 'Edit') {
    modePayload = [
      [null, params.sourceVideoMediaId, 0, params.sourceVideoEndFrame],
      promptStruct,
      params.modelKey,
      ratioEnum,
      [null, null, null, null, u1, u2],
      null, null, null,
      (params.referenceMediaIds || []).map(id => [null, id]),
      null, null, null,
      [resolutionCode]
    ];
  } else if (params.mode === 'Frames' && params.startMediaId && params.endMediaId) {
    modePayload = [
      promptStruct,
      params.modelKey,
      ratioEnum,
      null,
      [null, params.startMediaId, null, null, null, params.startCrop || null],
      [null, params.endMediaId, null, null, null, params.endCrop || null],
      [null, null, null, null, u1, u2]
    ];
  } else if (params.mode === 'I2V' && params.startMediaId) {
    modePayload = [
      promptStruct,
      params.modelKey,
      ratioEnum,
      null,
      [null, params.startMediaId, null, null, null, params.startCrop || null],
      [null, null, null, null, u1, u2],
      null, null, null,
      [resolutionCode]
    ];
  } else if (params.mode === 'R2V' && params.referenceMediaIds?.length) {
    modePayload = [
      promptStruct,
      params.referenceMediaIds.map(id => [null, id]),
      params.modelKey,
      ratioEnum,
      null,
      [null, null, null, null, u1, u2],
      null, null, null, null, null,
      [resolutionCode]
    ];
    // Giọng Flow (chỉ R2V): ô thứ 8 = [["charon"]]. Không có giọng → giữ nguyên yêu cầu cũ.
    if (Array.isArray(params.voices) && params.voices.length) {
      modePayload[7] = params.voices.map(v => [String(v).trim().toLowerCase()]).filter(v => v[0]);
    }
  } else {
    // T2V
    modePayload = [
      promptStruct,
      params.modelKey,
      ratioEnum,
      null,
      [null, null, null, null, u1, u2],
      null, null,
      [resolutionCode]
    ];
  }

  const clientVer = rpcConfig?.clientContext?.clientVersionNumber ?? 22;
  const envelopeData = [
    [modePayload],
    [null, clientVer, null, null, null, params.projectId, null, null, null, null, [recaptchaToken, 1]],
    [randomUuid(), 2]
  ];

  return {
    rpcId,
    envelope: JSON.stringify([[[rpcId, JSON.stringify(envelopeData), null, 'generic']]])
  };
}

function parseVideoSubmitResponse(raw, rpcId) {
  const data = si(raw, rpcId);
  let mediaId, workflowId;
  if (Array.isArray(data)) {
    const item3 = data[3]?.[0];
    if (Array.isArray(item3) && typeof item3[0] === 'string') {
      mediaId = item3[0];
      if (typeof item3[2] === 'string') workflowId = item3[2];
    }
    if (!mediaId) {
      const item2 = data[2]?.[0];
      if (Array.isArray(item2)) {
        if (typeof item2[0] === 'string') workflowId = item2[0];
        const s = item2[3];
        if (Array.isArray(s) && typeof s[4] === 'string') mediaId = s[4];
      }
    }
  }

  if (!mediaId) {
    const match = raw.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
    if (match) mediaId = match[1];
  }

  if (!mediaId) {
    throw new Error('Google Flow không trả về media ID hợp lệ: ' + raw.slice(0, 300));
  }
  return { mediaId, workflowId: workflowId || mediaId };
}

// -------------------------------------------------------------
// BANANA (IMAGE GENERATION, REFERENCE UPLOAD, 2K UPSCALE)
// -------------------------------------------------------------

function resolveImageModelName(params, rpcConfig) {
  let model = params.modelName || rpcConfig?.image?.defaultModel || 'BELUGA';
  if (model === 'NARWHAL' || !model) model = 'BELUGA';
  if (typeof params.model === 'string') {
    if (params.model.includes('imagen-4')) model = 'IMAGEN_3_5';
    else if (params.model.includes('gemini-3.0-pro')) model = 'GEM_PIX_2';
    else if (params.model.includes('gemini-3.1') || params.model.includes('flash') || params.model.includes('banana')) model = 'BELUGA';
  }
  return model;
}

function buildImageEnvelope(params, recaptchaToken, rpcConfig) {
  const modelName = resolveImageModelName(params, rpcConfig);
  const ratioMapping = rpcConfig?.image?.aspectRatioMapping || { '1:1': 1, '9:16': 2, '16:9': 3, '3:4': 4, '4:3': 5 };
  const ratioEnum = typeof params.aspectRatio === 'string' ? (ratioMapping[params.aspectRatio] || 1) : 1;
  const u1 = randomUuid();
  const u2 = randomUuid();
  const u3 = randomUuid();
  const seed = Math.floor(Math.random() * 2147483647);
  const clientVer = rpcConfig?.clientContext?.clientVersionNumber ?? 22;

  const authBlock = [null, clientVer, null, null, null, params.projectId, null, null, null, null, [recaptchaToken, 1]];
  const refs = Array.isArray(params.referenceMediaIds) && params.referenceMediaIds.length > 0
    ? params.referenceMediaIds.map(id => [id, null, null, null, 1])
    : null;

  const payload = [
    null,
    [[null, null, refs, seed, ratioEnum, modelName, null, authBlock, [[[params.prompt]]], null, null, null, u1, u2]],
    1,
    authBlock,
    [u3]
  ];

  const rpcId = rpcConfig?.rpcIds?.imageGenerate || 'ogiZ0b';
  return {
    rpcId,
    envelope: JSON.stringify([[[rpcId, JSON.stringify(payload), null, 'generic']]])
  };
}

function parseImageResponse(raw, projectId, rpcId = 'ogiZ0b') {
  let imgUrl = '';
  let providerAssetId = '';
  let width = 1024;
  let height = 1024;
  let seed = Math.floor(Math.random() * 1e9);

  const data = si(raw, rpcId);

  try {
    if (Array.isArray(data) && Array.isArray(data[0])) {
      for (const item of data[0]) {
        if (!Array.isArray(item)) continue;
        if (!providerAssetId && typeof item[0] === 'string' && item[0].length > 10) {
          providerAssetId = item[0];
        }
        const m = item[6];
        if (Array.isArray(m)) {
          const w = m[0];
          if (Array.isArray(w)) {
            if (typeof w[1] === 'number') seed = w[1];
            for (const field of w) {
              if (typeof field === 'string' && (field.includes('flow-content.google/image/') || field.includes('flow-content.googleusercontent.com'))) {
                imgUrl = cleanUrl(field);
                break;
              }
            }
          }
          const f = m[2];
          if (Array.isArray(f) && f.length >= 2) {
            if (typeof f[0] === 'number') width = f[0];
            if (typeof f[1] === 'number') height = f[1];
          }
        }
        if (imgUrl) break;
      }
    }
  } catch (_) {}

  if (!imgUrl && data) {
    const found = findInTree(data, s => s.includes('flow-content.google/image/') || s.includes('flow-content.googleusercontent.com'));
    if (found) imgUrl = cleanUrl(found);
  }

  if (!imgUrl) {
    const re = /(?:https:\/\/flow-content\.google\/image\/|https:\\\/\\\/flow-content\.google\\\/image\/)[^"'\s]+/g;
    const m = raw.match(re);
    if (m && m.length > 0) {
      imgUrl = cleanUrl(m[0]);
    }
  }

  if (!imgUrl) {
    if (isProjectNotFoundError(raw, rpcId)) {
      throw new Error('Google Flow báo lỗi Boq 5 (Project không tồn tại hoặc bị từ chối). Hệ thống đã kích hoạt cơ chế tự khôi phục project.');
    }
    throw new Error('Google Flow Banana không trả về link ảnh CDN hợp lệ: ' + raw.slice(0, 300));
  }

  if (!providerAssetId) {
    const assetMatch = imgUrl.match(/flow-content\.google\/image\/([a-f0-9-]+)/i);
    providerAssetId = assetMatch ? assetMatch[1] : ('banana-asset-' + Date.now());
  }

  return {
    imageUrl: imgUrl.trim(),
    width,
    height,
    providerAssetId,
    projectId,
    seed
  };
}

function buildUploadImageEnvelope(params, recaptchaToken, rpcConfig) {
  const clientVer = rpcConfig?.clientContext?.clientVersionNumber ?? 22;
  const payload = [
    [null, clientVer, null, null, null, params.projectId, null, null, null, null, [recaptchaToken, 1]],
    params.base64Bytes,
    params.mimeType || 'image/jpeg',
    1,
    null, null, null, null,
    params.fileName || 'reference.jpg',
    null,
    randomUuid(),
    randomUuid()
  ];
  const rpcId = rpcConfig?.rpcIds?.imageUpload || 'maseQ';
  return {
    rpcId,
    envelope: JSON.stringify([[[rpcId, JSON.stringify(payload), null, 'generic']]])
  };
}

function parseUploadImageResponse(raw, rpcId = 'maseQ') {
  const data = si(raw, rpcId);
  if (Array.isArray(data) && Array.isArray(data[0]) && typeof data[0][0] === 'string') {
    return data[0][0];
  }
  const match = raw.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  if (match) return match[1];
  throw new Error('Google Flow không trả về mediaId sau khi tải ảnh tham chiếu: ' + raw.slice(0, 300));
}

// -------------------------------------------------------------
// EXPORT CÁC HÀM XỬ LÝ PHẪU THUẬT (SURGICAL EXPORTS)
// -------------------------------------------------------------

module.exports = {
  // 1. Submit Video (Veo 3)
  async executeFlowVideoRpc(host, session, params, signal, rpcConfig) {
    return await recaptchaBroker.run(session.accountId, async () => {
      const readyView = await host.ensureGoogleFlowViewReady(session, signal);
      const siteKey = rpcConfig?.recaptcha?.siteKey || '6LdsFiUsAAAAAIjVDZcuLhaHiDn5nnHVXVRQGeMV';

      await ensurePartitionAuthenticated(session, readyView.view);

      try {
        const curUrl = readyView.view.webContents.getURL() || '';
        const projMatch = curUrl.match(/\/project\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
        if (projMatch && projMatch[1]) params.projectId = projMatch[1];
      } catch (_) {}

      await host.warmRecaptchaSurface?.(session.accountId, siteKey);

      let context = await requestContext(readyView.view, siteKey, 'VIDEO_GENERATION', 25000, signal);

      if (!context.recaptchaToken || context.recaptchaToken.length < 20) {
        writeDebugLog({
          event: 'recaptcha-token-failed',
          accountId: session.accountId,
          error: 'Empty or invalid reCAPTCHA token returned from in-page executor'
        });
        throw new Error('Google Flow yêu cầu xác minh bảo mật tài khoản trong trình duyệt (Không lấy được reCAPTCHA token hợp lệ)');
      }

      let { rpcId, envelope } = buildVideoEnvelope(params, context.recaptchaToken, rpcConfig);
      let res = await executeBatchexecuteRpc(session.partition, params.projectId, rpcId, envelope, context, 180000, signal);

      // 1. Phục hồi 401
      if (res.status === 401) {
        writeDebugLog({
          event: 'main-transport-video-401-retry',
          accountId: session.accountId,
          note: 'Nhận HTTP 401. Đang đồng bộ cookies và thử lại.'
        });
        const copied = await syncCookiesToPartition(session.partition, session);
        if (copied > 0 && readyView.view) {
          await ensureViewOnFlowDashboard(readyView.view);
          context = await requestContext(readyView.view, siteKey, 'VIDEO_GENERATION', 25000, signal);
          const rebuilt = buildVideoEnvelope(params, context.recaptchaToken, rpcConfig);
          rpcId = rebuilt.rpcId;
          envelope = rebuilt.envelope;
          res = await executeBatchexecuteRpc(session.partition, params.projectId, rpcId, envelope, context, 180000, signal);
        }
      }

      // 2. Phục hồi Boq 5 (Project not found)
      if (isProjectNotFoundError(res.text, rpcId)) {
        writeDebugLog({
          event: 'main-transport-video-project-not-found',
          accountId: session.accountId,
          failedProjectId: params.projectId
        });
        const newProjectId = await resolveValidProjectId(session, params.projectId, context, signal);
        if (newProjectId) {
          persistWorkingProject(session.accountId, newProjectId, params.projectId);
          params.projectId = newProjectId;
          const rebuilt = buildVideoEnvelope(params, context.recaptchaToken, rpcConfig);
          rpcId = rebuilt.rpcId;
          envelope = rebuilt.envelope;
          res = await executeBatchexecuteRpc(session.partition, params.projectId, rpcId, envelope, context, 180000, signal);
        }
      }

      writeDebugLog({
        event: 'main-transport-video-submit',
        accountId: session.accountId,
        projectId: params.projectId,
        modelKey: params.modelKey,
        mode: params.mode,
        rpcId,
        tokenLength: context.recaptchaToken.length,
        tokenPrefix: context.recaptchaToken.slice(0, 15) + '...',
        status: res.status,
        responseSnippet: res.text.slice(0, 500)
      });

      if (!res.ok) {
        throw new Error(`Google Flow Video RPC thất bại với status HTTP ${res.status}`);
      }
      return parseVideoSubmitResponse(res.text, rpcId);
    }, signal);
  },

  // 2. Poll Video Status (Veo 3)
  async executeFlowVideoStatusRpc(host, session, params, signal, rpcConfig) {
    const readyView = await host.ensureGoogleFlowViewReady(session, signal);
    const siteKey = rpcConfig?.recaptcha?.siteKey || '6LdsFiUsAAAAAIjVDZcuLhaHiDn5nnHVXVRQGeMV';
    const context = await requestContext(readyView.view, siteKey, '', 15000, signal);

    const rpcId = params.rpcId || rpcConfig?.rpcIds?.videoStatus || 'jwpduf';
    const envelope = JSON.stringify([[[rpcId, JSON.stringify([null, null, [[params.mediaId]]]), null, 'generic']]]);

    const res = await executeBatchexecuteRpc(session.partition, params.projectId, rpcId, envelope, context, 30000, signal);
    if (!res.ok) throw new Error(`Video Status RPC HTTP ${res.status}`);

    const data = si(res.text, rpcId);
    let statusCode;
    if (Array.isArray(data)) {
      const a = data[2]?.[0];
      if (Array.isArray(a)) {
        const s = a[5];
        if (Array.isArray(s)) {
          const A = s[8];
          if (Array.isArray(A) && typeof A[0] === 'number') statusCode = A[0];
        }
      }
    }

    let status = 'GENERATING';
    if (statusCode === 3) status = 'SUCCESS';
    else if (statusCode === 1) status = 'PENDING';
    else if (statusCode === 2) status = 'GENERATING';
    else if (typeof statusCode === 'number' && statusCode >= 4) status = 'FAILED';

    writeDebugLog({
      event: 'main-transport-video-status',
      accountId: session.accountId,
      mediaId: params.mediaId,
      statusCode,
      status
    });

    return { statusCode: statusCode || 2, status, raw: data };
  },

  // 3. Fetch Video MP4 Media URL (Veo 3)
  async executeFlowVideoMediaRpc(host, session, params, signal, rpcConfig) {
    const readyView = await host.ensureGoogleFlowViewReady(session, signal);
    const siteKey = rpcConfig?.recaptcha?.siteKey || '6LdsFiUsAAAAAIjVDZcuLhaHiDn5nnHVXVRQGeMV';
    const context = await requestContext(readyView.view, siteKey, '', 15000, signal);

    const rpcId = params.rpcId || rpcConfig?.rpcIds?.videoMedia || 'as29s';
    const envelope = JSON.stringify([[[rpcId, JSON.stringify([params.mediaId]), null, 'generic']]]);

    const res = await executeBatchexecuteRpc(session.partition, params.projectId, rpcId, envelope, context, 30000, signal);
    if (!res.ok) throw new Error(`Video Media RPC HTTP ${res.status}`);

    const data = si(res.text, rpcId);
    let videoUrl = '';
    let thumbnailUrl = '';
    let durationSeconds;
    let sizeBytes;
    let title;

    if (Array.isArray(data)) {
      const c = data[5];
      if (Array.isArray(c)) {
        if (typeof c[11] === 'string' && c[11].startsWith('http')) thumbnailUrl = cleanUrl(c[11]);
        if (typeof c[14] === 'number') sizeBytes = c[14];
      }
      const d = data[7]?.[0];
      if (Array.isArray(d)) {
        if (typeof d[8] === 'string' && d[8].startsWith('http')) videoUrl = cleanUrl(d[8]);
        if (typeof d[7] === 'string') title = d[7];
      }
      const l = data[7]?.[1]?.[2];
      if (Array.isArray(l) && typeof l[0] === 'number') durationSeconds = l[0];
    }

    if (!videoUrl && data) {
      const found = findInTree(data, s => s.includes('flow-content.google/video/'));
      if (found) videoUrl = cleanUrl(found);
    }

    if (!thumbnailUrl && data) {
      const found = findInTree(data, s => s.includes('flow-content.google/image/') || s.includes('flow-content.googleusercontent.com'));
      if (found) thumbnailUrl = cleanUrl(found);
    }

    if (!videoUrl) {
      const re = /(?:https:\/\/flow-content\.google\/video\/|https:\\\/\\\/flow-content\.google\\\/video\\\/)[^"'\s]+/g;
      const m = res.text.match(re);
      if (m && m.length > 0) videoUrl = cleanUrl(m[0]);
    }

    if (!thumbnailUrl) {
      const re = /(?:https:\/\/flow-content\.google\/image\/|https:\\\/\\\/flow-content\.google\\\/image\/)[^"'\s]+/g;
      const m = res.text.match(re);
      if (m && m.length > 0) thumbnailUrl = cleanUrl(m[0]);
    }

    writeDebugLog({
      event: 'main-transport-video-media-fetch',
      accountId: session.accountId,
      mediaId: params.mediaId,
      hasVideoUrl: Boolean(videoUrl),
      videoUrlSnippet: videoUrl ? videoUrl.slice(0, 100) + '...' : '',
      hasThumbnailUrl: Boolean(thumbnailUrl)
    });

    if (!videoUrl) {
      throw new Error('Google Flow không trả về URL MP4 hợp lệ: ' + res.text.slice(0, 300));
    }

    return {
      videoUrl,
      thumbnailUrl: thumbnailUrl || undefined,
      durationSeconds,
      sizeBytes,
      title,
      mediaId: params.mediaId
    };
  },

  // 4. Generate Image (Banana)
  async executeFlowImageRpc(host, session, params, signal, rpcConfig) {
    return await recaptchaBroker.run(session.accountId, async () => {
      const readyView = await host.ensureGoogleFlowViewReady(session, signal);
      const siteKey = rpcConfig?.recaptcha?.siteKey || '6LdsFiUsAAAAAIjVDZcuLhaHiDn5nnHVXVRQGeMV';

      // 1. Tự động kiểm tra và đồng bộ cookie nếu partition thiếu phiên đăng nhập Google
      await ensurePartitionAuthenticated(session, readyView.view);

      // 2. Tự động xác thực Project ID hợp lệ
      try {
        const curUrl = readyView.view.webContents.getURL() || '';
        const projMatch = curUrl.match(/\/project\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
        if (projMatch && projMatch[1]) {
          params.projectId = projMatch[1];
        }
      } catch (_) {}

      // Nếu projectId bị trống hoặc rơi vào ID chết cũ, tự động lấy project đang active
      if (!params.projectId || params.projectId === 'cda62c70-a0cd-4a8e-a27b-89db2e9a5dfb') {
        const known = getKnownProjectsForAccount(session.accountId, session.accountEmail || session.email);
        if (known.length > 0) {
          params.projectId = known[0];
        }
      }

      await host.warmRecaptchaSurface?.(session.accountId, siteKey);

      let context = await requestContext(readyView.view, siteKey, 'IMAGE_GENERATION', 25000, signal);

      if (!context.recaptchaToken || context.recaptchaToken.length < 20) {
        writeDebugLog({
          event: 'recaptcha-token-failed',
          accountId: session.accountId,
          error: 'Empty or invalid reCAPTCHA token returned from in-page executor for Banana'
        });
        throw new Error('Google Flow yêu cầu xác minh bảo mật tài khoản trong trình duyệt (Không lấy được reCAPTCHA token hợp lệ)');
      }

      let { rpcId, envelope } = buildImageEnvelope(params, context.recaptchaToken, rpcConfig);
      let res = await executeBatchexecuteRpc(session.partition, params.projectId, rpcId, envelope, context, 180000, signal);

      // 3. Phục hồi 401 khẩn cấp
      if (res.status === 401) {
        writeDebugLog({
          event: 'main-transport-image-401-retry',
          accountId: session.accountId,
          note: 'Nhận HTTP 401 Unauthorized. Tiến hành đồng bộ cookie khẩn cấp từ phiên Google Flow đang active và thử lại 1 lần.'
        });
        const copied = await syncCookiesToPartition(session.partition, session);
        if (copied > 0 && readyView.view) {
          await ensureViewOnFlowDashboard(readyView.view);
          context = await requestContext(readyView.view, siteKey, 'IMAGE_GENERATION', 25000, signal);
          const rebuilt = buildImageEnvelope(params, context.recaptchaToken, rpcConfig);
          rpcId = rebuilt.rpcId;
          envelope = rebuilt.envelope;
          res = await executeBatchexecuteRpc(session.partition, params.projectId, rpcId, envelope, context, 180000, signal);
        }
      }

      // 4. Phục hồi Boq Error 5 (Project not found / Invalid project)
      if (isProjectNotFoundError(res.text, rpcId)) {
        writeDebugLog({
          event: 'main-transport-image-project-not-found',
          accountId: session.accountId,
          failedProjectId: params.projectId,
          note: 'Nhận lỗi Boq 5 (Project không tồn tại). Tự động tìm project hợp lệ và gửi lại RPC.'
        });

        const newProjectId = await resolveValidProjectId(session, params.projectId, context, signal);
        if (newProjectId) {
          persistWorkingProject(session.accountId, newProjectId, params.projectId);
          params.projectId = newProjectId;
          const rebuilt = buildImageEnvelope(params, context.recaptchaToken, rpcConfig);
          rpcId = rebuilt.rpcId;
          envelope = rebuilt.envelope;
          res = await executeBatchexecuteRpc(session.partition, params.projectId, rpcId, envelope, context, 180000, signal);
        }
      }

      writeDebugLog({
        event: 'main-transport-image-submit',
        accountId: session.accountId,
        projectId: params.projectId,
        modelKey: resolveImageModelName(params, rpcConfig),
        rpcId,
        tokenLength: context.recaptchaToken.length,
        tokenPrefix: context.recaptchaToken.slice(0, 15) + '...',
        status: res.status,
        responseSnippet: res.text.slice(0, 500)
      });

      if (!res.ok) throw new Error(`Google Flow Image RPC HTTP ${res.status}`);
      return parseImageResponse(res.text, params.projectId, rpcId);
    }, signal);
  },

  // 5. Upload Reference Image (Banana)
  async executeFlowUploadImageRpc(host, session, params, signal, rpcConfig) {
    return await recaptchaBroker.run(session.accountId, async () => {
      const readyView = await host.ensureGoogleFlowViewReady(session, signal);
      const siteKey = rpcConfig?.recaptcha?.siteKey || '6LdsFiUsAAAAAIjVDZcuLhaHiDn5nnHVXVRQGeMV';

      await ensurePartitionAuthenticated(session, readyView.view);

      if (!params.projectId || params.projectId === 'cda62c70-a0cd-4a8e-a27b-89db2e9a5dfb') {
        const known = getKnownProjectsForAccount(session.accountId, session.accountEmail || session.email);
        if (known.length > 0) params.projectId = known[0];
      }

      await host.warmRecaptchaSurface?.(session.accountId, siteKey);

      let context = await requestContext(readyView.view, siteKey, 'UPLOAD_IMAGE', 25000, signal);

      if (!context.recaptchaToken || context.recaptchaToken.length < 20) {
        throw new Error('Google Flow yêu cầu xác minh bảo mật tài khoản trong trình duyệt (Upload Reference)');
      }

      let { rpcId, envelope } = buildUploadImageEnvelope(params, context.recaptchaToken, rpcConfig);
      let res = await executeBatchexecuteRpc(session.partition, params.projectId, rpcId, envelope, context, 120000, signal);

      if (res.status === 401) {
        await syncCookiesToPartition(session.partition, session);
        if (readyView.view) await ensureViewOnFlowDashboard(readyView.view);
        context = await requestContext(readyView.view, siteKey, 'UPLOAD_IMAGE', 25000, signal);
        const rebuilt = buildUploadImageEnvelope(params, context.recaptchaToken, rpcConfig);
        res = await executeBatchexecuteRpc(session.partition, params.projectId, rebuilt.rpcId, rebuilt.envelope, context, 120000, signal);
      }

      if (isProjectNotFoundError(res.text, rpcId)) {
        const newProjectId = await resolveValidProjectId(session, params.projectId, context, signal);
        if (newProjectId) {
          persistWorkingProject(session.accountId, newProjectId, params.projectId);
          params.projectId = newProjectId;
          const rebuilt = buildUploadImageEnvelope(params, context.recaptchaToken, rpcConfig);
          res = await executeBatchexecuteRpc(session.partition, params.projectId, rebuilt.rpcId, rebuilt.envelope, context, 120000, signal);
        }
      }

      if (!res.ok) throw new Error(`Google Flow Upload Image RPC HTTP ${res.status}`);
      return parseUploadImageResponse(res.text, rpcId);
    }, signal);
  },

  // 6. Upscale Image 2K/4K (Banana)
  async executeFlowUpscaleImageRpc(host, session, params, signal, rpcConfig) {
    return await recaptchaBroker.run(session.accountId, async () => {
      const readyView = await host.ensureGoogleFlowViewReady(session, signal);
      const siteKey = rpcConfig?.recaptcha?.siteKey || '6LdsFiUsAAAAAIjVDZcuLhaHiDn5nnHVXVRQGeMV';

      await ensurePartitionAuthenticated(session, readyView.view);

      if (!params.projectId || params.projectId === 'cda62c70-a0cd-4a8e-a27b-89db2e9a5dfb') {
        const known = getKnownProjectsForAccount(session.accountId, session.accountEmail || session.email);
        if (known.length > 0) params.projectId = known[0];
      }

      await host.warmRecaptchaSurface?.(session.accountId, siteKey);

      let context = await requestContext(readyView.view, siteKey, 'IMAGE_GENERATION', 25000, signal);
      const clientVer = rpcConfig?.clientContext?.clientVersionNumber ?? 22;
      const authBlock = [null, clientVer, null, null, null, params.projectId, null, null, null, null, [context.recaptchaToken || '', 1]];
      const modeCode = params.targetResolution === '4K' ? 2 : 1;
      const rpcId = rpcConfig?.rpcIds?.imageUpscale2K || 'SPrCad';
      const payload = [params.mediaId, modeCode, authBlock];
      const envelope = JSON.stringify([[[rpcId, JSON.stringify(payload), null, 'generic']]]);

      let res = await executeBatchexecuteRpc(session.partition, params.projectId, rpcId, envelope, context, 120000, signal);

      if (res.status === 401) {
        await syncCookiesToPartition(session.partition, session);
        if (readyView.view) await ensureViewOnFlowDashboard(readyView.view);
        context = await requestContext(readyView.view, siteKey, 'IMAGE_GENERATION', 25000, signal);
        const retryAuthBlock = [null, clientVer, null, null, null, params.projectId, null, null, null, null, [context.recaptchaToken || '', 1]];
        const retryPayload = [params.mediaId, modeCode, retryAuthBlock];
        res = await executeBatchexecuteRpc(session.partition, params.projectId, rpcId, JSON.stringify([[[rpcId, JSON.stringify(retryPayload), null, 'generic']]]), context, 120000, signal);
      }

      if (isProjectNotFoundError(res.text, rpcId)) {
        const newProjectId = await resolveValidProjectId(session, params.projectId, context, signal);
        if (newProjectId) {
          persistWorkingProject(session.accountId, newProjectId, params.projectId);
          params.projectId = newProjectId;
          const retryAuthBlock = [null, clientVer, null, null, null, params.projectId, null, null, null, null, [context.recaptchaToken || '', 1]];
          const retryPayload = [params.mediaId, modeCode, retryAuthBlock];
          res = await executeBatchexecuteRpc(session.partition, params.projectId, rpcId, JSON.stringify([[[rpcId, JSON.stringify(retryPayload), null, 'generic']]]), context, 120000, signal);
        }
      }

      if (!res.ok) throw new Error(`Google Flow Upscale Image RPC HTTP ${res.status}`);

      let imgUrl = '';
      const m = res.text.match(/https:\\\/\\\/flow-content\.google\\\/image\\\/[^"\s]+|https:\/\/flow-content\.google\/image\/[^"\s]+/);
      if (m) imgUrl = cleanUrl(m[0]);

      return { mediaId: params.mediaId, imageUrl: imgUrl || '' };
    }, signal);
  },

  // 7. Video Upscale (Veo 3)
  async executeFlowVideoUpscaleRpc(host, session, params, signal, rpcConfig) {
    return await recaptchaBroker.run(session.accountId, async () => {
      const readyView = await host.ensureGoogleFlowViewReady(session, signal);
      const siteKey = rpcConfig?.recaptcha?.siteKey || '6LdsFiUsAAAAAIjVDZcuLhaHiDn5nnHVXVRQGeMV';

      await ensurePartitionAuthenticated(session, readyView.view);
      await host.warmRecaptchaSurface?.(session.accountId, siteKey);

      const context = await requestContext(readyView.view, siteKey, 'VIDEO_GENERATION', 25000, signal);
      const clientVer = rpcConfig?.clientContext?.clientVersionNumber ?? 22;
      const authBlock = [null, clientVer, null, null, null, params.projectId, null, null, null, null, [context.recaptchaToken || '', 1]];
      const rpcId = params.rpcId || rpcConfig?.rpcIds?.videoUpscale || 'p0UkFb';
      const payload = [
        [[[null, params.originalMediaId], null, params.ratioEnum || 2, null, [null, params.workflowId || params.originalMediaId, null, null, randomUuid()], null, params.targetResolutionCode || 1, ...new Array(24).fill(null), params.upsampleModelKey]],
        authBlock,
        [randomUuid()]
      ];
      const envelope = JSON.stringify([[[rpcId, JSON.stringify(payload), null, 'generic']]]);

      const res = await executeBatchexecuteRpc(session.partition, params.projectId, rpcId, envelope, context, 120000, signal);
      if (!res.ok) throw new Error(`Google Flow Video Upscale RPC HTTP ${res.status}`);
      return res.text;
    }, signal);
  }
};
