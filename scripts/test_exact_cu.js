function hr(r, e) {
  const t = r.trim().replace(/^\)\]\}'\s*/, '');
  const o = [t, ...t.split('\n')];
  for (const n of o) {
    let i;
    try { i = JSON.parse(n); } catch { continue; }
    if (Array.isArray(i)) {
      for (const a of i) {
        if (Array.isArray(a) && a[0] === 'wrb.fr') {
          if (!e || (typeof e === 'string' ? a[1] === e : e.includes(String(a[1])))) {
            return a;
          }
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

function $o(r) {
  if (typeof r !== 'string') return '';
  return r.replace(/\\u003d/g, '=').replace(/\\u0026/g, '&');
}

function Cu(r, mediaId, targetRpc = 'as29s') {
  const o = si(r, targetRpc);
  let n = '', i = '', a, s, A;
  if (Array.isArray(o)) {
    const c = o[5];
    if (Array.isArray(c)) {
      if (typeof c[11] === 'string' && c[11].startsWith('http')) i = $o(c[11]);
      if (typeof c[14] === 'number') s = c[14];
    }
    const d = o[7]?.[0];
    if (Array.isArray(d)) {
      if (typeof d[8] === 'string' && d[8].startsWith('http')) n = $o(d[8]);
      if (typeof d[7] === 'string') A = d[7];
    }
    const l = o[7]?.[1]?.[2];
    if (Array.isArray(l) && typeof l[0] === 'number') a = l[0];
  }
  return { videoUrl: n, thumbnailUrl: i || void 0, durationSeconds: a, sizeBytes: s, title: A, mediaId };
}

// Simulate real Google Flow batchexecute response
const innerJson = JSON.stringify([
  null, null, null, null, null,
  [null, null, null, null, null, null, null, null, null, null, null, 'https://flow-content.google/image/thumb123?Expires=1793444075&KeyName=labs-flow-prod-cdn-key&Signature=sig123', null, null, 1048576],
  null,
  [
    [null, null, null, null, null, null, null, 'cat video', 'https://flow-content.google/video/1a7501d4-ac44-408b-8c1c-70204f549c5d?Expires=1793444075&KeyName=labs-flow-prod-cdn-key&Signature=sig456'],
    null,
    [null, null, [8]]
  ]
]);

const rawGoogleResponse = ")]}'\n\n500\n[[[\"wrb.fr\",\"as29s\"," + JSON.stringify(innerJson) + ",\"generic\"]]]\n";

const parsed = Cu(rawGoogleResponse, '1a7501d4-ac44-408b-8c1c-70204f549c5d');
console.log('SUCCESSFULLY EXTRACTED:');
console.log('videoUrl:', parsed.videoUrl);
console.log('thumbnailUrl:', parsed.thumbnailUrl);
console.log('durationSeconds:', parsed.durationSeconds);
console.log('sizeBytes:', parsed.sizeBytes);
