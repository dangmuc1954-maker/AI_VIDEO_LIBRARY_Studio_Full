const sample = ')]}\'\n[["wrb.fr","as29s","[null,null,null,null,null,[null,null,null,null,null,null,null,null,null,null,null,\\"https:\\/\\/flow-content.google\\/image\\/1a7501d4?Expires=1793444075\\\\u0026KeyName=labs-flow-prod-cdn-key\\\\u0026Signature=abc123xyz\\",null,null,12345],null,[[null,null,null,null,null,null,null,\\"My Video\\",\\"https:\\/\\/flow-content.google\\/video\\/1a7501d4?Expires=1793444075\\\\u0026KeyName=labs-flow-prod-cdn-key\\\\u0026Signature=def456uvw\\"],null,[null,null,[10]]]]",null,null,null,"generic"]]';

function hr(raw, rpcId) {
  const trimmed = raw.trim().replace(/^\)\]\}'\s*/, '');
  const lines = [trimmed, ...trimmed.split('\n')];
  for (const line of lines) {
    let parsed;
    try {
      parsed = JSON.parse(line);
    } catch {
      continue;
    }
    const stack = [parsed];
    while (stack.length > 0) {
      const cur = stack.pop();
      if (!Array.isArray(cur)) continue;
      if (cur[0] === 'wrb.fr') {
        if (!rpcId || (typeof rpcId === 'string' ? cur[1] === rpcId : rpcId.includes(String(cur[1])))) {
          return cur;
        }
      }
      for (let i = cur.length - 1; i >= 0; i--) {
        if (Array.isArray(cur[i])) stack.push(cur[i]);
      }
    }
  }
  return null;
}

function si(raw, rpcId) {
  const item = hr(raw, rpcId);
  if (item && item[2]) {
    if (typeof item[2] !== 'string') return item[2];
    try {
      return JSON.parse(item[2]);
    } catch {
      return item[2];
    }
  }
  return null;
}

const parsed = si(sample, 'as29s');
console.log('si parsed:', !!parsed, Array.isArray(parsed));
if (Array.isArray(parsed)) {
  console.log('c[11] image:', parsed[5]?.[11]);
  console.log('d[8] video:', parsed[7]?.[0]?.[8]);
}
