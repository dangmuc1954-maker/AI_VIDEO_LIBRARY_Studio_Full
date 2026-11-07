const fs = require('fs');

let content = fs.readFileSync('app/out/renderer/assets/index-BS7vgKVV.js', 'utf8');

const t1 = 'VideoFactoryLazy=wn(()=>import("./VideoFactoryStudio.js")),VfComponent=VideoFactoryLazy.Component';
const r1 = 'VideoFactoryLazy=wn(()=>import("./VideoFactoryStudio.js")),VfComponent=VideoFactoryLazy.Component,StoryScriptLazy=wn(()=>import("./StoryScriptStudio.js")),StoryScriptComponent=StoryScriptLazy.Component';

const t2 = '"/studio/upscale":VideoFactoryLazy.preload,"/studio/tts":Lv.preload';
const r2 = '"/studio/upscale":VideoFactoryLazy.preload,"/studio/stt":StoryScriptLazy.preload,"/studio/tts":Lv.preload';

const t3 = '{path:"studio/stt",element:N.jsx(pd,{to:"/dashboard",replace:!0})}';
const r3 = '{path:"studio/stt",element:N.jsx(StoryScriptComponent,{})}';

const t4 = '{label:r("nav.sttStudio"),icon:N.jsx(VT,{size:16}),path:"/studio/stt",disabled:!0}';
const r4 = '{label:"Studio Kịch Bản",icon:N.jsx(s0,{size:16}),path:"/studio/stt"}';

if (!content.includes(t1) || !content.includes(t2) || !content.includes(t3) || !content.includes(t4)) {
  console.error('One or more targets not found in index-BS7vgKVV.js!');
  console.log('has t1:', content.includes(t1));
  console.log('has t2:', content.includes(t2));
  console.log('has t3:', content.includes(t3));
  console.log('has t4:', content.includes(t4));
  process.exit(1);
}

content = content.replace(t1, r1).replace(t2, r2).replace(t3, r3).replace(t4, r4);
fs.writeFileSync('app/out/renderer/assets/index-BS7vgKVV.js', content, 'utf8');
console.log('Successfully patched index-BS7vgKVV.js with StoryScriptStudio route and sidebar!');

