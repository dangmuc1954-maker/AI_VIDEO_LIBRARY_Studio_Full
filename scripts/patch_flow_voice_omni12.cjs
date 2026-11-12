/*
 * Tris duyệt 12/11/2026: thêm model Omni 1.2 Flash + chọn giọng Flow cho video Veo3.
 * CHỈ THÊM, không đổi cách gọi cũ:
 *  - transport: R2V có voices → điền ô thứ 8 [["<giọng>"]] (đã ghi lại từ Flow thật: rpc MZZa6b,
 *    macaron_cookie_r2v_4s, [["charon"]] → Flow chấp nhận). Không có giọng → yêu cầu y như cũ.
 *  - index.js: đọc payload.voice / payload.voices → truyền voices xuống submitVideo (chỉ khi mode R2V).
 *  - index.js: thêm khối model Omni 1.2 Flash (macaron_cookie_<t2v|i2v|r2v>_<dur>[_360p]) vào danh mục code,
 *    đặt SAU Omni 1.1 (không đổi model mặc định); getCatalog gộp model code còn thiếu vào danh mục tải về.
 * Đoạn nào không khớp đúng số lần → dừng, không ghi file nào.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'app', 'out', 'main');
const files = {
  index: path.join(ROOT, 'index.js'),
  transport: path.join(ROOT, 'google_flow_native_transport.cjs'),
};

const edits = {
  transport: [
    {
      name: 'R2V: điền ô giọng (ô thứ 8) khi có voices',
      find: `      [null, null, null, null, u1, u2],
      null, null, null, null, null,
      [resolutionCode]
    ];
  } else {`,
      replace: `      [null, null, null, null, u1, u2],
      null, null, null, null, null,
      [resolutionCode]
    ];
    // Giọng Flow (chỉ R2V): ô thứ 8 = [["charon"]]. Không có giọng → giữ nguyên yêu cầu cũ.
    if (Array.isArray(params.voices) && params.voices.length) {
      modePayload[7] = params.voices.map(v => [String(v).trim().toLowerCase()]).filter(v => v[0]);
    }
  } else {`,
      count: 1,
    },
  ],
  index: [
    {
      name: 'đọc giọng từ payload',
      find: 'u=g.mode,d=$u(g.aspectRatio)',
      replace: 'u=g.mode,__voice=(Array.isArray(e.payload?.voices)?e.payload.voices:[e.payload?.voice]).filter(x=>typeof x=="string"&&x.trim()).map(x=>x.trim().toLowerCase()),d=$u(g.aspectRatio)',
      count: 1,
    },
    {
      name: 'truyền voices vào 3 lần submitVideo (chỉ R2V)',
      find: 'referenceMediaIds:b},t.signal))',
      replace: 'referenceMediaIds:b,voices:u==="R2V"&&__voice.length?__voice:void 0},t.signal))',
      count: 3,
    },
    {
      name: 'khai báo model Omni 1.2 Flash',
      find: 'function jm(){',
      replace: 'function jm12(){const r=["T2V","I2V","R2V"],e={"720p":{"4s":12,"6s":18,"8s":24,"10s":30},"360p":{"4s":6,"6s":9,"8s":12,"10s":15}},t=[];for(const A of r)for(const o of br)for(const n of _a)for(const a of xa){const i=`macaron_cookie_${A==="T2V"?"t2v":A==="R2V"?"r2v":"i2v"}_${n.id}`;t.push(Lc({mode:A,ratioId:o.id,durationId:n.id,resolutionId:a.id,modelKey:a.id==="360p"?`${i}_360p`:i,creditCost:e[a.id][n.id],maxReferenceImages:A==="R2V"?7:void 0,supportsVoice:A==="R2V"}))}return{id:"omni-flash-1.2",name:"Omni 1.2 Flash",status:"active",aliases:["Omni 1.2 Flash","Omni 1.2","macaron_cookie"],sortOrder:11,supportsVoice:!0,defaultMode:"T2V",defaultRatioId:"16:9",defaultDurationId:"8s",defaultResolutionId:"720p",ratios:br.map(A=>({...A})),durations:_a,resolutions:xa,variants:t}}function jm(){',
      count: 1,
    },
    {
      name: 'thêm Omni 1.2 vào danh mục code (sau Omni 1.1)',
      find: 'models:[jm(),',
      replace: 'models:[jm(),jm12(),',
      count: 1,
    },
    {
      name: 'getCatalog: gộp model code còn thiếu vào danh mục tải về',
      find: 'getCatalog(){return this.envelope?.payload.googleFlowVideo||this.bundled}',
      replace: 'getCatalog(){const __r=this.envelope?.payload.googleFlowVideo;if(!__r)return this.bundled;const __ids=new Set((__r.models||[]).map(m=>m.id)),__add=(this.bundled?.models||[]).filter(m=>!__ids.has(m.id));return __add.length?{...__r,models:[...(__r.models||[]),...__add]}:__r}',
      count: 1,
    },
  ],
};

const count = (s, sub) => s.split(sub).length - 1;
const out = {};
for (const [key, list] of Object.entries(edits)) {
  let s = fs.readFileSync(files[key], 'utf8');
  for (const ed of list) {
    if (count(s, ed.replace) > 0 && ed.replace.includes('jm12') && count(s, 'jm12') > 0) {
      console.error(`Đã vá trước đó (${ed.name}) — dừng.`);
      process.exit(1);
    }
    const n = count(s, ed.find);
    if (n !== ed.count) {
      console.error(`KHÔNG KHỚP: [${key}] ${ed.name} — tìm thấy ${n} lần, cần ${ed.count}. Không ghi file nào.`);
      process.exit(1);
    }
    s = s.split(ed.find).join(ed.replace);
    console.log(`  ✓ [${key}] ${ed.name} (${ed.count} chỗ)`);
  }
  out[key] = s;
}
for (const [key, s] of Object.entries(out)) {
  const bak = files[key] + '.bak_before_flow_voice';
  if (!fs.existsSync(bak)) fs.copyFileSync(files[key], bak);
  fs.writeFileSync(files[key], s, 'utf8');
}
console.log('Xong. Bản gốc: *.bak_before_flow_voice');
