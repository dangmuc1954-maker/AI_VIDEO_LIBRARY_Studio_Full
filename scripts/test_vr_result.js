// Simulate vr
const br = [{id:"16:9"},{id:"9:16"}];
const _a = [4,6,8,10].map(r=>({id:`${r}s`}));
const Um = [{id:"8s"}];
const xa = [{id:"360p"},{id:"720p"}];
const Nm = [{id:"720p"}];

function Lc(r){return r;}
function JA(r){
  const e=[];
  for(const[t,A]of Object.entries(r.keys))
    for(const o of br)
      e.push({mode:t,ratioId:o.id,durationId:"8s",resolutionId:"720p",modelKey:A[o.id]});
  return{id:r.id,name:r.name,variants:e};
}

const veoFast = JA({
  id:"veo-3.1-fast",
  name:"Veo 3.1 - Fast",
  keys:{
    T2V:{"16:9":"veo_3_1_t2v_fast","9:16":"veo_3_1_t2v_fast_portrait"},
    I2V:{"16:9":"veo_3_1_i2v_s_fast","9:16":"veo_3_1_i2v_s_fast_portrait"},
    Frames:{"16:9":"veo_3_1_i2v_s_fast_fl","9:16":"veo_3_1_i2v_s_fast_portrait_fl"},
    R2V:{"16:9":"veo_3_1_r2v_fast_landscape","9:16":"veo_3_1_r2v_fast_portrait"}
  }
});

const variant = veoFast.variants.find(d => d.mode === 'R2V' && d.ratioId === '16:9' && d.durationId === '8s' && d.resolutionId === '720p');
console.log('Resolved variant for R2V 16:9:\n', variant);
