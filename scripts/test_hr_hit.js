const rawGoogleResponse = ")]}'\n\n500\n[[[\"wrb.fr\",\"as29s\"," + JSON.stringify(JSON.stringify([
  null, null, null, null, null,
  [null, null, null, null, null, null, null, null, null, null, null, 'https://flow-content.google/image/thumb123?Expires=1793444075&KeyName=labs-flow-prod-cdn-key&Signature=sig123', null, null, 1048576],
  null,
  [
    [null, null, null, null, null, null, null, 'cat video', 'https://flow-content.google/video/1a7501d4-ac44-408b-8c1c-70204f549c5d?Expires=1793444075&KeyName=labs-flow-prod-cdn-key&Signature=sig456'],
    null,
    [null, null, [8]]
  ]
])) + ",\"generic\"]]]\n";

function hr(r, e) {
  const t = r.trim().replace(/^\)\]\}'\s*/, '');
  const o = [t, ...t.split('\n')];
  for (const n of o) {
    let i;
    try { i = JSON.parse(n); } catch { continue; }
    if (Array.isArray(i)) {
      for (const a of i) {
        // a could be [["wrb.fr", ...]] or ["wrb.fr", ...]
        if (Array.isArray(a)) {
          if (a[0] === 'wrb.fr' && a[1] === e) return a;
          for (const sub of a) {
            if (Array.isArray(sub) && sub[0] === 'wrb.fr' && sub[1] === e) return sub;
          }
        }
      }
    }
  }
  return null;
}

const hit = hr(rawGoogleResponse, 'as29s');
console.log('HIT:', hit ? hit[1] : 'null');
if (hit && hit[2]) {
  const parsed = JSON.parse(hit[2]);
  console.log('PARSED[7][0][8]:', parsed[7][0][8]);
  console.log('PARSED[5][11]:', parsed[5][11]);
}
