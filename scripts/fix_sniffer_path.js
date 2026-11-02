const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../app/out/main/index.js');
let content = fs.readFileSync(filePath, 'utf8');

// Thay thế đoạn auto-sniffer dùng require('fs') và đường dẫn tuyệt đối chuẩn xác
const oldSniffer = `const dbgFile=path.join(__dirname,'../../../flow_real_web_traffic.log');fs.appendFileSync(dbgFile,JSON.stringify({time:new Date().toISOString(),event:'request-headers',url:o.url,headers:o.requestHeaders},null,2)+'\\n\\n','utf8')`;
const newSniffer = `try{const _f=require('fs');_f.appendFileSync('D:\\\\dự án antigravity\\\\AIForge_Veo3_Studio\\\\flow_real_web_traffic.log',JSON.stringify({time:new Date().toISOString(),event:'request-headers',url:o.url,headers:o.requestHeaders},null,2)+'\\n\\n','utf8')}catch(err){}`;

content = content.replace(oldSniffer, newSniffer);

const oldBodySniffer = `const dbgFile=path.join(__dirname,'../../../flow_real_web_traffic.log');
    fs.appendFileSync(dbgFile,JSON.stringify({
      time:new Date().toISOString(),
      providerId:e.providerId,
      accountId:e.accountId,
      url:o.url,
      method:o.method,
      postDataSnippet:postData.slice(0,3000),
      rawPostDataLength:postData.length
    },null,2)+'\\n\\n','utf8');`;

const newBodySniffer = `try{
      const _f=require('fs');
      _f.appendFileSync('D:\\\\dự án antigravity\\\\AIForge_Veo3_Studio\\\\flow_real_web_traffic.log',JSON.stringify({
        time:new Date().toISOString(),
        event:'request-body',
        providerId:e.providerId,
        accountId:e.accountId,
        url:o.url,
        method:o.method,
        postDataSnippet:postData.slice(0,4000),
        rawPostDataLength:postData.length
      },null,2)+'\\n\\n','utf8');
    }catch(err){}`;

content = content.replace(oldBodySniffer, newBodySniffer);

fs.writeFileSync(filePath, content, 'utf8');
console.log('[+] Đã cập nhật auto-sniffer với require(\"fs\") và absolute path!');
