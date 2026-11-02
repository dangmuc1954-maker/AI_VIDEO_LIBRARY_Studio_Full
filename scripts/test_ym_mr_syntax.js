const vm = require('vm');

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

const generatedScript = `(async () => {
  const ym = ${Ym()};
  const mrFunc = ${mr()};
  return 'ok';
})()`;

// Test syntax
try {
  new vm.Script(generatedScript);
  console.log('SYNTAX IS 100% VALID!');
} catch (e) {
  console.error('SYNTAX ERROR:', e);
}
