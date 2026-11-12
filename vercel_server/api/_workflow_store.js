// ============================================================================
// KHO WORKFLOW — bán workflow qua QR SePay (tách riêng, KHÔNG đụng luồng bản quyền)
// - Đăng bán: cần mật khẩu. Ai đăng thì tiền vẫn về tài khoản SePay chung.
// - Mua: tạo đơn WFxxxxxx → QR → SePay báo (webhook hoặc server tự hỏi SePay) → máy đó sở hữu workflow.
// - Quyền sở hữu gắn theo MÃ MÁY (lấy từ token bản quyền do server ký).
// - Dữ liệu lưu trên Vercel Blob riêng tư (không ai tải thẳng được).
// File bắt đầu bằng "_" nên Vercel không coi là 1 API riêng.
// ============================================================================
const crypto = require('crypto');

let blob = null;
try { blob = require('@vercel/blob'); } catch (_) { blob = null; }

const PUBLISH_PASSWORD = process.env.WF_PUBLISH_PASSWORD || '08052026';
const ORDER_TTL_MS = 30 * 60 * 1000;
const MAX_PREVIEW_IMAGES = 6;
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
const ROOT = process.env.WF_BLOB_PREFIX || 'wf'; // đổi khi chạy thử để không lẫn dữ liệu thật

