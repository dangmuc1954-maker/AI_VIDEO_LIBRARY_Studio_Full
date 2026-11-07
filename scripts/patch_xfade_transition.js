const fs = require('fs');

// 1. Patch app/out/main/index.js
let mainContent = fs.readFileSync('app/out/main/index.js', 'utf8');
const p1_old = 'xfade=transition=${t}:duration=${Y.toFixed(3)}:offset=${Q.toFixed(3)}';
const p1_new = 'xfade=transition=${(t==="dissolve"||t==="crossfade")?"fade":t}:duration=${Y.toFixed(3)}:offset=${Q.toFixed(3)}';

const p2_old = 'xfade=transition=${t}:duration=${z.toFixed(3)}:offset=${H.toFixed(3)}';
const p2_new = 'xfade=transition=${(t==="dissolve"||t==="crossfade")?"fade":t}:duration=${z.toFixed(3)}:offset=${H.toFixed(3)}';

if (mainContent.includes(p1_new) && mainContent.includes(p2_new)) {
  console.log('app/out/main/index.js is already patched.');
} else if (mainContent.includes(p1_old) && mainContent.includes(p2_old)) {
  mainContent = mainContent.replace(p1_old, p1_new).replace(p2_old, p2_new);
  fs.writeFileSync('app/out/main/index.js', mainContent, 'utf8');
  console.log('Successfully patched app/out/main/index.js');
} else {
  console.error('Target strings not found in app/out/main/index.js!');
  process.exit(1);
}

// 2. Patch app/out/renderer/assets/aiforge_video_editor_automerge.js
let editorContent = fs.readFileSync('app/out/renderer/assets/aiforge_video_editor_automerge.js', 'utf8');
const e1_old = 'res = await assetsApi.editAndMergeVideos(payloadClips, activeTransition, {';
const e1_new = 'res = await assetsApi.editAndMergeVideos(payloadClips, activeTransition === "dissolve" ? "fade" : activeTransition, {';
const e2_old = 'res = await assetsApi.mergeVideos(assetIds, activeTransition, {';
const e2_new = 'res = await assetsApi.mergeVideos(assetIds, activeTransition === "dissolve" ? "fade" : activeTransition, {';

if (editorContent.includes(e1_new) && editorContent.includes(e2_new)) {
  console.log('aiforge_video_editor_automerge.js is already patched.');
} else if (editorContent.includes(e1_old) && editorContent.includes(e2_old)) {
  editorContent = editorContent.replace(e1_old, e1_new).replace(e2_old, e2_new);
  fs.writeFileSync('app/out/renderer/assets/aiforge_video_editor_automerge.js', editorContent, 'utf8');
  console.log('Successfully patched aiforge_video_editor_automerge.js');
} else {
  console.warn('Strings not found in aiforge_video_editor_automerge.js');
}

// 3. Patch app/out/renderer/assets/VideoStudio-frcr8V6s.js
let studioContent = fs.readFileSync('app/out/renderer/assets/VideoStudio-frcr8V6s.js', 'utf8');
const s1_old = 'editAndMergeVideos(c,le,{name:a';
const s1_new = 'editAndMergeVideos(c,le==="dissolve"?"fade":le,{name:a';
const s2_old = 'mergeVideos(c,le,{name:a';
const s2_new = 'mergeVideos(c,le==="dissolve"?"fade":le,{name:a';

if (studioContent.includes(s1_new) && studioContent.includes(s2_new)) {
  console.log('VideoStudio-frcr8V6s.js is already patched.');
} else if (studioContent.includes(s1_old) && studioContent.includes(s2_old)) {
  studioContent = studioContent.replace(s1_old, s1_new).replace(s2_old, s2_new);
  fs.writeFileSync('app/out/renderer/assets/VideoStudio-frcr8V6s.js', studioContent, 'utf8');
  console.log('Successfully patched VideoStudio-frcr8V6s.js');
} else {
  console.warn('Strings not found in VideoStudio-frcr8V6s.js');
}
