const rawSnippet = ')]}\'\n\n123\n[[["wrb.fr","as29s","[null,null,null,null,null,[null,null,null,null,null,null,null,null,null,null,null,\\"https://flow-content.google/image/thumb123?Expires=123\\\\u0026KeyName=k1\\\\u0026Signature=s1\\",null,null,12345],null,[[null,null,null,null,null,null,null,\\"title\\",\\"https://flow-content.google/video/vid123?Expires=123\\\\u0026KeyName=k1\\\\u0026Signature=s1\\"],null,[8]]]"]]]';

// Parse si
function si(raw, targetRpc) {
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
      }
    } catch {}
  }
  return null;
}

const data = si(rawSnippet, 'as29s');
console.log('Parsed data:', data);
console.log('Video URL from data[7][0][8]:', data[7][0][8]);
console.log('Thumb URL from data[5][11]:', data[5][11]);