function createWorkflowStore({ KEY_DATA, SETTINGS, WORKFLOWS_DATA, isBannedMachine }) {
  const STATIC = WORKFLOWS_DATA || { groups: [], products: [], definitions: {} };

  // ---------------- tiện ích ----------------
  function send(res, code, data) {
    res.writeHead(code, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store'
    });
    res.end(JSON.stringify(data));
    return true;
  }
  const fail = (res, code, message, extra = {}) => send(res, code, { error: { message, ...extra } });

  function b64urlDecode(s) {
    return Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  }

  // Token bản quyền do chính server ký (EdDSA) → lấy mã máy đáng tin
  function identify(token) {
    if (!token || token.split('.').length !== 3) return null;
    const [h, p, sig] = token.split('.');
    try {
      const ok = crypto.verify(null, Buffer.from(`${h}.${p}`, 'utf8'), KEY_DATA.publicKey, b64urlDecode(sig));
      if (!ok) return null;
      const payload = JSON.parse(b64urlDecode(p).toString('utf8'));
      const machineCode = String(payload.machineCode || '').trim();
      if (!machineCode) return null;
      return { machineCode, licenseId: payload.licenseId || '', exp: payload.exp || 0 };
    } catch (_) {
      return null;
    }
  }

  const safeName = s => String(s).replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 120);

  async function readJson(pathname, fallback) {
    if (!blob) throw new Error('Kho Workflow chưa được cấu hình (thiếu Vercel Blob)');
    try {
      const r = await blob.get(pathname, { access: 'private', useCache: false });
      if (!r || !r.stream) return fallback;
      const txt = await new Response(r.stream).text();
      return JSON.parse(txt);
    } catch (e) {
      if (/not.?found|404/i.test(String(e?.message || e))) return fallback;
      throw e;
    }
  }
  async function writeJson(pathname, data) {
    if (!blob) throw new Error('Kho Workflow chưa được cấu hình (thiếu Vercel Blob)');
    await blob.put(pathname, JSON.stringify(data), {
      access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json'
    });
  }

  const P = {
    catalog: `${ROOT}/catalog.json`,
    def: id => `${ROOT}/defs/${safeName(id)}.json`,
    order: code => `${ROOT}/orders/${safeName(code)}.json`,
    ent: mc => `${ROOT}/ent/${safeName(mc)}.json`,
    thumb: id => `${ROOT}/thumbs/${safeName(id)}`,
    image: (id, n) => `${ROOT}/images/${safeName(id)}/${Number(n) || 0}`
  };

  async function loadCatalog() {
    const c = await readJson(P.catalog, null);
    return c && typeof c === 'object' ? { groups: c.groups || [], products: c.products || [] } : { groups: [], products: [] };
  }
  async function loadEnt(machineCode) {
    const e = await readJson(P.ent(machineCode), null);
    return e && typeof e === 'object' ? { machineCode, items: e.items || [], orders: e.orders || [] } : { machineCode, items: [], orders: [] };
  }

  // Sản phẩm mẫu có sẵn trong workflowsData.json: giữ nguyên như trước (máy nào cũng có)
  const isStatic = id => (STATIC.products || []).some(p => p.id === id);

  function publicProduct(p) {
    const { publisherMachine, videoPath, ...rest } = p;
    return { ...rest, owned: false, installed: false };
  }

  // Video hướng dẫn tải lên từ máy: link xem có hạn (kho riêng tư), dùng lại trong vài giờ
  const VIDEO_LINK_TTL_MS = 12 * 3600 * 1000;
  const videoLinkCache = new Map();
  async function videoLinkOf(pathname) {
    const hit = videoLinkCache.get(pathname);
    if (hit && hit.until - Date.now() > 2 * 3600 * 1000) return hit.url;
    const until = Date.now() + VIDEO_LINK_TTL_MS;
    const tk = await blob.issueSignedToken({ pathname, operations: ['get'], validUntil: until });
    const { presignedUrl } = await blob.presignUrl(tk, { operation: 'get', pathname, validUntil: until, access: 'private' });
    videoLinkCache.set(pathname, { url: presignedUrl, until });
    return presignedUrl;
  }
  // Sản phẩm gửi ra app: video tải lên → đặt vào youtubeVideoId (app tự nhận là link video và phát bằng trình phát thường)
  async function withVideo(prod) {
    const out = publicProduct(prod);
    if (prod.videoPath) {
      try {
        const link = await videoLinkOf(prod.videoPath);
        out.videoUrl = link;
        out.youtubeVideoId = link;
      } catch (e) {
        console.error('[WorkflowStore] link video lỗi', prod.id, e?.message);
      }
    }
    return out;
  }

  function youtubeIdOf(urlOrId) {
    const s = String(urlOrId || '').trim();
    if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
    const m = s.match(/(?:v=|youtu\.be\/|shorts\/|embed\/|live\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : '';
  }

  function parseDataUrl(dataUrl) {
    const m = String(dataUrl || '').match(/^data:([a-z0-9.+/-]+);base64,(.+)$/i);
    if (!m) return null;
    return { mime: m[1].toLowerCase(), buf: Buffer.from(m[2], 'base64') };
  }

  function orderView(o) {
    if (!o) return null;
    let status = o.status;
    if (status === 'pending' && new Date(o.expiresAt).getTime() < Date.now()) status = 'expired';
    return { ...o, status };
  }

  async function grant(machineCode, productId, orderCode) {
    const ent = await loadEnt(machineCode);
    if (!ent.items.some(i => i.productId === productId)) {
      ent.items.push({
        productId,
        entitlementId: `ent-${safeName(machineCode)}-${safeName(productId)}`,
        status: 'active',
        orderCode: orderCode || null,
        grantedAt: new Date().toISOString(),
        installations: []
      });
      await writeJson(P.ent(machineCode), ent);
      if (!isStatic(productId)) {
        try {
          const cat = await loadCatalog();
          const prod = cat.products.find(p => p.id === productId);
          if (prod) { prod.salesCount = (Number(prod.salesCount) || 0) + 1; await writeJson(P.catalog, cat); }
        } catch (_) {}
      }
    }
  }

  // Đánh dấu đơn đã trả + cấp quyền. Trả về đơn sau cập nhật.
  async function markPaid(orderCode, amount, source) {
    const order = await readJson(P.order(orderCode), null);
    if (!order) return null;
    if (order.status === 'paid') return order;
    if (Number(amount) + 0.5 < Number(order.amount)) {
      order.lastPaymentNote = `${source}: nhận ${amount}đ, thiếu so với ${order.amount}đ`;
      await writeJson(P.order(orderCode), order);
      return order;
    }
    order.status = 'paid';
    order.paidAt = new Date().toISOString();
    order.paidAmount = Number(amount) || order.amount;
    order.paymentSource = source;
    await writeJson(P.order(orderCode), order);
    await grant(order.machineCode, order.productId, order.orderCode);
    return order;
  }

  // Hỏi thẳng SePay xem đã có giao dịch chứa mã đơn chưa (dự phòng khi webhook chậm/lỡ)
  async function checkSepay(order) {
    if (!SETTINGS.sepayApiKey) return order;
    try {
      const r = await fetch('https://my.sepay.vn/userapi/transactions/list?limit=50', {
        headers: { Authorization: `Apikey ${SETTINGS.sepayApiKey}`, 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(4000)
      });
      if (!r.ok) return order;
      const data = await r.json();
      const txs = data.transactions || data.data || [];
      const tx = txs.find(t => String(t.transaction_content || t.description || t.content || '').toUpperCase().includes(order.orderCode));
      if (!tx) return order;
      const amt = Number(tx.amount_in || tx.transferAmount || tx.amount || 0);
      return (await markPaid(order.orderCode, amt, 'SePay Live Query')) || order;
    } catch (_) {
      return order;
    }
  }

  async function streamBlob(res, pathname) {
    const r = await blob.get(pathname, { access: 'private' });
    if (!r || !r.stream) return false;
    const buf = Buffer.from(await new Response(r.stream).arrayBuffer());
    res.writeHead(200, {
      'Content-Type': r.blob?.contentType || 'image/png',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600'
    });
    res.end(buf);
    return true;
  }

  // ---------------- webhook SePay: chỉ nhận nội dung có mã WFxxxxxx ----------------
  function looksLikeWebhook(pathname, method, body) {
    if (method !== 'POST' || !body || typeof body !== 'object') return false;
    return /webhook|payment|sepay/i.test(pathname) || body.transferAmount !== undefined || body.amount_in !== undefined || !!body.gateway;
  }
  async function tryWebhook(pathname, method, body, res) {
    if (!looksLikeWebhook(pathname, method, body)) return false;
    const content = String(body.content || body.description || body.transaction_content || body.transfer_content || body.code || body.referenceCode || '').toUpperCase();
    const m = content.match(/WF[-\s]?(\d{6})/);
    if (!m) return false; // không phải đơn workflow → để luồng bản quyền xử lý như cũ
    const orderCode = 'WF' + m[1];
    const amountRaw = body.transferAmount ?? body.amount_in ?? body.amount ?? body.transfer_amount ?? 0;
    const amount = Number(String(amountRaw).replace(/[^0-9.]/g, '')) || 0;
    try {
      const order = await markPaid(orderCode, amount, 'SePay Webhook');
      return send(res, 200, { success: true, type: 'workflow', orderCode, status: order ? orderView(order).status : 'unknown_order' });
    } catch (e) {
      return send(res, 200, { success: true, type: 'workflow', orderCode, warning: e.message });
    }
  }

  // ---------------- định tuyến ----------------
  async function handle(req, res, { pathname, method, body, token }) {
    const isStore = pathname.includes('/workflow-store/') || pathname.endsWith('/workflow-store');
    const isPublisher = pathname.includes('/workflow-publisher');
    if (!isStore && !isPublisher) return tryWebhook(pathname, method, body, res);

    try {
      // Ảnh (không cần đăng nhập)
      let m = pathname.match(/\/workflow-store\/products\/([^/]+)\/thumbnail$/i);
      if (m && method === 'GET') {
        const id = decodeURIComponent(m[1]);
        if (isStatic(id)) return false; // ảnh mẫu: để handler cũ phục vụ
        if (await streamBlob(res, P.thumb(id))) return true;
        return fail(res, 404, 'Không có ảnh thumbnail');
      }
      m = pathname.match(/\/workflow-store\/products\/([^/]+)\/images\/([^/]+)$/i);
      if (m && method === 'GET') {
        const id = decodeURIComponent(m[1]);
        if (isStatic(id)) return false;
        if (await streamBlob(res, P.image(id, m[2]))) return true;
        return fail(res, 404, 'Không có ảnh');
      }

      // Danh mục (không cần đăng nhập)
      if (pathname.endsWith('/workflow-store/catalog') && method === 'GET') {
        const cat = await loadCatalog();
        const groups = [...(STATIC.groups || [])];
        for (const g of cat.groups) if (!groups.some(x => x.id === g.id)) groups.push(g);
        const products = [
          ...(STATIC.products || []).map(publicProduct),
          ...(await Promise.all(cat.products.filter(p => p.status === 'published').map(withVideo)))
        ];
        return send(res, 200, { groups, products, serverTime: new Date().toISOString() });
      }

      // Từ đây cần token bản quyền
      const who = identify(token);
      if (!who) return fail(res, 401, 'Cần kích hoạt bản quyền để dùng Kho Workflow');
      if (isBannedMachine && isBannedMachine(who.machineCode)) return fail(res, 403, 'Thiết bị đã bị khóa');

      if (pathname.endsWith('/workflow-publisher/me') && method === 'GET') {
        return send(res, 200, { publisher: { enabled: true, role: 'owner', displayName: 'AI VIDEO LIBRARY' } });
      }

      if (pathname.endsWith('/workflow-store/me') && method === 'GET') {
        const ent = await loadEnt(who.machineCode);
        const entitlements = [
          ...(STATIC.products || []).map(p => {
            const own = ent.items.find(i => i.productId === p.id);
            return { productId: p.id, entitlementId: `ent-${p.id}`, status: 'active', installations: own?.installations || [] };
          }),
          ...ent.items.filter(i => !isStatic(i.productId)).map(i => ({
            productId: i.productId, entitlementId: i.entitlementId, status: i.status, installations: i.installations || []
          }))
        ];
        return send(res, 200, { entitlements, publisher: { enabled: true, role: 'owner', displayName: 'AI VIDEO LIBRARY' } });
      }

      if (pathname.endsWith('/workflow-store/orders') && method === 'GET') {
        const ent = await loadEnt(who.machineCode);
        const orders = [];
        for (const code of ent.orders.slice(-30)) {
          const o = await readJson(P.order(code), null);
          if (o) orders.push(orderView(o));
        }
        return send(res, 200, { orders });
      }

      // Tạo đơn mua
      m = pathname.match(/\/workflow-store\/products\/([^/]+)\/orders$/i);
      if (m && method === 'POST') {
        const id = decodeURIComponent(m[1]);
        if (isStatic(id)) return fail(res, 409, 'Workflow này đã có sẵn trong máy của bạn');
        const cat = await loadCatalog();
        const prod = cat.products.find(p => p.id === id && p.status === 'published');
        if (!prod) return fail(res, 404, 'Không tìm thấy workflow');
        if (prod.pricingType !== 'paid' || !(Number(prod.priceVnd) > 0)) return fail(res, 400, 'Workflow miễn phí — bấm Nhận miễn phí');
        const ent = await loadEnt(who.machineCode);
        if (ent.items.some(i => i.productId === id && i.status === 'active')) return fail(res, 409, 'Máy này đã sở hữu workflow này');

        let orderCode = '';
        for (let k = 0; k < 5; k++) {
          const c = 'WF' + Math.floor(100000 + Math.random() * 900000);
          if (!(await readJson(P.order(c), null))) { orderCode = c; break; }
        }
        if (!orderCode) return fail(res, 500, 'Không tạo được mã đơn, thử lại');
        const amount = Number(prod.priceVnd);
        const qrImageUrl = `https://img.vietqr.io/image/${SETTINGS.bankName}-${SETTINGS.bankAccount}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(orderCode)}&accountName=${encodeURIComponent(SETTINGS.paymentReceiver)}`;
        const order = {
          orderCode,
          productId: id,
          productName: prod.name,
          amount,
          currency: 'VND',
          transferContent: orderCode,
          qrImageUrl,
          bankName: SETTINGS.bankName,
          accountNo: SETTINGS.bankAccount,
          accountName: SETTINGS.paymentReceiver,
          machineCode: who.machineCode,
          licenseId: who.licenseId,
          status: 'pending',
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + ORDER_TTL_MS).toISOString(),
          paidAt: null
        };
        await writeJson(P.order(orderCode), order);
        ent.orders.push(orderCode);
        await writeJson(P.ent(who.machineCode), ent);
        return send(res, 200, orderView(order));
      }

      // Kiểm tra / hủy đơn
      m = pathname.match(/\/workflow-store\/orders\/([^/]+)\/(status|cancel)$/i);
      if (m && method === 'POST') {
        const code = decodeURIComponent(m[1]).toUpperCase();
        let order = await readJson(P.order(code), null);
        if (!order || order.machineCode !== who.machineCode) return fail(res, 404, 'Không tìm thấy đơn hàng');
        if (m[2].toLowerCase() === 'cancel') {
          if (order.status === 'pending') { order.status = 'canceled'; await writeJson(P.order(code), order); }
          return send(res, 200, orderView(order));
        }
        if (order.status === 'pending') order = await checkSepay(order);
        return send(res, 200, orderView(order));
      }

      // Nhận workflow miễn phí
      m = pathname.match(/\/workflow-store\/products\/([^/]+)\/claim-free$/i);
      if (m && method === 'POST') {
        const id = decodeURIComponent(m[1]);
        if (isStatic(id)) return send(res, 200, { success: true, productId: id });
        const cat = await loadCatalog();
        const prod = cat.products.find(p => p.id === id && p.status === 'published');
        if (!prod) return fail(res, 404, 'Không tìm thấy workflow');
        if (prod.pricingType === 'paid' && Number(prod.priceVnd) > 0) return fail(res, 402, 'Workflow này cần thanh toán');
        await grant(who.machineCode, id, null);
        return send(res, 200, { success: true, productId: id });
      }

      // Tải workflow để cài — CHỈ khi máy đã sở hữu
      m = pathname.match(/\/workflow-store\/products\/([^/]+)\/download$/i);
      if (m && method === 'GET') {
        const id = decodeURIComponent(m[1]);
        if (isStatic(id)) {
          const prod = STATIC.products.find(p => p.id === id);
          const def = STATIC.definitions?.[id] || { name: prod.name, description: prod.summary || '', nodes: [], connections: [] };
          return send(res, 200, { product: publicProduct(prod), definition: def, entitlementId: `ent-${id}`, versionId: `ver-${id}-1.0.0`, version: prod.currentVersion || '1.0.0' });
        }
        const cat = await loadCatalog();
        const prod = cat.products.find(p => p.id === id);
        if (!prod) return fail(res, 404, 'Không tìm thấy workflow');
        const ent = await loadEnt(who.machineCode);
        const own = ent.items.find(i => i.productId === id && i.status === 'active');
        const isOwnerPublisher = prod.publisherMachine === who.machineCode;
        if (!own && !isOwnerPublisher) return fail(res, 402, 'Bạn chưa mua workflow này');
        const def = await readJson(P.def(id), null);
        if (!def) return fail(res, 404, 'Thiếu nội dung workflow trên kho');
        return send(res, 200, {
          product: publicProduct(prod),
          definition: def,
          entitlementId: own?.entitlementId || `ent-${safeName(who.machineCode)}-${safeName(id)}`,
          versionId: `ver-${id}-${prod.currentVersion || '1.0.0'}`,
          version: prod.currentVersion || '1.0.0'
        });
      }

      // Ghi nhận đã cài
      if (pathname.endsWith('/workflow-store/installations') && method === 'POST') {
        const entId = String(body?.entitlementId || '');
        const ent = await loadEnt(who.machineCode);
        let item = ent.items.find(i => i.entitlementId === entId);
        if (!item) {
          const staticId = entId.replace(/^ent-/, '');
          if (isStatic(staticId)) {
            item = { productId: staticId, entitlementId: entId, status: 'active', grantedAt: new Date().toISOString(), installations: [] };
            ent.items.push(item);
          }
        }
        if (item) {
          item.installations = (item.installations || []).filter(x => x.localWorkflowId !== body.localWorkflowId);
          item.installations.push({ localWorkflowId: body.localWorkflowId, versionId: body.versionId, status: body.status || 'installed', at: new Date().toISOString() });
          await writeJson(P.ent(who.machineCode), ent);
        }
        return send(res, 200, { status: 'installed' });
      }

      // ---------- NGƯỜI BÁN ----------
      if (pathname.endsWith('/workflow-publisher/groups') && method === 'POST') {
        const name = String(body?.name || '').trim();
        if (!name) return fail(res, 400, 'Thiếu tên nhóm');
        const cat = await loadCatalog();
        const slug = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        let group = cat.groups.find(g => g.slug === slug);
        if (!group) {
          group = { id: `grp-${slug || Date.now()}`, name, slug, description: '', sortOrder: 100 + cat.groups.length };
          cat.groups.push(group);
          await writeJson(P.catalog, cat);
        }
        return send(res, 200, { group });
      }

      if (pathname.endsWith('/workflow-publisher/products') && method === 'GET') {
        const cat = await loadCatalog();
        return send(res, 200, { products: await Promise.all(cat.products.filter(p => p.publisherMachine === who.machineCode).map(withVideo)) });
      }

      if (pathname.endsWith('/workflow-publisher/products') && method === 'POST') {
        if (String(body?.publishPassword || '') !== PUBLISH_PASSWORD) return fail(res, 403, 'Sai mật khẩu đăng bán');

        // Bước 1 (khi có video): cấp link tải video thẳng lên kho, chưa tạo sản phẩm
        if (body?._wfUpload) {
          const ct = String(body._wfUpload.contentType || '').toLowerCase();
          const size = Number(body._wfUpload.size) || 0;
          if (!/^video\/(mp4|webm|quicktime)$/.test(ct)) return fail(res, 400, 'Chỉ nhận video MP4, WEBM hoặc MOV');
          if (!(size > 0) || size > MAX_VIDEO_BYTES) return fail(res, 400, 'Video phải nhỏ hơn 200MB');
          const ext = ct.endsWith('webm') ? 'webm' : ct.endsWith('quicktime') ? 'mov' : 'mp4';
          const videoPath = `${ROOT}/media/${Date.now().toString(36)}${crypto.randomBytes(4).toString('hex')}/guide.${ext}`;
          const until = Date.now() + 30 * 60 * 1000;
          const tk = await blob.issueSignedToken({ pathname: videoPath, operations: ['put'], validUntil: until, allowedContentTypes: [ct], maximumSizeInBytes: MAX_VIDEO_BYTES });
          const { presignedUrl } = await blob.presignUrl(tk, {
            operation: 'put', pathname: videoPath, validUntil: until, access: 'private',
            allowOverwrite: true, addRandomSuffix: false, allowedContentTypes: [ct], maximumSizeInBytes: MAX_VIDEO_BYTES
          });
          return send(res, 200, { uploadUrl: presignedUrl, videoPath, status: 'upload_ready' });
        }

        const def = body?.definition;
        if (!def || !Array.isArray(def.nodes) || !Array.isArray(def.connections)) return fail(res, 400, 'Workflow không hợp lệ');
        const name = String(body.name || def.name || '').trim();
        if (!name) return fail(res, 400, 'Thiếu tên workflow');
        const pricingType = body.pricingType === 'paid' ? 'paid' : 'free';
        const priceVnd = pricingType === 'paid' ? Math.round(Number(body.priceVnd) || 0) : 0;
        if (pricingType === 'paid' && priceVnd < 1000) return fail(res, 400, 'Giá bán phải từ 1.000đ');
        const originalPriceVnd = Math.round(Number(body.originalPriceVnd) || 0);

        // Video đã tải lên ở bước 1: phải đúng thư mục kho và có thật
        let videoPath = '';
        if (body.videoPath) {
          videoPath = String(body.videoPath);
          if (!videoPath.startsWith(`${ROOT}/media/`) || videoPath.includes('..')) return fail(res, 400, 'Đường dẫn video không hợp lệ');
          try { await blob.head(videoPath); } catch (_) { return fail(res, 400, 'Video chưa tải lên xong, thử đăng lại'); }
          if (!parseDataUrl(body.thumbnailBase64)) return fail(res, 400, 'Có video thì cần chọn ảnh thumbnail');
        }

        const id = 'wf_' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
        const now = new Date().toISOString();
        let thumbnailUrl = '';
        const thumb = parseDataUrl(body.thumbnailBase64);
        if (thumb) {
          await blob.put(P.thumb(id), thumb.buf, { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: thumb.mime });
          thumbnailUrl = `/v1/workflow-store/products/${id}/thumbnail?v=${Date.now()}`;
        }
        const previewImages = [];
        const imgs = Array.isArray(body.previewImages) ? body.previewImages.slice(0, MAX_PREVIEW_IMAGES) : [];
        for (let n = 0; n < imgs.length; n++) {
          const img = parseDataUrl(typeof imgs[n] === 'string' ? imgs[n] : imgs[n]?.dataUrl || imgs[n]?.base64);
          if (!img) continue;
          await blob.put(P.image(id, n), img.buf, { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: img.mime });
          previewImages.push(`/v1/workflow-store/products/${id}/images/${n}`);
        }

        await writeJson(P.def(id), { ...def, name });

        const product = {
          id,
          slug: id,
          name,
          summary: String(body.summary || '').slice(0, 500),
          description: String(body.description || body.summary || '').slice(0, 5000),
          pricingType,
          priceVnd,
          currency: 'VND',
          originalPriceVnd: originalPriceVnd > priceVnd ? originalPriceVnd : undefined,
          discountPercent: originalPriceVnd > priceVnd && priceVnd > 0 ? Math.round((1 - priceVnd / originalPriceVnd) * 100) : undefined,
          youtubeVideoId: videoPath ? '' : youtubeIdOf(body.youtubeUrl || body.youtubeVideoId),
          videoPath: videoPath || undefined,
          thumbnailUrl,
          previewImages,
          aspectRatio: body.aspectRatio === '9:16' ? '9:16' : '16:9',
          salesCount: 0,
          tags: Array.isArray(body.tags) && body.tags.length ? body.tags.slice(0, 8) : ['Premium'],
          requiredProviders: [],
          status: 'published',
          currentVersion: String(body.version || '1.0.0'),
          changelog: String(body.changelog || ''),
          publisherName: 'AI VIDEO LIBRARY',
          groupId: body.groupId || undefined,
          publisherMachine: who.machineCode,
          createdAt: now,
          updatedAt: now
        };
        const cat = await loadCatalog();
        cat.products.push(product);
        await writeJson(P.catalog, cat);
        const shown = await withVideo(product);
        return send(res, 200, { ...shown, product: shown, status: 'published', strippedLocalAssets: 0 });
      }

      m = pathname.match(/\/workflow-publisher\/products\/([^/]+)(\/archive)?$/i);
      if (m && (method === 'PATCH' || method === 'POST' || method === 'DELETE')) {
        const id = decodeURIComponent(m[1]);
        const cat = await loadCatalog();
        const prod = cat.products.find(p => p.id === id);
        if (!prod) return fail(res, 404, 'Không tìm thấy workflow');
        if (prod.publisherMachine !== who.machineCode) return fail(res, 403, 'Chỉ máy đã đăng mới được sửa workflow này');
        if (method === 'DELETE' || m[2]) {
          prod.status = 'archived';
        } else {
          for (const k of ['name', 'summary', 'description', 'groupId', 'aspectRatio', 'changelog']) if (body?.[k] !== undefined) prod[k] = body[k];
          if (Array.isArray(body?.tags)) prod.tags = body.tags.slice(0, 8);
          if (body?.youtubeUrl !== undefined) prod.youtubeVideoId = youtubeIdOf(body.youtubeUrl);
          if (body?.pricingType) prod.pricingType = body.pricingType === 'paid' ? 'paid' : 'free';
          if (body?.priceVnd !== undefined) prod.priceVnd = Math.round(Number(body.priceVnd) || 0);
          if (body?.originalPriceVnd !== undefined) {
            const op = Math.round(Number(body.originalPriceVnd) || 0);
            prod.originalPriceVnd = op > prod.priceVnd ? op : undefined;
            prod.discountPercent = op > prod.priceVnd && prod.priceVnd > 0 ? Math.round((1 - prod.priceVnd / op) * 100) : undefined;
          }
          const thumb = parseDataUrl(body?.thumbnailBase64);
          if (thumb) {
            await blob.put(P.thumb(id), thumb.buf, { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: thumb.mime });
            prod.thumbnailUrl = `/v1/workflow-store/products/${id}/thumbnail?v=${Date.now()}`;
          }
        }
        prod.updatedAt = new Date().toISOString();
        await writeJson(P.catalog, cat);
        const shown = await withVideo(prod);
        return send(res, 200, { ...shown, product: shown });
      }

      return false; // đường khác của kho: để handler cũ xử lý
    } catch (e) {
      console.error('[WorkflowStore]', e);
      return fail(res, 500, 'Lỗi Kho Workflow: ' + (e?.message || e));
    }
  }

  return { handle, tryWebhook, _identify: identify };
}

module.exports = { createWorkflowStore };
