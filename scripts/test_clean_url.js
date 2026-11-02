function cleanUrl(u) {
  if (typeof u !== 'string') return '';
  let res = u.trim();
  // Strip trailing backslashes or quotes
  res = res.replace(/[\\\"']+$/, '');
  // Unescape slashes
  res = res.replace(/\\+\//g, '/');
  // Unescape unicode ampersands and equals
  res = res.replace(/\\+u0026/gi, '&');
  res = res.replace(/\\+u003d/gi, '=');
  res = res.replace(/\\+u002f/gi, '/');
  // Unescape any leftover escaped ampersands or equals
  res = res.replace(/\\+&/g, '&');
  res = res.replace(/\\+=/g, '=');
  res = res.replace(/&amp;/g, '&');
  return res;
}

const raw = 'https:\\/\\/flow-content.google\\/video\\/1a7501d4?Expires=1793444075\\\\u0026KeyName=labs-flow-prod-cdn-key\\\\u0026Signature=def456uvw\\';
console.log('Result:', cleanUrl(raw));

try {
  const parsedUrl = new URL(cleanUrl(raw));
  console.log('URL parsed OK:', parsedUrl.href);
  console.log('Expires:', parsedUrl.searchParams.get('Expires'));
  console.log('KeyName:', parsedUrl.searchParams.get('KeyName'));
  console.log('Signature:', parsedUrl.searchParams.get('Signature'));
} catch (e) {
  console.log('URL parse failed:', e.message);
}
