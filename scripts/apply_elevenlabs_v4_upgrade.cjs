const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('======================================================================');
console.log('🚀 UPGRADE ELEVENLABS TO V4 & FIX HCAPTCHA DOMAIN ORIGIN VERIFICATION 🚀');
console.log('======================================================================');

const appOutDir = path.join(__dirname, '../app/out');

// 1. Patch app/out/main/index.js
const mainPath = path.join(appOutDir, 'main/index.js');
if (fs.existsSync(mainPath)) {
  console.log('[1/5] Patching app/out/main/index.js...');
  let code = fs.readFileSync(mainPath, 'utf8');

  // Fix captcha domain
  const oldIp = 'ip="https://example.com"';
  const newIp = 'ip="https://elevenlabs.io"';
  if (code.includes(oldIp)) {
    code = code.replace(oldIp, newIp);
    console.log('  ✓ Fixed hCaptcha origin domain: https://example.com -> https://elevenlabs.io');
  } else if (code.includes(newIp)) {
    console.log('  ✓ hCaptcha origin domain is already https://elevenlabs.io');
  } else {
    console.warn('  ⚠️ oldIp pattern not found in main/index.js');
  }

  // Upgrade default model from eleven_v3 to eleven_v4
  const oldDefaultModel = 'up="eleven_v3"';
  const newDefaultModel = 'up="eleven_v4"';
  if (code.includes(oldDefaultModel)) {
    code = code.replace(oldDefaultModel, newDefaultModel);
    console.log('  ✓ Upgraded default TTS model: eleven_v3 -> eleven_v4');
  } else if (code.includes(newDefaultModel)) {
    console.log('  ✓ Default TTS model is already eleven_v4');
  }

  fs.writeFileSync(mainPath, code, 'utf8');
}

// 2. Patch WaveSurferPlayer (TTS Studio)
const wavesurferPath = path.join(appOutDir, 'renderer/assets/WaveSurferPlayer-Tk3eqMz7.js');
if (fs.existsSync(wavesurferPath)) {
  console.log('[2/5] Patching WaveSurferPlayer-Tk3eqMz7.js (TTS Studio)...');
  let code = fs.readFileSync(wavesurferPath, 'utf8');

  // Update default selected model
  code = code.replace('ee="eleven_v3"', 'ee="eleven_v4"');

  // Update models list
  const oldModels = 'Oe=["eleven_v3","eleven_multilingual_v2","eleven_turbo_v2_5"]';
  const newModels = 'Oe=["eleven_v4","eleven_v4_turbo","eleven_v3","eleven_multilingual_v2","eleven_turbo_v2_5"]';
  if (code.includes(oldModels)) {
    code = code.replace(oldModels, newModels);
    console.log('  ✓ Added eleven_v4 and eleven_v4_turbo to TTS Studio model selector');
  }

  fs.writeFileSync(wavesurferPath, code, 'utf8');
}

// 3. Patch WorkflowEditor (Workflow Studio)
const wfEditorPath = path.join(appOutDir, 'renderer/assets/WorkflowEditor-LHGC9K3C.js');
if (fs.existsSync(wfEditorPath)) {
  console.log('[3/5] Patching WorkflowEditor-LHGC9K3C.js (Workflow Studio)...');
  let code = fs.readFileSync(wfEditorPath, 'utf8');

  // Update model array
  code = code.replaceAll(
    '["eleven_v3","eleven_multilingual_v2","eleven_turbo_v2_5"]',
    '["eleven_v4","eleven_v4_turbo","eleven_v3","eleven_multilingual_v2","eleven_turbo_v2_5"]'
  );

  // Update default model fallbacks
  code = code.replaceAll('e.config?.modelId||"eleven_v3"', 'e.config?.modelId||"eleven_v4"');
  code = code.replaceAll('r.modelId||"eleven_v3"', 'r.modelId||"eleven_v4"');

  fs.writeFileSync(wfEditorPath, code, 'utf8');
  console.log('  ✓ Upgraded Workflow Studio node editor to eleven_v4');
}

// 4. Patch VideoFactoryStudio (Xưởng phim)
const vfsPath = path.join(appOutDir, 'renderer/assets/VideoFactoryStudio.js');
if (fs.existsSync(vfsPath)) {
  console.log('[4/5] Patching VideoFactoryStudio.js...');
  let code = fs.readFileSync(vfsPath, 'utf8');

  code = code.replaceAll('modelId: "eleven_multilingual_v2"', 'modelId: "eleven_v4"');
  fs.writeFileSync(vfsPath, code, 'utf8');
  console.log('  ✓ Upgraded VideoFactoryStudio voiceover modelId to eleven_v4');
}

// 5. Patch index & useWorkflowRunner
const idxPath = path.join(appOutDir, 'renderer/assets/index-BS7vgKVV.js');
if (fs.existsSync(idxPath)) {
  let code = fs.readFileSync(idxPath, 'utf8');
  code = code.replace('modelId:"eleven_v3"', 'modelId:"eleven_v4"');
  fs.writeFileSync(idxPath, code, 'utf8');
}

const wfRunnerPath = path.join(appOutDir, 'renderer/assets/useWorkflowRunner-DGw6Ekx4.js');
if (fs.existsSync(wfRunnerPath)) {
  let code = fs.readFileSync(wfRunnerPath, 'utf8');
  code = code.replace('e.config?.modelId=="string"?e.config.modelId:"eleven_v3"', 'e.config?.modelId=="string"?e.config.modelId:"eleven_v4"');
  fs.writeFileSync(wfRunnerPath, code, 'utf8');
}

console.log('[5/5] Checking JavaScript syntax...');
const filesToCheck = [
  mainPath,
  wavesurferPath,
  wfEditorPath,
  vfsPath,
  idxPath,
  wfRunnerPath
];

for (const f of filesToCheck) {
  if (fs.existsSync(f)) {
    try {
      execSync(`node --check "${f}"`, { stdio: 'pipe' });
      console.log('  ✅ Syntax VALID:', path.basename(f));
    } catch(err) {
      console.error('  ❌ Syntax ERROR in', f, err.message);
      process.exit(1);
    }
  }
}

console.log('\n✨ ELEVENLABS V4 UPGRADE & CAPTCHA FIX SUCCESSFULLY APPLIED! ✨\n');
