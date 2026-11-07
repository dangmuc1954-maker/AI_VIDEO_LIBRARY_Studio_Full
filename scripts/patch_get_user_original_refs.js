const fs = require('fs');
const file = 'app/out/renderer/assets/VideoStudio-frcr8V6s.js';
let content = fs.readFileSync(file, 'utf8');

const target = 'function getUserOriginalRefs(p){if(!p)return[];const assets=(typeof qe!=="undefined"&&qe.getState?qe.getState().assets:[])||[];if(Array.isArray(p.userReferenceAssetIds)&&p.userReferenceAssetIds.length>0){const validUser=p.userReferenceAssetIds.filter(id=>{const a=assets.find(x=>x.id===id);if(!a||!a.name)return (typeof id==="string"&&!id.toLowerCase().includes("lastframe")&&!id.toLowerCase().includes("last_frame"));const n=a.name.toLowerCase();return !n.startsWith("lastframe_")&&!n.startsWith("last_frame_")});if(validUser.length>0)return validUser}const cur=Array.isArray(p.referenceAssetIds)?p.referenceAssetIds:[];return cur.filter(id=>{const a=assets.find(x=>x.id===id);if(!a||!a.name)return (typeof id==="string"&&!id.toLowerCase().includes("lastframe")&&!id.toLowerCase().includes("last_frame"));const n=a.name.toLowerCase();return !n.startsWith("lastframe_")&&!n.startsWith("last_frame_")})};';

const replacement = 'function getUserOriginalRefs(p){if(!p)return[];const assets=(typeof qe!=="undefined"&&qe.getState?qe.getState().assets:[])||[];const rawList=(Array.isArray(p.userReferenceAssetIds)&&p.userReferenceAssetIds.length>0)?p.userReferenceAssetIds:(Array.isArray(p.referenceAssetIds)?p.referenceAssetIds:[]);if(!rawList.length)return[];return rawList.filter(item=>{const id=typeof item==="object"&&item!==null?(item.id||item.assetId||""):String(item||"");if(!id)return false;const a=assets.find(x=>x.id===id);const n=(a&&a.name?a.name:id).toLowerCase();return !n.includes("lastframe")&&!n.includes("last_frame");});};';

if (!content.includes(target)) {
  console.error('Target getUserOriginalRefs not found!');
  process.exit(1);
}

content = content.replace(target, replacement);
fs.writeFileSync(file, content, 'utf8');
console.log('Successfully updated getUserOriginalRefs in VideoStudio-frcr8V6s.js');

