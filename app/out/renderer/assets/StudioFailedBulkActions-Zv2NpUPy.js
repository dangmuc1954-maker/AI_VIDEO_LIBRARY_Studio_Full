import{a4 as E,bL as L,bn as h,b4 as e,X as B,b as V,I as X,l as Y,bD as To}from"./index-BS7vgKVV.js";import{f as $,P as O,O as Z,a as Q,T as U,D as ee,C as G}from"./index-D4pq1Q3u.js";import{F as R}from"./file-text-BoaCCCa0.js";import{C as te}from"./clipboard-paste-Cc4Tv8YQ.js";import{S as F}from"./sparkles-DTN-KlRV.js";import{R as re}from"./rotate-ccw-DRur3je9.js";import{T as W}from"./selectContentLayer-C4AEo844.js";import{F as se}from"./maximize-DzzSGVgj.js";import{g as ne,w as S,a as oe}from"./runtimeIndexes-gerug5IH.js";import{P as ae}from"./StudioPrimitives-CEIXwDK6.js";/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Fe=E("CheckCheck",[["path",{d:"M18 6 7 17l-5-5",key:"116fxf"}],["path",{d:"m22 10-7.5 7.5L13 16",key:"ke71qq"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const T=E("FileUp",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"M12 12v6",key:"3ahymv"}],["path",{d:"m15 15-3-3-3 3",key:"15xj92"}]]);function ie(t){return!t||!t.trim()?[]:t.split(/\r?\n\s*\r?\n+/).map(n=>n.trim()).filter(n=>n.length>0)}function Se({open:t,onOpenChange:n,onImport:a,studioType:r,assets:propAssets}){
  const {t:s}=L(),
  [i,o]=h.useState(""),
  [projectName,setProjectName]=h.useState(""),
  [imageFiles,setImageFiles]=h.useState([]),
  [matchMode,setMatchMode]=h.useState("name"),
  [customOverrides,setCustomOverrides]=h.useState({}),
  [isUploading,setIsUploading]=h.useState(!1),
  [uploadStatus,setUploadStatus]=h.useState(""),
  [activeSourceTab,setActiveSourceTab]=h.useState("computer"),
  [toolSearch,setToolSearch]=h.useState(""),
  [toolSourceFilter,setToolSourceFilter]=h.useState("all"),
  [selectedToolIds,setSelectedToolIds]=h.useState([]),
  [liveAssets,setLiveAssets]=h.useState([]),

  storeAssets=(typeof To==="function"?To(st=>st.assets):null)||[],

  // Refresh live assets when modal opens
  _fetchLive=h.useEffect(()=>{
    if(t){
      let mounted=!0;
      const getList=async()=>{
        try{
          const res=await(window.aiforge?.assets?.list?.()||window.aivideo?.assets?.list?.());
          if(mounted&&Array.isArray(res))setLiveAssets(res);
        }catch(_){}
      };
      getList();
      return()=>{mounted=!1};
    }
  },[t]),

  // Merge and sort all available tool assets
  availableToolAssets=h.useMemo(()=>{
    const map=new Map();
    if(Array.isArray(propAssets))propAssets.forEach(x=>{if(x&&x.id)map.set(x.id,x)});
    if(Array.isArray(storeAssets))storeAssets.forEach(x=>{if(x&&x.id)map.set(x.id,x)});
    if(Array.isArray(liveAssets))liveAssets.forEach(x=>{if(x&&x.id)map.set(x.id,x)});
    return Array.from(map.values()).filter(x=>x&&(x.type==="image"||!x.type||x.mimeType?.startsWith("image/"))&&(x.thumbnailUrl||x.url||x.localPath)).sort((x1,x2)=>{
      const n1=x1.name||x1.sceneName||"",n2=x2.name||x2.sceneName||"";
      const cmp=n1.localeCompare(n2,undefined,{numeric:!0,sensitivity:"base"});
      if(cmp!==0)return cmp;
      return new Date(x2.createdAt||0)-new Date(x1.createdAt||0);
    });
  },[propAssets,storeAssets,liveAssets]),

  handleAddToolAssets=(assetsToAdd)=>{
    if(!assetsToAdd||assetsToAdd.length===0)return;
    const readItems=assetsToAdd.map((itm,idx)=>{
      let cName=itm.name||itm.sceneName||"";
      if(!cName||cName.startsWith("generated-image-")||cName.startsWith("asset-")){
        cName=(itm.prompt?itm.prompt.slice(0,30).trim():("Cảnh "+(idx+1)))+".png";
      }
      return{
        assetId:itm.id,
        name:cName,
        size:itm.bytes||0,
        type:itm.mimeType||"image/png",
        previewUrl:itm.thumbnailUrl||itm.url,
        isToolAsset:!0,
        prompt:itm.prompt||""
      };
    });
    setImageFiles(prev=>{
      const merged=[...prev,...readItems];
      const map=new Map();
      merged.forEach(item=>{
        const key=(item.assetId||item.name)+'_'+item.size;
        if(!map.has(key))map.set(key,item);
      });
      const unique=Array.from(map.values());
      unique.sort((f1,f2)=>f1.name.localeCompare(f2.name,undefined,{numeric:!0,sensitivity:"base"}));
      return unique;
    });
  },

  // Smart prompt parser: supports double-newline and single-newline lists
  d=h.useMemo(()=>{
    if (!i || !i.trim()) return [];
    const trimmed = i.trim();
    let rawList;
    if (/\r?\n\s*\r?\n/.test(trimmed)) {
      rawList = trimmed.split(/\r?\n\s*\r?\n+/);
    } else {
      rawList = trimmed.split(/\r?\n+/);
    }
    return rawList.map(item => {
      // Clean leading scene labels like "Cảnh 1:", "Scene 1.", "1. ", "1/"
      return item.replace(/^\s*(?:c[aả]nh|scene|ph[aâ]n\s*c[aả]nh)?\s*\d+[:.)\/\-\s]\s*/i, '').trim();
    }).filter(p => p.length > 0);
  },[i]),

  m=i.length,
  x=i?i.split(/\r?\n/).length:0;

  // Add files with natural sort (1.png, 2.png, 10.png)
  const handleAddFiles = (files) => {
    if (!files || files.length === 0) return;
    const newArr = Array.from(files).filter(f => f && f.type && f.type.startsWith("image/"));
    if (newArr.length === 0) return;

    const readItems = newArr.map(f => ({
      file: f,
      name: f.name,
      size: f.size,
      type: f.type,
      previewUrl: URL.createObjectURL(f)
    }));

    setImageFiles(prev => {
      const merged = [...prev, ...readItems];
      const map = new Map();
      merged.forEach(item => {
        const key = item.name + '_' + item.size;
        if (!map.has(key)) map.set(key, item);
      });
      const unique = Array.from(map.values());
      unique.sort((f1, f2) => f1.name.localeCompare(f2.name, undefined, { numeric: true, sensitivity: 'base' }));
      return unique;
    });
  };

  const onDragOver = e => { e.preventDefault(); e.stopPropagation(); };
  const onDropImages = e => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer && e.dataTransfer.files) {
      handleAddFiles(e.dataTransfer.files);
    }
  };

  // 3 Modes Matching Logic
  const getMatchedImageForScene = (sceneIndex, promptText) => {
    try {
      if (customOverrides[sceneIndex] !== undefined) {
        return customOverrides[sceneIndex];
      }
      if (!imageFiles || imageFiles.length === 0) return null;

      // Chế độ 3: 1 cho tất cả
      if (matchMode === "allOne") {
        return imageFiles[0] || null;
      }

      // Chế độ 2: Ghép 1 - 1 nối tiếp
      if (matchMode === "oneToOne") {
        return imageFiles[sceneIndex] || null;
      }

      // Chế độ 1: Theo tên cảnh / tên ảnh (Mặc định)
      const sceneNum = sceneIndex + 1;
      const nStr = String(sceneNum);

      // A. Match scene number in image filename (Ảnh Cảnh 1.png, Ảnh Cảnh 1'.png, 1.png, 1'.png...)
      const matchingImages = imageFiles.filter(img => {
        const raw = (img.name || "").replace(/\.[a-zA-Z0-9]+$/, '').toLowerCase();
        const mPrefix = raw.match(/(?:canh|cảnh|scene|phancanh|p|c)[_\s-]*0*(\d+)/i);
        if (mPrefix && parseInt(mPrefix[1], 10) === sceneNum) return true;

        const mStandalone = raw.match(/^(?:ảnh\s*|anh\s*|video\s*)?0*(\d+)(?:'+|\b|$)/i);
        if (mStandalone && parseInt(mStandalone[1], 10) === sceneNum) return true;

        const r1 = new RegExp('(canh|cảnh|scene|phancanh|p|c)[_\s-]*0*' + nStr + "([^0-9]|$)", 'i');
        if (r1.test(raw)) return true;

        return false;
      });

      if (matchingImages.length > 0) {
        matchingImages.sort((f1, f2) => {
          const p1 = (f1.name.match(/'/g) || []).length;
          const p2 = (f2.name.match(/'/g) || []).length;
          if (p2 !== p1) return p2 - p1;
          return (f2.file?.lastModified || 0) - (f1.file?.lastModified || 0);
        });
        return matchingImages[0];
      }

      // B. Match tag in prompt text: [@TênẢnh] or [TênẢnh] or [TênẢnh.png]
      const pLower = (promptText || '').toLowerCase();
      for (const img of imageFiles) {
        const base = (img.name || "").replace(/\.[a-zA-Z0-9]+$/, '').trim();
        const baseLower = base.toLowerCase();
        if (pLower.includes('@' + baseLower) || pLower.includes('[' + (img.name || "").toLowerCase() + ']') || pLower.includes('[' + baseLower + ']')) {
          return img;
        }
      }

      // C. Match character name in prompt text
      const matched = imageFiles.find(img => {
        const charName = (img.name || "").replace(/\.[a-zA-Z0-9]+$/, '').replace(/[_-]/g, ' ').trim().toLowerCase();
        if (charName.length >= 2 && !/^\d+$/.test(charName)) {
          const wordRegex = new RegExp('(^|[^a-zA-Z0-9\\u00C0-\\u024F\\u1EA0-\\u1EF9])' + charName + '([^a-zA-Z0-9\\u00C0-\\u024F\\u1EA0-\\u1EF9]|$)', 'i');
          return wordRegex.test(pLower) || pLower.includes(charName);
        }
        return false;
      });
      if (matched) return matched;

      // D. Fallback nếu người dùng nạp ảnh không theo tên chuẩn cảnh
      if (imageFiles.length === 1 && sceneIndex === 0) return imageFiles[0];
      if (imageFiles.length === d.length && imageFiles[sceneIndex]) return imageFiles[sceneIndex];
      return null;
    } catch (eMatch) {
      console.warn('[getMatchedImageForScene] error:', eMatch);
      return null;
    }
  };

  const u=async()=>{try{const c=await navigator.clipboard.readText();c&&o(l=>l.trim()?`${l.trim()}\n\n${c.trim()}`:c.trim())}catch{}},
  b=()=>{o(""); setProjectName(""); setImageFiles([]); setCustomOverrides({});},
  P=()=>{
    o(s(r==="video"?"importPrompt.sampleVideo":r==="tts"?"importPrompt.sampleTts":"importPrompt.sampleImage"));
  },
  w=c=>{const l=d.filter((f,g)=>g!==c);o(l.join("\n\n"))},

  // Final Import Handler
  j=async()=>{
    if (d.length === 0) return;
    setIsUploading(!0);
    setUploadStatus("Đang tải ảnh lên thư viện...");

    try {
      const uploadMap = new Map();
      const fileToDataUrl = file => new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });

      const importBridge = window.aiforge?.assets?.importReference || window.aivideo?.assets?.importReference;

      if (imageFiles.length > 0) {
        for (let idx = 0; idx < imageFiles.length; idx++) {
          const item = imageFiles[idx];
          const key = (item.assetId || item.name) + '_' + item.size;
          if (item.assetId) {
            uploadMap.set(key, item.assetId);
            continue;
          }
          if (importBridge && item.file) {
            setUploadStatus(`Nạp ảnh ${idx + 1}/${imageFiles.length}: ${item.name}...`);
            try {
              const dataUrl = await fileToDataUrl(item.file);
              const assetRes = await importBridge({
                name: item.name,
                mimeType: item.type || "image/png",
                dataUrl: dataUrl
              });
              if (assetRes && (assetRes.id || assetRes.assetId)) {
                uploadMap.set(key, assetRes.id || assetRes.assetId);
              }
            } catch (err) {
              console.warn("Could not import asset:", item.name, err);
            }
          }
        }
      }

      // Build payload items with prompt, referenceAssetIds, and sceneName (Cảnh 1, Cảnh 2...)
      const payload = d.map((pText, idx) => {
        const sceneNum = idx + 1;
        const matchedImg = getMatchedImageForScene(idx, pText);
        let refIds = [];
        if (matchedImg) {
          const key = (matchedImg.assetId || matchedImg.name) + '_' + matchedImg.size;
          const aid = uploadMap.get(key) || matchedImg.assetId;
          if (aid) refIds.push(aid);
        }
        const sTitle = projectName?.trim() ? `Cảnh ${sceneNum} ${projectName.trim()}` : `Cảnh ${sceneNum}`;
        return {
          prompt: pText,
          referenceAssetIds: refIds,
          userReferenceAssetIds: refIds,
          sceneName: sTitle,
          title: sTitle,
          sceneMode: idx === 0 ? "new" : "continue"
        };
      });

      a(payload);
      o("");
      setProjectName("");
      setImageFiles([]);
      setCustomOverrides({});
      n(!1);
    } catch (err) {
      console.error("Error during importPrompt:", err);
      a(d);
      n(!1);
    } finally {
      setIsUploading(!1);
      setUploadStatus("");
    }
  },

  N=s(r==="video"?"importPrompt.modalTitleVideo":r==="tts"?"importPrompt.modalTitleTts":"importPrompt.modalTitleImage"),
  p=r==="tts"?s("importPrompt.foundScriptsCount",{count:d.length}):s("importPrompt.foundPromptsCount",{count:d.length}),
  v=r==="tts"?s("importPrompt.importActionTts",{count:d.length}):s("importPrompt.importAction",{count:d.length});

  return e.jsx($,{open:t,onOpenChange:n,children:e.jsxs(O,{children:[
    e.jsx(Z,{className:"fixed inset-0 z-[var(--layer-dialog-overlay)] bg-black/85 backdrop-blur-md transition-opacity"}),
    e.jsxs(Q,{className:"fixed left-1/2 top-1/2 z-[var(--layer-dialog)] flex -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-white/20 bg-[#16122d] text-text-primary shadow-[0_25px_90px_rgba(0,0,0,0.92)] outline-none",style:{height:"88vh",maxHeight:"88vh",width:"95vw",maxWidth:"1380px",display:"flex",flexDirection:"column",overflow:"hidden"},children:[
      // Header
      e.jsxs("header",{className:"flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-gradient-to-r from-[#241d47] via-[#1f193d] to-[#241d47] px-6 backdrop-blur-xl select-none",children:[
        e.jsxs("div",{className:"flex min-w-0 items-center gap-3.5",children:[
          e.jsx("div",{className:"flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#a3e635]/30 bg-[#a3e635]/15 text-[#d9f99d] shadow-[0_0_15px_rgba(163,230,53,0.2)]",children:e.jsx(T,{size:20,strokeWidth:2.4})}),
          e.jsxs("div",{className:"min-w-0",children:[
            e.jsx(U,{className:"truncate text-base font-extrabold text-white sm:text-lg",children:N}),
            e.jsx(ee,{className:"truncate text-xs font-medium text-slate-300",children:r!=="tts"?"Nhập hàng loạt Prompt kèm 3 chế độ nạp Ảnh Tham Chiếu (1-1, 1 cho tất cả, Theo tên cảnh)":s("importPrompt.modalDesc")})
          ]})
        ]}),
        e.jsx("button",{type:"button",onClick:()=>n(!1),"aria-label":"Đóng cửa sổ",title:"Đóng cửa sổ (Esc)",className:"flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3.5 text-xs font-bold text-slate-200 transition-all hover:border-red-500/50 hover:bg-red-500/20 hover:text-white active:scale-95 shadow-sm",children:[e.jsx(B,{size:16,strokeWidth:2.5,className:"text-red-400"}),e.jsx("span",{className:"font-bold",children:"Đóng"})]})
      ]}),

      // Main content (2 columns)
      e.jsxs("div",{className:"grid min-h-0 flex-1 grid-cols-1 overflow-hidden md:grid-cols-2",style:{minHeight:0,flex:"1 1 0%",height:"calc(88vh - 112px)"},children:[
        // Left Column: Prompt Input & Reference Images
        e.jsxs("div",{className:"flex min-h-0 flex-col overflow-y-auto border-b border-white/10 bg-[#141028] p-4 md:border-b-0 md:border-r [scrollbar-gutter:stable]",style:{minHeight:0,overflowY:"auto",height:"100%"},children:[
          // Section 1: Prompts Input
          e.jsxs("div",{className:"mb-2.5 flex flex-wrap items-center justify-between gap-2",children:[
            e.jsxs("div",{className:"flex items-center gap-2 text-xs font-extrabold tracking-wide uppercase text-slate-200",children:[
              e.jsx(R,{size:16,className:"text-[#a3e635]"}),
              e.jsx("span",{children:"1. " + s("importPrompt.rawInputLabel")})
            ]}),
            e.jsxs("div",{className:"flex flex-wrap items-center gap-2",children:[
              e.jsxs("div",{className:"flex items-center gap-1.5 rounded-lg border border-white/15 bg-black/40 px-2.5 py-1 focus-within:border-[#a3e635] focus-within:ring-1 focus-within:ring-[#a3e635]/40 shadow-inner",children:[
                e.jsx("span",{className:"text-[11px] font-bold text-[#d9f99d] select-none whitespace-nowrap",children:"🏷️ Tên chung:"}),
                e.jsx("input",{type:"text",value:projectName,onChange:ev=>setProjectName(ev.target.value),placeholder:"VD: hoạt hình tập 1...",className:"h-6 w-36 sm:w-44 bg-transparent text-xs text-white placeholder:text-slate-400 focus:outline-none"})
              ]}),
              e.jsxs("button",{type:"button",onClick:u,className:"inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-white/12 bg-white/[0.06] px-3 text-xs font-bold text-slate-200 shadow-sm transition-all hover:border-[#a3e635]/40 hover:bg-[#a3e635]/15 hover:text-[#d9f99d] active:scale-95",children:[e.jsx(te,{size:13,className:"text-[#a3e635]"}),s("importPrompt.pasteClipboard")]}),
              e.jsxs("button",{type:"button",onClick:P,className:"inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-white/12 bg-white/[0.06] px-3 text-xs font-bold text-slate-200 shadow-sm transition-all hover:border-purple-400/40 hover:bg-purple-500/20 hover:text-purple-200 active:scale-95",children:[e.jsx(F,{size:13,className:"text-purple-300"}),s("importPrompt.loadSample")]}),
              i&&e.jsx("button",{type:"button",onClick:b,className:"inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg border border-red-500/25 bg-red-500/10 px-2.5 text-xs font-bold text-red-400 shadow-sm transition-all hover:bg-red-500/20 active:scale-95",title:s("importPrompt.clearAll"),children:e.jsx(re,{size:13})})
            ]})
          ]}),
          e.jsxs("div",{className:"relative flex h-[160px] shrink-0 flex-col overflow-hidden rounded-xl border border-white/12 bg-[#0e0a20] shadow-inner focus-within:border-[#a3e635]/50 focus-within:ring-2 focus-within:ring-[#a3e635]/20",children:[
            e.jsx("textarea",{value:i,onChange:c=>o(c.target.value),placeholder:"Dán danh sách prompt vào đây (mỗi prompt một dòng hoặc cách nhau bởi 2 lần Enter)...\n\nVí dụ:\nCảnh 1: Nam đang ngồi uống cà phê ở góc phố Hà Nội\nCảnh 2: Góc quay flycam toàn cảnh thành phố hoàng hôn\nCảnh 3: Lan bước vào mỉm cười vẫy tay chào Nam...",autoFocus:!0,className:"flex-1 w-full resize-none border-0 bg-transparent p-4 font-sans text-xs leading-relaxed text-slate-100 placeholder:text-slate-500 focus:outline-none"}),
            e.jsxs("div",{className:"flex h-8 shrink-0 items-center justify-between border-t border-white/8 bg-[#181330] px-4 text-[11px] font-mono text-slate-400 select-none",children:[
              e.jsx("span",{children:s("importPrompt.charLineStats",{chars:m,lines:x})}),
              e.jsx("span",{className:"font-sans font-medium text-slate-400",children:"Tự động phân cảnh 1, 2, 3..."})
            ]})
          ]}),

          // Section 2: Batch Reference Images (Only in Video Studio)
          r!=="tts"&&e.jsxs("div",{className:"mt-4 flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#1a1438]/80 p-4 shadow-md",children:[
            e.jsxs("div",{className:"flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5",children:[
              e.jsxs("div",{className:"flex items-center gap-2 text-xs font-extrabold tracking-wide uppercase text-slate-200",children:[
                e.jsx("span",{className:"text-base",children:"🖼️"}),
                e.jsx("span",{children:"2. Ảnh Tham Chiếu Hàng Loạt"}),
                imageFiles.length>0&&e.jsxs("span",{className:"ml-1.5 rounded-full bg-[#a3e635]/20 px-2 py-0.5 text-[11px] font-bold text-[#d9f99d]",children:[imageFiles.length," ảnh"]})
              ]}),

              // 3-Mode Selector Buttons
              e.jsxs("div",{className:"flex items-center gap-1 rounded-xl bg-black/40 p-1 border border-white/10 text-[11px]",children:[
                e.jsx("button",{type:"button",onClick:()=>setMatchMode("name"),className:`rounded-lg px-2.5 py-1 font-bold transition-all ${matchMode==="name"?"bg-[#a3e635] text-black shadow-sm":"text-slate-300 hover:text-white"}`,title:"Tên ảnh quyết định cảnh (1.png ➡️ Cảnh 1, 2.png ➡️ Cảnh 2 hoặc Nam.png ➡️ Cảnh có Nam). Cảnh không có thì để trống.",children:"🎯 Theo tên cảnh"}),
                e.jsx("button",{type:"button",onClick:()=>setMatchMode("oneToOne"),className:`rounded-lg px-2.5 py-1 font-bold transition-all ${matchMode==="oneToOne"?"bg-[#a3e635] text-black shadow-sm":"text-slate-300 hover:text-white"}`,title:"Ảnh 1 ➡️ Cảnh 1, Ảnh 2 ➡️ Cảnh 2 theo thứ tự đưa vào",children:"🔗 1 - 1"}),
                e.jsx("button",{type:"button",onClick:()=>setMatchMode("allOne"),className:`rounded-lg px-2.5 py-1 font-bold transition-all ${matchMode==="allOne"?"bg-[#a3e635] text-black shadow-sm":"text-slate-300 hover:text-white"}`,title:"Dùng ảnh đầu tiên cho tất cả các cảnh",children:"👤 1 cho tất cả"})
              ]})
            ]}),

            // Source Selection Inline Tabs
            e.jsxs("div",{className:"flex items-center gap-1.5 mb-2",children:[
              e.jsxs("button",{type:"button",onClick:()=>setActiveSourceTab("computer"),className:`flex-1 flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${activeSourceTab==="computer"?"border-white/30 bg-white/15 text-white shadow-sm":"border-white/10 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"}`,children:[
                "📁 Tải từ máy tính"
              ]}),
              e.jsxs("button",{type:"button",onClick:()=>setActiveSourceTab("tool"),className:`flex-1 flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-xl border text-xs font-black transition-all cursor-pointer ${activeSourceTab==="tool"?"border-[#a3e635] bg-[#a3e635]/20 text-[#d9f99d] shadow-[0_0_12px_rgba(163,230,53,0.2)]":"border-[#a3e635]/30 bg-[#a3e635]/5 text-slate-300 hover:text-white hover:bg-[#a3e635]/10"}`,children:[
                "🖼️ Thư viện Tool (", availableToolAssets.length, ")"
              ]})
            ]}),

            // INLINE SOURCE BOX (NO OVERLAY, NEVER COVERS ANYTHING)
            activeSourceTab==="computer"?e.jsxs("div",{onDragOver:onDragOver,onDrop:onDropImages,className:"group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/15 bg-black/25 p-4 text-center transition-all hover:border-[#a3e635]/50 hover:bg-[#a3e635]/5",children:[
              e.jsx("input",{type:"file",multiple:!0,accept:"image/*",id:"aiforge-batch-ref-input",onChange:ev=>handleAddFiles(ev.target.files),className:"absolute inset-0 cursor-pointer opacity-0 z-10"}),
              e.jsx("div",{className:"mb-1 text-2xl group-hover:scale-110 transition-transform",children:"📂"}),
              e.jsx("div",{className:"text-xs font-bold text-slate-200",children:"Kéo thả danh sách ảnh vào đây (hoặc click để chọn từ máy tính)"}),
              e.jsx("div",{className:"mt-0.5 text-[11px] text-slate-400",children:"Hỗ trợ đặt tên: 1.png, 2.png, canh1.png hoặc Nam.png, Lan.png..."})
            ]}):e.jsxs("div",{className:"rounded-xl border border-white/15 bg-black/35 p-2.5 flex flex-col gap-2 shadow-inner",children:[
              e.jsxs("div",{className:"flex items-center justify-between gap-2 px-1",children:[
                e.jsxs("span",{className:"text-[11px] font-bold text-slate-200",children:[
                  "Kho ảnh trong Tool (", availableToolAssets.length, "):"
                ]}),
                e.jsxs("div",{className:"flex items-center gap-1.5",children:[
                  availableToolAssets.length>0&&e.jsx("button",{type:"button",onClick:()=>handleAddToolAssets(availableToolAssets),className:"rounded-lg border border-[#a3e635]/50 bg-[#a3e635]/20 px-2 py-0.5 text-[10px] font-black text-[#d9f99d] hover:bg-[#a3e635]/30 cursor-pointer transition-all",children:"⚡ Nạp tất cả"}),
                  imageFiles.some(f=>f.isToolAsset)&&e.jsx("button",{type:"button",onClick:()=>setImageFiles(prev=>prev.filter(f=>!f.isToolAsset)),className:"rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-300 hover:bg-red-500/20 cursor-pointer transition-all",children:"Bỏ ảnh tool"})
                ]})
              ]}),
              availableToolAssets.length===0?e.jsxs("div",{className:"flex h-20 flex-col items-center justify-center text-center text-slate-400",children:[
                e.jsx("span",{className:"text-xs font-semibold text-slate-300",children:"Chưa có ảnh nào trong tool"}),
                e.jsx("span",{className:"text-[10px] text-slate-400 mt-0.5",children:"Hãy tạo ảnh trong Studio Ảnh AI trước."})
              ]}):e.jsx("div",{className:"flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]",children:availableToolAssets.map((asset,aIdx)=>{
                const isAdded=imageFiles.some(f=>f.assetId===asset.id);
                const sceneMatch=asset.name?.match(/^(c[aả]nh|scene)\s*\d+/i)||asset.sceneName;
                return e.jsxs("div",{key:asset.id,onClick:()=>{
                  if(isAdded){
                    setImageFiles(prev=>prev.filter(f=>f.assetId!==asset.id));
                  }else{
                    handleAddToolAssets([asset]);
                  }
                },className:`group relative flex h-20 w-24 shrink-0 flex-col overflow-hidden rounded-xl border transition-all cursor-pointer ${isAdded?"border-[#a3e635] ring-2 ring-[#a3e635]/50 bg-[#a3e635]/15":"border-white/15 bg-black/50 hover:border-white/40"}`,children:[
                  e.jsx("img",{src:asset.thumbnailUrl||asset.url,alt:asset.name||"Asset",className:"h-14 w-full object-cover"}),
                  e.jsx("div",{className:`absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black ${isAdded?"bg-[#a3e635] text-black":"bg-black/70 text-white/50 border border-white/20"}`,children:isAdded?"✓":"+"}),
                  sceneMatch&&e.jsx("div",{className:"absolute top-1 left-1 rounded bg-[#a3e635] px-1 py-0.2 text-[8px] font-black text-black",children:asset.sceneName||sceneMatch[0]}),
                  e.jsx("span",{className:`truncate px-1 py-0.5 text-[8.5px] font-bold text-center ${isAdded?"text-[#d9f99d] bg-black/80":"text-slate-300 bg-black/60"}`,title:asset.name,children:asset.name||("Ảnh "+(aIdx+1))})
                ]});
              })})
            ]}),

            // Image Thumbnails Strip
            imageFiles.length>0&&e.jsxs("div",{className:"space-y-1.5",children:[
              e.jsxs("div",{className:"flex items-center justify-between text-[11px] text-slate-400",children:[
                e.jsxs("span",{children:["Đã nạp ",imageFiles.length," ảnh (thứ tự tự nhiên 1 ➡️ N):"]}),
                e.jsx("button",{type:"button",onClick:()=>setImageFiles([]),className:"text-red-400 hover:underline cursor-pointer",children:"Xóa tất cả ảnh"})
              ]}),
              e.jsx("div",{className:"flex w-full gap-2 overflow-x-auto pb-2 [scrollbar-width:thin]",children:imageFiles.map((img,fIdx)=>e.jsxs("div",{key:img.name+'_'+fIdx,className:"relative flex h-18 w-24 shrink-0 flex-col overflow-hidden rounded-lg border border-white/15 bg-black/40",children:[
                e.jsx("img",{src:img.previewUrl,alt:img.name,className:"h-12 w-full object-cover"}),
                e.jsx("div",{className:"truncate px-1 py-0.5 text-[9px] font-mono text-slate-300",title:img.name,children:img.name}),
                e.jsxs("span",{className:"absolute top-1 left-1 rounded bg-black/75 px-1 text-[9px] font-black text-[#a3e635]",children:['#',fIdx+1]}),
                e.jsx("button",{type:"button",onClick:()=>setImageFiles(prev=>prev.filter((_,idx)=>idx!==fIdx)),className:"absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600/80 text-[10px] text-white hover:bg-red-500",children:"×"})
              ]}))})
            ]})
          ]})
        ]}),

        // Right Column: Scene Preview List
        e.jsxs("div",{className:"flex min-h-0 flex-col bg-[#1d183d]/95 p-4",style:{minHeight:0,height:"100%",display:"flex",flexDirection:"column",overflow:"hidden"},children:[
          e.jsxs("div",{className:"mb-2.5 flex shrink-0 items-center justify-between gap-2 border-b border-white/10 pb-2 select-none",children:[
            e.jsxs("div",{className:"flex items-center gap-2",children:[
              e.jsx("span",{className:"text-xs font-black tracking-wide uppercase text-slate-100",children:"DANH SÁCH PHÂN CẢNH"}),
              d.length>0&&e.jsxs("span",{className:"inline-flex items-center rounded-full border border-[#a3e635]/45 bg-[#a3e635]/20 px-2.5 py-0.5 text-xs font-black text-[#d9f99d] shadow-[0_0_10px_rgba(163,230,53,0.2)]",children:[d.length," cảnh"]})
            ]}),
            d.length>3&&e.jsxs("div",{className:"flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-white/5 px-2.5 py-0.5 rounded-lg border border-white/8",children:[
              e.jsx("span",{children:"↕ Cuộn chuột xem tiếp ("}),
              e.jsx("span",{className:"font-bold text-[#d9f99d]",children:d.length}),
              e.jsx("span",{children:" cảnh)"})
            ]})
          ]}),
          d.length>0?e.jsx("div",{className:"flex-1 min-h-0 overflow-y-auto space-y-2.5 pr-1.5 [scrollbar-gutter:stable]",style:{minHeight:0,flex:"1 1 0%",overflowY:"auto",maxHeight:"100%"},children:d.map((c,l)=>{
            const sceneNum = l + 1;
            const matchedImg = getMatchedImageForScene(l, c);

            return e.jsxs("div",{key:l,className:"group relative flex flex-col rounded-2xl border border-white/12 bg-[#251f47]/90 p-3.5 shadow-md transition-all hover:bg-[#2c2454] hover:border-[#a3e635]/45",children:[
              // Card Header: Cảnh X + Match Badge + Delete Button
              e.jsxs("div",{className:"mb-2 flex items-center justify-between gap-2 border-b border-white/8 pb-2",children:[
                e.jsxs("div",{className:"flex items-center gap-2",children:[
                  e.jsxs("span",{className:"flex h-6 items-center rounded-md border border-[#a3e635]/40 bg-[#a3e635]/20 px-2.5 text-xs font-extrabold text-[#d9f99d]",children:[
                    "Cảnh ", sceneNum, projectName?.trim() ? (" " + projectName.trim()) : ""
                  ]}),
                  matchedImg?e.jsxs("span",{className:"inline-flex items-center gap-1 rounded-md border border-sky-400/40 bg-sky-500/15 px-2 py-0.5 text-[11px] font-semibold text-sky-200",children:[
                    e.jsx("span",{children:"🖼️"}),
                    e.jsx("span",{className:"truncate max-w-[160px]",title:matchedImg.name,children:matchedImg.name})
                  ]}):e.jsx("span",{className:"rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-400 font-mono",children:"Text Only (Không tham chiếu)"})
                ]}),
                e.jsx("button",{type:"button",onClick:()=>w(l),title:s("importPrompt.deleteCardTooltip"),className:"flex h-6 w-6 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-500/15 hover:text-red-400",children:e.jsx(W,{size:13})})
              ]}),

              // Card Body: Thumbnail & Prompt text
              e.jsxs("div",{className:"flex gap-3",children:[
                matchedImg&&e.jsxs("div",{className:"relative h-20 w-24 shrink-0 overflow-hidden rounded-lg border border-white/15 bg-black/40",children:[
                  e.jsx("img",{src:matchedImg.previewUrl,alt:matchedImg.name,className:"h-full w-full object-cover"}),
                  e.jsx("button",{type:"button",onClick:()=>setCustomOverrides(prev=>({...prev,[l]:null})),title:"Bỏ ảnh tham chiếu cho cảnh này",className:"absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-black/80 text-[10px] text-red-300 hover:text-red-200 cursor-pointer",children:"×"})
                ]}),
                e.jsx("p",{className:"flex-1 line-clamp-4 text-xs leading-relaxed text-slate-100 select-text font-normal",children:c})
              ]})
            ]});
          })}):e.jsxs("div",{className:"flex flex-1 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/12 bg-[#15112a]/50 p-10 text-center",children:[
            e.jsx("div",{className:"mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-[#251f47] text-purple-300 shadow-md",children:e.jsx(R,{size:32})}),
            e.jsx("h4",{className:"text-sm font-bold text-white",children:s("importPrompt.previewEmptyTitle")}),
            e.jsx("p",{className:"mt-2 max-w-sm text-xs leading-relaxed text-slate-300",children:s("importPrompt.previewEmptyDesc")})
          ]})
        ]})
      ]}),

      // Footer
      e.jsxs("footer",{className:"flex h-14 shrink-0 items-center justify-between border-t border-white/10 bg-gradient-to-r from-[#241d47] via-[#1f193d] to-[#241d47] px-6 backdrop-blur-xl select-none",children:[
        e.jsxs("div",{className:"hidden sm:flex items-center gap-2 text-xs font-medium text-slate-300",children:[
          e.jsx(F,{size:16,className:"text-[#a3e635] shrink-0"}),
          e.jsx("span",{children:isUploading?uploadStatus:"Tự động đánh số Cảnh 1, Cảnh 2... và ghép ảnh tham chiếu theo chế độ đã chọn."})
        ]}),
        e.jsxs("div",{className:"flex items-center gap-3 ml-auto",children:[
          e.jsx("button",{type:"button",disabled:isUploading,onClick:()=>n(!1),className:"inline-flex h-10 cursor-pointer items-center rounded-xl border border-white/12 bg-white/[0.06] px-5 text-xs font-bold text-slate-200 shadow-sm transition-all hover:border-white/25 hover:bg-white/10 hover:text-white active:scale-95 disabled:opacity-50",children:s("common.cancel")}),
          e.jsxs("button",{type:"button",disabled:d.length===0||isUploading,onClick:j,className:"inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-[#a3e635] px-6 text-xs font-black text-[#06040c] shadow-[0_0_20px_rgba(163,230,53,0.3)] transition-all hover:bg-[#b7f245] hover:shadow-[0_0_28px_rgba(163,230,53,0.5)] hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 disabled:shadow-none",children:[
            e.jsx(T,{size:15,strokeWidth:2.6}),
            isUploading?"Đang nạp ảnh & tạo phân cảnh...":v
          ]})
        ]})
      ]})
    ]})
  ]})
})}
const le={image:{title:"Generating image",phase:"Rendering pixels",Icon:X},video:{title:"Generating video",phase:"Composing motion",Icon:se},audio:{title:"Generating audio",phase:"Synthesizing voice",Icon:V}};function de(t){return typeof t!="number"||!Number.isFinite(t)?0:Math.min(99,Math.max(0,Math.round(t)))}function Te({media:t,progress:n,variant:a="card",className:r=""}){const s=de(n),i=Math.max(4,s),{title:o,phase:d,Icon:m}=le[t],x={"--studio-generation-progress":`${i}%`};return e.jsxs("div",{className:`studio-generation-progress ${r}`,"data-media":t,"data-variant":a,role:"progressbar","aria-label":o,"aria-valuemin":0,"aria-valuemax":100,"aria-valuenow":s,"aria-valuetext":`${o}, ${s}% complete`,style:x,children:[e.jsx("div",{className:"studio-generation-backdrop","aria-hidden":"true"}),e.jsxs("div",{className:"studio-generation-content",children:[e.jsxs("div",{className:"studio-generation-visual","aria-hidden":"true",children:[e.jsx("span",{className:"studio-generation-orbit studio-generation-orbit-outer"}),e.jsx("span",{className:"studio-generation-orbit studio-generation-orbit-inner"}),e.jsx("span",{className:"studio-generation-core",children:e.jsx(m,{size:a==="card"?20:15,strokeWidth:1.8})})]}),e.jsxs("div",{className:"studio-generation-details",children:[e.jsxs("div",{className:"studio-generation-heading",children:[e.jsx("span",{className:"studio-generation-title",children:o}),e.jsxs("span",{className:"studio-generation-value",children:[s,"%"]})]}),e.jsx("span",{className:"studio-generation-phase",children:d}),e.jsx("span",{className:"studio-generation-track","aria-hidden":"true",children:e.jsx("span",{className:"studio-generation-fill"})})]})]})]})}const H=["ChatGPT Images","Grok","Banana","Muse AI"],q=["16:9","4:3","1:1","3:4","9:16"],K=["2:3","3:2","1:1","9:16","16:9"],J=["1:1","16:9","9:16","4:5"],ce=Array.from(new Set([...q,...K,...J]));function ue(t){return t==="Banana"?q:t==="Grok"?K:(t==="Muse AI"||t==="muse")?["9:16","16:9","1:1"]:J}function Me(t,n){const a=ue(t);return a.includes(n)?n:a[0]}const A=["Full HD","2K","4K"],_=[1,2,3,4],De=54,ze=312,Ee=6,M=3e4,C=new WeakMap;function pe(t){const n=typeof t=="number"?t:Number(t);return Number.isFinite(n)?Math.max(1,Math.min(4,Math.round(n))):1}function me(t){return H.find(n=>n===t)||(String(t).toLowerCase().includes("muse")?"Muse AI":"Banana")}function xe(t,n){return t==="Completed"?"Completed":t==="Running"?"Running":t==="Paused"&&n==="open-browser"?"Failed":t==="Queued"||t==="Paused"?"Queued":t==="Failed"||t==="Canceled"?"Failed":"Pending"}function I(t,n){const a=t?.[n];return typeof a=="number"&&Number.isFinite(a)?a:void 0}function D(t,n){const a=t?.[n];return typeof a=="string"&&a.trim()?a.trim():void 0}function Le(t,n=[]){const a=ne(n);return t.flatMap(r=>{if(r.type!=="Image")return[];const o=`${r.status}:${r.error||""}:${(r.result?.assets?.filter(l=>l.type==="image")||[]).map(l=>{const f=l.assetId?a.get(l.assetId):void 0;return[l.assetId||"",l.url||"",l.thumbnailUrl||"",l.localPath||"",f?.url||"",f?.thumbnailUrl||""].join(":")}).join("|")}|deleted:${S(r,"image")?"1":"0"}`,d=C.get(r);if(d?.assetSignature===o)return d.previews;const m=typeof r.payload?.prompt=="string"?r.payload.prompt:r.title,x=typeof r.payload?.promptId=="string"?r.payload.promptId:r.id,{assets:u,hadStoredAssets:b}=oe(r.result?.assets,a,"image"),P=xe(r.status,r.recoveryAction),w=D(r.payload,"generationRunId"),j=D(r.payload,"generationRunCreatedAt"),N=I(r.payload,"promptOrder"),y=I(r.payload,"batchIndex")??I(r.payload,"outputIndex"),p=pe(I(r.payload,"generationCount")),v={jobId:r.id,promptId:x,title:N?("Cảnh "+N):(D(r.payload,"sceneName")||D(r.payload,"title")||"Cảnh"),prompt:m,provider:me(r.provider),account:r.account||"Generated account",status:P,progress:r.progress,error:r.error,providerErrorCode:r.providerErrorCode,providerErrorDetails:r.providerErrorDetails,payload:r.payload,generationRunId:w,generationRunCreatedAt:j,promptOrder:N,batchIndex:y,createdAt:r.createdAt,startedAt:r.startedAt,completedAt:r.completedAt};if(u.length===0){if(P==="Failed"||r.status==="Failed"||r.status==="Canceled"){const l=Array.from({length:p},(f,g)=>({...v,id:`${r.id}-failed-${g}`,count:p,batchIndex:p>1?g:y??g,thumbnail:"",status:"Failed",error:r.error||v.error||"Generation failed"}));return C.set(r,{assetSignature:o,previews:l}),l}if(b||r.status==="Completed"||S(r,"image"))return C.set(r,{assetSignature:o,previews:[]}),[];const l=Array.from({length:p},(f,g)=>({...v,id:`${r.id}-pending-${g}`,count:p,batchIndex:p>1?g:y??g,thumbnail:""}));return C.set(r,{assetSignature:o,previews:l}),l}const c=u.map((l,f)=>{const g=l.assetId?a.get(l.assetId):void 0;return{...v,id:`${r.id}-asset-${f}`,count:u.length,batchIndex:p>1?f:y??f,thumbnail:l.thumbnailUrl||g?.thumbnailUrl||(l.url?.startsWith("aiforge-asset://")?"":l.url),fullUrl:l.url||g?.url,asset:{assetId:l.assetId,providerAssetId:l.providerAssetId,width:l.width,height:l.height,mimeType:l.mimeType,localPath:l.localPath,bytes:g?.bytes,resolution:g?.resolution}}});return C.set(r,{assetSignature:o,previews:c}),c})}function k(t){const n=t?new Date(t).getTime():Number.NaN;return Number.isFinite(n)?n:0}function z(t){const n=k(t.generationRunCreatedAt);if(n>0)return n;const a=k(t.createdAt);return a>0?Math.floor(a/M)*M:0}function Be(t,n){const a=new Map(n.map((r,s)=>[r.id,r.index||s+1]));return[...t].sort((r,s)=>{const i=z(s)-z(r);if(i!==0)return i;const o=r.promptOrder??a.get(r.promptId)??Number.MAX_SAFE_INTEGER,d=s.promptOrder??a.get(s.promptId)??Number.MAX_SAFE_INTEGER;if(o!==d)return o-d;const m=r.batchIndex??0,x=s.batchIndex??0;if(m!==x)return m-x;const u=k(r.createdAt)-k(s.createdAt);return u!==0?u:r.id.localeCompare(s.id)})}function he(t){return typeof t.payload?.promptId=="string"?t.payload.promptId:void 0}function fe(t,n){const a=t.payload?.batchSize;return typeof a=="number"&&Number.isFinite(a)&&a>0?Math.floor(a):n}function ge(t,n){if(t.length===0)return n;const a=t.filter(o=>o.status==="Running");return a.length>0?{status:"Running",progress:Math.round(a.reduce((o,d)=>o+d.progress,0)/a.length)}:t.filter(o=>o.status==="Paused"&&o.recoveryAction==="open-browser").length>0?{status:"Failed",progress:void 0}:t.filter(o=>o.status==="Queued"||o.status==="Paused"&&o.recoveryAction!=="open-browser").length>0?{status:"Queued",progress:void 0}:t.filter(o=>o.status==="Failed"||o.status==="Canceled").length>0?{status:"Failed",progress:void 0}:t.every(o=>o.status==="Completed")?{status:"Completed",progress:100}:n}function $e(t,n){const a=new Map(t.map(i=>[i.id,i])),r=new Map;n.forEach(i=>{if(i.type!=="Image")return;const o=he(i);if(!o||!a.has(o))return;const d=r.get(o);d?d.push(i):r.set(o,[i])});const s=new Map;return r.forEach((i,o)=>{const d=a.get(o);if(!d)return;i.sort((u,b)=>new Date(b.createdAt).getTime()-new Date(u.createdAt).getTime());const m=i[0];if(!m)return;const x=i.slice(0,fe(m,d.count));s.set(o,ge(x,{status:d.status,progress:d.progress}))}),s}function Oe(t){return new Promise((n,a)=>{const r=new FileReader;r.onload=()=>n(String(r.result)),r.onerror=()=>a(r.error||new Error("Unable to read file")),r.readAsDataURL(t)})}function Qe(t){return!t.upsampleResolution||t.upsampleResolution==="Standard"||t.upsampleResolution==="Full HD"?"Full HD":t.upsampleResolution}function Ue(t,n){const a=t.payload?.upsampleResolution,r=t.asset?.resolution,s=A.find(i=>i===a)||A.find(i=>i===r);return s||(n==="Standard"||!n?"Full HD":n)}function Ge(t,n=!1){return typeof t.payload?.autoRemoveWatermark=="boolean"?t.payload.autoRemoveWatermark:typeof t.payload?.removeWatermark=="boolean"?t.payload.removeWatermark:n}function We(t){return t>=_[_.length-1]?_[0]:t+1}function He(t){return{"1:1":"h-4 w-4","16:9":"h-3 w-5","9:16":"h-5 w-3","4:5":"h-5 w-4","4:3":"h-4 w-5","3:4":"h-5 w-4","2:3":"h-5 w-3.5","3:2":"h-3.5 w-5"}[t]}function qe(t){try{const n=JSON.parse(t),r=(Array.isArray(n)?n:[n]).flatMap(s=>{if(!s||typeof s!="object")return[];const i=s;if(i.type!=="aiforge.prompt"||!i.prompt||typeof i.prompt!="object")return[];const o=i.prompt;return typeof o.text!="string"||!o.text.trim()?[]:[{prompt:o.text.trim(),provider:H.includes(o.provider)?o.provider:void 0,ratio:ce.includes(o.ratio)?o.ratio:void 0,count:typeof o.count=="number"&&_.includes(o.count)?o.count:void 0,account:typeof o.account=="string"?o.account:void 0,upsampleResolution:A.includes(o.upsampleResolution)?o.upsampleResolution:void 0,referenceAssetIds:Array.isArray(o.referenceAssetIds)?o.referenceAssetIds.filter(d=>typeof d=="string"):void 0}]});return r.length?r:null}catch{return null}}function Ke(){return`prompt-${Date.now()}-${Math.random().toString(36).slice(2,8)}`}function Je(t){return t.map((n,a)=>{const s=a+1;return{...n,index:s,sceneName:"Cảnh "+s,title:"Cảnh "+s}})}function Ve(t){return t.split(/\r?\n/).map(n=>n.replace(/^\s*(?:[-*]|\d+[.)])\s+/,"").trim()).filter(Boolean)}const Xe="bg-[radial-gradient(circle_at_50%_36%,rgba(244,63,94,0.08),transparent_42%),linear-gradient(180deg,#1e1a38_0%,#12101f_100%)]",Ye="ring-red/15 shadow-[0_7px_22px_rgba(244,63,94,0.045)] hover:ring-red/22 hover:shadow-[0_9px_26px_rgba(244,63,94,0.07)]",Ze="border-red/20 bg-red/[0.07] text-red/90 shadow-[0_0_16px_rgba(244,63,94,0.04)]";function et({actions:t,children:n,onClose:a,title:r}){return e.jsx($,{open:!0,modal:!1,onOpenChange:s=>!s&&a(),children:e.jsxs(O,{children:[e.jsx("div",{"aria-hidden":"true",onMouseDown:a,className:"fixed inset-0 z-[var(--layer-drawer-overlay)] bg-black/55 backdrop-blur-xs animate-fade-in"}),e.jsxs(Q,{"aria-describedby":void 0,onOpenAutoFocus:s=>s.preventDefault(),onInteractOutside:s=>s.preventDefault(),className:"fixed inset-y-0 right-0 z-[var(--layer-drawer)] flex w-[min(396px,calc(100vw-16px))] flex-col overflow-hidden border-l border-[#2e2954] bg-[#18152e] shadow-[-24px_0_70px_rgba(0,0,0,0.75)] outline-none animate-slide-in-right",children:[e.jsxs("header",{className:"flex shrink-0 items-center justify-between gap-2.5 border-b border-[#2e2954] bg-[#131026] px-4 py-3",children:[e.jsxs(U,{className:"min-w-0 flex items-center gap-2 truncate text-xs font-bold text-white tracking-wide",children:[e.jsx("span",{className:"flex h-1.5 w-1.5 rounded-full bg-[#a78bfa] shadow-[0_0_6px_#a78bfa]"}),e.jsx("span",{className:"truncate",children:r})]}),e.jsxs("div",{className:"flex shrink-0 items-center gap-1.5",children:[t&&e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"flex items-center gap-0.5 bg-[#181430] p-0.5 rounded-lg border border-[#2e2954]",children:t}),e.jsx("span",{className:"h-4 w-px bg-[#2e2954] mx-0.5"})]}),e.jsx(G,{asChild:!0,children:e.jsx("button",{type:"button","aria-label":"Close prompt drawer",title:"Close prompt drawer",className:"flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-[#2e2954] bg-[#181430] text-slate-300 transition-all hover:bg-[#261f4d] hover:border-[#4d4480] hover:text-white focus:outline-none active:scale-95",children:e.jsx(B,{size:13})})})]})]}),e.jsx("div",{className:"min-h-0 flex-1 overflow-y-auto p-3.5 pb-8 space-y-3 custom-scrollbar",children:n})]})]})})}const be={clear:t=>clearTimeout(t),set:(t,n)=>setTimeout(t,n)};function ve(t,n,a=be){let r,s=!1,i;const o=()=>{i!==void 0&&(a.clear(i),i=void 0)},d=()=>{o(),s=!1,r=void 0};return{discard:d,flush:()=>{if(!s)return;const u=r;return d(),t(u),u},hasPending:()=>s,schedule:u=>{o(),r=u,s=!0,i=a.set(()=>{if(i=void 0,!s)return;const b=r;s=!1,r=void 0,t(b)},n)}}}const we=300,tt=h.forwardRef(function({ariaLabel:n,countLabel:a,label:r,maxLength:s,onCommit:i,onPaste:o,onShortcut:d,placeholder:m,shortcutLabel:x,value:u},b){const P=h.useRef(null),w=h.useRef(u),j=h.useRef(i);j.current=i;const[N,y]=h.useState(u),[p]=h.useState(()=>ve(c=>j.current(c),we)),v=h.useCallback(()=>(p.flush(),w.current),[p]);return h.useImperativeHandle(b,()=>({flush:v}),[v]),h.useEffect(()=>{if(u===w.current){p.discard();return}p.hasPending()||(w.current=u,y(u))},[p,u]),h.useEffect(()=>{const c=setTimeout(()=>{const l=P.current;if(!l)return;l.focus();const f=l.value.length;l.setSelectionRange(f,f)},60);return()=>clearTimeout(c)},[]),h.useEffect(()=>()=>{p.flush()},[p]),e.jsxs("section",{className:"flex flex-col gap-2.5 rounded-xl border border-[#2e2956] bg-[#1c1836] p-3.5 shadow-sm",children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsxs("label",{className:"flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-slate-300 uppercase select-none",children:[e.jsx("span",{className:"h-1.5 w-1.5 rounded-full bg-[#a78bfa]"}),r]}),e.jsx("span",{className:"rounded-md border border-[#2e2956] bg-[#131026] px-2 py-0.5 font-mono text-[10px] text-slate-400 tabular-nums",children:a?a(N.length,s):`${N.length} / ${s}`})]}),e.jsx("textarea",{ref:P,"aria-label":n,value:N,maxLength:s,placeholder:m,onBlur:v,onChange:c=>{const l=c.currentTarget.value;w.current=l,y(l),p.schedule(l)},onPaste:c=>{o?.(c),c.defaultPrevented&&p.discard()},onKeyDown:c=>{(c.metaKey||c.ctrlKey)&&c.key==="Enter"&&(c.preventDefault(),v(),d())},className:"min-h-[160px] w-full resize-y rounded-lg border border-[#2e2956] bg-[#131026] p-3 text-xs leading-relaxed text-white outline-none transition-all placeholder:text-slate-500 focus:border-[#a78bfa] focus:bg-[#16132c] focus:ring-1 focus:ring-[#a78bfa]/40"}),e.jsx(ae,{label:x})]})});function rt(t){return{Completed:{text:"text-green",bg:"bg-green/12",border:"border-green/25",dot:"bg-green",label:"Completed"},Running:{text:"text-yellow",bg:"bg-yellow/12",border:"border-yellow/25",dot:"bg-yellow",label:"Running"},Queued:{text:"text-blue",bg:"bg-blue/12",border:"border-blue/25",dot:"bg-blue",label:"Queued"},Failed:{text:"text-red",bg:"bg-red/12",border:"border-red/25",dot:"bg-red",label:"Failed"},Pending:{text:"text-text-secondary",bg:"bg-white/[0.05]",border:"border-white/[0.08]",dot:"bg-text-muted",label:"Pending"}}[t]}function st(t,n){const a={All:{active:"bg-violet-500/20 text-violet-100",idle:"text-violet-300 hover:bg-violet-500/10 hover:text-violet-100"},Running:{active:"bg-amber-400/20 text-amber-100",idle:"text-amber-300 hover:bg-amber-400/10 hover:text-amber-100"},Completed:{active:"bg-emerald-400/20 text-emerald-100",idle:"text-emerald-300 hover:bg-emerald-400/10 hover:text-emerald-100"},Failed:{active:"bg-rose-400/20 text-rose-100",idle:"text-rose-300 hover:bg-rose-400/10 hover:text-rose-100"}},r=a[t]||a.All;return n?r.active:r.idle}function nt({failedCount:t,operationName:n,onRetryAll:a,onDeleteAll:r}){const{t:s}=L();if(t<=0)return null;const i=n==="retry",o=n==="remove",d=i||o;return e.jsxs("div",{className:"flex items-center gap-1.5",children:[e.jsxs("button",{type:"button",disabled:d,onClick:a,className:"inline-flex h-7 cursor-pointer items-center gap-1 rounded-lg border border-lime-300/50 bg-lime-400 px-2.5 text-[11px] font-bold text-slate-950 shadow-[0_3px_12px_rgba(163,230,53,0.16)] transition-colors hover:bg-lime-300 focus:outline-none focus:ring-2 focus:ring-lime-300/50 disabled:cursor-not-allowed disabled:opacity-45",children:[e.jsx(Y,{size:13,className:i?"animate-spin":void 0}),e.jsx("span",{children:s(i?"common.retryingFailed":"common.retryAllFailed")})]}),e.jsxs("button",{type:"button",disabled:d,onClick:r,className:"inline-flex h-7 cursor-pointer items-center gap-1 rounded-lg border border-rose-400/50 bg-rose-500 px-2.5 text-[11px] font-bold text-white shadow-[0_3px_12px_rgba(244,63,94,0.14)] transition-colors hover:bg-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-300/50 disabled:cursor-not-allowed disabled:opacity-45",children:[e.jsx(W,{size:13}),e.jsx("span",{children:s(o?"common.deletingFailed":"common.deleteAllFailed")})]})]})}export{Ye as A,Ze as B,Fe as C,Xe as D,st as E,T as F,Se as I,nt as S,Te as a,et as b,tt as c,$e as d,Ke as e,Oe as f,Ge as g,ue as h,Ue as i,pe as j,Me as k,Ve as l,Le as m,We as n,A as o,qe as p,Ee as q,Qe as r,De as s,ze as t,H as u,He as v,ce as w,Je as x,Be as y,rt as z};
