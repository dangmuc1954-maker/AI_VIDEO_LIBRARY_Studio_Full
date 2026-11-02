const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../app/out/main/index.js');
let content = fs.readFileSync(filePath, 'utf8');

// Tìm setupSessionInterceptors
const target = 'if(o.webContentsId!==t.id)return n({});if(this.attachedAccountId===e.accountId)return n({});';
const replacement = `if(o.webContentsId!==t.id)return n({});
try{
  if(o.url&&o.url.includes('batchexecute')){
    let postData='';
    if(o.uploadData&&o.uploadData.length>0){
      for(const ud of o.uploadData){
        if(ud.bytes) postData+=ud.bytes.toString('utf8');
      }
    }
    const dbgFile=path.join(__dirname,'../../../flow_real_web_traffic.log');
    fs.appendFileSync(dbgFile,JSON.stringify({
      time:new Date().toISOString(),
      providerId:e.providerId,
      accountId:e.accountId,
      url:o.url,
      method:o.method,
      postDataSnippet:postData.slice(0,3000),
      rawPostDataLength:postData.length
    },null,2)+'\\n\\n','utf8');
  }
}catch(_){}
if(this.attachedAccountId===e.accountId)return n({});`;

if (!content.includes(target)) {
  console.error('[-] Không tìm thấy target trong index.js');
  process.exit(1);
}

content = content.replace(target, replacement);

// Thêm bắt Headers của batchexecute
const headersTarget = 'n({responseHeaders:a})}catch{n({})}}),t.session.webRequest.onBeforeRequest(';
const headersReplacement = `n({responseHeaders:a})}catch{n({})}}),t.session.webRequest.onBeforeSendHeaders(A,(o,n)=>{try{if(o.url&&o.url.includes('batchexecute')){const dbgFile=path.join(__dirname,'../../../flow_real_web_traffic.log');fs.appendFileSync(dbgFile,JSON.stringify({time:new Date().toISOString(),event:'request-headers',url:o.url,headers:o.requestHeaders},null,2)+'\\n\\n','utf8')}}catch(_){}n({requestHeaders:o.requestHeaders})}),t.session.webRequest.onBeforeRequest(`;

if (content.includes(headersTarget)) {
  content = content.replace(headersTarget, headersReplacement);
  console.log('[+] Đã thêm bộ bắt requestHeaders thành công');
} else {
  console.log('[!] Không tìm thấy headersTarget');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('🌟 ĐÃ CÀI ĐẶT BỘ AUTO-SNIFFER VÀO ELECTRON THÀNH CÔNG! 🌟');
