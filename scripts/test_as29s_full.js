function hr(r, targetRpc) {
  const t = r.trim().replace(/^\)\]\}'\s*/, '');
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

function si(r, e) {
  const hit = hr(r, e);
  if (hit) {
    if (typeof hit[2] !== 'string') return hit[2];
    try {
      return JSON.parse(hit[2]);
    } catch {
      return hit[2];
    }
  }
  return null;
}

function cleanUrl(u) {
  if (typeof u !== 'string') return '';
  return u
    .replace(/\\\//g, '/')
    .replace(/\\u0026/g, '&')
    .replace(/\\u003d/g, '=')
    .replace(/\\u002f/g, '/');
}

function parseMediaResponse(raw, mediaId, targetRpc = 'as29s') {
  const data = si(raw, targetRpc);
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

  if (!videoUrl) {
    const re = /(?:https:\/\/flow-content\.google\/video\/|https:\\\/\\\/flow-content\.google\\\/video\\\/)[^"'\s]+/g;
    const m = raw.match(re);
    if (m && m.length > 0) videoUrl = cleanUrl(m[0]);
  }

  if (!thumbnailUrl) {
    const re = /(?:https:\/\/flow-content\.google\/image\/|https:\\\/\\\/flow-content\.google\\\/image\\\/)[^"'\s]+/g;
    const m = raw.match(re);
    if (m && m.length > 0) thumbnailUrl = cleanUrl(m[0]);
  }

  return {
    videoUrl,
    thumbnailUrl: thumbnailUrl || undefined,
    durationSeconds,
    sizeBytes,
    title,
    mediaId
  };
}

// Test with simulated raw text containing escaped chars
const testPayload = JSON.stringify([
  null, null, null, null, null,
  [null, null, null, null, null, null, null, null, null, null, null, 'https://flow-content.google/image/thumb-test?Expires=123\\u0026KeyName=key\\u0026Signature=sig', null, null, 123456],
  null,
  [
    [null, null, null, null, null, null, null, 'my cat video', 'https://flow-content.google/video/vid-test?Expires=123\\u0026KeyName=key\\u0026Signature=sig'],
    null,
    [null, null, [8]]
  ]
]);

const rawResponse = ")]}'\n\n500\n[[[\"wrb.fr\",\"as29s\"," + JSON.stringify(testPayload) + ",\"generic\"]]]\n";

const res = parseMediaResponse(rawResponse, 'test-id');
console.log('RESULT:', res);
