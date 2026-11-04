import { bn as React, bf as toast } from "./index-BS7vgKVV.js";
import FittingRoomKocStudio from "./FittingRoomKocStudio.js";

// HELPER ĐĂNG KÝ ASSET ĐẢM BẢO ASSET ID HỢP LỆ TRONG HÀNG ĐỢI
async function ensureRegisteredAsset(item, defaultName) {
  if (!item) return null;
  const isSynthetic = (id) => !id || typeof id !== 'string' || id.startsWith('ref-') || id.startsWith('asset-img-') || id.startsWith('asset-vid-');
  if (item.assetId && !isSynthetic(item.assetId)) {
    return item.assetId;
  }
  if (item.mediaId && !isSynthetic(item.mediaId)) {
    return item.mediaId;
  }
  if (item.id && !isSynthetic(item.id)) {
    return item.id;
  }

  const api = window.aiforge?.assets || window.aivideo?.assets;
  if (api?.list) {
    try {
      const res = await api.list();
      const assetsList = Array.isArray(res) ? res : (res?.assets || []);
      const matched = assetsList.find(a => 
        (item.localPath && a.localPath === item.localPath) ||
        (item.url && (a.url === item.url || a.thumbnailUrl === item.url))
      );
      if (matched?.id && !isSynthetic(matched.id)) {
        item.assetId = matched.id;
        item.id = matched.id;
        return matched.id;
      }
    } catch (_) {}
  }

  let dataUrl = item.base64 || item.dataUrl;
  if (!dataUrl && typeof item.url === 'string' && item.url.startsWith('data:')) {
    dataUrl = item.url;
  }

  if (!dataUrl && item.url && typeof window !== 'undefined') {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const resp = await fetch(item.url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (resp.ok) {
        const blob = await resp.blob();
        dataUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        });
      }
    } catch (_) {}
  }

  if (dataUrl && api?.importReference) {
    try {
      const imported = await api.importReference({
        name: item.name || defaultName || 'aiforge_registered_asset.jpg',
        mimeType: item.mimeType || 'image/jpeg',
        dataUrl: dataUrl
      });
      if (imported?.id) {
        item.assetId = imported.id;
        item.mediaId = imported.id;
        return imported.id;
      }
    } catch (_) {}
  }
  return (!isSynthetic(item.assetId) ? item.assetId : null) || 
         (!isSynthetic(item.mediaId) ? item.mediaId : null) || 
         (!isSynthetic(item.id) ? item.id : null);
}


// ==========================================
// MASTER PROMPT TEMPLATES THEO TỪNG NGÀNH HÀNG
// ==========================================
const NICHE_TEMPLATES = {
  household: {
    id: 'household',
    name: 'Xưởng Gia Dụng',
    icon: '🏠',
    defaultBrand: 'GIA DỤNG VIỆT',
    defaultInfo: 'đồng hồ như ảnh tham chiếu',
    kocRole: 'Bạn là chuyên gia review KOC TikTok Shop ngành Đồ Gia Dụng & Tiện Ích Đời Sống (giọng miền Bắc, năng lượng cao, chốt đơn cực đỉnh).'
  },
  cosmetics: {
    id: 'cosmetics',
    name: 'Phòng thay đồ',
    icon: '🪞',
    defaultBrand: 'KOC FITTING ROOM',
    defaultInfo: 'Phòng thay đồ KOC hàng loạt & Ghép bối cảnh chuẩn từng pixel',
    kocRole: 'Bạn là chuyên gia phối đồ & thay trang phục KOC hàng loạt.'
  },
  fashion: {
    id: 'fashion',
    name: 'Xưởng Thời Trang',
    icon: '👗',
    defaultBrand: 'FASHION CHIC',
    defaultInfo: 'Set blazer croptop dạ tweed cao cấp, tôn dáng thon gọn, đính cúc ngọc trai sang trọng',
    kocRole: 'Bạn là Fashion Stylist / KOC thời trang TikTok (giọng tự tin, sành điệu, bắt trend cực nhạy).'
  },
  jewelry: {
    id: 'jewelry',
    name: 'Xưởng Trang Sức',
    icon: '⌚',
    defaultBrand: 'LUXURY JEWELS',
    defaultInfo: 'Đồng hồ đính đá sapphire cao cấp, chống nước 5ATM, mặt kính chống trầy, thiết kế sang trọng',
    kocRole: 'Bạn là KOC chuyên gia Đồng hồ & Trang sức cao cấp (phong thái lịch lãm, tinh tế, am hiểu độ hoàn thiện).'
  },
  tech: {
    id: 'tech',
    name: 'Xưởng Công Nghệ',
    icon: '🎧',
    defaultBrand: 'TECH PRO',
    defaultInfo: 'Tai nghe Bluetooth không dây chống ồn chủ động ANC, pin 40h, âm bass uy lực, chống nước IPX7',
    kocRole: 'Bạn là Tech Reviewer TikTok hàng đầu (giọng dứt khoát, chuyên môn cao, trải nghiệm thực tế công tâm).'
  }
};

// CẤU TRÚC PHÂN ĐOẠN CHUẨN KOC THƯƠNG MẠI (3, 4, 5 CẢNH)
// Bắt buộc: Cảnh mở đầu, phân cảnh quay cận review công dụng/chức năng sản phẩm, và cảnh kết chốt hàng (CTA)
const SCENE_STAGE_TEMPLATES = {
  3: [
    { id: 1, stage: 'MỞ ĐẦU & GIỚI THIỆU', title: 'Thu Hút & Giới Thiệu Sản Phẩm', angleName: 'Góc Trung Cận: Nhân Vật Chào & Giới Thiệu SP' },
    { id: 2, stage: 'REVIEW CÔNG DỤNG (QUAY CẬN)', title: 'Quay Cận Cảnh Chức Năng & Công Dụng', angleName: 'Quay Cận Cảnh (Macro Shot): Soi Chi Tiết & Test Công Năng' },
    { id: 3, stage: 'CẢNH KẾT & CHỐT HÀNG', title: 'Kêu Gọi Mua Ngay & Giỏ Hàng', angleName: 'Góc Trung: Nhân Vật Chốt Đơn Trỏ Giỏ Hàng Góc Trái' }
  ],
  4: [
    { id: 1, stage: 'MỞ ĐẦU & GIỚI THIỆU', title: 'Thu Hút & Giới Thiệu Tổng Quan', angleName: 'Góc Trung Cận: Giới Thiệu SP Cuốn Hút' },
    { id: 2, stage: 'CẬN CẢNH CHI TIẾT SP', title: 'Soi Cận Cảnh Thiết Kế & Chất Liệu', angleName: 'Quay Cận Cảnh (Macro Hero): Chi Tiết & Tinh Xảo' },
    { id: 3, stage: 'REVIEW CÔNG DỤNG & TEST', title: 'Trực Tiếp Test Công Dụng & Hiệu Quả', angleName: 'Quay Cận Thao Tác: Test Chức Năng Thực Tế' },
    { id: 4, stage: 'CẢNH KẾT & CHỐT HÀNG', title: 'Ưu Đãi Giá Kho & Kêu Gọi Giỏ Hàng', angleName: 'Góc Trung: Nhân Vật Tươi Vui Kêu Gọi Bấm Giỏ Hàng' }
  ],
  5: [
    { id: 1, stage: 'MỞ ĐẦU & GIỚI THIỆU', title: 'Mở Đầu Ấn Tượng & Giới Thiệu SP', angleName: 'Góc Trung Cận: Nhân Vật Bắt Trend & Giới Thiệu SP' },
    { id: 2, stage: 'CẬN CẢNH CHI TIẾT SP', title: 'Soi Cận Cảnh Thiết Kế & Vật Liệu', angleName: 'Quay Cận Cảnh (Macro Hero): Độ Hoàn Thiện Tinh Xảo' },
    { id: 3, stage: 'REVIEW CÔNG DỤNG & TÍNH NĂNG', title: 'Trực Tiếp Test Công Dụng Đỉnh Cao', angleName: 'Quay Cận Thao Tác: Trải Nghiệm Chức Năng Vượt Trội' },
    { id: 4, stage: 'CHỨNG THỰC & UY TÍN', title: 'Giải Quyết Nhu Cầu & Cam Kết Hãng', angleName: 'Góc Trung: Nhân Vật Trải Nghiệm Hài Lòng Trong Showroom' },
    { id: 5, stage: 'CẢNH KẾT & CHỐT HÀNG', title: 'Kêu Gọi Chốt Đơn Ưu Đãi Độc Quyền', angleName: 'Góc Trung: Nhân Vật Cầm SP Trỏ Giỏ Hàng Ưu Đãi' }
  ]
};

// 5 MODEL VIDEO ĐẦY ĐỦ CỦA FLOW
const VIDEO_MODELS = [
  'Veo 3.1 - Lite [Lower Priority]',
  'Veo 3.1 - Lite',
  'Veo 3.1 - Fast',
  'Veo 3.1 - Quality',
  'Omni Flash'
];

function mapVideoModelToBackendId(modelDisplayName) {
  if (!modelDisplayName) return 'veo-3.1-lite';
  const s = String(modelDisplayName).toLowerCase();
  if (s.includes('quality')) return 'veo-3.1-quality';
  if (s.includes('fast')) return 'veo-3.1-fast';
  if (s.includes('low') || s.includes('priority')) return 'veo-3.1-lite-low-priority';
  if (s.includes('lite')) return 'veo-3.1-lite';
  if (s.includes('omni') || s.includes('flash')) return 'omni-flash-1.1';
  return 'veo-3.1-lite';
}

// PHÂN TÍCH NHẬN DIỆN CHI TIẾT KOC (GIỚI TÍNH, TRANG PHỤC, NỤ CƯỜI TƯƠI TẮN)
async function analyzeKocDetails(kocImg, apiKey) {
  if (!kocImg?.base64) return null;
  try {
    const activeKey = (apiKey || DEFAULT_GEMINI_KEY).trim();
    let rawB64 = kocImg.base64;
    let mime = kocImg.mimeType || 'image/jpeg';
    if (rawB64.includes(',')) {
      const parts = rawB64.split(',');
      rawB64 = parts[1];
      const matchMime = parts[0].match(/:(.*?);/);
      if (matchMime) mime = matchMime[1];
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);

    const prompt = `Analyze this reference photo of a commercial presenter/KOC.
Identify their exact gender and clothing details to lock character identity and wardrobe 100% across all commercial scenes.
Return ONLY a JSON object:
{
  "gender": "female" or "male",
  "isFemale": true or false,
  "presenterNoun": "attractive young Asian female presenter" or "handsome young Asian male presenter",
  "outfitDesc": "concise description of the exact clothing they wear (colors, style, sleeves, collar, neckline, pattern) - 100% exact replica of the reference photo, e.g. 'wearing the exact same clothing from reference photo with identical collar, sleeves, and style, NO blazer or jacket unless clearly visible in photo'",
  "expression": "beaming radiant commercial smile, fresh and inviting facial expression looking at camera"
}`;

    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${activeKey}`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: mime, data: rawB64 } },
            { text: prompt }
          ]
        }],
        generationConfig: { temperature: 0.1, response_mime_type: "application/json" }
      })
    });
    clearTimeout(timer);

    if (resp.ok) {
      const data = await resp.json();
      const txt = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      const match = txt?.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (parsed.gender) {
          parsed.isFemale = parsed.gender.toLowerCase().includes('female') || parsed.gender.toLowerCase().includes('woman') || parsed.gender.toLowerCase().includes('nữ');
          return parsed;
        }
      }
    }
  } catch(e) {
    console.warn("[VFS] Phân tích KOC offline/timeout:", e);
  }
  return null;
}

function isFemaleVoice(voice) {
  if (!voice) return true;
  const s = String(voice).toLowerCase();
  // 1. Nếu có chữ 'nữ' hoặc 'female' -> 100% NỮ (kể cả 'Nữ Miền Nam' hay 'Nữ Miền Bắc')
  if (s.includes('nữ') || s.includes('female') || s.includes('woman') || s.includes('gái')) {
    return true;
  }
  // 2. Nếu có 'nam' nhưng không phải 'miền nam' đơn thuần
  const withoutMienNam = s.replace(/miền\s*nam/gi, '').trim();
  if (withoutMienNam.includes('nam') || withoutMienNam.includes('male') || withoutMienNam.includes('man') || withoutMienNam.includes('trai')) {
    return false;
  }
  return true;
}

function getEffectiveKocProfile(kocImg, profile, voice) {
  const voiceIsFem = isFemaleVoice(voice);
  if (profile && (profile.gender || profile.isFemale !== undefined)) {
    const isFem = profile.isFemale !== undefined
      ? Boolean(profile.isFemale)
      : (profile.gender.toLowerCase().includes('female') || profile.gender.toLowerCase().includes('woman') || profile.gender.toLowerCase().includes('nữ'));
    const cleanOutfit = profile.outfitDesc ? profile.outfitDesc.replace(/tailored (jacket|blazer)|business blazer/gi, 'clothing from reference photo') : '';
    return {
      ...profile,
      isFemale: isFem,
      presenterNoun: isFem ? 'attractive young Asian female presenter' : 'handsome young Asian male presenter',
      outfitDesc: cleanOutfit || (kocImg 
        ? 'wearing the EXACT SAME outfit and clothing as shown in the reference photo (identical style, neckline, sleeves, and colors - 100% exact 1:1 match with NO jacket/blazer unless shown in photo)' 
        : 'wearing clean commercial clothing matching the reference photo'),
      expression: 'beaming radiant commercial smile, energetic fresh confident expression looking directly at camera'
    };
  }
  const isFemale = kocImg?.profile?.isFemale !== undefined ? kocImg.profile.isFemale : voiceIsFem;
  return {
    gender: isFemale ? 'female' : 'male',
    isFemale: isFemale,
    presenterNoun: isFemale ? 'attractive young Asian female presenter' : 'handsome young Asian male presenter',
    outfitDesc: kocImg 
      ? 'wearing the EXACT SAME outfit and clothing as shown in the reference photo (identical style, neckline, sleeves, and colors - 100% exact 1:1 match with NO jacket/blazer unless shown in photo)' 
      : 'wearing clean commercial clothing matching the reference photo',
    expression: 'beaming radiant commercial smile, energetic fresh confident expression looking directly at camera'
  };
}

// TẠO PROMPT VIDEO NÂNG CAO CHO MODEL VEO / OMNI / MUSE (KHÓA NHÂN VẬT, TRANG PHỤC KOC GỐC & NỤ CƯỜI TƯƠI TẮN)
function buildEnhancedVideoPrompt(scene, totalScenes = 3, kocProfile = null, hasKocImage = false, voiceLabel = '', currentNiche = '') {
  const isFirstScene = scene.id === 1;
  const isLastScene = scene.id === totalScenes;
  let rawMotion = (scene.motionPrompt || '').trim().replace(/\.+$/, '');
  const vietnameseDialogue = (scene.voiceScript || '').trim();

  // Strip any accidental English spoken quotes from motion prompt
  rawMotion = rawMotion.replace(/saying\s*:\s*["'][^"']+["']/gi, '');
  rawMotion = rawMotion.replace(/saying\s+["'][^"']+["']/gi, '');
  rawMotion = rawMotion.replace(/\b(speaking|speaks|talks)\s+(in\s+)?english\b/gi, 'speaking fluent Vietnamese');
  rawMotion = rawMotion.replace(/\benglish\s+(dialogue|speech|words|lines)\b/gi, 'Vietnamese dialogue');

  const isFem = kocProfile?.isFemale ?? isFemaleVoice(voiceLabel);
  const presWord = isFem ? "attractive Asian female presenter" : "handsome Asian male presenter";
  const outfitWord = hasKocImage 
    ? (kocProfile?.outfitDesc 
        ? `wearing ${kocProfile.outfitDesc.replace(/tailored (jacket|blazer)|business blazer/gi, 'clothing from reference photo')}` 
        : "wearing the EXACT SAME outfit and clothing as shown in the reference photo (identical style, neckline, sleeves, and colors - 100% exact 1:1 match with NO jacket/blazer unless shown in photo)")
    : "wearing clean commercial clothing matching the reference photo";

  // KHÓA CHẶT QUY TẮC NHÂN VẬT CHỈ NÓI TIẾNG VIỆT, CẤM TUYỆT ĐỐI NÓI TIẾNG ANH
  const speechRule = vietnameseDialogue
    ? `The presenter speaks natural fluent Vietnamese with authentic Vietnamese mouth movements and lip-sync, expressing: "${vietnameseDialogue}". ABSOLUTELY NO English speech, NO English dialogue, 100% Vietnamese spoken language only. `
    : "The presenter speaks natural fluent Vietnamese with accurate Vietnamese lip-sync, absolutely no English spoken dialogue. ";

  // 🏠 QUY TRÌNH RIÊNG BIỆT DÀNH RIÊNG CHO XƯỞNG GIA DỤNG (HOUSEHOLD)
  if (currentNiche === 'household') {
    return `Sleek high-converting UGC commercial video for home appliance in modern showroom: ${rawMotion ? rawMotion + '. ' : ''}Directly animating inside the showroom setting shown in Reference #1 (Scene ${scene.id} Showroom). The presenter is the SAME ${presWord} from Reference #2 (${outfitWord}, 100% locked facial identity, hair, radiant commercial smile). The featured home appliance is the EXACT product from Reference #3, showcased clearly with premium functionality. ${speechRule}Steady locked cinematic camera, natural soft daylight, authentic TikTok Shop UGC style, pristine 4k commercial finish.`;
  }

  const hasShowroom = Boolean(scene.showroomImage);
  const refContext = hasShowroom 
    ? "Directly animating the exact scene, presenter, and outfit shown in reference image #1. " 
    : "";

  if (isFirstScene) {
    return `A sleek commercial video opening, steady medium shot: ${rawMotion ? rawMotion + '. ' : ''}${refContext}${speechRule}The SAME ${presWord} ${outfitWord} gracefully showcases the featured product inside a bright modern showroom with a radiant, confident commercial smile. 100% consistent character identity and wardrobe lock, steady locked cinematic camera, soft diffused studio lighting, high production value, pristine 4k commercial quality.`;
  } else if (isLastScene) {
    return `A high-converting commercial closing clip, steady medium framing: ${rawMotion ? rawMotion + '. ' : ''}${refContext}${speechRule}The SAME ${presWord} ${outfitWord} proudly presents the product while gesturing warmly towards the bottom-left shopping area in the bright modern showroom with an inviting, radiant commercial smile. 100% consistent character identity and wardrobe lock, steady locked framing, natural soft lighting, 4k commercial finish.`;
  } else {
    return `A premium macro commercial product video: ${rawMotion ? rawMotion + '. ' : ''}${refContext}${speechRule}Crisp close-up focus on the product features and utility in action, smoothly operated by the hands of the SAME ${presWord} wearing identical sleeves matching the reference outfit. 100% consistent character identity, presenter's radiant smile visible in soft background bokeh, steady cinematic camera without spinning, soft studio lighting, pristine 4k.`;
  }
}

// BỘ GIỌNG ĐỌC KOC CHUẨN THƯƠNG MẠI (ĐỒNG NHẤT 100% CÁC CẢNH)
const KOC_VOICES = [
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Nữ Miền Bắc – Trẻ trung & Giật tít (Hot TikTok)', label: '🎙️ Nữ Miền Bắc – Trẻ trung & Bắt tai' },
  { id: 'aN7cv9yXNrfIR87bDmyD', name: 'Nam Miền Bắc – Ninh Đôn Trầm Ấm (Chuyên Gia)', label: '🎙️ Nam Bắc – Ninh Đôn Trầm Ấm' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Nữ Miền Nam – Ngọt ngào & Chốt đơn (Top Livestream)', label: '🎙️ Nữ Miền Nam – Ngọt ngào Chốt đơn' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Nam Miền Nam – Sôi nổi & Tràn năng lượng', label: '🎙️ Nam Miền Nam – Năng động Sôi nổi' }
];

// ============================================================================
// UI PRIMITIVES
// ============================================================================
const SectionLabel = ({ children }) => (
  React.createElement("div", { className: "flex items-center px-0.5 py-0.5" },
    React.createElement("span", { className: "text-[10px] font-bold text-gray-400 tracking-[0.08em] uppercase" },
      children
    )
  )
);

const PillButton = ({ icon, children, variant = 'filled', onClick, disabled, className = '', loading }) => {
  const base = 'flex items-center gap-[6px] justify-center w-full h-[38px] rounded-xl font-semibold tracking-[0.2px] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] select-none';
  const variants = {
    filled: 'bg-black hover:bg-gray-800 text-white text-[11px] px-3 shadow-sm border border-white/20',
    outline: 'border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-[11px] px-3 text-white shadow-sm',
    solid: 'bg-blue-600 hover:bg-blue-500 text-white text-[12px] px-4 shadow-lg shadow-blue-600/30'
  };

  return React.createElement("button", {
    className: `${base} ${variants[variant]} ${className}`,
    onClick: onClick,
    disabled: disabled || loading
  },
    loading ? React.createElement("div", { className: "w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" }) : (
      React.createElement(React.Fragment, null,
        icon && React.createElement("span", { className: "flex items-center justify-center text-sm" }, icon),
        React.createElement("span", null, children)
      )
    )
  );
};

const TextInput = ({ value, onChange, placeholder, label, className = '' }) => (
  React.createElement("div", { className: `flex flex-col gap-1 ${className}` },
    label && React.createElement("p", { className: "text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-0.5" }, label),
    React.createElement("input", {
      type: "text",
      value: value,
      onChange: (e) => onChange(e.target.value),
      placeholder: placeholder,
      className: "border border-white/[0.12] bg-[#12192c] hover:border-white/[0.2] focus:border-cyan-500 rounded-xl w-full h-[38px] px-3 text-[12px] font-medium text-white placeholder-gray-500 outline-none transition-all shadow-sm"
    })
  )
);

const TextArea = ({ value, onChange, placeholder, label, className = '' }) => (
  React.createElement("div", { className: `flex flex-col gap-1 ${className}` },
    label && React.createElement("p", { className: "text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-0.5" }, label),
    React.createElement("textarea", {
      value: value,
      onChange: (e) => onChange(e.target.value),
      placeholder: placeholder,
      style: { height: '70px', maxHeight: '70px', minHeight: '70px' },
      className: "border border-white/[0.12] bg-[#12192c] hover:border-white/[0.2] focus:border-cyan-500 rounded-xl w-full p-2.5 text-[12px] font-medium text-white placeholder-gray-500 outline-none transition-all resize-none no-scrollbar shadow-sm"
    })
  )
);

const SegmentedToggle = ({ value, items, onChange, className = '' }) => (
  React.createElement("div", { className: `flex w-full items-center border border-white/[0.08] rounded-xl overflow-hidden bg-white/[0.03] p-1 ${className}` },
    items.map((item) => (
      React.createElement("button", {
        key: item.value,
        type: "button",
        onClick: () => onChange(item.value),
        className: `flex-1 flex items-center justify-center gap-1.5 h-[30px] px-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
          value === item.value 
            ? 'bg-blue-600 text-white shadow-sm border border-blue-500/40' 
            : 'text-gray-400 hover:text-white hover:bg-white/[0.05]'
        }`
      },
        item.icon,
        React.createElement("span", null, item.label)
      )
    ))
  )
);

const FieldDropdown = ({ label, value, options, onChange, className = '' }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    const listener = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, []);

  return (
    React.createElement("div", { ref: ref, className: `relative flex flex-col gap-1 ${className}` },
      label && React.createElement("p", { className: "text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-0.5" }, label),
      React.createElement("button", {
        type: "button",
        onClick: () => setIsOpen(!isOpen),
        className: "w-full text-left border border-white/[0.15] bg-[#12192c] hover:border-white/[0.25] focus:border-cyan-500 rounded-xl flex items-center justify-between px-3 h-[38px] text-[12px] font-bold text-cyan-300 select-none outline-none transition-all shadow-sm cursor-pointer"
      },
        React.createElement("span", { className: "truncate pr-2" }, value),
        React.createElement("span", { className: `text-gray-400 text-xs transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}` }, "▼")
      ),
      isOpen && (
        React.createElement("div", { className: "absolute z-50 top-[calc(100%+4px)] left-0 w-full bg-[#0d1426] border border-white/[0.15] rounded-xl overflow-hidden shadow-2xl backdrop-blur-xl" },
          React.createElement("div", { className: "max-h-48 overflow-y-auto no-scrollbar py-1" },
            options.map((opt) => (
              React.createElement("button", {
                key: opt,
                type: "button",
                className: `w-full text-left px-3 py-2 text-[11px] font-semibold transition-colors ${value === opt ? 'bg-cyan-500/20 text-cyan-300 font-bold border-l-2 border-cyan-400' : 'text-gray-300 hover:bg-white/[0.06] hover:text-white'}`,
                onClick: () => { onChange(opt); setIsOpen(false); }
              },
                opt
              )
            ))
          )
        )
      )
    )
  );
};

const ProgressCircle = ({ progress, size = 60, strokeWidth = 4, color = "#06b6d4" }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    React.createElement("div", { className: "relative flex items-center justify-center", style: { width: size, height: size } },
      React.createElement("svg", { width: size, height: size, className: "rotate-[-90deg]" },
        React.createElement("circle", {
          cx: size / 2,
          cy: size / 2,
          r: radius,
          stroke: "rgba(255,255,255,0.1)",
          strokeWidth: strokeWidth,
          fill: "transparent"
        }),
        React.createElement("circle", {
          cx: size / 2,
          cy: size / 2,
          r: radius,
          stroke: color,
          strokeWidth: strokeWidth,
          fill: "transparent",
          strokeDasharray: circumference,
          style: { strokeDashoffset: offset, transition: 'stroke-dashoffset 0.3s ease' },
          strokeLinecap: "round"
        })
      ),
      React.createElement("span", { className: "absolute text-[11px] font-black text-cyan-300 tracking-tighter" },
        `${Math.round(progress)}%`
      )
    )
  );
};

// ============================================================================
// GLOBAL PERSISTENCE
// ============================================================================
const DEFAULT_GEMINI_KEY = "";
let globalStudioState = null;
try {
  const raw = localStorage.getItem('aivideo_factory_persisted_state');
  if (raw) globalStudioState = JSON.parse(raw);
} catch(e) {}

// Khởi tạo danh sách scene theo số lượng cảnh
function initScenesForCount(count = 5, existingScenes = []) {
  const templates = SCENE_STAGE_TEMPLATES[count] || SCENE_STAGE_TEMPLATES[5];
  return templates.map((tmpl, idx) => {
    const prev = existingScenes[idx];
    return {
      id: tmpl.id,
      stage: tmpl.stage,
      title: tmpl.title,
      angleName: tmpl.angleName,
      showroomImage: prev?.showroomImage || null,
      showroomStatus: prev?.showroomStatus || 'idle',
      showroomProgress: prev?.showroomProgress || 0,
      showroomJobId: prev?.showroomJobId || null,
      voiceScript: prev?.voiceScript || '',
      motionPrompt: prev?.motionPrompt || '',
      promptStatus: prev?.promptStatus || 'idle',
      videoUrl: prev?.videoUrl || null,
      videoStatus: prev?.videoStatus || 'idle',
      videoProgress: prev?.videoProgress || 0,
      jobId: prev?.jobId || null,
      assetId: prev?.assetId || null
    };
  });
}

// ============================================================================
// COMPONENT CHÍNH: VIDEO FACTORY STUDIO
// ============================================================================

// ============================================================================
// 👗 KOC FASHION PRODUCTION WORKSTATION (GOOGLE FLOW 1:1 REPLICA)
// ============================================================================

const FASHION_VIDEO_MODELS_MAP = {
  'Veo 3.1 - Lite': 'veo-3.1-lite',
  'Veo 3.1 - Fast': 'veo-3.1-fast',
  'Veo 3.1 - Quality': 'veo-3.1-quality',
  'Omni 1.1 Flash': 'omni-flash-1.1'
};

const FASHION_VIDEO_MODELS = Object.keys(FASHION_VIDEO_MODELS_MAP);
const FASHION_IMAGE_MODEL = '🍌 Nano Banana Pro';

const FASHION_PROMPT_TEMPLATES = [
  "A female KOC wearing luxury pajamas, holding a black plastic courier shipping rip bag (express delivery style) in her hands. Standing in a [Environment Style]. 9:16 vertical.",
  "The same female KOC from frame 1, still wearing her luxury pajamas. She is now holding the actual outfit from the outfit reference photo in her hands, showing the fabric to the camera. Same person, same room, same environment.",
  "The KOC has now changed into the outfit from the outfit reference photo. She is wearing the outfit exactly as shown in the reference image. Same person, same room, walking towards camera.",
  "Character and Outfit Consistency: Same person, same room, wearing the same outfit as frame 3. Striking a dynamic fashion pose, looking confidently at the camera. Identical outfit details.",
  "Character and Outfit Consistency: Same person, same room, wearing the same outfit as frame 3. Side profile fashion pose, looking over her shoulder at the camera. Identical outfit details.",
  "Character and Outfit Consistency: Same person, same room, wearing the same outfit as frame 3. Hands on hips or adjusting hair, standing tall. Identical outfit details.",
  "Character and Outfit Consistency: Same person, same room, wearing the same outfit as frame 3. Final confident pose, slightly tilting her head with a soft smile. Identical outfit details."
];

const INITIAL_FASHION_STORYBOARD = FASHION_PROMPT_TEMPLATES.map((prompt, i) => ({
  id: i + 1,
  title: "Cảnh " + String(i + 1).padStart(2, "0"),
  imagePrompt: prompt,
  imageAsset: null,
  imageStatus: "idle",
  imageProgress: 0,
  videoPrompt: "",
  videoPromptStatus: "idle",
  videoAsset: null,
  videoStatus: "idle",
  videoProgress: 0,
  model: "Veo 3.1 - Lite",
  duration: 8
}));

// ProgressCircle Component (Dark Theme with Glow Rose Accent)
function KocProgressCircle({ progress, size = 70, strokeWidth = 6 }) {
  const radius = (size - strokeWidth) / 2;
  const circ = radius * 2 * Math.PI;
  const offset = circ - (Math.min(100, Math.max(0, progress)) / 100) * circ;
  return React.createElement("div", { className: "relative flex items-center justify-center select-none", style: { width: size, height: size } },
    React.createElement("svg", { width: size, height: size, className: "rotate-[-90deg]" },
      React.createElement("circle", { cx: size / 2, cy: size / 2, r: radius, stroke: "rgba(255,255,255,0.12)", strokeWidth: strokeWidth, fill: "transparent" }),
      React.createElement("circle", {
        cx: size / 2, cy: size / 2, r: radius, stroke: "#f43f5e", strokeWidth: strokeWidth, fill: "transparent",
        strokeDasharray: circ, style: { strokeDashoffset: offset, transition: "stroke-dashoffset 0.6s cubic-bezier(0.16, 1, 0.3, 1)" }, strokeLinecap: "round"
      })
    ),
    React.createElement("span", { className: "absolute text-[12px] font-black text-white italic drop-shadow-md" },
      Math.round(progress) + "%"
    )
  );
}

// StageSection Component (Dark Theme)
function KocStageSection({ title, description, icon, children }) {
  return React.createElement("section", { className: "flex flex-col gap-6" },
    React.createElement("div", { className: "flex items-center gap-4 border-b border-white/[0.08] pb-4" },
      React.createElement("div", { className: "w-13 h-13 rounded-2xl bg-white/[0.05] border border-white/[0.1] shadow-xl flex items-center justify-center text-3xl shadow-rose-500/5 flex-shrink-0" },
        icon
      ),
      React.createElement("div", null,
        React.createElement("h2", { className: "text-2xl md:text-3xl font-black italic tracking-tight uppercase leading-none mb-1 text-white" }, title),
        React.createElement("p", { className: "text-[11px] text-rose-400 font-bold uppercase tracking-widest" }, description)
      )
    ),
    React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" },
      children
    )
  );
}

// PillButton Component (Dark Theme with Glowing Effects)
function KocPillButton({ icon, children, variant = 'filled', onClick, disabled, className = '', loading, progress }) {
  const base = 'flex items-center gap-2 justify-center w-full h-[44px] rounded-xl font-black tracking-tight transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-[12px] relative overflow-hidden active:scale-[0.98] select-none';
  const variants = {
    filled: 'bg-white/10 hover:bg-white/15 text-white px-4 border border-white/10 font-bold',
    outline: 'border border-white/20 hover:border-rose-500 hover:bg-rose-500/10 text-white px-4 bg-white/[0.02] font-bold',
    solid: 'bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white px-4 shadow-lg shadow-rose-600/30 font-black'
  };
  const progressBg = variant === 'solid' ? 'bg-white/25' : 'bg-rose-500/30';

  return React.createElement("button", {
    className: base + " " + (variants[variant] || variants.filled) + " " + className,
    onClick: onClick,
    disabled: disabled || loading
  },
    loading && progress !== undefined && React.createElement("div", {
      className: "absolute inset-0 " + progressBg + " transition-all duration-300 ease-out",
      style: { width: progress + "%" }
    }),
    React.createElement("div", { className: "relative z-10 flex items-center justify-center gap-2" },
      loading ? React.createElement("span", { className: "text-[16px] animate-spin" }, "⏳") : icon,
      React.createElement("span", { className: "uppercase italic font-black tracking-wider text-white" },
        loading && progress !== undefined ? Math.round(progress) + "%" : children
      )
    )
  );
}

// TextInput Component (Dark Theme, High-Contrast White Text)
function KocTextInput({ value, onChange, placeholder, label, className = '' }) {
  return React.createElement("div", { className: "flex flex-col gap-1.5 " + className },
    label && React.createElement("p", { className: "text-[10px] font-black text-gray-300 tracking-[0.1em] pl-1 uppercase" }, label),
    React.createElement("textarea", {
      value: value,
      onChange: e => onChange(e.target.value),
      placeholder: placeholder,
      className: "border border-white/[0.12] hover:border-white/[0.25] focus:border-rose-500/80 rounded-xl w-full h-[80px] px-3.5 py-2.5 resize-none bg-white/[0.04] text-[12px] font-bold text-white placeholder-gray-500 tracking-tight focus:outline-none transition-all shadow-inner leading-relaxed select-text"
    })
  );
}

// FieldDropdown Component (Dark Theme)
function KocFieldDropdown({ label, value, options, onChange, className = '' }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return React.createElement("div", { ref: ref, className: "relative " + className },
    React.createElement("button", {
      type: "button",
      onClick: () => setIsOpen(!isOpen),
      className: "w-full text-left border border-white/[0.12] hover:border-white/[0.25] transition-all rounded-xl flex flex-col gap-0.5 justify-center pb-2 pl-3.5 pr-3 pt-[8px] select-none focus:outline-none bg-white/[0.04] shadow-sm cursor-pointer"
    },
      React.createElement("p", { className: "text-[9px] font-black text-gray-400 tracking-wider uppercase" }, label),
      React.createElement("div", { className: "flex items-center justify-between" },
        React.createElement("span", { className: "text-[12px] font-black text-white tracking-tight truncate pr-2 italic" }, value),
        React.createElement("span", { className: "text-[12px] text-gray-400 transition-transform duration-200 " + (isOpen ? "rotate-180" : "") }, "▼")
      )
    ),
    isOpen && React.createElement("div", { className: "absolute z-50 top-[calc(100%+6px)] left-0 w-full bg-[#0c1020] border border-white/[0.15] rounded-xl overflow-hidden shadow-2xl animate-dropdown origin-top" },
      React.createElement("div", { className: "max-h-60 overflow-y-auto no-scrollbar p-1.5" },
        options.map(opt =>
          React.createElement("button", {
            key: opt,
            type: "button",
            className: "w-full text-left px-3 py-2 rounded-lg text-[12px] font-black tracking-tight transition-colors cursor-pointer " + (value === opt ? "bg-rose-600 text-white italic" : "text-gray-300 hover:bg-white/[0.08] hover:text-white"),
            onClick: () => { onChange(opt); setIsOpen(false); }
          }, opt)
        )
      )
    )
  );
}

// 🎬 KỊCH BẢN CHUYỂN ĐỘNG CHUẨN 1:1 GOOGLE FLOW (TEMPORAL UGC FASHION & SOUNDSCAPE)
function getSmartMotionPrompt(sceneId, creativeDirection = '', outfitName = '') {
  const loc = creativeDirection ? `in ${creativeDirection}` : 'in a luxury bedroom';
  switch (Number(sceneId)) {
    case 1:
      const garment = outfitName ? `a gorgeous ${outfitName} matching the reference photo` : 'the stunning new garment matching the reference outfit';
      return `A young East Asian woman with long wavy black hair wearing pajamas ${loc}, starts in the exact pose shown holding a black shipping bag. Over 8 seconds, she excitedly unboxes the package, peeling open the bag to reveal ${garment}. She holds the dress up against herself, beaming with a delighted closed-mouth smile. Handheld shaky camera. Mouth strictly closed. Soundscape: soft plastic package peeling, gentle crinkling courier bag, delicate fabric rustle, ambient room tone.`;
    case 2:
      return `The same female KOC starts in the exact pose shown ${loc}. Over 8 seconds, while standing in place she takes 1 gentle step closer to the camera to inspect garment quality, slowly turning and rotating the dress front and back, delicately feeling and rubbing the fabric texture between her fingers, and holding it against herself so viewers can clearly perceive the weave and premium material quality. All movements are calm, slow-paced, graceful and feminine (strictly NO rapid spinning or frantic head shaking). Handheld smartphone camera with subtle natural breathing shake. Mouth strictly closed throughout. Soundscape: soft fabric rubbing, delicate textile rustle, quiet room ambience.`;
    case 3:
      return `The same female KOC starts in the exact pose shown, now wearing the stunning new outfit ${loc}. Over 8 seconds, she performs a confident fashion walk towards the camera, smiling warmly with mouth closed. Handheld tracking camera slowly stepping backward. Mouth strictly closed throughout. Soundscape: gentle footstep sounds, delicate fabric swishing with movement, peaceful room tone.`;
    case 4:
      return `The same female KOC starts in the exact pose shown ${loc}. Over 8 seconds, she performs a playful 360-degree spin, gracefully showcasing the dress silhouette, drape, and back design with a radiant closed-mouth smile. Smooth handheld circular camera follow. Mouth strictly closed throughout. Soundscape: fabric whoosh, soft air movement, gentle room acoustics.`;
    case 5:
      return `The same female KOC starts in the exact pose shown ${loc}. Over 8 seconds, she poses with an elegant over-the-shoulder look, gently tucking her hair while smiling warmly at the camera with mouth firmly closed. Subtle handheld camera drift, soft flattering lighting. Mouth strictly closed throughout. Soundscape: faint hair touch, soft room tone, quiet atmospheric hum.`;
    case 6:
      return `The same female KOC starts in the exact pose shown ${loc}. Over 8 seconds, she strikes a confident fashion stance with hands on her hips, swaying slightly to highlight the garment's fit and movement, beaming with closed lips. Handheld natural eye-level framing. Mouth strictly closed throughout. Soundscape: subtle cloth rustling, gentle indoor room acoustics.`;
    case 7:
      return `The same female KOC starts in the exact pose shown ${loc}. Over 8 seconds, she gives a friendly, charming wave to the camera and takes a gentle step back as a closing gesture, smiling happily with mouth closed. Handheld camera slowly pulling back. Mouth strictly closed throughout. Soundscape: gentle hand motion in air, soft room ambience, calm closing vibe.`;
    default:
      return `The female KOC starts in the exact pose shown ${loc}. She performs natural fashion posing movements showcasing the outfit with mouth strictly closed. Handheld UGC smartphone camera. Mouth strictly closed throughout. Soundscape: fabric rustling, natural room ambience.`;
  }
}

// HELPER TRÍCH XUẤT ẢNH BASE64 AN TOÀN TUYỆT ĐỐI CHO GEMINI VISION & BROWSER DIRECTOR
async function ensureAssetBase64(asset) {
  if (!asset) return null;
  try {
    let raw = asset.base64 || asset.dataUrl;
    if (!raw && typeof asset.url === 'string' && asset.url.startsWith('data:')) {
      raw = asset.url;
    }
    if (typeof raw === 'string') {
      if (raw.includes(';base64,')) {
        const parts = raw.split(';base64,');
        if (parts[1] && parts[1].length > 50) return parts[1].trim();
      } else if (raw.includes(',')) {
        const parts = raw.split(',');
        if (parts[1] && parts[1].length > 50) return parts[1].trim();
      } else if (raw.length > 50 && !raw.startsWith('http') && !raw.startsWith('file:')) {
        return raw.trim();
      }
    }

    const urlToFetch = asset.localPath 
      ? ('file:///' + asset.localPath.replace(/\\/g, '/')) 
      : (asset.url || asset.thumbnailUrl || null);

    if (urlToFetch) {
      try {
        const resp = await fetch(urlToFetch);
        if (resp.ok) {
          const blob = await resp.blob();
          const b64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const res = reader.result;
              if (typeof res === 'string' && res.includes(',')) {
                resolve(res.split(',')[1]);
              } else {
                resolve(null);
              }
            };
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          });
          if (b64) return b64;
        }
      } catch (_) {}

      if (typeof document !== 'undefined') {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = urlToFetch;
          await new Promise((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = (e) => reject(e);
            setTimeout(() => reject(new Error('Image timeout')), 3500);
          });
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width || 512;
          canvas.height = img.naturalHeight || img.height || 512;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
            if (dataUrl && dataUrl.includes(',')) {
              return dataUrl.split(',')[1];
            }
          }
        } catch (_) {}
      }
    }
  } catch (err) {
    console.warn('[ensureAssetBase64] Error extracting base64:', err);
  }
  return null;
}

function isValidMotionPrompt(text) {
  if (!text || typeof text !== 'string') return false;
  const t = text.trim();
  if (t.length < 25) return false;
  if (t.includes('googleapis.com') || t.includes('google.rpc') || t.includes('ErrorInfo')) return false;
  if (t.includes('RESOURCE_EXHAUSTED') || t.includes('RATE_LIMIT') || t.includes('PERMISSION_DENIED')) return false;
  if (t.startsWith('{') && t.endsWith('}')) return false;
  return true;
}

async function callGeminiVisionDirector(frame, action, apiKey, outfitAsset = null) {
  if (!frame?.imageAsset) {
    return { ok: false, error: "Cảnh này chưa có hình ảnh để phân tích" };
  }

  const cleanB64 = await ensureAssetBase64(frame.imageAsset);
  if (!cleanB64) {
    return { ok: false, error: "Không thể trích xuất ảnh base64 của Cảnh " + frame.id };
  }

  const isScene1 = Number(frame.id) === 1;
  let outfitB64 = '';
  if (isScene1 && outfitAsset) {
    try {
      outfitB64 = await ensureAssetBase64(outfitAsset);
    } catch (_) {}
  }

  let promptText = '';
  let parts = [];

  if (isScene1 && outfitB64) {
    parts = [
      { inline_data: { mime_type: 'image/jpeg', data: cleanB64 } },
      { inline_data: { mime_type: 'image/jpeg', data: outfitB64 } }
    ];

    promptText = `You are the master cinematic AI director for Google Veo 3 and Veo 3.1 video production.
You are provided with TWO reference images:
- Image 1: The starting video pose for Scene 1 showing a young East Asian female presenter holding a sealed black courier shopping bag in a luxury bedroom/setting.
- Image 2: The exact reference outfit photo showing the clothing/dress she bought.

YOUR TASK:
Generate a single, hyper-realistic, production-ready 8-second video motion prompt for Scene 1: Unboxing and Revealing the Exact Outfit from Image 2.

YOU MUST STRICTLY FOLLOW THIS PROVEN VIDEO SCRIPT STRUCTURE:
1. STARTING POSE ANCHOR:
   Describe the presenter based on Image 1 (e.g. "A young East Asian woman with long wavy black hair, wearing pajamas/homewear in the bedroom, starts in the exact pose shown holding a black shopping bag.").
2. METICULOUS OUTFIT EXTRACTION FROM IMAGE 2 (100% ACCURACY):
   Carefully examine Image 2. You MUST identify and detail the exact garment:
   - Garment type (e.g. mini dress, midi dress, gown, top and skirt set, blazer, jumpsuit)
   - Color and patterns (e.g. white with black polka dots, solid red, floral print, stripes)
   - Straps / Neckline / Sleeves (e.g. spaghetti straps, sleeveless, sweetheart neckline, off-shoulder)
   - Fabric texture and silhouette (e.g. silk, satin, cotton, chiffon, tiered ruffled skirt, pleated hem)
3. 8-SECOND UNBOXING ACTION PACING:
   "Over 8 seconds, she excitedly unboxes the package, peeling open the bag to reveal [detailed garment description from Image 2]. She holds the dress up against herself, beaming with a delighted closed-mouth smile."
4. CAMERA & FACIAL DIRECTING:
   "Handheld shaky camera. Mouth strictly closed." (Zero mouth distortion, authentic TikTok/Reels smartphone aesthetic).
5. AMBIENT SOUNDSCAPE LINE:
   "Soundscape: soft plastic package peeling, gentle crinkling courier bag, delicate fabric rustle, ambient room tone."

OUTPUT FORMAT:
Return ONLY the raw English prompt text ready for Veo 3. Do NOT include markdown code blocks, quotes, or conversational preamble.`;
  } else {
    parts = [
      { inline_data: { mime_type: 'image/jpeg', data: cleanB64 } }
    ];

    promptText = `You are the master cinematic AI director for Google Veo 3 and Veo 3.1 video production.
Analyze this high-fashion commercial storyboard reference photo for Scene ${frame.id}.
The primary scene action is: "${action}"

Generate a single, hyper-realistic, production-ready video motion prompt for an 8-second commercial scene.

YOU MUST STRICTLY ENFORCE THESE 6 CORE DIRECTING RULES:

RULE 1: FIRST FRAME ANCHOR (Zero Flicker Guarantee)
The video MUST seamlessly begin from the exact starting pose, facial angle, clothing details, and environment shown in the reference image. Zero jumping or flickering when transitioning from the static frame into continuous video motion.

RULE 2: NATURAL PHYSICAL INERTIA & ACTION PACING (Organic Movement)
Describe smooth, continuous physical action designed precisely for an 8-second clip. Detail physical weight shifts, natural fabric drape and inertia sway, hair movement, and elegant posture transitions.

RULE 3: MOUTH STRICTLY CLOSED (No Speaking / No Distortion)
The presenter's mouth MUST remain strictly closed throughout the entire 8-second video. They maintain a radiant, natural, genuine closed-mouth commercial smile. Absolutely NO lip movement, NO mouth opening, NO speaking animation, preventing any facial distortion.

RULE 4: SMARTPHONE UGC CAMERA STYLE (Authentic TikTok / Reels Aesthetic)
Direct the camera as an authentic handheld smartphone shot (iPhone 15 Pro UGC aesthetic). Incorporate subtle organic handheld breathing shake, dynamic focus tracking, and natural eye-level framing—NOT artificial cinematic Hollywood staging.

RULE 5: REALISTIC SOUNDSCAPE LINE (Detailed Ambient Audio Design)
At the very end of the prompt, include a dedicated ambient soundscape sentence tailored specifically to the action (e.g. realistic plastic tearing sound of the courier bag, delicate fabric rustle as the dress moves, soft footsteps on hardwood floor, warm ambient room tone).

RULE 6: METICULOUS OUTFIT & SCENE CONTINUITY (Flawless Consistency)
Maintain exact continuity with the reference image: same clothing details, same lighting temperature, same room architecture, same character likeness.

RULE 7: FEMININE, CALM, SLOW-PACED MOVEMENT (Anti-Frantic Rule)
Every character movement, gesture, and pose transition MUST be calm, gentle, slow-paced, and feminine. Strictly forbid rapid twirling, frantic spinning, or erratic head shaking.
${Number(frame.id) === 2 ? `
SPECIAL DIRECTIVE FOR SCENE 2 (GARMENT & FABRIC QUALITY INSPECTION):
The female character stands in place, takes 1 deliberate step forward closer to the camera to inspect dress quality. She gently rotates and displays the dress front and back, rubs and feels the fabric weave texture between her fingers, and holds the garment against her body so viewers can clearly see and appreciate the material quality, fabric drape, and weave details.` : ''}

OUTPUT FORMAT:
Return ONLY the raw English prompt text ready for Veo 3. Do NOT include markdown code blocks, quotes, or conversational preamble.`;
  }
  parts.push({ text: promptText });

  const modelsToTry = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-flash-latest',
    'gemini-1.5-pro'
  ];

  let lastErr = '';
  for (const model of modelsToTry) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6500);
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: parts
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 600
          }
        })
      });
      clearTimeout(timer);

      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        lastErr = errJson?.error?.message || `HTTP ${resp.status}`;
        continue;
      }

      const data = await resp.json();
      const prompt = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (prompt && isValidMotionPrompt(prompt)) {
        return { ok: true, prompt };
      }
    } catch (e) {
      lastErr = e?.message || String(e);
    }
  }

  return { ok: false, error: lastErr || "Lỗi gọi Gemini Vision API" };
}

async function callGoogleFlowDirector(frame, action, flowAccounts) {
  if (!frame?.imageAsset) {
    return { ok: false, error: "Cảnh này chưa có hình ảnh để phân tích" };
  }

  const cleanB64 = await ensureAssetBase64(frame.imageAsset);
  if (!cleanB64) {
    return { ok: false, error: "Không thể trích xuất ảnh base64 của Cảnh " + frame.id };
  }

  const bApi = window.aiforge?.browser || window.aivideo?.browser;
  if (!bApi?.analyzeMotion) {
    return { ok: false, error: "Hệ thống Browser Motion Analyzer chưa sẵn sàng trên ứng dụng" };
  }

  try {
    const res = await Promise.race([
      bApi.analyzeMotion({
        frameId: frame.id,
        action: action,
        imageBase64: cleanB64
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Flow motion timeout")), 5000))
    ]);
    if (res && res.ok && isValidMotionPrompt(res.prompt)) {
      return res;
    }
    return { ok: false, error: res?.error || "Kịch bản Google Flow không hợp lệ" };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
}

// Main FashionKocProStudio Component
// ============================================================================
// Global persistent store across tab switching
if (typeof window !== "undefined") {
  if (!window.__AIFORGE_FASHION_PERSISTENCE__) {
    let savedKoc = null, savedOutfit = null, savedStoryboard = null, savedDir = null, savedModel = null;
    let savedEngine = null, savedImgRes = null, savedVidRes = null, savedWatermark = true, savedTech = null;
    try {
      const k = localStorage.getItem("aiforge_koc_face");
      if (k) savedKoc = JSON.parse(k);
      const o = localStorage.getItem("aiforge_koc_outfit");
      if (o) savedOutfit = JSON.parse(o);
      const s = localStorage.getItem("aiforge_koc_storyboard");
      if (s) {
        const p = JSON.parse(s);
        if (Array.isArray(p) && p.length === 7) savedStoryboard = p;
      }
      savedDir = localStorage.getItem("aiforge_koc_creative_direction");
      savedModel = localStorage.getItem("aiforge_koc_video_model");
      savedEngine = localStorage.getItem("aiforge_koc_video_engine");
      savedImgRes = localStorage.getItem("aiforge_koc_img_res");
      savedVidRes = localStorage.getItem("aiforge_koc_vid_res");
      savedTech = localStorage.getItem("aiforge_koc_technical_style");
      const wm = localStorage.getItem("aiforge_koc_watermark");
      if (wm !== null) savedWatermark = wm === 'true';
    } catch (_) {}

    let savedImgEngine = "muse";
    try {
      const ie = localStorage.getItem("aiforge_koc_image_engine") || localStorage.getItem("aivideo_factory_image_engine");
      if (ie === "muse" || ie === "banana") savedImgEngine = ie;
    } catch (_) {}

    window.__AIFORGE_FASHION_PERSISTENCE__ = {
      koc: savedKoc,
      outfit: savedOutfit,
      creativeDirection: savedDir || "Phòng ngủ sang trọng hiện đại, ánh sáng ấm áp.",
      storyboard: savedStoryboard || INITIAL_FASHION_STORYBOARD,
      globalVideoModel: savedModel || "Veo 3.1 - Lite",
      technicalStyle: savedTech || "Shot on iPhone 15 Pro, authentic UGC lifestyle, luxury studio lighting, crisp 4k texture",
      videoEngine: savedEngine || "veo3",
      imageEngine: savedImgEngine || "muse",
      imageResolution: savedImgRes || "standard",
      videoResolution: savedVidRes || "720p",
      removeWatermark: savedWatermark
    };
  }
}

// Helper an toàn lấy Media URL cho Ảnh & Video trong Electron
function getKocMediaUrl(asset) {
  if (!asset) return null;
  if (typeof asset === 'string' && asset.trim()) return asset.trim();
  // 🎯 Ưu tiên số 1: Tệp cục bộ localPath để luôn hiển thị bản sạch 100% không watermark
  if (asset.localPath && typeof asset.localPath === 'string' && asset.localPath.trim()) {
    return 'file:///' + asset.localPath.replace(/\\/g, '/');
  }
  if (asset.thumbnailUrl && typeof asset.thumbnailUrl === 'string' && asset.thumbnailUrl.trim()) return asset.thumbnailUrl.trim();
  if (asset.url && typeof asset.url === 'string' && asset.url.trim()) return asset.url.trim();
  if (asset.base64 && typeof asset.base64 === 'string' && asset.base64.trim()) return asset.base64.trim();
  return null;
}

// 🎯 HÀM TIÊM BIẾN (PROMPT INJECTION) & PHONG CÁCH KỸ THUẬT CHUẨN GOOGLE FLOW
function buildSceneImagePrompt(templatePrompt, envStyle, techStyle) {
  const env = (envStyle || "Phòng ngủ sang trọng hiện đại, ánh sáng ấm áp.").trim();
  const tech = (techStyle || "Shot on iPhone 15 Pro, authentic UGC lifestyle, luxury studio lighting, crisp 4k texture").trim();
  let p = templatePrompt.replace(/\[Environment Style\]/g, env).replace(/\[Bối cảnh\]/g, env);
  if (tech && !p.includes(tech)) {
    p = `${p}, ${tech}`;
  }
  return p;
}

// 🎯 QUY TẮC NẠP ẢNH THAM CHIẾU XƯỞNG THỜI TRANG (CHUẨN 100% YÊU CẦU NGƯỜI DÙNG):
// Ảnh cảnh 1: 1 KOC gốc + 1 Outfit gốc -> [KOC, Outfit]
// Ảnh cảnh 2: 1 KOC gốc + 1 Outfit gốc + 1 Cảnh 1 -> [KOC, Outfit, Cảnh 1]
// Ảnh cảnh 3: 1 KOC gốc + 1 Outfit gốc + 1 Cảnh 2 -> [KOC, Outfit, Cảnh 2]
// Ảnh cảnh 4..7: 1 KOC gốc + 1 Outfit gốc + 1 Cảnh 3 + 1 Cảnh 1 -> [KOC, Outfit, Cảnh 3, Cảnh 1]
function getFashionSceneReferenceIds(frameId, validKocId, validOutfitId, validFrame1Id, validFrame2Id, validFrame3Id) {
  const refs = [];
  if (frameId === 1) {
    if (validKocId) refs.push(validKocId);
    if (validOutfitId) refs.push(validOutfitId);
  } else if (frameId === 2) {
    if (validKocId) refs.push(validKocId);
    if (validOutfitId) refs.push(validOutfitId);
    if (validFrame1Id) refs.push(validFrame1Id);
  } else if (frameId === 3) {
    if (validKocId) refs.push(validKocId);
    if (validOutfitId) refs.push(validOutfitId);
    if (validFrame2Id) refs.push(validFrame2Id);
  } else if (frameId >= 4) {
    if (validKocId) refs.push(validKocId);
    if (validOutfitId) refs.push(validOutfitId);
    if (validFrame3Id) refs.push(validFrame3Id);
    if (validFrame1Id) refs.push(validFrame1Id);
  }
  return refs.filter((id, idx, arr) => id && arr.indexOf(id) === idx);
}


function FashionKocProStudio({
  currentNiche,
  handleSelectNiche,
  accounts = [],
  selectedBananaAccountId,
  handleSelectBananaAccount,
  selectedVideoAccountId,
  handleSelectVideoAccount,
  autoDelMins,
  onChangeAutoDel,
  NICHE_TEMPLATES,
  geminiApiKey
}) {
  const persist = (typeof window !== "undefined" && window.__AIFORGE_FASHION_PERSISTENCE__) || {};

  const [koc, setKoc] = React.useState(persist.koc || null);
  const [outfit, setOutfit] = React.useState(persist.outfit || null);
  const [creativeDirection, setCreativeDirection] = React.useState(
    persist.creativeDirection || "Phòng ngủ sang trọng hiện đại, ánh sáng ấm áp."
  );
  const [technicalStyle, setTechnicalStyle] = React.useState(
    persist.technicalStyle || "Shot on iPhone 15 Pro, authentic UGC lifestyle, luxury studio lighting, crisp 4k texture"
  );
  const [storyboard, setStoryboard] = React.useState(persist.storyboard || INITIAL_FASHION_STORYBOARD);
  const [globalVideoModel, setGlobalVideoModel] = React.useState(persist.globalVideoModel || "Veo 3.1 - Lite");

  // ⚡ TÍCH HỢP MODEL MUSE AI & CHẤT LƯỢNG / WATERMARK NHƯ XƯỞNG GIA DỤNG
  const [videoEngine, setVideoEngine] = React.useState(persist.videoEngine || 'veo3'); // 'veo3' | 'muse'
  const [imageEngine, setImageEngine] = React.useState(() => {
    try {
      const ie = localStorage.getItem("aiforge_koc_image_engine");
      if (ie === "muse" || ie === "banana") return ie;
    } catch(_) {}
    return persist.imageEngine || "muse";
  }); // 'banana' | 'muse'
  const [imageResolution, setImageResolution] = React.useState(persist.imageResolution || 'standard'); // 'standard' | '2k'
  const [videoResolution, setVideoResolution] = React.useState(persist.videoResolution || '720p'); // '720p' | '1080p'
  const [removeWatermark, setRemoveWatermark] = React.useState(
    globalStudioState?.removeWatermark !== undefined ? (globalStudioState.removeWatermark === true) : (persist.removeWatermark === true)
  );

  const [isGeneratingImages, setIsGeneratingImages] = React.useState(false);
  const [isGeneratingPrompts, setIsGeneratingPrompts] = React.useState(false);
  const [isGeneratingVideos, setIsGeneratingVideos] = React.useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = React.useState(false);
  const [localApiKey, setLocalApiKey] = React.useState(() => {
    try { return localStorage.getItem('aivideo_gemini_api_key') || geminiApiKey || ''; } catch(_) { return geminiApiKey || ''; }
  });
  const [tempApiKeyInput, setTempApiKeyInput] = React.useState('');

  const dispatchLocksRef = React.useRef({ anchor1: false, anchor2: false, anchor3: false });
  const dispatchRef = React.useRef({});

  const stateRef = React.useRef({
    koc, outfit, creativeDirection, storyboard, globalVideoModel,
    videoEngine, imageResolution, videoResolution, removeWatermark
  });

  React.useEffect(() => {
    if (!localApiKey) {
      try {
        const sApi = window.aiforge?.settings || window.aivideo?.settings;
        sApi?.getGeminiApiKey?.().then(k => {
          if (k && typeof k === 'string' && (k.startsWith('AIzaSy') || k.startsWith('AQ.'))) {
            setLocalApiKey(k.trim());
            try { localStorage.setItem('aivideo_gemini_api_key', k.trim()); } catch (_) {}
          }
        }).catch(() => {});
      } catch (_) {}
    }
  }, [localApiKey]);

  React.useEffect(() => {
    stateRef.current = {
      koc, outfit, creativeDirection, technicalStyle, storyboard, globalVideoModel,
      videoEngine, imageEngine, imageResolution, videoResolution, removeWatermark
    };
    if (typeof window !== "undefined" && window.__AIFORGE_FASHION_PERSISTENCE__) {
      window.__AIFORGE_FASHION_PERSISTENCE__.koc = koc;
      window.__AIFORGE_FASHION_PERSISTENCE__.outfit = outfit;
      window.__AIFORGE_FASHION_PERSISTENCE__.creativeDirection = creativeDirection;
      window.__AIFORGE_FASHION_PERSISTENCE__.technicalStyle = technicalStyle;
      window.__AIFORGE_FASHION_PERSISTENCE__.storyboard = storyboard;
      window.__AIFORGE_FASHION_PERSISTENCE__.globalVideoModel = globalVideoModel;
      window.__AIFORGE_FASHION_PERSISTENCE__.videoEngine = videoEngine;
      window.__AIFORGE_FASHION_PERSISTENCE__.imageEngine = imageEngine;
      window.__AIFORGE_FASHION_PERSISTENCE__.imageResolution = imageResolution;
      window.__AIFORGE_FASHION_PERSISTENCE__.videoResolution = videoResolution;
      window.__AIFORGE_FASHION_PERSISTENCE__.removeWatermark = removeWatermark;
    }
    try {
      localStorage.setItem("aiforge_koc_creative_direction", creativeDirection);
      localStorage.setItem("aiforge_koc_technical_style", technicalStyle);
      localStorage.setItem("aiforge_koc_video_model", globalVideoModel);
      localStorage.setItem("aiforge_koc_video_engine", videoEngine);
      localStorage.setItem("aiforge_koc_image_engine", imageEngine);
      localStorage.setItem("aiforge_koc_img_res", imageResolution);
      localStorage.setItem("aiforge_koc_vid_res", videoResolution);
      localStorage.setItem("aiforge_koc_watermark", String(removeWatermark));
      localStorage.setItem("aiforge_koc_storyboard", JSON.stringify(storyboard));
      if (koc) localStorage.setItem("aiforge_koc_face", JSON.stringify(koc));
      if (outfit) localStorage.setItem("aiforge_koc_outfit", JSON.stringify(outfit));
    } catch (_) {}
  }, [koc, outfit, creativeDirection, technicalStyle, storyboard, globalVideoModel, videoEngine, imageEngine, imageResolution, videoResolution, removeWatermark]);

  // ⚡ Tự động đồng bộ tài khoản video khi chuyển đổi Engine giữa Muse AI và Veo 3
  React.useEffect(() => {
    const isMuse = videoEngine === 'muse';
    const vAccs = (accounts || []).filter(a => isMuse ? (a.providerId === 'muse' || a.provider?.toLowerCase().includes('muse')) : (a.providerId === 'veo3'));
    if (vAccs.length > 0) {
      const curExists = selectedVideoAccountId === 'auto' || vAccs.some(a => a.accountId === selectedVideoAccountId);
      if (!curExists) {
        handleSelectVideoAccount('auto');
      }
    }
  }, [videoEngine, accounts]);

  const updateFrame = React.useCallback((id, updates) => {
    setStoryboard(prev => {
      const next = prev.map(f => f.id === id ? { ...f, ...updates } : f);
      if (typeof window !== "undefined" && window.__AIFORGE_FASHION_PERSISTENCE__) {
        window.__AIFORGE_FASHION_PERSISTENCE__.storyboard = next;
      }
      try { localStorage.setItem("aiforge_koc_storyboard", JSON.stringify(next)); } catch (_) {}
      return next;
    });
  }, []);

  // Hidden inputs for file selecting
  const kocInputRef = React.useRef(null);
  const outfitInputRef = React.useRef(null);

  const handleFileUpload = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target.result;
      let assetId = null;
      const api = window.aiforge?.assets || window.aivideo?.assets;
      if (api?.importReference) {
        try {
          const imp = await api.importReference({
            name: file.name,
            mimeType: file.type || "image/jpeg",
            dataUrl: base64
          });
          assetId = imp?.id || null;
        } catch (err) {
          console.error("importReference error:", err);
        }
      }
      const assetObj = { name: file.name, mediaId: assetId || ("ref-" + Date.now()), base64, mimeType: file.type || "image/jpeg", assetId };
      if (type === "koc") setKoc(assetObj);
      else setOutfit(assetObj);
      toast?.success?.(type === "koc" ? "Đã nạp Gương mặt KOC tham chiếu!" : "Đã nạp Trang phục Outfit tham chiếu!");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // ⚡ BỘ ĐỒNG BỘ NỀN SIÊU TỐC: TỰ ĐỘNG QUÉT VÀ NẠP NGAY LẬP TỨC (< 1.2S)
  React.useEffect(() => {
    let isMounted = true;
    const checkJobsAndAssets = async () => {
      try {
        const queueApi = window.aiforge?.queue || window.aivideo?.queue;
        const assetsApi = window.aiforge?.assets || window.aivideo?.assets;
        if (!queueApi?.list) return;

        const [rawQueue, rawAssets] = await Promise.all([
          queueApi.list().catch(() => null),
          assetsApi?.list ? assetsApi.list().catch(() => []) : Promise.resolve([])
        ]);

        const jobs = Array.isArray(rawQueue) 
          ? rawQueue 
          : (Array.isArray(rawQueue?.jobs) ? rawQueue.jobs : []);

        const allAssets = Array.isArray(rawAssets) 
          ? rawAssets 
          : (Array.isArray(rawAssets?.assets) ? rawAssets.assets : []);

        if (!isMounted || (jobs.length === 0 && allAssets.length === 0)) return;

        const cs = stateRef.current;
        let hasChanges = false;
        const updated = cs.storyboard.map(f => {
          let nextFrame = { ...f };

          // 1. Quét trạng thái Cảnh Ảnh
          if (f.imageStatus === "generating") {
            let matchedJob = null;
            if (f.imageJobId) {
              matchedJob = jobs.find(j => j.id === f.imageJobId);
            }
            if (!matchedJob) {
              const runStart = f.imageRunStartTime || 0;
              matchedJob = jobs.find(j => {
                if (j.type !== "Image" && j.jobType !== "Image") return false;
                const title = j.title || j.payload?.title || "";
                if (!title.includes(`Storyboard Cảnh ${f.id}`)) return false;
                const jTime = new Date(j.createdAt || j.created_at || 0).getTime();
                return jTime >= (runStart - 5000);
              });
            }

            if (matchedJob) {
              const prog = matchedJob.progress || 0;
              if (prog > nextFrame.imageProgress) {
                nextFrame.imageProgress = prog;
                hasChanges = true;
              }
              const st = (matchedJob.status || "").toLowerCase();
              if (st === "completed" || st === "done" || st === "succeeded") {
                // 🎯 TRÍCH XUẤT ASSET CHUẨN XÁC 100% TỪ JOB RESULT VÀ ALL ASSETS
                const resAsset = matchedJob.result?.assets?.[0];
                const matchedAsset = (allAssets || []).find(a => 
                  (matchedJob.id && a.jobId === matchedJob.id) || 
                  (matchedJob.resultAssetId && a.id === matchedJob.resultAssetId) || 
                  (matchedJob.result?.assetId && a.id === matchedJob.result?.assetId) || 
                  (resAsset && (a.id === resAsset.assetId || a.id === resAsset.id || a.url === resAsset.url))
                ) || resAsset;

                const bestUrl = matchedAsset ? (
                  (matchedAsset.localPath ? 'file:///' + matchedAsset.localPath.replace(/\\/g, '/') : '') ||
                  matchedAsset.thumbnailUrl || 
                  matchedAsset.url || 
                  matchedAsset.base64 || 
                  ''
                ) : '';

                if (bestUrl) {
                  nextFrame.imageAsset = {
                    id: matchedAsset?.assetId || matchedAsset?.id || ("asset-img-" + f.id),
                    url: bestUrl,
                    thumbnailUrl: matchedAsset?.thumbnailUrl || bestUrl,
                    localPath: matchedAsset?.localPath || '',
                    base64: bestUrl
                  };
                  nextFrame.imageStatus = "done";
                  nextFrame.imageProgress = 100;
                  hasChanges = true;

                  // 🎯 NỐI CHUỖI TỰ ĐỘNG: C1 XONG -> C2; C2 XONG -> C3; C3 XONG -> C4-7
                  if (f.id === 1) {
                    setTimeout(() => dispatchScenesWaitingAnchor1(nextFrame.imageAsset), 500);
                  } else if (f.id === 2) {
                    setTimeout(() => dispatchScenesWaitingAnchor2(nextFrame.imageAsset), 500);
                  } else if (f.id === 3) {
                    setTimeout(() => dispatchScenesWaitingAnchor3(nextFrame.imageAsset), 500);
                  }
                }
              } else if (st === "failed" || st === "error") {
                nextFrame.imageStatus = "error";
                hasChanges = true;
              }
            }
          } else if (!getKocMediaUrl(f.imageAsset) && f.imageStatus === "done") {
            // Tự động phục hồi nếu trước đó bị lưu trúng object không có URL
            const fallback = (allAssets || []).find(a => 
              a.type === 'image' && (
                a.name?.toLowerCase().includes(`storyboard_canh_${f.id}`) ||
                a.name?.toLowerCase().includes(`storyboard_canh${f.id}`) ||
                a.prompt?.includes(`Storyboard Cảnh ${f.id}`)
              )
            );
            if (fallback) {
              const bUrl = (fallback.localPath ? 'file:///' + fallback.localPath.replace(/\\/g, '/') : '') || fallback.thumbnailUrl || fallback.url || fallback.base64 || '';
              if (bUrl) {
                nextFrame.imageAsset = {
                  id: fallback.id,
                  url: bUrl,
                  thumbnailUrl: fallback.thumbnailUrl || bUrl,
                  localPath: fallback.localPath || '',
                  base64: bUrl
                };
                hasChanges = true;
              }
            } else {
              nextFrame.imageAsset = null;
              nextFrame.imageStatus = "idle";
              hasChanges = true;
            }
          }

          // 2. Quét trạng thái Cảnh Video
          if (f.videoStatus === "generating") {
            let matchedJob = null;
            if (f.videoJobId) {
              matchedJob = jobs.find(j => j.id === f.videoJobId);
            }
            if (!matchedJob) {
              const runStart = f.videoRunStartTime || 0;
              matchedJob = jobs.find(j => {
                if (j.type !== "Video" && j.jobType !== "Video") return false;
                const title = j.title || j.payload?.title || "";
                if (!title.includes(`Video Cảnh ${f.id}`)) return false;
                const jTime = new Date(j.createdAt || j.created_at || 0).getTime();
                return jTime >= (runStart - 5000);
              });
            }

            if (matchedJob) {
              const prog = matchedJob.progress || 0;
              if (prog > nextFrame.videoProgress) {
                nextFrame.videoProgress = prog;
                hasChanges = true;
              }
              const st = (matchedJob.status || "").toLowerCase();
              if (st === "completed" || st === "done" || st === "succeeded") {
                const resAsset = matchedJob.result?.assets?.[0];
                const matchedVideoAsset = (allAssets || []).find(a => 
                  (matchedJob.id && a.jobId === matchedJob.id) || 
                  (matchedJob.resultAssetId && a.id === matchedJob.resultAssetId) || 
                  (matchedJob.result?.assetId && a.id === matchedJob.result?.assetId) || 
                  (resAsset && (a.id === resAsset.assetId || a.id === resAsset.id || a.url === resAsset.url))
                ) || resAsset;

                const bestVideoUrl = matchedVideoAsset ? (
                  (matchedVideoAsset.localPath ? 'file:///' + matchedVideoAsset.localPath.replace(/\\/g, '/') : '') || 
                  matchedVideoAsset.url || 
                  matchedVideoAsset.base64 || 
                  ''
                ) : '';

                if (bestVideoUrl) {
                  nextFrame.videoAsset = {
                    id: matchedVideoAsset?.assetId || matchedVideoAsset?.id || ("asset-vid-" + f.id),
                    url: bestVideoUrl,
                    localPath: matchedVideoAsset?.localPath || '',
                    base64: bestVideoUrl
                  };
                  nextFrame.videoStatus = "done";
                  nextFrame.videoProgress = 100;
                  hasChanges = true;
                }
              } else if (st === "failed" || st === "error") {
                nextFrame.videoStatus = "error";
                nextFrame.videoError = matchedJob.error || matchedJob.statusText || "Lỗi tạo video";
                hasChanges = true;
              }
            }
          } else if (!getKocMediaUrl(f.videoAsset) && f.videoStatus === "done") {
            const fallbackVid = (allAssets || []).find(a => 
              a.type === 'video' && (
                a.name?.toLowerCase().includes(`video_canh_${f.id}`) ||
                a.prompt?.includes(`Video Cảnh ${f.id}`)
              )
            );
            if (fallbackVid) {
              const bUrl = (fallbackVid.localPath ? 'file:///' + fallbackVid.localPath.replace(/\\/g, '/') : '') || fallbackVid.url || fallbackVid.base64 || '';
              if (bUrl) {
                nextFrame.videoAsset = {
                  id: fallbackVid.id,
                  url: bUrl,
                  localPath: fallbackVid.localPath || '',
                  base64: bUrl
                };
                hasChanges = true;
              }
            } else {
              nextFrame.videoAsset = null;
              nextFrame.videoStatus = "idle";
              hasChanges = true;
            }
          }

          return nextFrame;
        });

        if (hasChanges && isMounted) {
          setStoryboard(updated);
          if (typeof window !== "undefined" && window.__AIFORGE_FASHION_PERSISTENCE__) {
            window.__AIFORGE_FASHION_PERSISTENCE__.storyboard = updated;
          }
          try { localStorage.setItem("aiforge_koc_storyboard", JSON.stringify(updated)); } catch (_) {}
        }

        // 🎯 TỰ ĐỘNG ĐIỀU PHỐI CHUỖI MỎ NEO TỰ ĐỘNG 7 CẢNH (ANCHOR AUTOPILOT)
        const curFrames = updated;
        const f1 = curFrames.find(f => f.id === 1);
        const f2 = curFrames.find(f => f.id === 2);
        const f3 = curFrames.find(f => f.id === 3);

        const f1Asset = f1?.imageAsset;
        const f2Asset = f2?.imageAsset;
        const f3Asset = f3?.imageAsset;

        const isF1Done = f1?.imageStatus === "done" && Boolean(getKocMediaUrl(f1Asset));
        const isF2Done = f2?.imageStatus === "done" && Boolean(getKocMediaUrl(f2Asset));
        const isF3Done = f3?.imageStatus === "done" && Boolean(getKocMediaUrl(f3Asset));

        // 1. CẢNH 1 XONG -> TỰ ĐỘNG NỐI CHUỖI CẢNH 2
        if (isF1Done && f2 && (f2.imageStatus === "waiting_anchor_1" || f2.imageStatus === "waiting_anchor") && !dispatchLocksRef.current.anchor1) {
          dispatchLocksRef.current.anchor1 = true;
          const handler = dispatchRef.current.dispatchScenesWaitingAnchor1 || dispatchScenesWaitingAnchor1;
          handler(f1Asset).finally(() => {
            dispatchLocksRef.current.anchor1 = false;
          });
        }

        // 2. CẢNH 2 XONG -> TỰ ĐỘNG NỐI CHUỖI CẢNH 3
        if (isF2Done && f3 && (f3.imageStatus === "waiting_anchor_2" || f3.imageStatus === "waiting_anchor") && !dispatchLocksRef.current.anchor2) {
          dispatchLocksRef.current.anchor2 = true;
          const handler = dispatchRef.current.dispatchScenesWaitingAnchor2 || dispatchScenesWaitingAnchor2;
          handler(f2Asset).finally(() => {
            dispatchLocksRef.current.anchor2 = false;
          });
        }

        // 3. CẢNH 3 XONG -> TỰ ĐỘNG NỐI CHUỖI CẢNH 4, 5, 6, 7
        const hasWaiting4to7 = curFrames.some(f => f.id >= 4 && (f.imageStatus === "waiting_anchor_3" || f.imageStatus === "waiting_anchor"));
        if (isF3Done && hasWaiting4to7 && !dispatchLocksRef.current.anchor3) {
          dispatchLocksRef.current.anchor3 = true;
          const handler = dispatchRef.current.dispatchScenesWaitingAnchor3 || dispatchScenesWaitingAnchor3;
          handler(f3Asset).finally(() => {
            dispatchLocksRef.current.anchor3 = false;
          });
        }

        // 4. KIỂM TRA HOÀN TẤT TOÀN BỘ 7 CẢNH
        const allImagesDone = curFrames.length === 7 && curFrames.every(f => f.imageStatus === "done");
        const nonePendingOrGenerating = !curFrames.some(f => f.imageStatus === "generating" || (typeof f.imageStatus === 'string' && f.imageStatus.startsWith("waiting_anchor")));
        if (nonePendingOrGenerating && isMounted) {
          setIsGeneratingImages(false);
          if (allImagesDone && window.__AIFORGE_FASHION_BATCH_ACTIVE__) {
            window.__AIFORGE_FASHION_BATCH_ACTIVE__ = false;
            toast?.success?.("🎉 Tuyệt vời! Đã sản xuất tự động toàn bộ 7 cảnh ảnh thành công!");
          }
        }
      } catch (e) {
        console.warn("[KOC Studio Sync Error]:", e);
      }
    };

    checkJobsAndAssets();
    const timer = setInterval(checkJobsAndAssets, 1000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, []);

  // 1. Tạo 1 Ảnh Đơn Lẻ (Chuỗi tham chiếu Google Flow: Cảnh 1 -> 2,3 -> 4,5,6,7)

  const generateSingleImage = async (frameId) => {
    const cs = stateRef.current;
    if (!cs.koc || !cs.outfit) {
      toast?.warn?.("Vui lòng tải lên cả Gương mặt KOC và Mẫu Trang phục trước!");
      return;
    }

    const now = Date.now();
    updateFrame(frameId, {
      imageStatus: "generating",
      imageProgress: 15,
      imageAsset: null,
      imageJobId: null,
      imageRunStartTime: now,
      videoAsset: null,
      videoStatus: "idle",
      videoProgress: 0,
      videoJobId: null,
      videoRunStartTime: 0,
      videoPrompt: "",
      videoPromptStatus: "idle"
    });

    try {
      const frame = cs.storyboard.find(f => f.id === frameId);
      if (!frame) return;
      const finalPrompt = buildSceneImagePrompt(frame.imagePrompt, cs.creativeDirection, cs.technicalStyle);

      const validKocId = await ensureRegisteredAsset(cs.koc, 'koc_face.jpg');
      const validOutfitId = await ensureRegisteredAsset(cs.outfit, 'outfit_sample.jpg');
      if (validKocId && validKocId !== cs.koc.assetId) {
        setKoc(prev => prev ? { ...prev, assetId: validKocId, mediaId: validKocId } : prev);
      }
      if (validOutfitId && validOutfitId !== cs.outfit.assetId) {
        setOutfit(prev => prev ? { ...prev, assetId: validOutfitId, mediaId: validOutfitId } : prev);
      }

      // 🎯 QUY TẮC NẠP ẢNH THAM CHIẾU XƯỞNG THỜI TRANG (CHUẨN 100% YÊU CẦU NGƯỜI DÙNG):
      // Cảnh 1: [KOC gốc, Outfit gốc]
      // Cảnh 2: [KOC gốc, Outfit gốc, Cảnh 1]
      // Cảnh 3: [KOC gốc, Outfit gốc, Cảnh 2]
      // Cảnh 4..7: [KOC gốc, Outfit gốc, Cảnh 3, Cảnh 1]
      let validFrame1Id = null;
      let validFrame2Id = null;
      let validFrame3Id = null;

      if (frameId === 2 || frameId >= 4) {
        const frame1 = cs.storyboard.find(f => f.id === 1);
        if (frame1?.imageAsset) {
          validFrame1Id = await ensureRegisteredAsset(frame1.imageAsset, 'koc_scene_1.jpg');
        }
      }
      if (frameId === 3) {
        const frame2 = cs.storyboard.find(f => f.id === 2);
        if (frame2?.imageAsset) {
          validFrame2Id = await ensureRegisteredAsset(frame2.imageAsset, 'koc_scene_2.jpg');
        }
      }
      if (frameId >= 4) {
        const frame3 = cs.storyboard.find(f => f.id === 3);
        if (frame3?.imageAsset) {
          validFrame3Id = await ensureRegisteredAsset(frame3.imageAsset, 'koc_scene_3.jpg');
        }
      }

      const refs = getFashionSceneReferenceIds(frameId, validKocId, validOutfitId, validFrame1Id, validFrame2Id, validFrame3Id);

      const qApi = window.aiforge?.queue || window.aivideo?.queue;
      if (!qApi?.addJobs && !qApi?.addJob) throw new Error("Hệ thống Queue chưa sẵn sàng");

      const liveSessions = (window.aiforge?.browser?.listSessions?.() || window.aivideo?.browser?.listSessions?.() || []);
      const effectiveAccs = (accounts && accounts.length > 0) ? accounts : liveSessions;
      const curEng = (cs.imageEngine || imageEngine || 'muse');
      const isM = curEng === 'muse';
      window.__aiforge_koc_single_banana_counter = (window.__aiforge_koc_single_banana_counter || 0) + 1;
      const accInfo = resolveFashionImageAccount(curEng, selectedBananaAccountId, window.__aiforge_koc_single_banana_counter - 1);
      const targetAccId = accInfo.accountId;
      const targetAccName = accInfo.accountName;
      const isManualBanana = accInfo.isManual;

      const jobInput = {
        title: `[KOC Thời Trang] Storyboard Cảnh ${frameId}`,
        type: "Image",
        providerId: isM ? "muse" : "banana",
        provider: isM ? "Muse AI" : "Banana",
        autoRemoveWatermark: cs.removeWatermark === true,
        removeWatermark: cs.removeWatermark === true,
        ...(targetAccId ? { accountId: targetAccId, account: targetAccName } : {}),
        payload: {
          title: `[KOC Thời Trang] Storyboard Cảnh ${frameId}`,
          prompt: isM && !finalPrompt.toLowerCase().startsWith('tạo ảnh') ? `Tạo ảnh 9:16: ${finalPrompt}` : finalPrompt,
          ratio: "9:16",
          aspectRatio: "9:16",
          referenceAssetIds: refs,
          referenceLocalPaths: refLocalPaths,
          model: isM ? "muse-image" : "banana",
          modelDisplayName: isM ? "⚡ Muse AI" : "🍌 Nano Banana Pro",
          studioSource: "video-factory",
          removeWatermark: cs.removeWatermark === true,
          autoRemoveWatermark: cs.removeWatermark === true,
          upsampleResolution: cs.imageResolution === '2k' ? '2K' : 'Full HD',
          resolution: cs.imageResolution === '2k' ? '2K' : 'Standard',
          quality: cs.imageResolution === '2k' ? '2K' : 'Standard',
          imageResolution: cs.imageResolution,
          upscale2k: cs.imageResolution === '2k',
          accountSelection: isManualBanana ? "manual" : "auto"
        }
      };

      const res = await (qApi.addJobs ? qApi.addJobs([jobInput]) : qApi.addJob(jobInput));
      try { qApi.resume?.(); } catch(_) {}

      const jId = res?.results?.[0]?.job?.id || res?.results?.[0]?.id || res?.id || res?.jobId || null;
      updateFrame(frameId, { imageJobId: jId, imageStatus: "generating", imageProgress: 20 });
      toast?.info?.(`Đang tạo Cảnh ${frameId} (${refs.length} ảnh tham chiếu)... `);
    } catch (err) {
      console.error(err);
      toast?.error?.(`Lỗi tạo Cảnh ${frameId}: ` + (err?.message || err));
      updateFrame(frameId, { imageStatus: "error", imageProgress: 0 });
    }
  };

  // 🎯 BỘ PHÂN GIẢI TÀI KHOẢN TẠO ẢNH ĐA NĂNG (HỖ TRỢ CẢ MUSE AI & BANANA PRO)
  const resolveFashionImageAccount = (engine, selectedAccId, idx = 0) => {
    const isMuse = engine === 'muse';
    const liveSessions = (window.aiforge?.browser?.listSessions?.() || window.aivideo?.browser?.listSessions?.() || []);
    const all = (accounts && accounts.length > 0) ? accounts : liveSessions;
    let pool = all.filter(a => isMuse ? 
      (a.providerId === 'muse' || (a.provider && a.provider.toLowerCase().includes('muse'))) : 
      (a.providerId === 'banana' || a.provider === 'Banana')
    );
    const active = pool.filter(a => a.authStatus === 'Logged In' || a.authStatus === 'active' || !a.disabled);
    const finalPool = active.length > 0 ? active : pool;

    const isAuto = !selectedAccId || selectedAccId === 'auto';
    let curAcc = undefined;
    let isManual = false;
    if (!isAuto) {
      curAcc = all.find(a => a.accountId === selectedAccId);
      isManual = !!curAcc;
    }
    if (!curAcc && finalPool.length > 0) {
      curAcc = finalPool[idx % finalPool.length];
      isManual = false;
    }
    return {
      accountId: curAcc?.accountId || undefined,
      accountName: curAcc?.accountDisplayName || curAcc?.accountEmail || curAcc?.accountName || undefined,
      isManual
    };
  };

  // 1. TẠO 7 CẢNH ẢNH (QUY TRÌNH CHUỖI NỐI TIẾP: C1 -> C2 -> C3 -> C4..7)
  const generateAllImages = async () => {
    const cs = stateRef.current;
    if (!cs.koc || !cs.outfit) {
      toast?.warn?.("Vui lòng tải lên cả Gương mặt KOC và Mẫu Trang phục trước khi tạo kịch bản ảnh!");
      return;
    }

    dispatchLocksRef.current = { anchor1: false, anchor2: false, anchor3: false };
    window.__AIFORGE_FASHION_BATCH_ACTIVE__ = true;
    setIsGeneratingImages(true);

    const now = Date.now();
    const frame1 = cs.storyboard.find(f => f.id === 1);
    const frame2 = cs.storyboard.find(f => f.id === 2);
    const frame3 = cs.storyboard.find(f => f.id === 3);
    const hasFrame1Asset = Boolean(getKocMediaUrl(frame1?.imageAsset));
    const hasFrame2Asset = Boolean(getKocMediaUrl(frame2?.imageAsset));
    const hasFrame3Asset = Boolean(getKocMediaUrl(frame3?.imageAsset));

    try {
      const validKocId = await ensureRegisteredAsset(cs.koc, 'koc_face.jpg');
      const validOutfitId = await ensureRegisteredAsset(cs.outfit, 'outfit_sample.jpg');
      if (validKocId && validKocId !== cs.koc.assetId) {
        setKoc(prev => prev ? { ...prev, assetId: validKocId, mediaId: validKocId } : prev);
      }
      if (validOutfitId && validOutfitId !== cs.outfit.assetId) {
        setOutfit(prev => prev ? { ...prev, assetId: validOutfitId, mediaId: validOutfitId } : prev);
      }

      const qApi = window.aiforge?.queue || window.aivideo?.queue;
      if (!qApi?.addJobs && !qApi?.addJob) throw new Error("Hệ thống Queue chưa sẵn sàng");

      const helperCreateJob = (frame, refs, idx = 0) => {
        const curEng = (cs.imageEngine || imageEngine || 'muse');
        const isM = curEng === 'muse';
        const accInfo = resolveFashionImageAccount(curEng, selectedBananaAccountId, idx);
        const targetAccId = accInfo.accountId;
        const targetAccName = accInfo.accountName;
        const isManual = accInfo.isManual;
        const finalPrompt = buildSceneImagePrompt(frame.imagePrompt, cs.creativeDirection, cs.technicalStyle);

        return {
          title: `[KOC Thời Trang] Storyboard Cảnh ${frame.id}`,
          type: "Image",
          providerId: isM ? "muse" : "banana",
          provider: isM ? "Muse AI" : "Banana",
          autoRemoveWatermark: cs.removeWatermark === true,
          removeWatermark: cs.removeWatermark === true,
          ...(targetAccId ? { accountId: targetAccId, account: targetAccName } : {}),
          payload: {
            title: `[KOC Thời Trang] Storyboard Cảnh ${frame.id}`,
            prompt: isM && !finalPrompt.toLowerCase().startsWith('tạo ảnh') ? `Tạo ảnh 9:16: ${finalPrompt}` : finalPrompt,
            ratio: "9:16",
            aspectRatio: "9:16",
            referenceAssetIds: refs,
            model: isM ? "muse-image" : "banana",
            modelDisplayName: isM ? "⚡ Muse AI" : "🍌 Nano Banana Pro",
            studioSource: "video-factory",
            removeWatermark: cs.removeWatermark === true,
            autoRemoveWatermark: cs.removeWatermark === true,
            upsampleResolution: cs.imageResolution === '2k' ? '2K' : 'Full HD',
            resolution: cs.imageResolution === '2k' ? '2K' : 'Standard',
            quality: cs.imageResolution === '2k' ? '2K' : 'Standard',
            imageResolution: cs.imageResolution,
            upscale2k: cs.imageResolution === '2k',
            accountSelection: isManual ? "manual" : "auto"
          }
        };
      };

      // TRƯỜNG HỢP 1: CẢ CẢNH 1, 2, 3 ĐỀU ĐÃ CÓ ẢNH -> NẠP CẢ 7 CẢNH VỚI ĐỦ MỎ NEO!
      if (hasFrame1Asset && hasFrame2Asset && hasFrame3Asset) {
        const validFrame1Id = await ensureRegisteredAsset(frame1.imageAsset, 'koc_scene_1.jpg');
        const validFrame2Id = await ensureRegisteredAsset(frame2.imageAsset, 'koc_scene_2.jpg');
        const validFrame3Id = await ensureRegisteredAsset(frame3.imageAsset, 'koc_scene_3.jpg');
        toast?.info?.("🚀 Đang sản xuất toàn bộ 7 cảnh với đầy đủ chuỗi mỏ neo Cảnh 1, 2 & 3...");

        const jobs = cs.storyboard.map((frame, idx) => {
          const refs = getFashionSceneReferenceIds(frame.id, validKocId, validOutfitId, validFrame1Id, validFrame2Id, validFrame3Id);
          return helperCreateJob(frame, refs, idx);
        });

        setStoryboard(prev => prev.map(f => ({
          ...f,
          imageStatus: "generating",
          imageProgress: 20,
          imageRunStartTime: now
        })));

        const res = await (qApi.addJobs ? qApi.addJobs(jobs) : Promise.all(jobs.map(j => qApi.addJob(j))));
        try { qApi.resume?.(); } catch(_) {}

        const jobResults = Array.isArray(res) ? res : (res?.results || []);
        setStoryboard(prev => prev.map((f, idx) => ({
          ...f,
          imageJobId: jobResults[idx]?.job?.id || jobResults[idx]?.id || null,
          imageStatus: "generating",
          imageProgress: 20
        })));

        toast?.success?.("Đã nạp chuỗi 7 cảnh ảnh thành công!");
      } else if (hasFrame1Asset && hasFrame2Asset && !hasFrame3Asset) {
        // TRƯỜNG HỢP 2: ĐÃ CÓ CẢNH 1 & 2, CHƯA CÓ CẢNH 3: NẠP CẢNH 3 (REFS: KOC + OUTFIT + CẢNH 2), CẢNH 4-7 CHỜ CẢNH 3
        const validFrame2Id = await ensureRegisteredAsset(frame2.imageAsset, 'koc_scene_2.jpg');
        toast?.info?.("🚀 Đã có Cảnh 1 & 2! Đang nạp Cảnh 3 (Cảnh 4-7 sẽ tự động nạp ngay khi Cảnh 3 xong)...");

        const targetFrame3 = cs.storyboard.find(f => f.id === 3) || cs.storyboard[2];
        const refs3 = getFashionSceneReferenceIds(3, validKocId, validOutfitId, null, validFrame2Id, null);
        const job3 = helperCreateJob(targetFrame3, refs3, 0);

        setStoryboard(prev => prev.map(f => {
          if (f.id === 3) {
            return { ...f, imageAsset: null, imageStatus: "generating", imageProgress: 20, imageRunStartTime: now };
          }
          if (f.id >= 4) {
            return { ...f, imageAsset: null, imageStatus: "waiting_anchor_3", imageProgress: 0, imageRunStartTime: now };
          }
          return f;
        }));

        const res = await (qApi.addJobs ? qApi.addJobs([job3]) : qApi.addJob(job3));
        try { qApi.resume?.(); } catch(_) {}

        const jId = res?.results?.[0]?.job?.id || res?.results?.[0]?.id || res?.id || res?.jobId || null;
        updateFrame(3, { imageJobId: jId, imageStatus: "generating", imageProgress: 20 });
      } else if (hasFrame1Asset && !hasFrame2Asset) {
        // TRƯỜNG HỢP 3: ĐÃ CÓ CẢNH 1, CHƯA CÓ CẢNH 2: NẠP CẢNH 2 (REFS: KOC + OUTFIT + CẢNH 1), CẢNH 3 CHỜ CẢNH 2, CẢNH 4-7 CHỜ CẢNH 3
        const validFrame1Id = await ensureRegisteredAsset(frame1.imageAsset, 'koc_scene_1.jpg');
        toast?.info?.("🚀 Đã có Cảnh 1! Đang nạp Cảnh 2 (Cảnh 3 chờ C2, Cảnh 4-7 chờ C3)...");

        const targetFrame2 = cs.storyboard.find(f => f.id === 2) || cs.storyboard[1];
        const refs2 = getFashionSceneReferenceIds(2, validKocId, validOutfitId, validFrame1Id, null, null);
        const job2 = helperCreateJob(targetFrame2, refs2, 0);

        setStoryboard(prev => prev.map(f => {
          if (f.id === 2) {
            return { ...f, imageAsset: null, imageStatus: "generating", imageProgress: 20, imageRunStartTime: now };
          }
          if (f.id === 3) {
            return { ...f, imageAsset: null, imageStatus: "waiting_anchor_2", imageProgress: 0, imageRunStartTime: now };
          }
          if (f.id >= 4) {
            return { ...f, imageAsset: null, imageStatus: "waiting_anchor_3", imageProgress: 0, imageRunStartTime: now };
          }
          return f;
        }));

        const res = await (qApi.addJobs ? qApi.addJobs([job2]) : qApi.addJob(job2));
        try { qApi.resume?.(); } catch(_) {}

        const jId = res?.results?.[0]?.job?.id || res?.results?.[0]?.id || res?.id || res?.jobId || null;
        updateFrame(2, { imageJobId: jId, imageStatus: "generating", imageProgress: 20 });
      } else {
        // TRƯỜNG HỢP 4: CHƯA CÓ CẢNH 1: TẠO CẢNH 1 TRƯỚC (REFS: 1 KOC GỐC + 1 OUTFIT GỐC), CẢNH 2 CHỜ C1, CẢNH 3 CHỜ C2, CẢNH 4-7 CHỜ C3
        toast?.info?.("⚓ Đang tạo Cảnh 1 làm mỏ neo bối cảnh... Các cảnh sau sẽ tự động nối chuỗi lần lượt!");

        setStoryboard(prev => prev.map(f => {
          if (f.id === 1) {
            return { ...f, imageAsset: null, imageStatus: "generating", imageProgress: 20, imageRunStartTime: now };
          }
          if (f.id === 2) {
            return { ...f, imageAsset: null, imageStatus: "waiting_anchor_1", imageProgress: 0, imageRunStartTime: now };
          }
          if (f.id === 3) {
            return { ...f, imageAsset: null, imageStatus: "waiting_anchor_2", imageProgress: 0, imageRunStartTime: now };
          }
          return { ...f, imageAsset: null, imageStatus: "waiting_anchor_3", imageProgress: 0, imageRunStartTime: now };
        }));

        const targetFrame1 = cs.storyboard.find(f => f.id === 1) || cs.storyboard[0];
        // 🎯 Cảnh 1 chỉ nạp 1 ảnh tham chiếu KOC gốc và 1 ảnh Outfit gốc
        const refs1 = getFashionSceneReferenceIds(1, validKocId, validOutfitId, null, null, null);
        const f1Job = helperCreateJob(targetFrame1, refs1, 0);

        const res = await (qApi.addJobs ? qApi.addJobs([f1Job]) : qApi.addJob(f1Job));
        try { qApi.resume?.(); } catch(_) {}

        const jId = res?.results?.[0]?.job?.id || res?.results?.[0]?.id || res?.id || res?.jobId || null;
        updateFrame(1, { imageJobId: jId, imageStatus: "generating", imageProgress: 25 });
      }
    } catch (err) {
      console.error("Lỗi nạp batch ảnh:", err);
      toast?.error?.("Lỗi nạp ảnh: " + (err?.message || err));
      setIsGeneratingImages(false);
      window.__AIFORGE_FASHION_BATCH_ACTIVE__ = false;
    }
  };

  // 🎯 TỰ ĐỘNG NỐI CHUỖI CẢNH 2 KHI CẢNH 1 VỪA HOÀN THÀNH (REFS: KOC GỐC + OUTFIT GỐC + CẢNH 1)
  const dispatchScenesWaitingAnchor1 = async (frame1Asset) => {
    const cs = stateRef.current;
    const waitingScene = cs.storyboard.find(f => f.id === 2 && (f.imageStatus === "waiting_anchor_1" || f.imageStatus === "waiting_anchor"));
    if (!waitingScene) return;

    const effectiveFrame1Asset = frame1Asset || cs.storyboard.find(f => f.id === 1)?.imageAsset;
    if (!effectiveFrame1Asset) return;

    try {
      const qApi = window.aiforge?.queue || window.aivideo?.queue;
      if (!qApi?.addJobs && !qApi?.addJob) return;

      const validKocId = await ensureRegisteredAsset(cs.koc, 'koc_face.jpg');
      const validOutfitId = await ensureRegisteredAsset(cs.outfit, 'outfit_sample.jpg');
      const validFrame1Id = await ensureRegisteredAsset(effectiveFrame1Asset, 'koc_scene_1.jpg');

      // 🎯 Cảnh 2 chỉ nạp 1 ảnh KOC gốc, 1 ảnh Outfit gốc và 1 ảnh Cảnh 1
      const refs = getFashionSceneReferenceIds(2, validKocId, validOutfitId, validFrame1Id, null, null);
      const refLocalPaths = [cs.koc?.localPath, cs.outfit?.localPath, effectiveFrame1Asset?.localPath].filter(Boolean);

      const curEng = (cs.imageEngine || imageEngine || 'muse');
      const isM = curEng === 'muse';
      const accInfo = resolveFashionImageAccount(curEng, selectedBananaAccountId, 1);
      const targetAccId = accInfo.accountId;
      const targetAccName = accInfo.accountName;
      const isManual = accInfo.isManual;
      const finalPrompt = buildSceneImagePrompt(waitingScene.imagePrompt, cs.creativeDirection, cs.technicalStyle);

      const job = {
        title: `[KOC Thời Trang] Storyboard Cảnh 2`,
        type: "Image",
        providerId: isM ? "muse" : "banana",
        provider: isM ? "Muse AI" : "Banana",
        autoRemoveWatermark: cs.removeWatermark === true,
        removeWatermark: cs.removeWatermark === true,
        ...(targetAccId ? { accountId: targetAccId, account: targetAccName } : {}),
        payload: {
          title: `[KOC Thời Trang] Storyboard Cảnh 2`,
          prompt: isM && !finalPrompt.toLowerCase().startsWith('tạo ảnh') ? `Tạo ảnh 9:16: ${finalPrompt}` : finalPrompt,
          ratio: "9:16",
          aspectRatio: "9:16",
          referenceAssetIds: refs,
          model: isM ? "muse-image" : "banana",
          modelDisplayName: isM ? "⚡ Muse AI" : "🍌 Nano Banana Pro",
          studioSource: "video-factory",
          removeWatermark: cs.removeWatermark === true,
          autoRemoveWatermark: cs.removeWatermark === true,
          upsampleResolution: cs.imageResolution === '2k' ? '2K' : 'Full HD',
          resolution: cs.imageResolution === '2k' ? '2K' : 'Standard',
          quality: cs.imageResolution === '2k' ? '2K' : 'Standard',
          imageResolution: cs.imageResolution,
          upscale2k: cs.imageResolution === '2k',
          accountSelection: isManual ? "manual" : "auto"
        }
      };

      const now = Date.now();
      updateFrame(2, { imageStatus: "generating", imageProgress: 20, imageRunStartTime: now });

      const res = await (qApi.addJobs ? qApi.addJobs([job]) : qApi.addJob(job));
      try { qApi.resume?.(); } catch(_) {}

      const jId = res?.results?.[0]?.job?.id || res?.results?.[0]?.id || res?.id || res?.jobId || null;
      updateFrame(2, { imageJobId: jId, imageStatus: "generating", imageProgress: 20 });

      toast?.success?.("⚓ Cảnh 1 đã có mỏ neo! Đang tự động nạp Cảnh 02...");
    } catch (err) {
      console.error("Lỗi dispatch scenes anchor 1:", err);
    }
  };

  // 🎯 TỰ ĐỘNG NỐI CHUỖI CẢNH 3 KHI CẢNH 2 VỪA HOÀN THÀNH (REFS: KOC GỐC + OUTFIT GỐC + CẢNH 2)
  const dispatchScenesWaitingAnchor2 = async (frame2Asset) => {
    const cs = stateRef.current;
    const waitingScene = cs.storyboard.find(f => f.id === 3 && (f.imageStatus === "waiting_anchor_2" || f.imageStatus === "waiting_anchor"));
    if (!waitingScene) return;

    const effectiveFrame2Asset = frame2Asset || cs.storyboard.find(f => f.id === 2)?.imageAsset;
    if (!effectiveFrame2Asset) return;

    try {
      const qApi = window.aiforge?.queue || window.aivideo?.queue;
      if (!qApi?.addJobs && !qApi?.addJob) return;

      const validKocId = await ensureRegisteredAsset(cs.koc, 'koc_face.jpg');
      const validOutfitId = await ensureRegisteredAsset(cs.outfit, 'outfit_sample.jpg');
      const validFrame2Id = await ensureRegisteredAsset(effectiveFrame2Asset, 'koc_scene_2.jpg');

      // 🎯 Cảnh 3 chỉ nạp 1 ảnh KOC gốc, 1 ảnh Outfit gốc và 1 ảnh Cảnh 2
      const refs = getFashionSceneReferenceIds(3, validKocId, validOutfitId, null, validFrame2Id, null);
      const refLocalPaths = [cs.koc?.localPath, cs.outfit?.localPath, effectiveFrame2Asset?.localPath].filter(Boolean);

      const curEng = (cs.imageEngine || imageEngine || 'muse');
      const isM = curEng === 'muse';
      const accInfo = resolveFashionImageAccount(curEng, selectedBananaAccountId, 2);
      const targetAccId = accInfo.accountId;
      const targetAccName = accInfo.accountName;
      const isManual = accInfo.isManual;
      const finalPrompt = buildSceneImagePrompt(waitingScene.imagePrompt, cs.creativeDirection, cs.technicalStyle);

      const job = {
        title: `[KOC Thời Trang] Storyboard Cảnh 3`,
        type: "Image",
        providerId: isM ? "muse" : "banana",
        provider: isM ? "Muse AI" : "Banana",
        autoRemoveWatermark: cs.removeWatermark === true,
        removeWatermark: cs.removeWatermark === true,
        ...(targetAccId ? { accountId: targetAccId, account: targetAccName } : {}),
        payload: {
          title: `[KOC Thời Trang] Storyboard Cảnh 3`,
          prompt: isM && !finalPrompt.toLowerCase().startsWith('tạo ảnh') ? `Tạo ảnh 9:16: ${finalPrompt}` : finalPrompt,
          ratio: "9:16",
          aspectRatio: "9:16",
          referenceAssetIds: refs,
          model: isM ? "muse-image" : "banana",
          modelDisplayName: isM ? "⚡ Muse AI" : "🍌 Nano Banana Pro",
          studioSource: "video-factory",
          removeWatermark: cs.removeWatermark === true,
          autoRemoveWatermark: cs.removeWatermark === true,
          upsampleResolution: cs.imageResolution === '2k' ? '2K' : 'Full HD',
          resolution: cs.imageResolution === '2k' ? '2K' : 'Standard',
          quality: cs.imageResolution === '2k' ? '2K' : 'Standard',
          imageResolution: cs.imageResolution,
          upscale2k: cs.imageResolution === '2k',
          accountSelection: isManual ? "manual" : "auto"
        }
      };

      const now = Date.now();
      updateFrame(3, { imageStatus: "generating", imageProgress: 20, imageRunStartTime: now });

      const res = await (qApi.addJobs ? qApi.addJobs([job]) : qApi.addJob(job));
      try { qApi.resume?.(); } catch(_) {}

      const jId = res?.results?.[0]?.job?.id || res?.results?.[0]?.id || res?.id || res?.jobId || null;
      updateFrame(3, { imageJobId: jId, imageStatus: "generating", imageProgress: 20 });

      toast?.success?.("🎬 Cảnh 2 đã có mỏ neo! Đang tự động nạp Cảnh 03...");
    } catch (err) {
      console.error("Lỗi dispatch scenes anchor 2:", err);
    }
  };

  // 🎯 TỰ ĐỘNG NỐI CHUỖI CẢNH 4, 5, 6, 7 KHI CẢNH 3 VỪA HOÀN THÀNH (REFS: KOC GỐC + OUTFIT GỐC + CẢNH 3 + CẢNH 1)
  const dispatchScenesWaitingAnchor3 = async (frame3Asset) => {
    const cs = stateRef.current;
    const waitingScenes = cs.storyboard.filter(f => f.id >= 4 && (f.imageStatus === "waiting_anchor_3" || f.imageStatus === "waiting_anchor"));
    if (waitingScenes.length === 0) return;

    const effectiveFrame3Asset = frame3Asset || cs.storyboard.find(f => f.id === 3)?.imageAsset;
    if (!effectiveFrame3Asset) return;

    try {
      const qApi = window.aiforge?.queue || window.aivideo?.queue;
      if (!qApi?.addJobs && !qApi?.addJob) return;

      const validKocId = await ensureRegisteredAsset(cs.koc, 'koc_face.jpg');
      const validOutfitId = await ensureRegisteredAsset(cs.outfit, 'outfit_sample.jpg');
      
      const frame1 = cs.storyboard.find(f => f.id === 1);
      const validFrame1Id = frame1?.imageAsset ? await ensureRegisteredAsset(frame1.imageAsset, 'koc_scene_1.jpg') : null;
      const validFrame3Id = await ensureRegisteredAsset(effectiveFrame3Asset, 'koc_scene_3.jpg');

      // 🎯 Cảnh 4..7 chỉ nạp 1 ảnh KOC gốc, 1 ảnh Outfit gốc, 1 ảnh Cảnh 3 và 1 ảnh Cảnh 1
      const refs = getFashionSceneReferenceIds(4, validKocId, validOutfitId, validFrame1Id, null, validFrame3Id);
      const refLocalPaths = [cs.koc?.localPath, cs.outfit?.localPath, frame1?.imageAsset?.localPath, effectiveFrame3Asset?.localPath].filter(Boolean);

      const curEng = (cs.imageEngine || imageEngine || 'muse');
      const isM = curEng === 'muse';

      const jobs = waitingScenes.map((frame, idx) => {
        const accInfo = resolveFashionImageAccount(curEng, selectedBananaAccountId, idx + 3);
        const targetAccId = accInfo.accountId;
        const targetAccName = accInfo.accountName;
        const isManual = accInfo.isManual;
        const finalPrompt = buildSceneImagePrompt(frame.imagePrompt, cs.creativeDirection, cs.technicalStyle);
        return {
          title: `[KOC Thời Trang] Storyboard Cảnh ${frame.id}`,
          type: "Image",
          providerId: isM ? "muse" : "banana",
          provider: isM ? "Muse AI" : "Banana",
          autoRemoveWatermark: cs.removeWatermark === true,
          removeWatermark: cs.removeWatermark === true,
          ...(targetAccId ? { accountId: targetAccId, account: targetAccName } : {}),
          payload: {
            title: `[KOC Thời Trang] Storyboard Cảnh ${frame.id}`,
            prompt: isM && !finalPrompt.toLowerCase().startsWith('tạo ảnh') ? `Tạo ảnh 9:16: ${finalPrompt}` : finalPrompt,
            ratio: "9:16",
            aspectRatio: "9:16",
            referenceAssetIds: refs,
            model: isM ? "muse-image" : "banana",
            modelDisplayName: isM ? "⚡ Muse AI" : "🍌 Nano Banana Pro",
            studioSource: "video-factory",
            removeWatermark: cs.removeWatermark === true,
            autoRemoveWatermark: cs.removeWatermark === true,
            upsampleResolution: cs.imageResolution === '2k' ? '2K' : 'Full HD',
            resolution: cs.imageResolution === '2k' ? '2K' : 'Standard',
            quality: cs.imageResolution === '2k' ? '2K' : 'Standard',
            imageResolution: cs.imageResolution,
            upscale2k: cs.imageResolution === '2k',
            accountSelection: isManual ? "manual" : "auto"
          }
        };
      });

      const now = Date.now();
      setStoryboard(prev => prev.map(f => f.id >= 4 && (f.imageStatus === "waiting_anchor_3" || f.imageStatus === "waiting_anchor") ? {
        ...f,
        imageStatus: "generating",
        imageProgress: 20,
        imageRunStartTime: now
      } : f));

      const res = await (qApi.addJobs ? qApi.addJobs(jobs) : Promise.all(jobs.map(j => qApi.addJob(j))));
      try { qApi.resume?.(); } catch(_) {}

      const jobResults = Array.isArray(res) ? res : (res?.results || []);
      setStoryboard(prev => prev.map(f => {
        const idxInWaiting = waitingScenes.findIndex(ws => ws.id === f.id);
        if (idxInWaiting !== -1) {
          const jId = jobResults[idxInWaiting]?.job?.id || jobResults[idxInWaiting]?.id || null;
          return { ...f, imageJobId: jId, imageStatus: "generating", imageProgress: 20 };
        }
        return f;
      }));

      toast?.success?.("👗 Cảnh 3 đã có mỏ neo! Đang tự động nạp Cảnh 04, 05, 06, 07...");
    } catch (err) {
      console.error("Lỗi dispatch scenes anchor 3:", err);
    }
  };
  React.useEffect(() => {
    dispatchRef.current = {
      dispatchScenesWaitingAnchor1,
      dispatchScenesWaitingAnchor2,
      dispatchScenesWaitingAnchor3
    };
  });

  // 🧠 2. Phân Tích Chuyển Động Siêu Tốc (HỖ TRỢ GEMINI VISION API TRỰC TIẾP & BROWSER HUB & SMART DIRECTOR FALLBACK)
  const analyzeMotion = async () => {
    const cs = stateRef.current;
    
    const hasAnyImage = cs.storyboard.some(f => f.imageAsset);
    if (!hasAnyImage) {
      toast?.warn?.("Vui lòng tạo hoặc tải ảnh cho các Cảnh trước khi Phân tích chuyển động!");
      return;
    }

    let activeKey = (localApiKey || geminiApiKey || localStorage.getItem('aivideo_gemini_api_key') || '').trim();

    // Nếu chưa có activeKey, thử lấy từ main settings qua IPC
    if (!activeKey || !(activeKey.startsWith('AIzaSy') || activeKey.startsWith('AQ.'))) {
      try {
        const sApi = window.aiforge?.settings || window.aivideo?.settings;
        const mainKey = await sApi?.getGeminiApiKey?.();
        if (mainKey && (mainKey.startsWith('AIzaSy') || mainKey.startsWith('AQ.'))) {
          activeKey = mainKey.trim();
          setLocalApiKey(activeKey);
          try { localStorage.setItem('aivideo_gemini_api_key', activeKey); } catch (_) {}
        }
      } catch (_) {}
    }

    // Nếu vẫn chưa có Gemini API Key hợp lệ thì mở modal cho người dùng nhập ngay
    if (!activeKey || !(activeKey.startsWith('AIzaSy') || activeKey.startsWith('AQ.'))) {
      setTempApiKeyInput(activeKey);
      setShowApiKeyModal(true);
      toast?.info?.("Vui lòng dán mã Gemini API Key (bắt đầu bằng AIzaSy...) của bạn để phân tích siêu tốc!");
      return;
    }

    setIsGeneratingPrompts(true);
    toast?.info?.("Đang gọi Gemini Vision AI phân tích kịch bản chuyển động 8s cho cả 7 cảnh...");

    setStoryboard(prev => prev.map(f => ({
      ...f,
      videoPromptStatus: f.imageAsset ? "generating" : "error"
    })));

    let successCount = 0;
    let fallbackCount = 0;
    let failCount = 0;

    // Chạy tuần tự từng cảnh để triệt tiêu 100% lỗi 429 Rate Limit từ Google Gemini API
    for (const frame of cs.storyboard) {
      if (!frame.imageAsset) {
        updateFrame(frame.id, { videoPromptStatus: "error" });
        failCount++;
        continue;
      }

      updateFrame(frame.id, { videoPromptStatus: "generating" });

      let action = "";
      switch (Number(frame.id)) {
        case 1: action = "Excitedly tearing open the black courier bag, plastic rustling sounds, looking at camera with a big closed-mouth smile."; break;
        case 2: action = "Detailed fabric showcase, moving material near lens, showing texture, happy facial expression with mouth closed."; break;
        case 3: action = "Fashion walk towards camera, dynamic stride, confident closed-mouth smile, showing full outfit in motion."; break;
        case 4: action = "Playful 360-degree spin, showing full outfit movement from all angles, dynamic garment drape."; break;
        case 5: action = "Over-the-shoulder gaze, adjusting hair cinematic pose, looking directly at lens with mouth closed."; break;
        case 6: action = "Powerful stance, hair flip, hands on hips fashion movement, subtle body sway highlighting outfit."; break;
        case 7: action = "Friendly wave and exit, soft camera movement follow, stepping back with a genuine closed-mouth smile."; break;
        default: action = "Natural fashion posing movement with mouth strictly closed.";
      }

      let validPrompt = "";
      let isFallback = false;

      // 1. Thử gọi Gemini Vision API
      try {
        const geminiRes = await callGeminiVisionDirector(frame, action, activeKey, Number(frame.id) === 1 ? cs.outfit : null);
        if (geminiRes?.ok && isValidMotionPrompt(geminiRes?.prompt)) {
          validPrompt = geminiRes.prompt.trim();
        }
      } catch (err) {
        console.warn(`[Motion Director] Gemini Vision Cảnh ${frame.id} gặp sự cố:`, err);
      }

      // 2. Nếu Gemini chưa trả về prompt chuẩn, thử qua Browser Flow (có timeout 5s)
      if (!validPrompt) {
        try {
          const flowRes = await callGoogleFlowDirector(frame, action, []);
          if (flowRes?.ok && isValidMotionPrompt(flowRes?.prompt)) {
            validPrompt = flowRes.prompt.trim();
          }
        } catch (_) {}
      }

      // 3. Nếu cả 2 đều lỗi (hoặc dính RPC Error/Rate Limit): Kích hoạt ngay Smart Motion Director
      if (!validPrompt || !isValidMotionPrompt(validPrompt)) {
        validPrompt = getSmartMotionPrompt(frame.id, cs.creativeDirection, cs.outfit?.name || cs.outfit?.productName || cs.outfitName);
        isFallback = true;
      }

      // Luôn cập nhật trạng thái "done" và gán prompt chuẩn - KHÔNG BAO GIỜ TREO ĐỒNG HỒ CÁT!
      updateFrame(frame.id, {
        videoPrompt: validPrompt,
        videoPromptStatus: "done"
      });

      if (isFallback) fallbackCount++;
      else successCount++;

      // Nghỉ ngắn 100ms giữa các cảnh để UI mượt mà và tránh burst API
      await new Promise(r => setTimeout(r, 100));
    }

    setIsGeneratingPrompts(false);

    const totalSuccess = successCount + fallbackCount;
    if (totalSuccess === cs.storyboard.length) {
      if (fallbackCount > 0) {
        toast?.success?.(`Đã hoàn tất phân tích kịch bản chuyển động 8s cho cả 7 cảnh (${successCount} từ Gemini Vision, ${fallbackCount} từ Smart Director tích hợp)!`);
      } else {
        toast?.success?.("Đã hoàn tất phân tích kịch bản chuyển động từ Gemini Vision AI cho cả 7 cảnh!");
      }
    } else if (totalSuccess > 0) {
      toast?.warn?.(`Phân tích thành công ${totalSuccess}/${cs.storyboard.length} cảnh (${failCount} cảnh lỗi: ${firstFailError}).`);
    } else {
      toast?.error?.(firstFailError ? `Phân tích kịch bản thất bại: ${firstFailError}` : "Phân tích kịch bản thất bại. Vui lòng kiểm tra lại Gemini API Key!");
    }
  };

  // 3. Render 1 Video Đơn Lẻ (🎯 CHỈ NẠP DUY NHẤT ẢNH STORYBOARD CỦA CẢNH ĐÓ ĐỂ ĐỒNG NHẤT 100%)
  const generateSingleVideo = async (frameId) => {
    const cs = stateRef.current;
    const frame = cs.storyboard.find(f => f.id === frameId);
    if (!frame) return;

    const promptToSend = frame.videoPrompt || getSmartMotionPrompt(frameId, cs.creativeDirection, cs.outfit?.name || cs.outfit?.productName || cs.outfitName);
    if (!frame.videoPrompt) {
      updateFrame(frameId, { videoPrompt: promptToSend, videoPromptStatus: "done" });
    }

    const now = Date.now();
    updateFrame(frameId, {
      videoStatus: "generating",
      videoProgress: 15,
      videoAsset: null,
      videoJobId: null,
      videoRunStartTime: now
    });

    try {
      const qApi = window.aiforge?.queue || window.aivideo?.queue;
      if (!qApi?.addJob && !qApi?.addJobs) throw new Error("Hệ thống Queue chưa sẵn sàng");

      const isMuse = cs.videoEngine === 'muse';
      const isAutoAcc = !selectedVideoAccountId || selectedVideoAccountId === 'auto';
      let activeAccs = [];
      if (isMuse) {
        activeAccs = accounts.filter(a => (a.providerId === 'muse' || a.provider?.toLowerCase().includes('muse')) && (a.authStatus === 'Logged In' || a.authStatus === 'active'));
        if (activeAccs.length === 0) activeAccs = accounts.filter(a => a.providerId === 'muse' || a.provider?.toLowerCase().includes('muse'));
      } else {
        activeAccs = accounts.filter(a => a.providerId === 'veo3' && a.authStatus === 'Logged In');
        if (activeAccs.length === 0) activeAccs = accounts.filter(a => a.providerId === 'veo3');
      }

      let curAcc = undefined;
      let isManual = false;
      if (!isAutoAcc) {
        curAcc = accounts.find(a => a.accountId === selectedVideoAccountId);
        isManual = !!curAcc;
      }
      if (!curAcc && activeAccs.length > 0) {
        window.__aiforge_koc_single_video_counter = (window.__aiforge_koc_single_video_counter || 0) + 1;
        curAcc = activeAccs[(window.__aiforge_koc_single_video_counter - 1) % activeAccs.length];
        isManual = false;
      }
      const targetAccId = curAcc?.accountId || undefined;
      const targetAccName = curAcc?.accountDisplayName || curAcc?.accountEmail || curAcc?.accountName || undefined;

      // 🎯 QUY TẮC NẠP ẢNH THAM CHIẾU VIDEO (TỪ VIDEO CẢNH 3 CHỈ NẠP ĐÚNG 1 ẢNH THAM CHIẾU CỦA CẢNH ĐÓ):
      let validAssetId = null;
      if (frame.imageAsset) {
        validAssetId = await ensureRegisteredAsset(frame.imageAsset, `koc_scene_${frameId}.jpg`);
        if (!validAssetId && frame.imageAsset.assetId) validAssetId = frame.imageAsset.assetId;
        if (!validAssetId && frame.imageAsset.mediaId) validAssetId = frame.imageAsset.mediaId;
        if (!validAssetId && frame.imageAsset.id) validAssetId = frame.imageAsset.id;
      }
      const validKocId = cs.koc ? await ensureRegisteredAsset(cs.koc, 'koc_model_face.jpg') : null;
      const validOutfitId = cs.outfit ? await ensureRegisteredAsset(cs.outfit, 'outfit_sample.jpg') : null;

      const isFromScene3 = Number(frameId) >= 3;
      // Từ video cảnh 3 trở đi: chỉ nạp đúng prompt do AI phân tích và ĐÚNG 1 ẢNH THAM CHIẾU CẢNH ĐÓ, không nạp thêm KOC hay Outfit
      const sceneRefIds = isFromScene3 
        ? [validAssetId].filter(Boolean) 
        : [validAssetId, validKocId, validOutfitId].filter(Boolean);
      const extraRefMediaIds = isFromScene3 
        ? [] 
        : [validKocId, validOutfitId].filter(Boolean);

      const modelDisplayName = FASHION_VIDEO_MODELS_MAP[cs.globalVideoModel] || 'veo-3.1-lite';

      const jobInput = {
        title: `[KOC Thời Trang] Video Cảnh ${frameId}`,
        type: "Video",
        providerId: isMuse ? "muse" : "veo3",
        provider: isMuse ? "Muse AI" : "Veo3",
        autoRemoveWatermark: true,
        removeWatermark: true,
        ...(targetAccId ? { accountId: targetAccId, account: targetAccName } : {}),
        payload: isMuse ? {
          title: `[KOC Thời Trang] Video Cảnh ${frameId}`,
          promptId: `fashion-scene-${frameId}`,
          prompt: promptToSend,
          ratio: "9:16",
          duration: "10s",
          model: "muse-video",
          mode: "Components",
          outputIndex: 0,
          batchSize: 1,
          batchIndex: 0,
          promptOrder: frameId,
          referenceAssetIds: sceneRefIds,
          referenceLocalPath: frame?.imageAsset?.localPath || undefined,
          referenceUrl: frame?.imageAsset?.url || undefined,
          resolutionName: cs.videoResolution === '1080p' ? "1080p" : "720p",
          studioSource: "video-factory",
          removeWatermark: cs.removeWatermark === true,
          autoRemoveWatermark: cs.removeWatermark === true,
          account: targetAccName || (isManual ? undefined : "Auto"),
          accountSelection: isManual ? "manual" : "auto"
        } : {
          title: `[KOC Thời Trang] Video Cảnh ${frameId}`,
          prompt: promptToSend,
          flowVideoMode: validAssetId ? "I2V" : "T2V",
          videoMode: validAssetId ? "I2V" : "T2V",
          mode: validAssetId ? "I2V" : "T2V",
          referenceAssetIds: validAssetId ? [validAssetId] : [],
          inputImageAssetId: validAssetId || undefined,
          firstFrameImageMediaId: validAssetId || undefined,
          startImageMediaId: validAssetId || undefined,
          referenceImageMediaIds: extraRefMediaIds,
          model: modelDisplayName,
          modelId: modelDisplayName,
          modelDisplayName: cs.globalVideoModel,
          ratio: "9:16",
          aspectRatio: "9:16",
          duration: "8s",
          durationSeconds: 8,
          studioSource: "video-factory",
          autoRemoveWatermark: cs.removeWatermark === true,
          removeWatermark: cs.removeWatermark === true,
          upscale1080p: cs.videoResolution === '1080p',
          upsampleResolution: cs.videoResolution,
          resolution: "720p",
          account: targetAccName || (isManual ? undefined : "Auto"),
          accountSelection: isManual ? "manual" : "auto"
        }
      };

      const res = await (qApi.addJobs ? qApi.addJobs([jobInput]) : qApi.addJob(jobInput));
      try { qApi.resume?.(); } catch(_) {}

      const jId = res?.results?.[0]?.job?.id || res?.results?.[0]?.id || res?.id || res?.jobId || null;
      updateFrame(frameId, { videoJobId: jId, videoStatus: "generating", videoProgress: 20 });
      toast?.info?.(`Đang render Video Cảnh ${frameId} trên ${isMuse ? 'Muse AI' : 'Veo 3.1 Flow'}...`);
    } catch (err) {
      console.error(err);
      toast?.error?.(`Lỗi render Cảnh ${frameId}: ` + (err?.message || err));
      updateFrame(frameId, { videoStatus: "error", videoProgress: 0 });
    }
  };

  // 🚀 TẠO TOÀN BỘ VIDEO (ĐA LUỒNG - NẠP ĐÚNG ẢNH STORYBOARD TỪNG CẢNH XUỐNG VIDEO)
  const renderAllVideos = async () => {
    const cs = stateRef.current;
    // Bất kỳ cảnh nào có kịch bản HOẶC có ảnh đều được tạo video ngay!
    const targetFrames = cs.storyboard.filter(f => f.videoPrompt || f.imageAsset);
    if (targetFrames.length === 0) {
      toast?.warn?.("Vui lòng bấm 'PHÂN TÍCH CHUYỂN ĐỘNG' hoặc tạo ảnh trước khi tạo video!");
      return;
    }

    const now = Date.now();
    setStoryboard(prev => {
      const cleaned = prev.map(f => {
        const isTarget = targetFrames.some(tf => tf.id === f.id);
        if (!isTarget) return f;
        const promptToUse = f.videoPrompt || getSmartMotionPrompt(f.id, cs.creativeDirection);
        return {
          ...f,
          videoPrompt: promptToUse,
          videoPromptStatus: "done",
          videoAsset: null,
          videoStatus: "generating",
          videoProgress: 15,
          videoJobId: null,
          videoRunStartTime: now
        };
      });
      if (typeof window !== "undefined" && window.__AIFORGE_FASHION_PERSISTENCE__) {
        window.__AIFORGE_FASHION_PERSISTENCE__.storyboard = cleaned;
      }
      try { localStorage.setItem("aiforge_koc_storyboard", JSON.stringify(cleaned)); } catch(_) {}
      return cleaned;
    });

    setIsGeneratingVideos(true);
    const isMuse = cs.videoEngine === 'muse';
    toast?.info?.(`🚀 Đang nạp đồng loạt ${targetFrames.length} Video vào Queue (${isMuse ? 'Muse AI' : 'Veo 3.1 Flow'})...`);

    try {
      const qApi = window.aiforge?.queue || window.aivideo?.queue;
      if (!qApi?.addJobs && !qApi?.addJob) throw new Error("Hệ thống Queue chưa sẵn sàng");

      const isAutoAcc = !selectedVideoAccountId || selectedVideoAccountId === 'auto';
      let activeAccs = [];
      if (isMuse) {
        activeAccs = accounts.filter(a => (a.providerId === 'muse' || a.provider?.toLowerCase().includes('muse')) && (a.authStatus === 'Logged In' || a.authStatus === 'active'));
        if (activeAccs.length === 0) activeAccs = accounts.filter(a => a.providerId === 'muse' || a.provider?.toLowerCase().includes('muse'));
      } else {
        activeAccs = accounts.filter(a => a.providerId === 'veo3' && a.authStatus === 'Logged In');
        if (activeAccs.length === 0) activeAccs = accounts.filter(a => a.providerId === 'veo3');
      }

      let manualAcc = undefined;
      if (!isAutoAcc) {
        manualAcc = accounts.find(a => a.accountId === selectedVideoAccountId);
      }

      const modelDisplayName = FASHION_VIDEO_MODELS_MAP[cs.globalVideoModel] || 'veo-3.1-lite';
      const runId = `fashion-run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const runCreatedAt = new Date().toISOString();

      const jobs = [];
      for (let idx = 0; idx < targetFrames.length; idx++) {
        const frame = targetFrames[idx];

        let curAcc = undefined;
        let isManual = false;
        if (manualAcc) {
          curAcc = manualAcc;
          isManual = true;
        } else if (activeAccs.length > 0) {
          // 🎯 ROUND-ROBIN LOAD BALANCING: Chia đều cảnh cho từng tài khoản (2 acc -> 50/50, 3 acc -> chia 3)
          curAcc = activeAccs[idx % activeAccs.length];
          isManual = false;
        }
        const targetAccId = curAcc?.accountId || undefined;
        const targetAccName = curAcc?.accountDisplayName || curAcc?.accountEmail || curAcc?.accountName || undefined;
        
        // 🎯 QUY TẮC NẠP ẢNH THAM CHIẾU VIDEO (TỪ VIDEO CẢNH 3 CHỈ NẠP ĐÚNG 1 ẢNH THAM CHIẾU CỦA CẢNH ĐÓ):
        let validAssetId = null;
        if (frame.imageAsset) {
          validAssetId = await ensureRegisteredAsset(frame.imageAsset, `koc_scene_${frame.id}.jpg`);
          if (!validAssetId && frame.imageAsset.assetId) validAssetId = frame.imageAsset.assetId;
          if (!validAssetId && frame.imageAsset.mediaId) validAssetId = frame.imageAsset.mediaId;
          if (!validAssetId && frame.imageAsset.id) validAssetId = frame.imageAsset.id;
        }
        const validKocId = cs.koc ? await ensureRegisteredAsset(cs.koc, 'koc_model_face.jpg') : null;
        const validOutfitId = cs.outfit ? await ensureRegisteredAsset(cs.outfit, 'outfit_sample.jpg') : null;

        const isFromScene3 = Number(frame.id) >= 3;
        // Từ video cảnh 3 trở đi: chỉ nạp đúng prompt do AI phân tích và ĐÚNG 1 ẢNH THAM CHIẾU CẢNH ĐÓ, không nạp thêm KOC hay Outfit
        const sceneRefIds = isFromScene3 
          ? [validAssetId].filter(Boolean) 
          : [validAssetId, validKocId, validOutfitId].filter(Boolean);
        const extraRefMediaIds = isFromScene3 
          ? [] 
          : [validKocId, validOutfitId].filter(Boolean);

        const promptToSend = frame.videoPrompt || getSmartMotionPrompt(frame.id, cs.creativeDirection, cs.outfit?.name || cs.outfit?.productName || cs.outfitName);

        jobs.push({
          title: `[KOC Thời Trang] Video Cảnh ${frame.id}`,
          type: "Video",
          providerId: isMuse ? "muse" : "veo3",
          provider: isMuse ? "Muse AI" : "Veo3",
          autoRemoveWatermark: true,
          removeWatermark: true,
          ...(targetAccId ? { accountId: targetAccId, account: targetAccName } : {}),
          payload: isMuse ? {
            title: `[KOC Thời Trang] Video Cảnh ${frame.id}`,
            promptId: `fashion-scene-${frame.id}`,
            prompt: promptToSend,
            ratio: "9:16",
            duration: "10s",
            model: "muse-video",
            mode: "Components",
            outputIndex: idx,
            batchSize: targetFrames.length,
            generationRunId: runId,
            generationRunCreatedAt: runCreatedAt,
            promptOrder: frame.id,
            batchIndex: idx,
            referenceAssetIds: sceneRefIds,
            referenceLocalPath: frame?.imageAsset?.localPath || undefined,
            referenceUrl: frame?.imageAsset?.url || undefined,
            resolutionName: cs.videoResolution === '1080p' ? "1080p" : "720p",
            studioSource: "video-factory",
            removeWatermark: cs.removeWatermark === true,
            autoRemoveWatermark: cs.removeWatermark === true,
            account: targetAccName || (isManual ? undefined : "Auto"),
            accountSelection: isManual ? "manual" : "auto"
          } : {
            title: `[KOC Thời Trang] Video Cảnh ${frame.id}`,
            prompt: promptToSend,
            flowVideoMode: validAssetId ? "I2V" : "T2V",
            videoMode: validAssetId ? "I2V" : "T2V",
            mode: validAssetId ? "I2V" : "T2V",
            referenceAssetIds: validAssetId ? [validAssetId] : [],
            inputImageAssetId: validAssetId || undefined,
            firstFrameImageMediaId: validAssetId || undefined,
            startImageMediaId: validAssetId || undefined,
            referenceImageMediaIds: extraRefMediaIds,
            model: modelDisplayName,
            modelId: modelDisplayName,
            modelDisplayName: cs.globalVideoModel,
            ratio: "9:16",
            aspectRatio: "9:16",
            duration: "8s",
            durationSeconds: 8,
            studioSource: "video-factory",
            autoRemoveWatermark: cs.removeWatermark === true,
            removeWatermark: cs.removeWatermark === true,
            upscale1080p: cs.videoResolution === '1080p',
            upsampleResolution: cs.videoResolution,
            resolution: "720p",
            account: targetAccName || (isManual ? undefined : "Auto"),
            accountSelection: isManual ? "manual" : "auto"
          }
        });
      }

      const res = await (qApi.addJobs ? qApi.addJobs(jobs) : Promise.all(jobs.map(j => qApi.addJob(j))));
      try { qApi.resume?.(); } catch(_) {}

      const jobResults = Array.isArray(res) ? res : (res?.results || []);

      setStoryboard(prev => prev.map(f => {
        const idxInReady = targetFrames.findIndex(rf => rf.id === f.id);
        if (idxInReady !== -1) {
          const jId = jobResults[idxInReady]?.job?.id || jobResults[idxInReady]?.id || null;
          return {
            ...f,
            videoJobId: jId,
            videoStatus: "generating",
            videoProgress: 20
          };
        }
        return f;
      }));

      toast?.success?.(`Đã nạp ${jobs.length} video sang ${isMuse ? 'Muse AI' : 'Veo 3.1 Flow'}! Tự động nạp kết quả khi hoàn tất.`);
    } catch (err) {
      console.error("Lỗi nạp batch video:", err);
      toast?.error?.("Lỗi nạp video: " + (err?.message || err));
    } finally {
      setIsGeneratingVideos(false);
    }
  };

  // 🗑️ LÀM MỚI / XÓA SẠCH TOÀN BỘ DỮ LIỆU CŨ ĐỂ TẠO DỰ ÁN MỚI
  const handleResetAllData = () => {
    if (!window.confirm("Bạn có chắc chắn muốn XÓA SẠCH toàn bộ dữ liệu (ảnh, video, bối cảnh) để làm mới dự án KOC?")) {
      return;
    }
    setKoc(null);
    setOutfit(null);
    setCreativeDirection("Phòng ngủ sang trọng hiện đại, ánh sáng ấm áp.");
    setTechnicalStyle("Shot on iPhone 15 Pro, authentic UGC lifestyle, luxury studio lighting, crisp 4k texture");
    setStoryboard(INITIAL_FASHION_STORYBOARD);
    try {
      localStorage.removeItem("aiforge_koc_face");
      localStorage.removeItem("aiforge_koc_outfit");
      localStorage.removeItem("aiforge_koc_storyboard");
      localStorage.setItem("aiforge_koc_creative_direction", "Phòng ngủ sang trọng hiện đại, ánh sáng ấm áp.");
      localStorage.setItem("aiforge_koc_technical_style", "Shot on iPhone 15 Pro, authentic UGC lifestyle, luxury studio lighting, crisp 4k texture");
    } catch(_) {}
    if (typeof window !== "undefined" && window.__AIFORGE_FASHION_PERSISTENCE__) {
      window.__AIFORGE_FASHION_PERSISTENCE__.koc = null;
      window.__AIFORGE_FASHION_PERSISTENCE__.outfit = null;
      window.__AIFORGE_FASHION_PERSISTENCE__.creativeDirection = "Phòng ngủ sang trọng hiện đại, ánh sáng ấm áp.";
      window.__AIFORGE_FASHION_PERSISTENCE__.technicalStyle = "Shot on iPhone 15 Pro, authentic UGC lifestyle, luxury studio lighting, crisp 4k texture";
      window.__AIFORGE_FASHION_PERSISTENCE__.storyboard = INITIAL_FASHION_STORYBOARD;
    }
    toast?.success?.("Đã xóa sạch toàn bộ dữ liệu cũ! Sẵn sàng cho dự án KOC mới.");
  };

  // Tải 1 video đơn lẻ
  const handleDownloadSingle = async (f) => {
    if (!f.videoAsset) return;
    try {
      const url = f.videoAsset.url || f.videoAsset.base64;
      if (!url) return;
      if (typeof window !== "undefined" && window.aiforge?.utils?.downloadFile) {
        await window.aiforge.utils.downloadFile({ url, defaultName: `KOC_Scene_${f.id}.mp4` });
        toast?.success?.(`Đang tải Cảnh ${f.id}...`);
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = `KOC_Scene_${f.id}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast?.success?.(`Đang tải Cảnh ${f.id}...`);
      }
    } catch (err) {
      toast?.error?.("Lỗi tải video: " + err.message);
    }
  };

  // Tải tất cả video
  const downloadAll = async () => {
    const framesWithVideos = storyboard.filter(f => f.videoAsset);
    if (framesWithVideos.length === 0) {
      toast?.warn?.("Chưa có video nào hoàn tất để tải về!");
      return;
    }
    toast?.info?.(`Đang tải xuống ${framesWithVideos.length} clips video...`);
    for (const f of framesWithVideos) {
      await handleDownloadSingle(f);
      await new Promise(r => setTimeout(r, 600));
    }
    toast?.success?.("Đã tải xong toàn bộ video!");
  };

  // Tính tiến độ tổng thể
  const overallImageProgress = React.useMemo(() => {
    const hasGenerating = storyboard.some(f => f.imageStatus === "generating");
    if (!hasGenerating && !isGeneratingImages) return undefined;
    const total = storyboard.length;
    const done = storyboard.filter(f => f.imageStatus === "done").length;
    const inProgress = storyboard.filter(f => f.imageStatus === "generating");
    const avgProg = inProgress.reduce((sum, f) => sum + (f.imageProgress || 0), 0);
    return Math.round(((done * 100) + avgProg) / total);
  }, [storyboard, isGeneratingImages]);

  const overallVideoProgress = React.useMemo(() => {
    const hasGenerating = storyboard.some(f => f.videoStatus === "generating");
    if (!hasGenerating && !isGeneratingVideos) return undefined;
    const total = storyboard.length;
    const done = storyboard.filter(f => f.videoStatus === "done").length;
    const inProgress = storyboard.filter(f => f.videoStatus === "generating");
    const avgProg = inProgress.reduce((sum, f) => sum + (f.videoProgress || 0), 0);
    return Math.round(((done * 100) + avgProg) / total);
  }, [storyboard, isGeneratingVideos]);

  const isMuse = videoEngine === 'muse';

  return React.createElement("div", {
    style: { display: "flex", flexDirection: "column", height: "100%", width: "100%", overflow: "hidden" },
    className: "bg-[#070a14] text-white font-sans select-none"
  },
    // Top Bar (50px) - Dark Theme with Niche, Engine & Account Selector
    React.createElement("div", {
      style: { height: "50px", minHeight: "50px", maxHeight: "50px" },
      className: "border-b border-white/[0.08] bg-[#0b0f1d] px-4 flex items-center justify-between z-30 shadow-md flex-shrink-0"
    },
      React.createElement("div", { className: "flex items-center gap-2.5" },
        React.createElement("div", { className: "w-7 h-7 rounded-lg bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-rose-500/20" },
          "👗"
        ),
        React.createElement("div", { className: "flex items-center gap-2" },
          React.createElement("span", { className: "text-xs font-black text-white uppercase tracking-tight" }, "Xưởng Thời Trang KOC Pro"),
          React.createElement("span", { className: "text-xs text-gray-500" }, "•"),
          React.createElement("span", { className: "text-[10px] font-bold text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/30" }, "7 Cảnh KOC Nhất Quán")
        )
      ),

      // Right Top Controls
      React.createElement("div", { className: "flex items-center gap-2" },
        // Auto-delete selector
        React.createElement("div", {
          className: `inline-flex h-7 items-center gap-1 rounded-lg border px-2 text-[10px] font-bold transition-all ${autoDelMins > 0 ? "border-amber-400/50 bg-amber-500/15 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]" : "border-white/10 bg-white/5 text-gray-400"}`
        },
          React.createElement("span", { className: `w-1.5 h-1.5 rounded-full ${autoDelMins > 0 ? "bg-amber-400 animate-pulse" : "bg-gray-500"}` }),
          React.createElement("span", null, "⏱️ Tự xóa:"),
          React.createElement("select", {
            value: autoDelMins,
            onChange: e => onChangeAutoDel(e.target.value),
            title: "Chế độ tự động xóa tài nguyên sau khi tạo để tiết kiệm ổ đĩa",
            className: "cursor-pointer bg-transparent text-[10px] font-bold text-inherit outline-none border-none pr-1"
          },
            React.createElement("option", { value: 0, className: "bg-[#18152e] text-gray-300" }, "Tắt (Giữ vĩnh viễn)"),
            React.createElement("option", { value: 10, className: "bg-[#18152e] text-amber-300" }, "10 phút"),
            React.createElement("option", { value: 20, className: "bg-[#18152e] text-amber-300" }, "20 phút"),
            React.createElement("option", { value: 30, className: "bg-[#18152e] text-amber-300" }, "30 phút"),
            React.createElement("option", { value: 40, className: "bg-[#18152e] text-amber-300" }, "40 phút"),
            React.createElement("option", { value: 50, className: "bg-[#18152e] text-amber-300" }, "50 phút"),
            React.createElement("option", { value: 60, className: "bg-[#18152e] text-amber-300" }, "60 phút")
          )
        ),

        // Niche Selector
        React.createElement("div", { className: "flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/[0.08]" },
          Object.values(NICHE_TEMPLATES).map(n => 
            React.createElement("button", {
              key: n.id,
              onClick: () => handleSelectNiche(n.id),
              className: `px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                currentNiche === n.id 
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30' 
                  : 'text-gray-400 hover:text-white hover:bg-white/[0.05]'
              }`
            },
              React.createElement("span", null, n.icon),
              React.createElement("span", null, n.name)
            )
          )
        ),

        // Image Engine & Account Selector (Banana Pro vs Muse AI - Xưởng Thời Trang)
        React.createElement("div", {
          className: "flex items-center rounded-xl bg-black/40 border border-white/10 p-0.5 shadow-sm"
        },
          React.createElement("button", {
            type: "button",
            onClick: () => { setImageEngine("banana"); try { localStorage.setItem("aiforge_koc_image_engine", "banana"); } catch(e){} },
            className: `px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all ${imageEngine === "banana" ? "bg-amber-500 text-black shadow-md font-black" : "text-gray-400 hover:text-white"}`
          }, React.createElement("span", null, "🍌"), React.createElement("span", null, "Banana")),
          React.createElement("button", {
            type: "button",
            onClick: () => { setImageEngine("muse"); try { localStorage.setItem("aiforge_koc_image_engine", "muse"); } catch(e){} },
            className: `px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all ${imageEngine === "muse" ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md font-black" : "text-gray-400 hover:text-white"}`
          }, React.createElement("span", null, "⚡"), React.createElement("span", null, "Muse AI"))
        ),
        React.createElement("div", { 
          title: imageEngine === "muse" ? "Tài khoản tạo Ảnh Storyboard (Muse AI)" : "Tài khoản tạo Ảnh Storyboard (Banana Pro / Google Flow)",
          className: `flex items-center gap-1.5 px-2.5 py-1 rounded-xl border shadow-sm ${imageEngine === "muse" ? "bg-purple-500/10 border-purple-500/30 text-purple-300" : "bg-amber-500/10 border-amber-500/30 text-amber-300"}` 
        },
          React.createElement("span", { className: "text-xs" }, imageEngine === "muse" ? "⚡" : "🍌"),
          (() => {
            const availAccs = accounts.filter(a => imageEngine === "muse" ? (a.providerId === "muse" || (a.provider && a.provider.toLowerCase().includes("muse"))) : (a.providerId === "banana"));
            return availAccs.length > 0 ? React.createElement("select", {
              value: selectedBananaAccountId,
              onChange: (e) => handleSelectBananaAccount(e.target.value),
              className: `bg-transparent text-[11px] font-bold outline-none cursor-pointer max-w-[140px] truncate ${imageEngine === "muse" ? "text-purple-200" : "text-amber-300"}`
            },
              React.createElement("option", { key: "auto", value: "auto", className: "bg-[#0b101f] text-yellow-300 font-bold" }, imageEngine === "muse" ? "🔄 Tự chia đều Muse" : "🔄 Tự động chia đều Acc"),
              availAccs.map(acc => 
                React.createElement("option", { key: acc.accountId, value: acc.accountId, className: "bg-[#0b101f] text-white" },
                  (imageEngine === "muse" ? "⚡ " : "🍌 ") + (acc.accountDisplayName || acc.accountEmail || acc.accountId)
                )
              )
            ) : React.createElement("span", { className: "text-[11px] font-bold opacity-80" }, imageEngine === "muse" ? "Chưa có Muse AI" : "Chưa có Banana");
          })()
        ),

        // Video Engine Account Selector (Muse AI hoặc Veo 3)
        React.createElement("div", { 
          title: `Tài khoản tạo Video Clip (${isMuse ? 'Muse AI' : 'Veo 3.1 Flow'})`,
          className: `flex items-center gap-1.5 px-2.5 py-1 rounded-xl border shadow-sm ${isMuse ? 'bg-purple-500/15 border-purple-500/35' : 'bg-cyan-500/15 border-cyan-500/35'}` 
        },
          React.createElement("span", { className: "text-xs" }, isMuse ? "⚡" : "🎬"),
          (() => {
            const vAccs = accounts.filter(a => isMuse ? (a.providerId === 'muse' || a.provider?.toLowerCase().includes('muse')) : (a.providerId === 'veo3'));
            return vAccs.length > 0 ? React.createElement("select", {
              value: selectedVideoAccountId,
              onChange: (e) => handleSelectVideoAccount(e.target.value),
              className: `bg-transparent text-[11px] font-black outline-none cursor-pointer max-w-[130px] truncate ${isMuse ? 'text-purple-300' : 'text-cyan-300'}`
            },
              React.createElement("option", { key: "auto", value: "auto", className: "bg-[#0b101f] text-amber-300 font-bold" }, isMuse ? "⚡ Tự động đổi Acc (Tối đa 6 luồng/acc)" : "🔄 Tự động chọn tài khoản"),
              ...vAccs.map(acc => 
                React.createElement("option", { key: acc.accountId, value: acc.accountId, className: "bg-[#0b101f] text-gray-200" },
                  `${isMuse ? '⚡' : '🎬'} ${acc.accountName || acc.accountDisplayName || acc.accountEmail || (isMuse ? `Muse AI #${vAccs.indexOf(acc) + 1}` : `Veo 3 #${vAccs.indexOf(acc) + 1}`)}`
                )
              )
            ) : React.createElement("span", { className: "text-[11px] text-red-400 font-bold" }, `Chưa có ${isMuse ? 'Muse' : 'Veo3'}`);
          })()
        )
      )
    ),

    // Hidden file inputs
    React.createElement("input", { type: "file", accept: "image/*", ref: kocInputRef, style: { display: "none" }, onChange: e => handleFileUpload(e, "koc") }),
    React.createElement("input", { type: "file", accept: "image/*", ref: outfitInputRef, style: { display: "none" }, onChange: e => handleFileUpload(e, "outfit") }),

    // Main Workstation Body: Sidebar + Main 3-Stage Canvas (100% Dark Cyber Theme)
    React.createElement("div", { className: "flex flex-1 bg-[#070a14] text-white overflow-hidden font-sans" },
      // Sidebar: Control Center
      React.createElement("aside", {
        className: "w-[340px] min-w-[340px] max-w-[340px] border-r border-white/[0.08] flex flex-col justify-between px-5 py-6 bg-[#080d1a] shadow-2xl z-30 overflow-y-auto no-scrollbar"
      },
        React.createElement("div", { className: "flex flex-col gap-6" },
          // Header
          React.createElement("header", { className: "border-b border-white/[0.08] pb-4" },
            React.createElement("div", { className: "flex items-center gap-3.5 mb-1" },
              React.createElement("div", { className: "w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-600 flex items-center justify-center text-2xl shadow-lg shadow-rose-600/30 overflow-hidden text-white flex-shrink-0" },
                "👗"
              ),
              React.createElement("div", null,
                React.createElement("h1", { className: "text-xl font-black italic tracking-tight uppercase leading-none text-white" }, "KOC PRO"),
                React.createElement("p", { className: "text-[9px] font-black text-rose-400 uppercase tracking-[0.2em] mt-1" }, "Fashion Studio Edition")
              )
            )
          ),

          // Inputs Section
          React.createElement("div", { className: "flex flex-col gap-4" },
            React.createElement("div", { className: "flex items-center px-1" },
              React.createElement("span", { className: "text-[10px] font-black text-gray-400 tracking-[0.2em] uppercase" }, "1. Tài nguyên đầu vào")
            ),
            React.createElement("div", { className: "grid grid-cols-2 gap-3" },
              // Face
              React.createElement("div", { className: "flex flex-col gap-1" },
                React.createElement("button", {
                  type: "button",
                  onClick: () => kocInputRef.current?.click(),
                  className: "aspect-[3/4] bg-white/[0.03] border-2 border-dashed border-white/[0.12] rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-rose-500/60 hover:bg-white/[0.06] transition-all overflow-hidden group cursor-pointer"
                },
                  koc ? React.createElement("img", { src: koc.base64, className: "w-full h-full object-cover" })
                    : React.createElement(React.Fragment, null,
                        React.createElement("span", { className: "text-2xl text-gray-400 group-hover:text-rose-400 transition-colors" }, "👤"),
                        React.createElement("span", { className: "text-[9px] font-black uppercase text-gray-400 group-hover:text-white transition-colors" }, "Gương mặt KOC")
                      )
                ),
                koc && React.createElement("button", {
                  type: "button",
                  onClick: () => setKoc(null),
                  className: "text-[9px] font-bold text-rose-400 hover:text-rose-300 text-center cursor-pointer"
                }, "✕ Xóa mặt KOC")
              ),

              // Outfit
              React.createElement("div", { className: "flex flex-col gap-1" },
                React.createElement("button", {
                  type: "button",
                  onClick: () => outfitInputRef.current?.click(),
                  className: "aspect-[3/4] bg-white/[0.03] border-2 border-dashed border-white/[0.12] rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-rose-500/60 hover:bg-white/[0.06] transition-all overflow-hidden group cursor-pointer"
                },
                  outfit ? React.createElement("img", { src: outfit.base64, className: "w-full h-full object-cover" })
                    : React.createElement(React.Fragment, null,
                        React.createElement("span", { className: "text-2xl text-gray-400 group-hover:text-rose-400 transition-colors" }, "👗"),
                        React.createElement("span", { className: "text-[9px] font-black uppercase text-gray-400 group-hover:text-white transition-colors" }, "Trang phục mẫu")
                      )
                ),
                outfit && React.createElement("button", {
                  type: "button",
                  onClick: () => setOutfit(null),
                  className: "text-[9px] font-bold text-rose-400 hover:text-rose-300 text-center cursor-pointer"
                }, "✕ Xóa trang phục")
              )
            ),

            React.createElement(KocTextInput, {
              value: creativeDirection,
              onChange: v => setCreativeDirection(v),
              label: "Bối cảnh / Không gian phòng"
            }),

            React.createElement(KocTextInput, {
              value: technicalStyle,
              onChange: v => setTechnicalStyle(v),
              label: "Phong cách kỹ thuật (Technical Style)",
              placeholder: "Ví dụ: Shot on iPhone 15 Pro, authentic UGC lifestyle, luxury studio lighting..."
            })
          ),

          // Image Engine Config (Banana Pro vs Muse AI - Xưởng Thời Trang)
          React.createElement("div", { className: "flex flex-col gap-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08]" },
            React.createElement("div", { className: "flex items-center justify-between px-0.5" },
              React.createElement("span", { className: "text-[10px] font-black text-gray-400 tracking-[0.2em] uppercase" }, "Nền tảng tạo ảnh (Cảnh)"),
              React.createElement("span", { className: "text-[9px] text-amber-300 font-bold" }, imageEngine === "muse" ? "⚡ Muse AI" : "🍌 Nano Banana")
            ),
            React.createElement("div", { className: "grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-black/40 border border-white/[0.08]" },
              React.createElement("button", {
                type: "button",
                onClick: () => { setImageEngine('banana'); try { localStorage.setItem("aiforge_koc_image_engine", "banana"); } catch(e){} },
                className: `py-1.5 px-2 rounded-lg text-[11px] font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${imageEngine === 'banana' ? 'bg-amber-500 text-black shadow-md' : 'text-gray-400 hover:text-white'}`
              },
                React.createElement("span", null, "🍌"),
                React.createElement("span", null, "Banana Pro")
              ),
              React.createElement("button", {
                type: "button",
                onClick: () => { setImageEngine('muse'); try { localStorage.setItem("aiforge_koc_image_engine", "muse"); } catch(e){} },
                className: `py-1.5 px-2 rounded-lg text-[11px] font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${imageEngine === 'muse' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`
              },
                React.createElement("span", null, "⚡"),
                React.createElement("span", null, "Muse AI")
              )
            )
          ),

          // Engine Config (Muse AI vs Veo 3)
          React.createElement("div", { className: "flex flex-col gap-3" },
            React.createElement("div", { className: "flex items-center justify-between px-1" },
              React.createElement("span", { className: "text-[10px] font-black text-gray-400 tracking-[0.2em] uppercase" }, "2. Nền tảng Video"),
              isMuse && React.createElement("span", { className: "text-[9px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30" }, "✓ Không lo chặn mặt")
            ),
            // Engine Toggle
            React.createElement("div", { className: "grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-white/[0.03] border border-white/[0.08]" },
              React.createElement("button", {
                type: "button",
                onClick: () => setVideoEngine('muse'),
                className: `py-2 px-2 rounded-lg text-[11px] font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${videoEngine === 'muse' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-600/30' : 'text-gray-400 hover:text-white'}`
              },
                React.createElement("span", { className: "text-amber-300 font-bold" }, "⚡"),
                React.createElement("span", null, "Muse AI")
              ),
              React.createElement("button", {
                type: "button",
                onClick: () => setVideoEngine('veo3'),
                className: `py-2 px-2 rounded-lg text-[11px] font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${videoEngine === 'veo3' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30' : 'text-gray-400 hover:text-white'}`
              },
                React.createElement("span", null, "🎬"),
                React.createElement("span", null, "Veo 3.1 Flow")
              )
            ),
            isMuse ? React.createElement("div", { className: "text-[9px] text-emerald-300 font-medium px-2.5 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/25 flex items-start gap-1.5" },
              React.createElement("span", { className: "text-xs" }, "💡"),
              React.createElement("span", null, "Muse AI tự động lấy ảnh Cảnh làm chuẩn, tạo video nhanh không lo lỗi vi phạm gương mặt!")
            ) : React.createElement(KocFieldDropdown, {
              label: "Model Video Veo 3",
              value: globalVideoModel,
              options: FASHION_VIDEO_MODELS,
              onChange: v => setGlobalVideoModel(v)
            })
          ),

          // ⚡ BẢNG ĐIỀU KHIỂN CHẤT LƯỢNG & XÓA WATERMARK (BẬT/TẮT)
          React.createElement("div", { className: "space-y-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08]" },
            React.createElement("div", { className: "flex items-center px-0.5 mb-1" },
              React.createElement("span", { className: "text-[10px] font-black text-gray-400 tracking-[0.2em] uppercase" }, "3. Chất lượng & Watermark")
            ),
            // 1. Độ nét Ảnh Storyboard
            React.createElement("div", { className: "flex items-center justify-between" },
              React.createElement("span", { className: "text-[10px] font-bold text-gray-300 uppercase tracking-wider" }, "ĐỘ NÉT ẢNH:"),
              React.createElement("div", { className: "flex gap-1" },
                React.createElement("button", {
                  type: "button",
                  onClick: () => setImageResolution('standard'),
                  className: `px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${imageResolution !== '2k' ? 'bg-cyan-500 text-black shadow-md' : 'bg-white/5 text-gray-400 hover:text-white'}`
                }, "⚡ Chuẩn"),
                React.createElement("button", {
                  type: "button",
                  onClick: () => setImageResolution('2k'),
                  className: `px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${imageResolution === '2k' ? 'bg-amber-400 text-black shadow-md' : 'bg-white/5 text-gray-400 hover:text-white'}`
                }, "🌟 2K Siêu Nét")
              )
            ),
            // 2. Độ nét Video Clip
            React.createElement("div", { className: "flex items-center justify-between pt-1.5 border-t border-white/[0.05]" },
              React.createElement("span", { className: "text-[10px] font-bold text-gray-300 uppercase tracking-wider" }, "ĐỘ NÉT VIDEO:"),
              React.createElement("div", { className: "flex gap-1" },
                React.createElement("button", {
                  type: "button",
                  onClick: () => setVideoResolution('720p'),
                  className: `px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${videoResolution === '720p' ? 'bg-cyan-500 text-black shadow-md' : 'bg-white/5 text-gray-400 hover:text-white'}`
                }, "⚡ 720p"),
                React.createElement("button", {
                  type: "button",
                  onClick: () => setVideoResolution('1080p'),
                  className: `px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${videoResolution === '1080p' ? 'bg-amber-400 text-black shadow-md' : 'bg-white/5 text-gray-400 hover:text-white'}`
                }, "🌟 1080p HD")
              )
            ),
            // 3. Xóa Watermark Logo
            // 3. Xóa Watermark (Ảnh & Clip)
            React.createElement("div", { className: "flex items-center justify-between pt-1 border-t border-white/[0.05]" },
              React.createElement("span", { className: "text-[10px] font-bold text-gray-300 uppercase tracking-wider" }, "XÓA WATERMARK (ẢNH & CLIP):"),
              React.createElement("div", { className: "flex gap-1" },
                React.createElement("button", {
                  type: "button",
                  onClick: () => {
                    setRemoveWatermark(false);
                    try { window.__AIFORGE_GLOBAL_STUDIO_STATE__.removeWatermark = false; } catch(_) {}
                  },
                  className: `px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${!removeWatermark ? 'bg-gray-600 text-white shadow-md' : 'bg-white/5 text-gray-400 hover:text-white'}`
                }, "🏷️ Giữ Gốc"),
                React.createElement("button", {
                  type: "button",
                  onClick: () => {
                    setRemoveWatermark(true);
                    try { window.__AIFORGE_GLOBAL_STUDIO_STATE__.removeWatermark = true; } catch(_) {}
                  },
                  className: `px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${removeWatermark ? 'bg-emerald-500 text-black shadow-md' : 'bg-white/5 text-gray-400 hover:text-white'}`
                }, "✨ Bật Xóa Logo")
              )
            )
          ),

          // Batch Production
          React.createElement("div", { className: "flex flex-col gap-3 pb-6" },
            React.createElement("div", { className: "flex items-center px-1" },
              React.createElement("span", { className: "text-[10px] font-black text-gray-400 tracking-[0.2em] uppercase" }, "4. Sản xuất hàng loạt")
            ),
            // Button 1: Tạo 7 Cảnh Ảnh
            React.createElement(KocPillButton, {
              variant: "outline",
              icon: React.createElement("span", null, imageEngine === "muse" ? "⚡" : "✨"),
              onClick: generateAllImages,
              loading: isGeneratingImages,
              progress: overallImageProgress,
              disabled: !koc || !outfit
            }, imageEngine === "muse" ? "Tạo 7 Cảnh Ảnh (⚡ Muse AI)" : "Tạo 7 Cảnh Ảnh (🍌 Banana)"),

            // Button 2: Phân tích chuyển động + Nút Cài đặt Key
            React.createElement("div", { className: "flex items-center gap-1.5 w-full" },
              React.createElement(KocPillButton, {
                variant: "outline",
                icon: React.createElement("span", null, "🧠"),
                onClick: analyzeMotion,
                loading: isGeneratingPrompts,
                disabled: false,
                className: "flex-1"
              }, "Phân tích chuyển động"),
              React.createElement("button", {
                type: "button",
                onClick: () => {
                  setTempApiKeyInput(localApiKey || geminiApiKey || localStorage.getItem('aivideo_gemini_api_key') || '');
                  setShowApiKeyModal(true);
                },
                title: "Cấu hình Gemini API Key",
                className: "h-11 px-3 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-sm font-bold cursor-pointer transition-all shadow-sm"
              }, "🔑")
            ),

            // Button 3: TẠO TOÀN BỘ VIDEO (Mở khóa ngay khi có ảnh)
            React.createElement(KocPillButton, {
              variant: "solid",
              icon: React.createElement("span", null, isMuse ? "⚡" : "🎬"),
              onClick: renderAllVideos,
              loading: isGeneratingVideos,
              progress: overallVideoProgress,
              disabled: !storyboard.some(f => f.videoPrompt || f.imageAsset)
            }, isMuse ? "TẠO TOÀN BỘ VIDEO (MUSE)" : "TẠO TOÀN BỘ VIDEO (VEO 3)"),

            // Button 4: Xóa sạch dữ liệu cũ
            React.createElement("button", {
              type: "button",
              onClick: handleResetAllData,
              className: "w-full py-2 px-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm mt-1"
            },
              React.createElement("span", null, "🗑️"),
              React.createElement("span", null, "Xóa Sạch Dữ Liệu Cũ")
            ),

            // Download All
            storyboard.some(f => f.videoAsset) && React.createElement("button", {
              type: "button",
              onClick: downloadAll,
              className: "text-[10px] font-black uppercase italic tracking-[0.2em] text-rose-400 hover:text-white transition-colors text-center cursor-pointer mt-1"
            }, "📥 Tải tất cả Video (.mp4)")
          )
        )
      ),

      // Main Workspace (Dark Canvas)
      React.createElement("main", {
        className: "flex-1 overflow-y-auto no-scrollbar bg-[#070a14] px-8 py-10"
      },
        React.createElement("div", { className: "max-w-7xl mx-auto space-y-16" },
          // Stage 1: Storyboard (7 ảnh)
          React.createElement(KocStageSection, {
            title: "1. Storyboard KOC",
            description: "Xây dựng 7 khung hình tĩnh chuẩn xác (KOC + Outfit + 7 tư thế)",
            icon: "📸"
          },
            storyboard.map(f => {
              const imgUrl = getKocMediaUrl(f.imageAsset);
              return React.createElement("div", { key: f.id, className: "flex flex-col gap-3 animate-fade-in" },
                React.createElement("div", {
                  className: "aspect-[9/16] bg-[#0c1020] rounded-[32px] border-2 border-white/[0.08] hover:border-rose-500/50 relative overflow-hidden flex items-center justify-center shadow-xl transition-all duration-300 group"
                },
                  imgUrl ? React.createElement("img", {
                    src: imgUrl,
                    className: "w-full h-full object-cover",
                    loading: "lazy",
                    onError: (e) => {
                      e.currentTarget.style.display = 'none';
                      updateFrame(f.id, { imageAsset: null, imageStatus: "idle" });
                    }
                  }) : f.imageStatus === "generating" ? React.createElement(KocProgressCircle, { progress: f.imageProgress })
                  : (f.imageStatus === "waiting_anchor_1" || f.imageStatus === "waiting_anchor") ? React.createElement("div", { className: "flex flex-col items-center justify-center gap-2 select-none text-center px-2" },
                      React.createElement("span", { className: "text-4xl text-amber-400 animate-pulse" }, "⚓"),
                      React.createElement("span", { className: "text-[11px] font-bold text-amber-300 uppercase tracking-wider" }, "Chờ mỏ neo Cảnh 1"),
                      React.createElement("span", { className: "text-[9px] text-gray-400" }, "Tự động tạo khi Cảnh 1 xong")
                    )
                  : f.imageStatus === "waiting_anchor_2" ? React.createElement("div", { className: "flex flex-col items-center justify-center gap-2 select-none text-center px-2" },
                      React.createElement("span", { className: "text-4xl text-cyan-400 animate-pulse" }, "🎬"),
                      React.createElement("span", { className: "text-[11px] font-bold text-cyan-300 uppercase tracking-wider" }, "Chờ mỏ neo Cảnh 2"),
                      React.createElement("span", { className: "text-[9px] text-gray-400" }, "Tự động tạo khi Cảnh 2 xong")
                    )
                  : f.imageStatus === "waiting_anchor_3" ? React.createElement("div", { className: "flex flex-col items-center justify-center gap-2 select-none text-center px-2" },
                      React.createElement("span", { className: "text-4xl text-rose-400 animate-pulse" }, "👗"),
                      React.createElement("span", { className: "text-[11px] font-bold text-rose-300 uppercase tracking-wider" }, "Chờ mỏ neo Cảnh 3"),
                      React.createElement("span", { className: "text-[9px] text-gray-400" }, "Tự động tạo khi Cảnh 3 xong")
                    )
                  : React.createElement("div", { className: "flex flex-col items-center justify-center gap-2 select-none" },
                      React.createElement("span", { className: "text-4xl text-rose-500/70 group-hover:scale-110 transition-transform" }, "📸"),
                      React.createElement("span", { className: "text-[11px] font-bold text-gray-400 uppercase tracking-wider" }, `Chờ tạo Cảnh ${f.id}`)
                    ),
                  React.createElement("div", {
                    className: "absolute top-4 left-4 bg-black/80 backdrop-blur-md border border-white/10 text-white px-3 py-1 rounded-xl text-[10px] font-black italic uppercase shadow-xl z-10"
                  }, f.title),
                  // Hover action tinh tế
                  React.createElement("div", {
                    className: "absolute inset-0 bg-black/35 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center z-20"
                  },
                    React.createElement("button", {
                      type: "button",
                      onClick: () => generateSingleImage(f.id),
                      disabled: f.imageStatus === "generating",
                      className: "px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 text-white font-black text-[11px] uppercase shadow-2xl hover:scale-105 transition-transform cursor-pointer"
                    }, imgUrl ? "Tạo lại ảnh này" : "Tạo ảnh Cảnh này")
                  )
                ),
                React.createElement(KocTextInput, {
                  value: f.imagePrompt,
                  onChange: v => updateFrame(f.id, { imagePrompt: v })
                })
              );
            })
          ),

          // Stage 2: Directing (Kịch bản chuyển động)
          React.createElement(KocStageSection, {
            title: "2. Motion Directing",
            description: "Kịch bản chuyển động Temporal 8s (Google Flow Vision AI & Soundscape)",
            icon: "🎬"
          },
            storyboard.map(f =>
              React.createElement("div", {
                key: f.id,
                className: "bg-[#0c1020] p-5 rounded-[24px] border border-white/[0.08] hover:border-white/[0.2] shadow-xl h-[210px] flex flex-col animate-fade-in"
              },
                React.createElement("div", { className: "flex items-center justify-between mb-3 border-b border-white/[0.06] pb-2.5" },
                  React.createElement("span", { className: "text-[11px] font-black uppercase text-rose-400 italic" }, `SCENE DIRECTOR ${f.id}`),
                  f.videoPromptStatus === "generating" && React.createElement("span", { className: "text-[16px] animate-spin" }, "⏳")
                ),
                React.createElement("textarea", {
                  value: f.videoPrompt,
                  onChange: e => updateFrame(f.id, { videoPrompt: e.target.value }),
                  placeholder: "AI đang soạn kịch bản chuyển động 8s...",
                  className: "flex-1 bg-transparent border-none text-[12px] font-bold text-slate-100 resize-none outline-none leading-relaxed italic no-scrollbar placeholder-gray-500 select-text"
                })
              )
            )
          ),

          // Stage 3: Production (7 Video Veo 3 / Muse AI)
          React.createElement(KocStageSection, {
            title: "3. Video Production",
            description: `Kết quả Video (${isMuse ? 'Muse AI 10s' : 'Veo 3.1 Flow 8s'} - Khóa Start Frame 100%)`,
            icon: "📺"
          },
            storyboard.map(f => {
              const vidUrl = getKocMediaUrl(f.videoAsset);
              const imgUrl = getKocMediaUrl(f.imageAsset);
              const hasImg = Boolean(imgUrl);
              return React.createElement("div", { key: f.id, className: "flex flex-col gap-3 animate-fade-in" },
                React.createElement("div", {
                  className: "aspect-[9/16] bg-[#0c1020] rounded-[32px] border-2 border-white/[0.08] hover:border-rose-500/50 relative overflow-hidden flex items-center justify-center shadow-xl transition-all duration-300 group"
                },
                  vidUrl ? React.createElement("video", {
                    src: vidUrl,
                    className: "w-full h-full object-cover",
                    controls: true,
                    loop: true,
                    playsInline: true
                  }) : f.videoStatus === "generating" ? React.createElement(KocProgressCircle, { progress: f.videoProgress })
                  : f.videoStatus === "error" ? React.createElement("div", { className: "flex flex-col items-center justify-center gap-2 select-none px-4 text-center" },
                      React.createElement("span", { className: "text-3xl text-rose-500 animate-bounce" }, "⚠️"),
                      React.createElement("span", { className: "text-[11px] font-bold text-rose-400 uppercase tracking-wider" }, "Tạo thất bại"),
                      React.createElement("span", { className: "text-[10px] text-gray-400 line-clamp-2 px-2", title: f.videoError || "" }, f.videoError || "Có lỗi xảy ra khi render")
                    )
                  : React.createElement("div", { className: "flex flex-col items-center justify-center gap-2 select-none" },
                      React.createElement("span", { className: "text-4xl text-cyan-500/70 group-hover:scale-110 transition-transform" }, "🎬"),
                      React.createElement("span", { className: "text-[11px] font-bold text-gray-400 uppercase tracking-wider" }, `Chờ tạo Video ${f.id}`)
                    ),
                  React.createElement("div", {
                    className: "absolute top-4 left-4 bg-black/80 backdrop-blur-md border border-white/10 text-white px-3 py-1 rounded-xl text-[10px] font-black italic uppercase shadow-xl z-10"
                  }, f.title)
                ),
                React.createElement("div", { className: "flex flex-col gap-2" },
                  React.createElement(KocPillButton, {
                    variant: "outline",
                    icon: React.createElement("span", null, "📥"),
                    onClick: () => handleDownloadSingle(f),
                    disabled: !vidUrl
                  }, "Tải MP4"),
                  React.createElement(KocPillButton, {
                    variant: "solid",
                    onClick: () => generateSingleVideo(f.id),
                    loading: f.videoStatus === "generating",
                    progress: f.videoProgress,
                    disabled: !f.videoPrompt && !hasImg
                  }, vidUrl ? "Render lại" : (isMuse ? "Tạo Video (Muse)" : "Tạo Video (Veo 3)"))
                )
              );
            })
          )
        )
      ),

      // MODAL CẤU HÌNH GEMINI API KEY RIÊNG TRONG XƯỞNG FASHION PRO
      showApiKeyModal && React.createElement("div", {
        className: "fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4",
        onClick: () => setShowApiKeyModal(false)
      },
        React.createElement("div", {
          className: "bg-[#0d1428] border border-cyan-500/30 rounded-3xl p-6 w-full max-w-md shadow-2xl flex flex-col gap-4 text-left",
          onClick: (e) => e.stopPropagation()
        },
          React.createElement("div", { className: "flex justify-between items-center pb-2 border-b border-white/10" },
            React.createElement("div", { className: "flex items-center gap-2" },
              React.createElement("span", { className: "text-lg" }, "🔑"),
              React.createElement("h3", { className: "text-sm font-bold text-white uppercase tracking-wider" }, "Cấu Hình Gemini Vision API Key")
            ),
            React.createElement("button", {
              type: "button",
              onClick: () => setShowApiKeyModal(false),
              className: "text-gray-400 hover:text-white text-lg w-7 h-7 rounded-full bg-white/5 flex items-center justify-center cursor-pointer"
            }, "×")
          ),

          React.createElement("div", { className: "space-y-3" },
            React.createElement("p", { className: "text-xs text-gray-300 leading-relaxed" },
              "Dán mã Gemini API Key từ tài khoản Google AI Studio của bạn vào đây để phân tích kịch bản chuyển động siêu tốc 1-2s (0% lỗi, cực kỳ tiết kiệm token)."
            ),

            React.createElement("div", { className: "space-y-1.5" },
              React.createElement("div", { className: "flex justify-between items-center text-[10px] font-bold uppercase tracking-wider" },
                React.createElement("span", { className: "text-cyan-400" }, "Gemini API Key:"),
                React.createElement("a", {
                  href: "https://aistudio.google.com/app/apikey",
                  target: "_blank",
                  className: "text-cyan-400 hover:text-cyan-300 underline font-semibold flex items-center gap-1"
                },
                  "Lấy mã key tại Google AI Studio ↗"
                )
              ),
              React.createElement("input", {
                type: "text",
                value: tempApiKeyInput,
                onChange: (e) => setTempApiKeyInput(e.target.value),
                placeholder: "Dán mã AIzaSy... hoặc AQ.Ab8... vào đây",
                className: "w-full h-11 px-4 rounded-xl border border-white/20 bg-[#141b30] text-white text-xs font-mono outline-none focus:border-cyan-500"
              })
            )
          ),

          React.createElement("div", { className: "flex justify-end gap-2 pt-2 border-t border-white/10" },
            React.createElement("button", {
              type: "button",
              onClick: () => setShowApiKeyModal(false),
              className: "px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white bg-white/5 cursor-pointer"
            }, "Hủy"),
            React.createElement("button", {
              type: "button",
              onClick: () => {
                const k = (tempApiKeyInput || '').trim();
                if (!k || !(k.startsWith('AIzaSy') || k.startsWith('AQ.'))) {
                  toast?.error?.("Vui lòng dán mã API Key hợp lệ (bắt đầu bằng AIzaSy...)!");
                  return;
                }
                setLocalApiKey(k);
                try { localStorage.setItem('aivideo_gemini_api_key', k); } catch(_) {}
                try { window.aiforge?.settings?.setGeminiApiKey?.(k); } catch(_) {}
                try { window.aivideo?.settings?.setGeminiApiKey?.(k); } catch(_) {}
                setShowApiKeyModal(false);
                toast?.success?.("Đã lưu Gemini API Key thành công!");
                setTimeout(() => analyzeMotion(), 200);
              },
              className: "px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/30 cursor-pointer"
            }, "Lưu & Phân Tích Ngay")
          )
        )
      )
    )
  );
}

export default function VideoFactoryStudio() {
  const [autoDelMins, setAutoDelMins] = React.useState(0);
  React.useEffect(() => {
    const api = window.aiforge?.assets || window.aivideo?.assets;
    api?.getAutoDeleteConfig?.().then(cfg => {
      if (cfg?.enabled && cfg?.minutes > 0) setAutoDelMins(cfg.minutes);
      else setAutoDelMins(0);
    }).catch(() => {});
    const unsub = api?.onAutoDeleteChanged?.(cfg => {
      if (cfg?.enabled && cfg?.minutes > 0) setAutoDelMins(cfg.minutes);
      else setAutoDelMins(0);
    });
    return () => unsub?.();
  }, []);
  const onChangeAutoDel = async (v) => {
    const mins = Number(v) || 0;
    setAutoDelMins(mins);
    const api = window.aiforge?.assets || window.aivideo?.assets;
    try {
      await api?.setAutoDeleteConfig?.({ enabled: mins > 0, minutes: mins });
    } catch (_) {}
  };

  const [currentNiche, setCurrentNiche] = React.useState(globalStudioState?.currentNiche || 'household');
  const [products, setProducts] = React.useState(globalStudioState?.products || [null, null, null]);
  const [productInfo, setProductInfo] = React.useState(globalStudioState?.productInfo ?? NICHE_TEMPLATES.household.defaultInfo);
  const [brandName, setBrandName] = React.useState(globalStudioState?.brandName || NICHE_TEMPLATES.household.defaultBrand);
  const [bgMode, setBgMode] = React.useState(globalStudioState?.bgMode || 'auto');
  const [kocImage, setKocImage] = React.useState(globalStudioState?.kocImage || null);
  const [kocProfile, setKocProfile] = React.useState(globalStudioState?.kocProfile || null);
  const [videoEngine, setVideoEngine] = React.useState(() => {
    try {
      const ve = localStorage.getItem("aivideo_factory_video_engine");
      if (ve === "muse" || ve === "veo3") return ve;
    } catch(_) {}
    return globalStudioState?.videoEngine || 'veo3';
  });
  const [imageEngine, setImageEngine] = React.useState(() => {
    try {
      const ie = localStorage.getItem("aivideo_factory_image_engine");
      if (ie === "muse" || ie === "banana") return ie;
    } catch(_) {}
    return globalStudioState?.imageEngine || "banana";
  });
  const [videoModel, setVideoModel] = React.useState(globalStudioState?.videoModel || 'Veo 3.1 - Lite');
  const [selectedVoice, setSelectedVoice] = React.useState(globalStudioState?.selectedVoice || '🎙️ Nữ Miền Bắc – Trẻ trung & Bắt tai');
  const [removeWatermark, setRemoveWatermark] = React.useState(globalStudioState?.removeWatermark === true);
  const [videoResolution, setVideoResolution] = React.useState(globalStudioState?.videoResolution || '720p');
  const [imageResolution, setImageResolution] = React.useState(globalStudioState?.imageResolution || 'standard');

  // TÙY CHỌN SỐ LƯỢNG CẢNH (3, 4, HOẶC 5 CẢNH)
  const [sceneCount, setSceneCount] = React.useState(globalStudioState?.sceneCount || 5);
  const [activePreviewIndex, setActivePreviewIndex] = React.useState(0);

  // Gemini API Key State
  const [geminiApiKey, setGeminiApiKey] = React.useState(() => {
    try {
      const saved = localStorage.getItem('aivideo_gemini_api_key');
      return saved && saved.trim().length > 10 ? saved.trim() : DEFAULT_GEMINI_KEY;
    } catch(e) {
      return DEFAULT_GEMINI_KEY;
    }
  });
  const [showApiKeyModal, setShowApiKeyModal] = React.useState(false);
  const [tempApiKeyInput, setTempApiKeyInput] = React.useState('');

  // TÀI KHOẢN TÁCH BIỆT: BANANA (ẢNH SHOWROOM) & VIDEO ENGINE (MUSE / VEO3)
  const [accounts, setAccounts] = React.useState([]);
  const [selectedBananaAccountId, setSelectedBananaAccountId] = React.useState(() => {
    try { return localStorage.getItem('aivideo_factory_banana_account') || 'auto'; } catch(e) { return 'auto'; }
  });
  const [selectedVideoAccountId, setSelectedVideoAccountId] = React.useState(() => {
    try { return localStorage.getItem('aivideo_factory_video_account') || 'auto'; } catch(e) { return 'auto'; }
  });

  // DANH SÁCH CÁC CẢNH
  const [scenes, setScenes] = React.useState(() => {
    return initScenesForCount(globalStudioState?.sceneCount || 5, globalStudioState?.scenes || []);
  });

  const [selectedVideo, setSelectedVideo] = React.useState(null);
  const [editingScene, setEditingScene] = React.useState(null);
  const [isScriptGenerating, setIsScriptGenerating] = React.useState(false);
  const [isShowroomGenerating, setIsShowroomGenerating] = React.useState(false);
  const [isBatchGenerating, setIsBatchGenerating] = React.useState(false);
  const [isDownloading, setIsDownloading] = React.useState(false);

  // Thay đổi số lượng cảnh (3, 4, 5)
  const handleSceneCountChange = (count) => {
    const num = parseInt(count, 10);
    setSceneCount(num);
    setScenes(prev => initScenesForCount(num, prev));
    if (activePreviewIndex >= num) {
      setActivePreviewIndex(0);
    }
    toast?.info?.(`Đã chuyển sang cấu trúc kịch bản ${num} Cảnh!`);
  };

  // Lưu state vĩnh viễn khi có thay đổi
  React.useEffect(() => {
    const toSave = {
      currentNiche,
      products,
      productInfo,
      brandName,
      bgMode,
      kocImage,
      kocProfile,
      videoEngine,
      imageEngine,
      videoModel,
      selectedVoice,
      removeWatermark,
      videoResolution,
      sceneCount,
      scenes
    };
    globalStudioState = toSave;
    try {
      localStorage.setItem('aivideo_factory_persisted_state', JSON.stringify(toSave));
    } catch(e) {}
  }, [currentNiche, products, productInfo, brandName, bgMode, kocImage, kocProfile, videoEngine, imageEngine, videoModel, selectedVoice, removeWatermark, videoResolution, sceneCount, scenes]);

  const handleSaveGeminiKey = (key) => {
    setGeminiApiKey(key);
    try { localStorage.setItem('aivideo_gemini_api_key', key); } catch(e){}
    setShowApiKeyModal(false);
    toast?.success?.("Đã lưu Gemini API Key thành công!");
  };

  const handleSelectBananaAccount = (accId) => {
    setSelectedBananaAccountId(accId);
    try { localStorage.setItem('aivideo_factory_banana_account', accId); } catch(e){}
  };

  const handleSelectVideoAccount = (accId) => {
    setSelectedVideoAccountId(accId);
    try { localStorage.setItem(`aivideo_factory_${videoEngine}_account`, accId); } catch(e){}
    try { localStorage.setItem('aivideo_factory_video_account', accId); } catch(e){}
  };

  // Load danh sách session Google Flow & Muse AI từ BrowserHub
  React.useEffect(() => {
    async function loadAccounts() {
      if (window.aiforge?.browser?.listSessions) {
        try {
          const sessions = await window.aiforge.browser.listSessions();
          const valid = (sessions || []).filter(s => 
            (s.providerId === 'veo3' || s.providerId === 'banana' || s.providerId === 'muse' || (s.provider && s.provider.toLowerCase().includes('muse'))) && (s.authStatus === 'Logged In' || s.authStatus === 'active' || (s.providerId === 'muse' && !s.disabled))
          );
          setAccounts(valid);

          // 1. Tự động gán tài khoản Banana (Ảnh Showroom)
          const bananaAccounts = valid.filter(a => a.providerId === 'banana');
          if (bananaAccounts.length > 0) {
            setSelectedBananaAccountId(prev => {
              const saved = localStorage.getItem('aivideo_factory_banana_account');
              if (saved === 'auto' || prev === 'auto') return 'auto';
              if (saved && bananaAccounts.some(a => a.accountId === saved)) return saved;
              if (prev && bananaAccounts.some(a => a.accountId === prev)) return prev;
              return 'auto';
            });
          }

          // 2. Tự động gán tài khoản Video theo engine (Muse hoặc Veo3)
          const isMuse = videoEngine === 'muse';
          const videoAccounts = valid.filter(a => 
            isMuse ? (a.providerId === 'muse' || a.provider?.toLowerCase().includes('muse')) : (a.providerId === 'veo3')
          );
          if (videoAccounts.length > 0) {
            setSelectedVideoAccountId(prev => {
              const savedKey = `aivideo_factory_${videoEngine}_account`;
              const saved = localStorage.getItem(savedKey) || localStorage.getItem('aivideo_factory_video_account');
              if (saved === 'auto' || prev === 'auto') return 'auto';
              if (saved && videoAccounts.some(a => a.accountId === saved)) return saved;
              if (prev && videoAccounts.some(a => a.accountId === prev)) return prev;
              return 'auto';
            });
          }
        } catch(e) {
          console.warn('Error loading accounts:', e);
        }
      }
    }
    loadAccounts();
    const interval = setInterval(loadAccounts, 8000);
    return () => clearInterval(interval);
  }, [videoEngine]);

  // ⚡ BỘ ĐỒNG BỘ SIÊU TỐC: TỰ ĐỘNG QUÉT VÀ NẠP NGAY LẬP TỨC (< 1 GIÂY) KHI ẢNH/VIDEO XONG
  const checkJobsAndAssetsDirectly = React.useCallback(async () => {
    try {
      const queueApi = window.aiforge?.queue || window.aivideo?.queue;
      const assetsApi = window.aiforge?.assets || window.aivideo?.assets;
      if (!queueApi?.list) return;

      const [rawQueue, rawAssets] = await Promise.all([
        queueApi.list().catch(() => null),
        assetsApi?.list ? assetsApi.list().catch(() => []) : Promise.resolve([])
      ]);

      const jobs = Array.isArray(rawQueue) 
        ? rawQueue 
        : (Array.isArray(rawQueue?.jobs) ? rawQueue.jobs : []);

      const allAssets = Array.isArray(rawAssets) 
        ? rawAssets 
        : (Array.isArray(rawAssets?.assets) ? rawAssets.assets : []);

      if (jobs.length === 0 && allAssets.length === 0) return;

      // Sắp xếp jobs theo thời gian mới nhất lên đầu để luôn ưu tiên nạp thành phẩm vừa xong
      const sortedJobs = [...jobs].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

      setScenes(prev => {
        let changed = false;
        const next = prev.map(scene => {
          let s = { ...scene };

          // 1. Kiểm tra ảnh Showroom của cảnh (Tự động nạp ngay cả khi vừa chuyển tab)
          if (!s.showroomImage || s.showroomJobId || s.showroomStatus === 'generating') {
            let sJob = null;
            if (s.showroomJobId) {
              sJob = sortedJobs.find(j => j.id === s.showroomJobId);
            } else if (s.showroomRunStartTime) {
              // Chỉ tìm job được tạo trong đợt bấm tạo này
              sJob = sortedJobs.find(j => 
                j.type === 'Image' && 
                new Date(j.createdAt || 0).getTime() >= (s.showroomRunStartTime - 3000) &&
                (
                  (j.payload?.studioSource === 'video-factory' && (j.title?.includes('Cảnh ' + s.id + ':') || j.payload?.title?.includes('Cảnh ' + s.id + ':'))) ||
                  j.title?.includes('Showroom Cảnh ' + s.id + ':') ||
                  j.title?.includes('[Xưởng] Showroom Cảnh ' + s.id + ':')
                )
              );
            } else if (s.showroomStatus !== 'generating') {
              sJob = sortedJobs.find(j => 
                j.type === 'Image' && (
                  (j.payload?.studioSource === 'video-factory' && (j.title?.includes('Cảnh ' + s.id + ':') || j.payload?.title?.includes('Cảnh ' + s.id + ':'))) ||
                  j.title?.includes('Showroom Cảnh ' + s.id + ':') ||
                  j.title?.includes('[Xưởng] Showroom Cảnh ' + s.id + ':')
                )
              );
            }

            // NẾU ĐANG GENERATING VÀ CHƯA CÓ JOB: GIỮ NGUYÊN TRẠNG THÁI GENERATING, KHÔNG BAO GIỜ LẤY ẢNH CŨ
            if (s.showroomStatus === 'generating' && !sJob) {
              // Bỏ qua không làm gì để tiếp tục chờ job Banana chạy xong
            } else if (sJob) {
              if (sJob.status === 'Completed') {
                const resAsset = sJob.result?.assets?.[0];
                const matchedAsset = (allAssets || []).find(a => 
                  a.jobId === sJob.id || 
                  a.id === sJob.resultAssetId || 
                  a.id === sJob.result?.assetId || 
                  (resAsset && (a.id === resAsset.assetId || a.id === resAsset.id))
                ) || resAsset;

                if (matchedAsset && (matchedAsset.url || matchedAsset.localPath || matchedAsset.thumbnailUrl)) {
                  const bestUrl = (matchedAsset.localPath ? 'file:///' + matchedAsset.localPath.replace(/\\/g, '/') : '') || matchedAsset.url || matchedAsset.thumbnailUrl || '';
                  s.showroomStatus = 'done';
                  s.showroomProgress = 100;
                  s.showroomJobId = null;
                  s.showroomImage = {
                    url: bestUrl,
                    thumbnailUrl: matchedAsset.thumbnailUrl || bestUrl,
                    localPath: matchedAsset.localPath || '',
                    assetId: matchedAsset.assetId || matchedAsset.id,
                    base64: bestUrl,
                    mimeType: matchedAsset.mimeType || 'image/jpeg'
                  };
                  changed = true;
                }
              } else if (sJob.status === 'Running' || sJob.status === 'Pending') {
                const newProg = sJob.progress || (sJob.status === 'Running' ? 60 : 25);
                if (s.showroomProgress !== newProg || s.showroomStatus !== 'generating') {
                  s.showroomStatus = 'generating';
                  s.showroomProgress = newProg;
                  changed = true;
                }
              } else if (sJob.status === 'Failed') {
                s.showroomStatus = 'error';
                s.showroomJobId = null;
                changed = true;
              }
            } else if (!s.showroomImage && s.showroomStatus !== 'generating') {
              // Tìm trong thư viện Assets nếu không có job active
              const fallbackAsset = (allAssets || []).find(a => 
                a.type === 'image' && (
                  a.name?.toLowerCase().includes(`canh_${s.id}`) || 
                  a.name?.toLowerCase().includes(`canh${s.id}`) || 
                  a.prompt?.includes(`Scene ${s.id}`) ||
                  a.prompt?.includes(`Cảnh ${s.id}:`) ||
                  a.prompt?.includes(`Cảnh ${s.id} `)
                )
              );

              if (fallbackAsset && (fallbackAsset.url || fallbackAsset.localPath || fallbackAsset.thumbnailUrl)) {
                const bestUrl = (fallbackAsset.localPath ? 'file:///' + fallbackAsset.localPath.replace(/\\/g, '/') : '') || fallbackAsset.url || fallbackAsset.thumbnailUrl || '';
                s.showroomStatus = 'done';
                s.showroomProgress = 100;
                s.showroomJobId = null;
                s.showroomImage = {
                  url: bestUrl,
                  thumbnailUrl: fallbackAsset.thumbnailUrl || bestUrl,
                  localPath: fallbackAsset.localPath || '',
                  assetId: fallbackAsset.id,
                  base64: bestUrl,
                  mimeType: fallbackAsset.mimeType || 'image/jpeg'
                };
                changed = true;
              }
            }
          }

          // 2. Kiểm tra Video Clip của cảnh
          if (!s.videoUrl || s.jobId || s.videoStatus === 'generating') {
            let vJob = null;
            if (s.jobId) {
              vJob = sortedJobs.find(j => j.id === s.jobId);
            }
            if (!vJob) {
              vJob = sortedJobs.find(j => 
                j.type === 'Video' && (
                  (j.payload?.studioSource === 'video-factory' && (j.title?.includes(`Cảnh ${s.id}:`) || j.payload?.title?.includes(`Cảnh ${s.id}:`))) ||
                  j.title?.includes(`[Xưởng] Cảnh ${s.id}:`)
                )
              );
            }

            if (vJob) {
              if (vJob.status === 'Completed') {
                const resAsset = vJob.result?.assets?.[0];
                const matchedVideoAsset = (allAssets || []).find(a => 
                  a.jobId === vJob.id || 
                  a.id === vJob.resultAssetId || 
                  a.id === vJob.result?.assetId || 
                  (resAsset && (a.id === resAsset.assetId || a.id === resAsset.id))
                ) || resAsset;

                if (matchedVideoAsset && (matchedVideoAsset.url || matchedVideoAsset.localPath)) {
                  const bestUrl = (matchedVideoAsset.localPath ? 'file:///' + matchedVideoAsset.localPath.replace(/\\/g, '/') : '') || matchedVideoAsset.url || '';
                  s.videoStatus = 'done';
                  s.videoProgress = 100;
                  s.jobId = null;
                  s.videoUrl = bestUrl;
                  s.assetId = matchedVideoAsset.id || matchedVideoAsset.assetId;
                  changed = true;
                }
              } else if (vJob.status === 'Running' || vJob.status === 'Pending') {
                const newProg = vJob.progress || (vJob.status === 'Running' ? 60 : 25);
                if (s.videoProgress !== newProg || s.videoStatus !== 'generating') {
                  s.videoStatus = 'generating';
                  s.videoProgress = newProg;
                  changed = true;
                }
              } else if (vJob.status === 'Failed') {
                s.videoStatus = 'error';
                s.videoError = vJob.error || 'Lỗi tạo video';
                s.jobId = null;
                changed = true;
              }
            } else if (!s.videoUrl && (s.videoStatus === 'generating' || s.jobId)) {
              const fallbackVideo = (allAssets || []).find(a => 
                a.type === 'video' && (
                  a.name?.toLowerCase().includes(`canh_${s.id}`) ||
                  a.name?.toLowerCase().includes(`canh${s.id}`) ||
                  a.prompt?.includes(`Scene ${s.id}`) ||
                  a.prompt?.includes(`Cảnh ${s.id}`)
                )
              );

              if (fallbackVideo && (fallbackVideo.url || fallbackVideo.localPath)) {
                const bestUrl = (fallbackVideo.localPath ? 'file:///' + fallbackVideo.localPath.replace(/\\/g, '/') : '') || fallbackVideo.url || '';
                s.videoStatus = 'done';
                s.videoProgress = 100;
                s.jobId = null;
                s.videoUrl = bestUrl;
                s.assetId = fallbackVideo.id;
                changed = true;
              }
            }
          }

          return s;
        });

        return changed ? next : prev;
      });
    } catch(err) {
      console.warn('checkJobsAndAssetsDirectly error:', err);
    }
  }, []);

  // Lắng nghe queue.onChanged, assets.onChanged VÀ Fast Polling 1200ms siêu tốc
  React.useEffect(() => {
    const queueApi = window.aiforge?.queue || window.aivideo?.queue;
    const assetsApi = window.aiforge?.assets || window.aivideo?.assets;

    let unsubQueue = null;
    let unsubAssets = null;

    if (queueApi?.onChanged) {
      unsubQueue = queueApi.onChanged(() => checkJobsAndAssetsDirectly());
    }
    if (assetsApi?.onChanged) {
      unsubAssets = assetsApi.onChanged(() => checkJobsAndAssetsDirectly());
    }

    // Quét ngay lập tức và định kỳ mỗi 1.2s để nạp về tức thì
    checkJobsAndAssetsDirectly();
    const interval = setInterval(() => {
      checkJobsAndAssetsDirectly();
    }, 1200);

    return () => {
      if (typeof unsubQueue === 'function') unsubQueue();
      if (typeof unsubAssets === 'function') unsubAssets();
      clearInterval(interval);
    };
  }, [checkJobsAndAssetsDirectly]);

  // Chuyển ngành hàng
  const handleSelectNiche = (nicheId) => {
    setCurrentNiche(nicheId);
    const n = NICHE_TEMPLATES[nicheId];
    if (n) {
      setBrandName(n.defaultBrand);
      setProductInfo(n.defaultInfo);
      setScenes(initScenesForCount(sceneCount));
    }
  };

  // Upload ảnh sản phẩm
  const handleProductUpload = async (index, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target.result;
      let assetId = null;
      const api = window.aiforge?.assets || window.aivideo?.assets;
      if (api?.importReference) {
        try {
          const imported = await api.importReference({
            name: file.name,
            mimeType: file.type,
            dataUrl: base64
          });
          assetId = imported?.id;
        } catch(err){}
      }
      const updated = [...products];
      updated[index] = { name: file.name, base64, mimeType: file.type, assetId };
      setProducts(updated);
      toast?.success?.(`Đã tải ảnh sản phẩm ${index + 1}`);
    };
    reader.readAsDataURL(file);
  };

  const removeProductImage = (index) => {
    const updated = [...products];
    updated[index] = null;
    setProducts(updated);
  };

  // Upload KOC mẫu & Tự động phân tích nhận diện khóa nhân vật, trang phục
  const handleKocUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target.result;
      let assetId = null;
      const api = window.aiforge?.assets || window.aivideo?.assets;
      if (api?.importReference) {
        try {
          const imported = await api.importReference({
            name: file.name,
            mimeType: file.type,
            dataUrl: base64
          });
          assetId = imported?.id;
        } catch(err){}
      }
      const newKoc = { name: file.name, base64, mimeType: file.type, assetId };
      setKocImage(newKoc);
      setBgMode('reference');
      toast?.info?.("Đang phân tích nhân vật & khóa trang phục KOC...");

      analyzeKocDetails(newKoc, geminiApiKey).then(profile => {
        if (profile) {
          setKocProfile(profile);
          setKocImage(prev => prev ? { ...prev, profile } : prev);
          toast?.success?.(`Đã nhận diện: ${profile.isFemale ? 'KOC Nữ' : 'KOC Nam'} - Khóa 100% trang phục & nụ cười tươi tắn!`);
        } else {
          toast?.success?.("Đã nạp KOC mẫu - Khóa trang phục và nhân vật theo ảnh!");
        }
      });
    };
    reader.readAsDataURL(file);
  };

  // 1. TẠO SHOWROOM ĐỘC BẢN CHO TỪNG CẢNH (GEMINI THINKING + BANANA PRO)
  const handleGenerateShowroomAllScenes = async () => {
    const hasProduct = products.some(p => p !== null);
    if (!hasProduct && !productInfo) {
      toast?.error?.("Vui lòng tải ít nhất 1 ảnh sản phẩm hoặc nhập mô tả sản phẩm!");
      return;
    }

    setIsShowroomGenerating(true);
    const runStartTime = Date.now();
    // Reset ảnh cũ và đưa trạng thái về generating để UI hiển thị vòng quay loading
    setScenes(prev => prev.map(s => ({
      ...s,
      showroomImage: null,
      showroomStatus: 'generating',
      showroomProgress: 15,
      showroomJobId: null,
      showroomRunStartTime: runStartTime
    })));

    try {
      const niche = NICHE_TEMPLATES[currentNiche] || NICHE_TEMPLATES.household;
      const activeKey = (geminiApiKey || DEFAULT_GEMINI_KEY).trim();

      // 🧠 GỌI GEMINI THINKING AI ĐỂ SÁNG TẠO PROMPT SHOWROOM RIÊNG BIỆT CHO TỪNG CẢNH (LINH HOẠT NAM/NỮ THEO SẢN PHẨM)
      const effProfile = getEffectiveKocProfile(kocImage, kocProfile, selectedVoice);
      const isKocFemale = effProfile.isFemale;
      const presenterTitle = effProfile.presenterNoun;
      const outfitLockRule = kocImage
        ? `The presenter MUST wear the EXACT SAME OUTFIT as seen in the reference KOC photo (${effProfile.outfitDesc}). Absolutely NO clothing change between scenes!`
        : `The presenter MUST wear the EXACT SAME stylish tailored business blazer over a clean top across ALL scenes (100% outfit lock).`;

      const directorPrompt = `You are a top-tier commercial advertising director planning high-end TikTok / e-commerce showroom photography.
Product: ${productInfo || niche.defaultInfo}
Brand: ${brandName}
Niche: ${niche.name}
Total Scenes: ${sceneCount}
Chosen Voice: ${selectedVoice}

Stage breakdown:
${scenes.map((s, i) => `Scene ${i + 1}: ${s.stage} - ${s.title} (Camera style: ${s.angleName})`).join('\n')}

🚨 MANDATORY RULES (STRICT CONSISTENCY, GENDER LOCK, OUTFIT LOCK & RADIANT EXPRESSION):
1. PRESENTER IDENTIFICATION & WARDROBE LOCK:
- GENDER LOCK: ${kocImage ? `A reference KOC photo is provided. The presenter MUST BE ${isKocFemale ? 'FEMALE (woman)' : 'MALE (man)'} to strictly match the reference photo! NEVER swap or change gender under any circumstances!` : `Selected voice is ${selectedVoice}. The presenter MUST BE ${isKocFemale ? 'FEMALE (attractive young Asian female presenter)' : 'MALE (handsome young Asian male presenter)'} to match the voice!`}
- IDENTITY & CONSISTENCY: The presenter MUST remain 100% IDENTICAL across ALL ${sceneCount} scenes (same face, neat hair, same Asian commercial look).
- WARDROBE LOCK (ABSOLUTE 100% MATCH): ${outfitLockRule} In a professional commercial, the presenter DOES NOT CHANGE CLOTHES between scenes. Do NOT invent different colors or outfits; replicate the reference clothing exactly!
- EXPRESSION: The presenter MUST ALWAYS have a radiant, cheerful, warm commercial smile with fresh, energetic, inviting poise looking directly at camera (nhân vật luôn tươi tắn, rạng rỡ, thần thái đỉnh cao).

2. MANDATORY SCENE STRUCTURE:
- Scene 1 (Hook & Introduction): Energetic medium close-up of the ${presenterTitle} presenting the product with a warm, radiant inviting smile, face clearly visible to camera.
- Scene 2 (Macro Hero Product Close-Up & Function Review): Dramatic commercial close-up shot focusing tightly on the product's fine details, craftsmanship, functions, and premium textures in sharp crisp focus, held proudly by the hands of the SAME ${presenterTitle} (wearing the identical sleeves and outfit, with the presenter's recognizable face and warm smile visible in the soft background depth of field).
- Middle Scenes (if 4 or 5 scenes): Hands-on demonstration and real-world satisfaction, showing practical utility and features with the SAME ${presenterTitle} actively operating or interacting with the product.
- Final Scene (Closing Call-To-Action): The SAME ${presenterTitle} holding the product and warmly gesturing towards the bottom-left corner (where the shopping cart is located) with a welcoming, confident radiant smile.

3. COMMERCIAL AESTHETIC:
- Plain clean unbranded showroom or luxury studio background with soft cinematic lighting.
- 8K commercial photography, vertical 9:16 aspect ratio, ultra-crisp focus, photorealistic textures.
- No text, no logos, no watermarks, no split screens.

Return ONLY a JSON array of ${sceneCount} prompt strings:
[
  "Prompt for scene 1...",
  "Prompt for scene 2...",
  ...
]`;

      // Chuẩn bị dữ liệu KOC ảnh gửi kèm cho Gemini Thinking
      let kocInlinePart = null;
      if (kocImage?.base64) {
        let b64 = kocImage.base64;
        let mime = kocImage.mimeType || 'image/jpeg';
        if (b64.includes(',')) {
          const spl = b64.split(',');
          b64 = spl[1];
          const m = spl[0].match(/:(.*?);/);
          if (m) mime = m[1];
        }
        if (b64 && b64.length > 50) {
          kocInlinePart = {
            inline_data: {
              mime_type: mime,
              data: b64
            }
          };
        }
      }

      let generatedPrompts = [];
      const geminiModels = [
        'gemini-3.5-flash',
        'gemini-3.1-flash-lite',
        'gemini-3.6-flash'
      ];
      for (const mName of geminiModels) {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 3500);
          const reqParts = [{ text: directorPrompt }];
          if (kocInlinePart) reqParts.unshift(kocInlinePart);

          const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${mName}:generateContent?key=${activeKey}`, {
            method: 'POST',
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: reqParts }],
              generationConfig: { temperature: 0.8, response_mime_type: "application/json" }
            })
          });
          clearTimeout(timer);
          if (resp.ok) {
            const d = await resp.json();
            const text = d?.candidates?.[0]?.content?.parts?.[0]?.text;
            const match = text?.match(/\[[\s\S]*\]/);
            if (match) {
              generatedPrompts = JSON.parse(match[0]);
              if (Array.isArray(generatedPrompts) && generatedPrompts.length > 0) break;
            }
          }
        } catch(e) {}
      }

      // Chuẩn bị reference assets với đăng ký đảm bảo
      const refIds = [];
      for (let pIdx = 0; pIdx < products.length; pIdx++) {
        const p = products[pIdx];
        if (p) {
          const aid = await ensureRegisteredAsset(p, `product_${pIdx + 1}.jpg`);
          if (aid) refIds.push(aid);
        }
      }
      if (kocImage) {
        const kid = await ensureRegisteredAsset(kocImage, 'koc_ref.jpg');
        if (kid) refIds.push(kid);
      }

      // 🎯 ROUND-ROBIN CHO ẢNH SHOWROOM: Chia đều cho từng tài khoản Banana
      const isAutoBanana = !selectedBananaAccountId || selectedBananaAccountId === 'auto';
      const liveSessions = (window.aiforge?.browser?.listSessions?.() || window.aivideo?.browser?.listSessions?.() || []);
      const allAccs = (accounts && accounts.length > 0) ? accounts : liveSessions;
      let activeBananaAccs = allAccs.filter(a => a.providerId === 'banana' && (a.authStatus === 'Logged In' || a.authStatus === 'active' || !a.disabled));
      if (activeBananaAccs.length === 0) activeBananaAccs = allAccs.filter(a => a.providerId === 'banana');
      let manualBananaAcc = !isAutoBanana ? allAccs.find(a => a.accountId === selectedBananaAccountId) : undefined;

      const qApi = window.aiforge?.queue || window.aivideo?.queue;
      if (qApi?.addJobs || qApi?.addJob) {

        const prodDesc = productInfo || niche.defaultInfo || brandName;

        const jobs = scenes.map((s, idx) => {
          let curAcc = undefined;
          let isManual = false;
          if (manualBananaAcc) {
            curAcc = manualBananaAcc;
            isManual = true;
          } else if (activeBananaAccs.length > 0) {
            curAcc = activeBananaAccs[idx % activeBananaAccs.length];
            isManual = false;
          }
          const targetBananaAccId = curAcc?.accountId || undefined;
          const targetBananaAccName = curAcc?.accountDisplayName || curAcc?.accountEmail || curAcc?.accountName || undefined;
          let promptForScene = generatedPrompts[idx];
          if (!promptForScene) {
            const charDesc = `The SAME ${effProfile.presenterNoun} with a radiant beaming commercial smile, ${effProfile.outfitDesc}`;
            if (s.id === 1) {
              promptForScene = `A high-end 8K commercial showroom photograph of ${prodDesc} - Scene 1 (Hook Close-up). ${charDesc} enthusiastically presenting the product with an energetic smile, face clearly visible looking at camera. Clean modern luxury showroom background, vertical 9:16.`;
            } else if (s.id === scenes.length) {
              promptForScene = `A high-end 8K commercial showroom photograph of ${prodDesc} - Scene ${s.id} (CTA Call To Action). ${charDesc} holding the product and warmly pointing towards the bottom left cart with a welcoming smile, face clearly visible to camera, vertical 9:16.`;
            } else if (s.id === 2 && scenes.length === 3) {
              promptForScene = `A high-end 8K commercial showroom photograph of ${prodDesc} - Scene 2 (Macro Hero Product Close-Up). Dramatic hero close-up shot focusing sharply on the exquisite craftsmanship, fine textures, and premium details of the product held proudly in the hands of the SAME ${charDesc} (wearing the same outfit, with presenter's warm smile visible in the soft background bokeh). Soft commercial studio lighting, vertical 9:16.`;
            } else if (s.id === 2) {
              promptForScene = `A high-end 8K commercial showroom photograph of ${prodDesc} - Scene 2 (Macro Hero Product Close-Up). Dramatic hero close-up shot focusing sharply on the exquisite craftsmanship, fine textures, and premium details of the product held proudly in the hands of the SAME ${charDesc} (wearing the same outfit, with presenter's warm smile visible in the soft background bokeh). Soft commercial studio lighting, vertical 9:16.`;
            } else if (s.id === 3) {
              promptForScene = `A high-end 8K commercial showroom photograph of ${prodDesc} - Scene 3 (Nhân Vật Trực Tiếp Thao Tác SP). ${charDesc} professionally demonstrating and holding the product in a sleek luxury showroom, face clearly visible, vertical 9:16.`;
            } else {
              promptForScene = `A high-end 8K commercial showroom photograph of ${prodDesc} - Scene ${s.id} (Nhân Vật Tự Tin Trong Showroom). ${charDesc} professionally demonstrating and holding the product in a sleek luxury showroom, face clearly visible, vertical 9:16.`;
            }
          }

          return {
            title: `[Xưởng] Showroom Cảnh ${s.id}: ${s.stage} - ${brandName}`,
            type: "Image",
            providerId: imageEngine === "muse" ? "muse" : "banana",
            provider: imageEngine === "muse" ? "Muse AI" : "Banana",
            ...(targetBananaAccId ? { accountId: targetBananaAccId } : {}),
            payload: {
              title: `[Xưởng] Showroom Cảnh ${s.id}: ${s.stage}`,
              prompt: imageEngine === "muse" && !promptForScene.toLowerCase().startsWith('tạo ảnh') ? `Tạo ảnh 9:16: ${promptForScene}` : promptForScene,
              ratio: "9:16",
              model: imageEngine === "muse" ? "muse-image" : "banana",
              modelDisplayName: imageEngine === "muse" ? "⚡ Muse AI" : "🍌 Nano Banana Pro",
              referenceAssetIds: refIds,
              studioSource: "video-factory",
              removeWatermark: removeWatermark,
              autoRemoveWatermark: removeWatermark,
              upsampleResolution: imageResolution === '2k' ? '2K' : 'Full HD',
              resolution: imageResolution === '2k' ? '2K' : 'Standard',
              quality: imageResolution === '2k' ? '2K' : 'Standard',
              imageResolution: imageResolution,
              upscale2k: imageResolution === '2k',
              accountSelection: (selectedBananaAccountId && selectedBananaAccountId !== "auto") ? "manual" : "auto"
            }
          };
        });

        const res = await (qApi.addJobs ? qApi.addJobs(jobs) : Promise.all(jobs.map(j => qApi.addJob(j))));
        try { qApi.resume?.(); } catch(_) {}
        const jobResults = Array.isArray(res) ? res : (res?.results || []);
        if (jobResults && Array.isArray(jobResults)) {
          setScenes(prev => prev.map((s, idx) => {
            const jId = jobResults[idx]?.job?.id || jobResults[idx]?.id || null;
            return {
              ...s,
              showroomJobId: jId || null,
              showroomStatus: 'generating',
              showroomProgress: 20,
              showroomRunStartTime: runStartTime
            };
          }));
          toast?.info?.(`Đã gửi lệnh tạo ${sceneCount} ảnh Showroom góc máy riêng biệt sang ${imageEngine === "muse" ? "Muse AI" : "Banana Pro"}!`);
          setIsShowroomGenerating(false);
          setTimeout(() => checkJobsAndAssetsDirectly(), 800);
          return;
        }
      }

      // Fallback offline
      setTimeout(() => {
        const firstProd = products.find(p => p !== null);
        const pUrl = firstProd ? firstProd.base64 : (kocImage ? kocImage.base64 : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=700&q=80");
        setScenes(prev => prev.map(s => ({
          ...s,
          showroomStatus: 'done',
          showroomProgress: 100,
          showroomImage: { url: pUrl, assetId: firstProd?.assetId || null }
        })));
        setIsShowroomGenerating(false);
        toast?.success?.(`Đã tạo xong ${sceneCount} góc ảnh Showroom!`);
      }, 2500);

    } catch(err) {
      console.error(err);
      setIsShowroomGenerating(false);
      setScenes(prev => prev.map(s => ({ ...s, showroomStatus: 'error' })));
      toast?.error?.("Lỗi khi tạo ảnh Showroom: " + err.message);
    }
  };

  // 2. LÊN KỊCH BẢN KOC: GEMINI AI THẬT TƯƠNG ỨNG VỚI SỐ CẢNH (3, 4, 5)
  const handleGenerateScript = async () => {
    if (!productInfo) {
      toast?.error?.("Vui lòng nhập mô tả thông tin sản phẩm!");
      return;
    }

    // Đảm bảo quét và đồng bộ ảnh Showroom mới nhất vào từng cảnh trước khi lên kịch bản
    try { await checkJobsAndAssetsDirectly(); } catch(e){}

    const activeKey = (geminiApiKey || DEFAULT_GEMINI_KEY).trim();
    setIsScriptGenerating(true);
    setScenes(prev => prev.map(s => ({
      ...s,
      promptStatus: 'generating',
      videoUrl: null,
      jobId: null,
      videoStatus: 'idle',
      videoProgress: 0,
      videoError: null
    })));

    try {
      const niche = NICHE_TEMPLATES[currentNiche] || NICHE_TEMPLATES.household;
      const effProfile = getEffectiveKocProfile(kocImage, kocProfile, selectedVoice);
      const variationNonce = Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);

      const analysisPrompt = `Bạn là chuyên gia biên kịch hàng đầu chuyên sản xuất video quảng cáo TikTok Shop & Reels KOC (Triệu view, chốt đơn đỉnh cao).
Sản phẩm: ${productInfo}
Thương hiệu: ${brandName}
Ngành hàng: ${niche.name}
Giọng đọc KOC đã chọn: ${selectedVoice}
Tổng số phân cảnh cần tạo: ${sceneCount} phân cảnh
Mã phiên bản ngẫu nhiên: ${variationNonce} (YÊU CẦU: Mỗi lần bấm tạo kịch bản BẮT BUỘC phải đổi mới hoàn toàn 100% câu từ, cách giật tít, góc tiếp cận và lời thoại cho tất cả các cảnh, không lặp lại kịch bản cũ!).

CẤU TRÚC PHÂN ĐOẠN BẮT BUỘC (${sceneCount} CẢNH):
${scenes.map((s, idx) => `Phân đoạn ${idx + 1}: ${s.stage} - ${s.title} (Góc quay: ${s.angleName})`).join('\n')}

TIÊU CHÍ VÀ QUY TẮC CỐT LÕI (BẮT BUỘC TUÂN THỦ 100%):
1. BỐ CỤC NỘI DUNG CHUẨN THƯƠNG MẠI:
- CẢNH 1 (MỞ ĐẦU & GIỚI THIỆU): Mở đầu ấn tượng, giật tít thu hút người xem ngay trong 3 giây đầu, giới thiệu sản phẩm và thương hiệu, đánh trúng nhu cầu khách hàng.
- PHÂN CẢNH BẮT BUỘC REVIEW CÔNG DỤNG & CHỨC NĂNG QUAY CẬN (Các cảnh giữa, đặc biệt là Cảnh 2):
  + BẮT BUỘC phải có phân cảnh QUAY CẬN CẢNH (Close-up / Macro Shot) đặc tả chi tiết sản phẩm.
  + Review trực tiếp công dụng, tính năng thực tế, cách thức hoạt động hoặc ưu điểm vượt trội của sản phẩm.
  + Thao tác thực tế, cho thấy sản phẩm tiện lợi, hiệu quả và giải quyết vấn đề thế nào.
  + VẪN ĐỒNG NHẤT NHÂN VẬT 100%: Tay của nhân vật (mặc cùng trang phục với cùng cổ tay áo / same sleeves) thao tác, cầm nắm sản phẩm, hoặc nhân vật tương tác cận cảnh với nụ cười tự nhiên ở hậu cảnh mờ (bokeh).
- CẢNH KẾT (CHỐT HÀNG / CTA): Cảnh kết chốt đơn mạnh mẽ, kêu gọi hành động (Call To Action), tạo cảm giác khan hiếm, giục người xem nhấp ngay vào giỏ hàng góc trái màn hình TikTok để nhận giá ưu đãi độc quyền.

2. QUY ĐỊNH CHUYỂN ĐỘNG & GÓC QUAY (motionPrompt tiếng Anh cho AI Video):
- TUYỆT ĐỐI KHÔNG để góc máy xoay tròn quanh người đơn điệu (NO 360 spinning camera, NO disorienting circular pans, NO random circling).
- Thay vào đó, phân định rõ góc máy điện ảnh cho từng cảnh:
  + Cảnh Giới thiệu: Steady medium framing: ${effProfile.presenterNoun} wearing ${effProfile.outfitDesc} gracefully introduces the featured product inside the modern showroom with a radiant, confident commercial smile and natural poise, soft studio lighting.
  + Cảnh Review Công Dụng (Quay Cận): Crisp macro close-up shot focused on product features and practical functions in action, operated smoothly by the same presenter's hands with identical sleeves matching the KOC outfit, steady camera capturing utility and fine textures, presenter's radiant smile visible in background bokeh.
  + Cảnh Chốt Hàng: Steady medium framing: The same ${effProfile.presenterNoun} wearing ${effProfile.outfitDesc} holding product proudly, gesturing warmly towards bottom-left shopping area with an inviting, radiant smile.

3. ĐỒNG NHẤT NHÂN VẬT & KHÓA TRANG PHỤC TUYỆT ĐỐI (100% STRICT REFERENCE OUTFIT LOCK):
- Tất cả các cảnh đều thuộc về CÙNG MỘT NHÂN VẬT mặc CÙNG MỘT BỘ ĐỒ DUY NHẤT lấy chính xác 100% từ ảnh tham chiếu KOC: The SAME presenter (${effProfile.presenterNoun}) wearing the EXACT SAME outfit and clothing as shown in the reference photo (identical style, neckline, sleeves, and colors - 100% exact 1:1 match).
- 🚨 CẢNH BÁO QUAN TRỌNG VỀ TRANG PHỤC: TUYỆT ĐỐI CẤM TỰ Ý MÔ TẢ MẶC VEST, BLAZER, JACKET, ÁO VÉC NẾU NHÂN VẬT TRONG ẢNH KHÔNG MẶC VEST! Nhân vật mặc gì trong ảnh tham chiếu thì motionPrompt PHẢI khóa y nguyên trang phục đó (ví dụ áo thun, áo sơ mi, đầm, áo polo,...), KHÔNG thêm áo khoác/vest/blazer vào prompt!

4. 🚨 LUẬT BẮT BUỘC: NHÂN VẬT 100% CHỈ ĐƯỢC NÓI TIẾNG VIỆT - TUYỆT ĐỐI CẤM NÓI TIẾNG ANH (STRICT 100% VIETNAMESE SPEECH ONLY):
- VỀ LỜI THOẠI (voiceScript):
  + TẤT CẢ các cảnh (từ Cảnh 1 đến Cảnh ${sceneCount}) 100% BẮT BUỘC PHẢI LÀ TIẾNG VIỆT thuần túy, tự nhiên, cuốn hút, chốt đơn đỉnh cao theo chuẩn phong cách TikTok KOC Việt Nam.
  + TUYỆT ĐỐI CẤM (ZERO TOLERANCE): CẤM tuyệt đối bất kỳ câu, từ, chữ tiếng Anh nào xuất hiện trong voiceScript (KHÔNG chèn "Hello guys", "Check it out", "Buy now", "Don't miss", "Today we have", "Amazing product",...). Toàn bộ kịch bản lời thoại phải là TIẾNG VIỆT CÓ DẤU HOÀN TOÀN!
- VỀ DIỄN XUẤT VÀ KHẨU HÌNH (motionPrompt):
  + motionPrompt được viết bằng tiếng Anh để mô tả góc quay và chuyển động cho AI Video. NHƯNG NẾU CÓ MÔ TẢ NHÂN VẬT NÓI, MỞ MIỆNG, CỬ ĐỘNG KHẨU HÌNH:
    * BẮT BUỘC PHẢI MÔ TẢ LÀ NÓI TIẾNG VIỆT: "The presenter speaks natural fluent Vietnamese with authentic Vietnamese lip-sync", hoặc trích dẫn chính câu thoại tiếng Việt: speaking in Vietnamese: "...".
    * TUYỆT ĐỐI CẤM đưa bất kỳ câu thoại tiếng Anh nào vào motionPrompt (CẤM các kiểu: saying: "...", talks in English, speaks English dialogue, shouting English slogans,...).
    * Mọi âm thanh và khẩu hình nói chuyện của nhân vật trong video ĐỀU LÀ TIẾNG VIỆT 100%!

5. YÊU CẦU ĐẦU RA CHO MỖI PHÂN ĐOẠN:
- voiceScript: 100% Lời thoại bán hàng TIẾNG VIỆT thuần túy, ngắn gọn, sắc bén, hấp dẫn, tối đa 22 từ, chuẩn văn phong phù hợp với giọng ${selectedVoice}. TUYỆT ĐỐI KHÔNG DÙNG TIẾNG ANH.
- motionPrompt: Mô tả diễn xuất tiếng Anh chi tiết, tuân thủ đúng góc máy và tiêu chí review công dụng ở trên, nhân vật nói tiếng Việt (speaking Vietnamese only).

Trả về DUY NHẤT một mảng JSON gồm đúng ${sceneCount} đối tượng:
[
${scenes.map((_, i) => `  { "voiceScript": "...", "motionPrompt": "..." }`).join(',\n')}
]`;

      // Trích xuất Base64 chuẩn cho các ảnh tham chiếu (KOC, Showroom cảnh, Sản phẩm)
      const extractBase64Data = async (imgObj) => {
        if (!imgObj) return null;
        try {
          const raw = imgObj.base64 || imgObj.dataUrl || imgObj.url;
          if (typeof raw === 'string' && raw.includes(';base64,')) {
            const spl = raw.split(';base64,');
            const mime = spl[0].match(/data:([^;]+)/)?.[1] || imgObj.mimeType || 'image/jpeg';
            if (spl[1] && spl[1].length > 100) return { data: spl[1], mimeType: mime };
          }
          const urlToFetch = imgObj.url || (typeof raw === 'string' && raw.startsWith('http') ? raw : null);
          if (urlToFetch) {
            const res = await fetch(urlToFetch);
            if (res.ok) {
              const blob = await res.blob();
              return await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                  const str = reader.result;
                  if (typeof str === 'string' && str.includes(',')) {
                    resolve({ data: str.split(',')[1], mimeType: blob.type || imgObj.mimeType || 'image/jpeg' });
                  } else resolve(null);
                };
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(blob);
              });
            }
          }
        } catch(e) {}
        return null;
      };

      const parts = [];
      try {
        // 1. Nạp ảnh KOC mẫu trước tiên để Gemini nhìn rõ nhân vật & trang phục
        if (kocImage) {
          const kocPart = await extractBase64Data(kocImage);
          if (kocPart?.data) parts.push({ inline_data: kocPart });
        }
        // 2. Nạp ảnh Showroom (nếu có)
        const curShowroom = scenes[activePreviewIndex]?.showroomImage || scenes[0]?.showroomImage;
        if (curShowroom) {
          const showPart = await extractBase64Data(curShowroom);
          if (showPart?.data) parts.push({ inline_data: showPart });
        }
        // 3. Nạp ảnh sản phẩm
        const firstProd = (products || []).find(p => p !== null);
        if (firstProd) {
          const prodPart = await extractBase64Data(firstProd);
          if (prodPart?.data) parts.push({ inline_data: prodPart });
        }
      } catch(e) {}

      parts.push({ text: analysisPrompt });

      const bodyPayload = {
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.85,
          response_mime_type: "application/json"
        }
      };

      let scriptData = null;
      let lastError = null;

      const geminiScriptModels = [
        'gemini-3.5-flash',
        'gemini-3.1-flash-lite',
        'gemini-3.6-flash'
      ];
      for (const mName of geminiScriptModels) {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 4000);

          const tryPayloads = [
            {
              contents: [{ parts }],
              generationConfig: {
                temperature: 0.85,
                response_mime_type: "application/json"
              }
            },
            {
              contents: [{ parts: [{ text: analysisPrompt }] }],
              generationConfig: {
                temperature: 0.85,
                response_mime_type: "application/json"
              }
            }
          ];

          for (const curPayload of tryPayloads) {
            const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${mName}:generateContent?key=${activeKey}`, {
              method: 'POST',
              signal: controller.signal,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(curPayload)
            });

            if (resp.ok) {
              const data = await resp.json();
              const candidate = data?.candidates?.[0];
              let textOutput = candidate?.content?.parts?.map(p => p.text || '').join('') || '';
              
              let parsedArr = null;
              try {
                let cleanText = textOutput.trim();
                if (cleanText.startsWith('```')) {
                  cleanText = cleanText.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '').trim();
                }
                const direct = JSON.parse(cleanText);
                if (Array.isArray(direct)) {
                  parsedArr = direct;
                } else if (typeof direct === 'object' && direct !== null) {
                  const arr = Object.values(direct).find(Array.isArray);
                  if (arr) parsedArr = arr;
                  else {
                    const entries = Object.values(direct).filter(v => v && typeof v === 'object' && (v.voiceScript || v.motionPrompt));
                    if (entries.length > 0) parsedArr = entries;
                  }
                }
              } catch(e1) {
                const jsonMatch = textOutput.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                  try { parsedArr = JSON.parse(jsonMatch[0]); } catch(e2){}
                }
              }

              if (Array.isArray(parsedArr) && parsedArr.length >= 1) {
                scriptData = parsedArr;
                break;
              }
            } else {
              lastError = await resp.text();
            }
          }
          clearTimeout(timer);
          if (scriptData) break;
        } catch(e) {
          lastError = e.message;
        }
      }

      // KOC Smart Fallback siêu đa dạng (Ngẫu nhiên 100% mỗi lần bấm kể cả khi offline)
      if (!scriptData || !Array.isArray(scriptData) || scriptData.length === 0) {
        const brand = brandName || 'CHÍNH HÃNG';
        const prod = productInfo || 'Sản phẩm cao cấp';

        const hookVariations = [
          `Bỏ lỡ em này là tiếc hùi hụi luôn cả nhà ơi! Cực phẩm ${brand} chính thức cập bến rồi đây!`,
          `Dừng lại 3 giây! Ai đang tìm kiếm giải pháp cho ${prod} thì chân ái đây rồi nhé!`,
          `Cảnh báo mê mẩn! Vừa unbox ${brand} là em phải lên clip khoe ngay vì quá đỉnh!`,
          `Tưởng không xịn mà xịn không tưởng! Em ${prod} này đang cháy hàng liên tục đó ạ!`,
          `Hot trend TikTok mấy ngày nay là gì? Chính là siêu phẩm ${prod} này chứ đâu!`
        ];

        const reviewFeatureVariations = [
          `Soi cận cảnh từng chi tiết ${prod} xịn sò, chất liệu cao cấp và công năng tiện ích vượt trội!`,
          `Nhìn cận cảnh này các bác, độ hoàn thiện tỉ mỉ từng đường nét, công nghệ thông minh vận hành cực êm!`,
          `Test thực tế công dụng ngay tại chỗ: giải quyết triệt để vấn đề, thao tác cực nhạy và mượt mà!`,
          `Quay sát vào sản phẩm cho cả nhà xem độ chất lượng, cầm đầm tay, tính năng độc quyền dùng là mê!`,
          `Điểm đắt giá nhất chính là công năng này: siêu bền bỉ, tiết kiệm thời gian tối đa cho người dùng!`
        ];

        const handsOnVariations = [
          `Trải nghiệm thực tế mới thấy đỉnh chóp, công năng vượt trội thao tác cực mượt mà dùng thử là mê tít!`,
          `Mỗi ngày dùng em này cảm giác như được nâng tầm cuộc sống, vừa tiện lợi vừa sang xịn mịn!`,
          `Test độ bền và khả năng vận hành thực tế: chuẩn chỉ đến từng milimet, không có điểm nào để chê!`,
          `Thực sự bất ngờ về hiệu quả mang lại, từ ngày có ${prod} mọi thứ trở nên nhẹ nhàng hơn hẳn!`
        ];

        const trustVariations = [
          `Hàng chính hãng bảo hành dài hạn, giá tận xưởng cực hời cho anh chị em trong live hôm nay!`,
          `Cam kết chuẩn xuất khẩu, đổi trả uy tín, đáng đồng tiền bát gạo cho mọi gia đình!`,
          `Đầu tư một lần dùng bền bỉ nhiều năm, phản hồi khách hàng toàn 5 sao chất lượng!`
        ];

        const ctaVariations = [
          `Duy nhất hôm nay đang có giá ưu đãi cực sốc, số lượng có hạn nhanh tay bấm ngay vào giỏ hàng góc trái nhé!`,
          `Deal hời có 1-0-2 trong hôm nay, số lượng kho sắp hết rồi, các bác bấm giỏ hàng góc trái săn ngay nha!`,
          `Đừng để lỡ voucher giảm giá độc quyền hôm nay! Bấm ngay vào giỏ hàng góc trái màn hình kẻo tiếc nhé!`,
          `Số lượng ưu đãi giới hạn cho những ai nhanh tay nhất! Click ngay giỏ hàng góc trái để nhận quà tặng kèm nha!`,
          `Giá sốc hôm nay chưa từng có, chốt đơn liền tay ở giỏ hàng góc trái để rinh ngay siêu phẩm về nhà nhé!`
        ];

        const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

        const buildFallbackForScene = (sceneId, total) => {
          if (sceneId === 1) {
            return {
              voiceScript: pickRandom(hookVariations),
              motionPrompt: `Medium close-up shot of the SAME ${effProfile.presenterNoun} wearing ${effProfile.outfitDesc} enthusiastically introducing ${prod} directly to camera with a radiant, confident commercial smile, speaking clearly, steady locked camera.`
            };
          }
          if (sceneId === total) {
            return {
              voiceScript: pickRandom(ctaVariations),
              motionPrompt: `Medium shot of the SAME ${effProfile.presenterNoun} wearing ${effProfile.outfitDesc} holding ${prod} proudly and warmly pointing towards the bottom-left shopping cart with an inviting, radiant smile.`
            };
          }
          if (total === 3 && sceneId === 2) {
            return {
              voiceScript: pickRandom(reviewFeatureVariations),
              motionPrompt: `Crisp macro close-up shot focusing directly on the practical functions and fine craftsmanship of ${prod}, held and demonstrated smoothly by the hands of the SAME ${effProfile.presenterNoun} wearing identical sleeves matching the KOC outfit, steady camera capturing utility, presenter's radiant smile visible in background bokeh, no spinning.`
            };
          }
          if (sceneId === 2) {
            return {
              voiceScript: `Cận cảnh từng chi tiết ${prod} xịn sò, chất liệu cao cấp và hoàn thiện tỉ mỉ từng milimet!`,
              motionPrompt: `Crisp macro hero close-up shot of ${prod} held proudly in the hands of the SAME ${effProfile.presenterNoun} wearing identical sleeves matching the KOC outfit, camera slowly highlighting fine textures and exquisite craftsmanship without spinning.`
            };
          }
          if (sceneId === 3) {
            return {
              voiceScript: pickRandom(handsOnVariations),
              motionPrompt: `Close-up shot of the SAME ${effProfile.presenterNoun}'s hands with identical sleeves matching the KOC outfit actively demonstrating the practical functions and utility of ${prod} with smooth confident gestures, steady framing.`
            };
          }
          return {
            voiceScript: pickRandom(trustVariations),
            motionPrompt: `Medium shot of the SAME ${effProfile.presenterNoun} wearing ${effProfile.outfitDesc} holding ${prod} with a radiant, welcoming commercial smile, showcasing the product clearly in modern showroom, speaking directly to camera.`
          };
        };

        scriptData = scenes.map((s) => buildFallbackForScene(s.id, sceneCount));
      }

      if (scriptData && Array.isArray(scriptData) && scriptData.length >= 1) {
        // Hàm kiểm tra nghiêm ngặt: Lời thoại phải là tiếng Việt có dấu
        const viDiacritics = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
        const enWordsCheck = /\b(hello|welcome|check out|buy now|today|don't miss|this is|product|great|amazing|order now|link below|click here)\b/i;

        setScenes(prev => prev.map((s, idx) => {
          const item = scriptData[idx] || scriptData[idx % scriptData.length];
          let vScript = (item?.voiceScript || s.voiceScript || '').trim();
          let mPrompt = (item?.motionPrompt || s.motionPrompt || '').trim();

          // 🚨 NẾU AI LỠ TRẢ VỀ TIẾNG ANH: TỰ ĐỘNG THAY THẾ BẰNG KỊCH BẢN TIẾNG VIỆT CHUẨN KOC NGAY LẬP TỨC
          if (!viDiacritics.test(vScript) || enWordsCheck.test(vScript)) {
            const fallback = buildFallbackForScene(s.id, sceneCount);
            vScript = fallback.voiceScript;
          }

          // 🚨 LÀM SẠCH motionPrompt: LOẠI BỎ TRIỆT ĐỂ BẤT KỲ CÂU NÓI TIẾNG ANH NÀO
          mPrompt = mPrompt.replace(/saying\s*:\s*["'][^"']+["']/gi, '');
          mPrompt = mPrompt.replace(/saying\s+["'][^"']+["']/gi, '');
          mPrompt = mPrompt.replace(/\b(speaking|speaks|talks)\s+(in\s+)?english\b/gi, 'speaking fluent Vietnamese');
          mPrompt = mPrompt.replace(/\benglish\s+(dialogue|speech|words|lines)\b/gi, 'Vietnamese dialogue');
          if (!/vietnamese/i.test(mPrompt)) {
            mPrompt += ' The presenter speaks natural fluent Vietnamese with authentic Vietnamese mouth movements and lip-sync.';
          }

          return {
            ...s,
            voiceScript: vScript,
            motionPrompt: mPrompt,
            promptStatus: 'done',
            videoUrl: null,
            jobId: null,
            videoStatus: 'idle',
            videoProgress: 0,
            videoError: null
          };
        }));
        setIsScriptGenerating(false);
        toast?.success?.(`Đã đổi mới 100% kịch bản KOC Tiếng Việt cho cả ${sceneCount} phân đoạn!`);
      } else {
        let cleanErr = lastError || "Không thể phân tích kịch bản từ Gemini";
        try { cleanErr = JSON.parse(lastError)?.error?.message || cleanErr; } catch(e){}
        throw new Error(cleanErr);
      }

    } catch (err) {
      console.error('Gemini error:', err);
      setIsScriptGenerating(false);
      setScenes(prev => prev.map(s => ({ ...s, promptStatus: 'error' })));
      toast?.error?.("Lỗi khi gọi Gemini AI: " + (err.message || "Kiểm tra lại kết nối mạng"));
    }
  };

  // 3. SẢN XUẤT 1 CLIP: NẠP CHÍNH ẢNH SHOWROOM CỦA CẢNH ĐÓ VÀO LÀM START FRAME
  const handleGenerateSingleVideo = async (index) => {
    const scene = scenes[index];
    if (!scene.motionPrompt && !scene.voiceScript) {
      toast?.error?.("Vui lòng tạo kịch bản trước khi sản xuất video!");
      return;
    }

    setScenes(prev => prev.map((s, i) => i === index ? { ...s, videoStatus: 'generating', videoProgress: 10 } : s));

    try {
      const backendModelId = mapVideoModelToBackendId(videoModel);
      const matchedVoice = KOC_VOICES.find(v => v.label === selectedVoice) || KOC_VOICES[0];
      const enhancedPrompt = buildEnhancedVideoPrompt(scene, sceneCount, kocProfile, Boolean(kocImage), selectedVoice, currentNiche);

      // 🎯 QUY TẮC CỐT LÕI MỌI CẢNH: ẢNH SHOWROOM CẢNH + ẢNH KOC MẪU + ẢNH OUTFIT/SẢN PHẨM
      const validShowroomId = scene.showroomImage ? await ensureRegisteredAsset(scene.showroomImage, `scene_${scene.id}_showroom.jpg`) : null;
      const validKocId = kocImage ? await ensureRegisteredAsset(kocImage, 'koc_model_ref.jpg') : null;
      const primaryProduct = (products || []).find(p => p);
      const validProductId = primaryProduct ? await ensureRegisteredAsset(primaryProduct, 'outfit_product_ref.jpg') : null;
      const allRefIds = [validShowroomId, validKocId, validProductId].filter(Boolean);
      const hasRef = allRefIds.length > 0;

      const isMuse = videoEngine === 'muse';
      const isAutoAcc = !selectedVideoAccountId || selectedVideoAccountId === 'auto';
      let targetAccId = undefined;
      let targetAccName = undefined;

      if (isMuse) {
        if (!isAutoAcc) {
          const museAcc = accounts.find(a => a.accountId === selectedVideoAccountId && (a.providerId === 'muse' || a.provider?.toLowerCase().includes('muse')));
          targetAccId = museAcc?.accountId || undefined;
          targetAccName = museAcc?.accountEmail || museAcc?.accountDisplayName;
        } else {
          const activeMuse = accounts.filter(a => (a.providerId === 'muse' || a.provider?.toLowerCase().includes('muse')) && (a.authStatus === 'Logged In' || a.authStatus === 'active'));
          if (activeMuse.length > 0) {
            window.__aiforge_vfs_video_counter = (window.__aiforge_vfs_video_counter || 0) + 1;
            const chosen = activeMuse[(window.__aiforge_vfs_video_counter - 1) % activeMuse.length];
            targetAccId = chosen.accountId;
            targetAccName = chosen.accountEmail || chosen.accountDisplayName;
          }
        }
      } else {
        if (!isAutoAcc) {
          const veoAccount = accounts.find(a => a.accountId === selectedVideoAccountId && a.providerId === 'veo3');
          targetAccId = veoAccount?.accountId || undefined;
          targetAccName = veoAccount?.accountEmail || veoAccount?.accountDisplayName;
        } else {
          const activeVeo = accounts.filter(a => a.providerId === 'veo3' && (a.authStatus === 'Logged In' || a.authStatus === 'active'));
          if (activeVeo.length > 0) {
            window.__aiforge_vfs_video_counter = (window.__aiforge_vfs_video_counter || 0) + 1;
            const chosen = activeVeo[(window.__aiforge_vfs_video_counter - 1) % activeVeo.length];
            targetAccId = chosen.accountId;
            targetAccName = chosen.accountEmail || chosen.accountDisplayName;
          }
        }
      }

      const qApi = window.aiforge?.queue || window.aivideo?.queue;
      if (qApi?.addJobs || qApi?.addJob) {
        const jobInput = {
          title: `[Xưởng] Cảnh ${scene.id}: ${scene.stage} - ${brandName}`,
          type: "Video",
          providerId: isMuse ? "muse" : "veo3",
          provider: isMuse ? "Muse AI" : "Veo3",
          account: targetAccName || (isAutoAcc ? "Auto" : undefined),
          ...(targetAccId ? { accountId: targetAccId, account: targetAccName } : {}),
          payload: isMuse ? {
            title: `[Xưởng] Cảnh ${scene.id}: ${scene.stage}`,
            promptId: `vfs-scene-${scene.id}`,
            prompt: enhancedPrompt,
            ratio: "9:16",
            duration: "10s",
            model: "muse-video",
            mode: "Components",
            outputIndex: 0,
            batchSize: 1,
            batchIndex: 0,
            promptOrder: scene.id,
            referenceAssetIds: allRefIds.slice(0, 6),
            resolutionName: videoResolution === '1080p' ? "1080p" : "720p",
            studioSource: "video-factory",
            account: targetAccName || (isAutoAcc ? "Auto" : undefined),
            accountSelection: isAutoAcc ? "auto" : "manual",
            tts: {
              enabled: true,
              script: scene.voiceScript,
              voiceName: matchedVoice.name,
              voiceId: matchedVoice.id,
              modelId: "eleven_v4"
            }
          } : {
            title: `[Xưởng] Cảnh ${scene.id}: ${scene.stage}`,
            prompt: enhancedPrompt,
            ratio: "9:16",
            duration: "8s",
            model: backendModelId,
            modelDisplayName: videoModel,
            flowVideoMode: hasRef ? "I2V" : "T2V",
            mode: hasRef ? "I2V" : "T2V",
            referenceAssetIds: validShowroomId ? [validShowroomId] : (allRefIds[0] ? [allRefIds[0]] : []),
            inputImageAssetId: validShowroomId || undefined,
            firstFrameImageMediaId: validShowroomId || undefined,
            startImageMediaId: validShowroomId || undefined,
            referenceImageMediaIds: [validKocId, validProductId].filter(Boolean),
            autoRemoveWatermark: true,
            removeWatermark: true,
            studioSource: "video-factory",
            removeWatermark: removeWatermark,
            autoRemoveWatermark: removeWatermark,
            upscale1080p: videoResolution === '1080p',
            upsampleResolution: videoResolution,
            resolution: "720p", // Flow catalog native resolution
            account: targetAccName || (isAutoAcc ? "Auto" : undefined),
            accountSelection: isAutoAcc ? "auto" : "manual",
            tts: {
              enabled: true,
              script: scene.voiceScript,
              voiceName: matchedVoice.name,
              voiceId: matchedVoice.id,
              modelId: "eleven_v4"
            }
          }
        };

        const res = await (qApi.addJobs ? qApi.addJobs([jobInput]) : qApi.addJob(jobInput));
        try { qApi.resume?.(); } catch(_) {}
        const rItem = Array.isArray(res) ? res[0] : (res?.results?.[0] || res);
        const jId = rItem?.job?.id || rItem?.id || null;
        if (jId && !rItem?.error) {
          setScenes(prev => prev.map((s, i) => i === index ? { ...s, jobId: jId, videoStatus: 'generating', videoProgress: 15 } : s));
          toast?.info?.(`Cảnh ${scene.id} đã gửi sang ${isMuse ? 'Muse AI' : `Google Flow (${videoModel})`} kèm ảnh Showroom Banana!`);
          setTimeout(() => checkJobsAndAssetsDirectly(), 800);
          return;
        } else if (rItem?.error) {
          throw new Error(rItem.error);
        }
      }

      // Fallback preview offline
      setTimeout(() => {
        setScenes(prev => prev.map((s, i) => i === index ? {
          ...s,
          videoStatus: 'done',
          videoProgress: 100,
          videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-woman-showing-a-product-in-a-studio-41481-large.mp4"
        } : s));
        toast?.success?.(`Cảnh ${scene.id} hoàn tất!`);
      }, 3500);

    } catch (err) {
      console.error(err);
      setScenes(prev => prev.map((s, i) => i === index ? { ...s, videoStatus: 'error' } : s));
      toast?.error?.(`Lỗi khi render cảnh ${scene.id}: ` + err.message);
    }
  };

  // 4. SẢN XUẤT TOÀN BỘ CLIPS (BATCH ADD JOBS)
  const handleGenerateAllVideos = async () => {
    const readyScenes = scenes.filter(s => s.voiceScript || s.motionPrompt);
    if (readyScenes.length === 0) {
      toast?.error?.("Vui lòng tạo kịch bản KOC trước khi sản xuất clips!");
      return;
    }

    setIsBatchGenerating(true);
    setScenes(prev => prev.map(s => (s.voiceScript || s.motionPrompt) ? {
      ...s,
      videoStatus: 'generating',
      videoProgress: 10
    } : s));

    try {
      const isMuse = videoEngine === 'muse';
      const backendModelId = mapVideoModelToBackendId(videoModel);
      const matchedVoice = KOC_VOICES.find(v => v.label === selectedVoice) || KOC_VOICES[0];

      // Tìm session thích hợp theo engine đã chọn với cơ chế chia đều
      const isAutoAcc = !selectedVideoAccountId || selectedVideoAccountId === 'auto';
      const activeVideoAccs = accounts.filter(a => isMuse ? 
        (a.providerId === 'muse' || a.provider?.toLowerCase().includes('muse')) && (a.authStatus === 'Logged In' || a.authStatus === 'active') :
        (a.providerId === 'veo3' && (a.authStatus === 'Logged In' || a.authStatus === 'active'))
      );

      const qApi = window.aiforge?.queue || window.aivideo?.queue;
      if (qApi?.addJobs || qApi?.addJob) {
        const runId = `vfs-run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const runCreatedAt = new Date().toISOString();

        const jobs = await Promise.all(scenes.map(async (scene, idx) => {
          let targetAccId = undefined;
          let targetAccName = undefined;
          if (!isAutoAcc) {
            const manualAcc = accounts.find(a => a.accountId === selectedVideoAccountId);
            targetAccId = manualAcc?.accountId;
            targetAccName = manualAcc?.accountEmail || manualAcc?.accountDisplayName;
          } else if (activeVideoAccs.length > 0) {
            const chosen = activeVideoAccs[idx % activeVideoAccs.length];
            targetAccId = chosen.accountId;
            targetAccName = chosen.accountEmail || chosen.accountDisplayName;
          }

          const enhancedPrompt = buildEnhancedVideoPrompt(scene, sceneCount, kocProfile, Boolean(kocImage), selectedVoice, currentNiche);

          // 🎯 QUY TẮC CỐT LÕI MỌI CẢNH: ẢNH SHOWROOM CẢNH + ẢNH KOC MẪU + ẢNH OUTFIT/SẢN PHẨM
          const validShowroomId = scene.showroomImage ? await ensureRegisteredAsset(scene.showroomImage, `scene_${scene.id}_showroom.jpg`) : null;
          const validKocId = kocImage ? await ensureRegisteredAsset(kocImage, 'koc_model_ref.jpg') : null;
          const primaryProduct = (products || []).find(p => p);
          const validProductId = primaryProduct ? await ensureRegisteredAsset(primaryProduct, 'outfit_product_ref.jpg') : null;
          const allRefIds = [validShowroomId, validKocId, validProductId].filter(Boolean);
          const hasRef = allRefIds.length > 0;

          return {
            title: `[Xưởng] Cảnh ${scene.id}: ${scene.stage} - ${brandName}`,
            type: "Video",
            providerId: isMuse ? "muse" : "veo3",
            provider: isMuse ? "Muse AI" : "Veo3",
            account: targetAccName || (isAutoAcc ? "Auto" : undefined),
            ...(targetAccId ? { accountId: targetAccId, account: targetAccName } : {}),
            payload: isMuse ? {
              title: `[Xưởng] Cảnh ${scene.id}: ${scene.stage}`,
              promptId: `vfs-scene-${scene.id}`,
              prompt: enhancedPrompt,
              ratio: "9:16",
              duration: "10s",
              model: "muse-video",
              mode: "Components",
              outputIndex: idx,
              batchSize: scenes.length,
              generationRunId: runId,
              generationRunCreatedAt: runCreatedAt,
              promptOrder: scene.id,
              batchIndex: idx,
              referenceAssetIds: allRefIds.slice(0, 6),
              resolutionName: videoResolution === '1080p' ? "1080p" : "720p",
              studioSource: "video-factory",
              account: targetAccName || (isAutoAcc ? "Auto" : undefined),
              accountSelection: isAutoAcc ? "auto" : "manual",
              tts: {
                enabled: true,
                script: scene.voiceScript || '',
                voiceName: matchedVoice.name,
                voiceId: matchedVoice.id,
                modelId: "eleven_v4"
              }
            } : {
              title: `[Xưởng] Cảnh ${scene.id}: ${scene.stage}`,
              prompt: enhancedPrompt,
              ratio: "9:16",
              duration: "8s",
              model: backendModelId,
              modelDisplayName: videoModel,
              flowVideoMode: hasRef ? "I2V" : "T2V",
              mode: hasRef ? "I2V" : "T2V",
              referenceAssetIds: validShowroomId ? [validShowroomId] : (allRefIds[0] ? [allRefIds[0]] : []),
              inputImageAssetId: validShowroomId || undefined,
              firstFrameImageMediaId: validShowroomId || undefined,
              startImageMediaId: validShowroomId || undefined,
              referenceImageMediaIds: [validKocId, validProductId].filter(Boolean),
              autoRemoveWatermark: true,
              removeWatermark: true,
              studioSource: "video-factory",
              removeWatermark: removeWatermark,
              autoRemoveWatermark: removeWatermark,
              upscale1080p: videoResolution === '1080p',
              upsampleResolution: videoResolution,
              resolution: "720p", // Flow catalog native resolution
              account: targetAccName || (isAutoAcc ? "Auto" : undefined),
              accountSelection: isAutoAcc ? "auto" : "manual",
              tts: {
                enabled: true,
                script: scene.voiceScript || '',
                voiceName: matchedVoice.name,
                voiceId: matchedVoice.id,
                modelId: "eleven_v4"
              }
            }
          };
        }));

        const res = await (qApi.addJobs ? qApi.addJobs(jobs) : Promise.all(jobs.map(j => qApi.addJob(j))));
        try { qApi.resume?.(); } catch(_) {}
        const jobResults = Array.isArray(res) ? res : (res?.results || []);
        if (jobResults && Array.isArray(jobResults)) {
          let successCount = 0;
          let firstError = null;

          setScenes(prev => prev.map((s, idx) => {
            const r = jobResults[idx];
            const jId = r?.job?.id || r?.id || null;
            if (jId && !r?.error) {
              successCount++;
              return { ...s, jobId: jId, videoStatus: 'generating', videoProgress: 15 };
            } else {
              if (r?.error && !firstError) firstError = r.error;
              return s;
            }
          }));

          if (successCount > 0) {
            toast?.success?.(`Đã gửi lệnh sản xuất hàng loạt ${successCount}/${scenes.length} video sang ${isMuse ? 'Muse AI siêu tốc' : `Google Flow (${videoModel})`}!`);
            setIsBatchGenerating(false);
            setTimeout(() => checkJobsAndAssetsDirectly(), 800);
            return;
          } else if (firstError) {
            toast?.error?.(`Lỗi gửi lệnh video: ${firstError}`);
          }
        }
      }

      // Fallback offline preview nếu không có kết nối backend
      setTimeout(() => {
        setScenes(prev => prev.map(s => ({
          ...s,
          videoStatus: 'done',
          videoProgress: 100,
          videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-woman-showing-a-product-in-a-studio-41481-large.mp4"
        })));
        setIsBatchGenerating(false);
        toast?.success?.(`Toàn bộ ${sceneCount} clips hoàn tất!`);
      }, 3500);

    } catch (err) {
      console.error(err);
      setIsBatchGenerating(false);
      setScenes(prev => prev.map(s => ({ ...s, videoStatus: 'error' })));
      toast?.error?.("Lỗi khi sản xuất hàng loạt: " + err.message);
    }
  };

  // 5. TẢI GÓI ZIP / XUẤT TẤT CẢ CLIPS
  const handleDownloadZip = () => {
    const readyVideos = scenes.filter(s => s.videoUrl);
    if (readyVideos.length === 0) {
      toast?.error?.("Chưa có clip nào render xong để tải về!");
      return;
    }

    setIsDownloading(true);
    try {
      readyVideos.forEach((s) => {
        const a = document.createElement('a');
        a.href = s.videoUrl;
        a.download = `KOC_${brandName.replace(/\s+/g, '_')}_Canh_0${s.id}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      });

      const scriptContent = scenes.map(s => 
        `[CẢNH ${s.id}: ${s.stage} - ${s.title}] (Góc: ${s.angleName})
Lời thoại KOC: ${s.voiceScript}
Motion Prompt: ${s.motionPrompt}

`
      ).join('\n');

      const blob = new Blob([scriptContent], { type: 'text/plain;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `Kich_Ban_KOC_${brandName.replace(/\s+/g, '_')}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast?.success?.(`Đang tải xuống ${readyVideos.length} video MP4 & kịch bản!`);
    } catch (e) {
      console.error(e);
      toast?.error?.("Lỗi khi tải gói dữ liệu!");
    } finally {
      setIsDownloading(false);
    }
  };


  // Lưu chỉnh sửa kịch bản trực tiếp
  const handleSaveSceneScript = (sceneId, newVoiceScript, newMotionPrompt) => {
    setScenes(prev => prev.map(s => s.id === sceneId ? {
      ...s,
      voiceScript: newVoiceScript,
      motionPrompt: newMotionPrompt || s.motionPrompt
    } : s));
    setEditingScene(null);
    toast?.success?.(`Đã lưu kịch bản Cảnh ${sceneId}!`);
  };

  if (currentNiche === 'fashion') {
    return React.createElement(FashionKocProStudio, {
      currentNiche,
      handleSelectNiche,
      accounts,
      selectedBananaAccountId,
      handleSelectBananaAccount,
      selectedVideoAccountId,
      handleSelectVideoAccount,
      autoDelMins,
      onChangeAutoDel,
      NICHE_TEMPLATES,
      geminiApiKey
    });
  }
  if (currentNiche === 'cosmetics') {
    return React.createElement(FittingRoomKocStudio, {
      currentNiche,
      handleSelectNiche,
      accounts,
      selectedBananaAccountId,
      handleSelectBananaAccount,
      selectedVideoAccountId,
      handleSelectVideoAccount,
      autoDelMins,
      onChangeAutoDel,
      NICHE_TEMPLATES,
      geminiApiKey,
      imageResolution,
      setImageResolution,
      removeWatermark,
      setRemoveWatermark
    });
  }
  const nicheObj = NICHE_TEMPLATES[currentNiche] || NICHE_TEMPLATES.household;
  const activeScene = scenes[activePreviewIndex] || scenes[0];

  return React.createElement("div", {
    style: { display: 'flex', flexDirection: 'column', height: '100%', width: '100%', overflow: 'hidden' },
    className: "bg-[#070a14] text-gray-100 font-sans select-none"
  },
    // Top Bar (50px)
    React.createElement("div", {
      style: { height: '50px', minHeight: '50px', maxHeight: '50px' },
      className: "border-b border-white/[0.08] bg-[#0b0f1d] px-4 flex items-center justify-between z-30 shadow-md flex-shrink-0"
    },
      React.createElement("div", { className: "flex items-center gap-2.5" },
        React.createElement("div", { className: "w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-blue-500/20" },
          "🏭"
        ),
        React.createElement("div", { className: "flex items-center gap-2" },
          React.createElement("span", { className: "text-xs font-bold text-white uppercase tracking-tight" }, "Xưởng Sản Xuất Video AI"),
          React.createElement("span", { className: "text-xs text-gray-500" }, "•"),
          React.createElement("span", { className: "text-[10px] font-semibold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/30" }, `${sceneCount} Clips 9:16 KOC`)
        )
      ),

      // Right Top Controls: Niche Selector & Account Selector
      React.createElement("div", { className: "flex items-center gap-2" },
        React.createElement("div", {
          className: `inline-flex h-7 items-center gap-1 rounded-lg border px-2 text-[10px] font-bold transition-all ${autoDelMins > 0 ? 'border-amber-400/50 bg-amber-500/15 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'border-white/10 bg-white/5 text-gray-400'}`
        },
          React.createElement("span", { className: `w-1.5 h-1.5 rounded-full ${autoDelMins > 0 ? 'bg-amber-400 animate-pulse' : 'bg-gray-500'}` }),
          React.createElement("span", null, "⏱️ Tự xóa:"),
          React.createElement("select", {
            value: autoDelMins,
            onChange: e => onChangeAutoDel(e.target.value),
            title: "Chế độ tự động xóa tài nguyên sau khi tạo để tiết kiệm ổ đĩa",
            className: "cursor-pointer bg-transparent text-[10px] font-bold text-inherit outline-none border-none pr-1"
          },
            React.createElement("option", { value: 0, className: "bg-[#18152e] text-gray-300" }, "Tắt (Giữ vĩnh viễn)"),
            React.createElement("option", { value: 10, className: "bg-[#18152e] text-amber-300" }, "10 phút"),
            React.createElement("option", { value: 20, className: "bg-[#18152e] text-amber-300" }, "20 phút"),
            React.createElement("option", { value: 30, className: "bg-[#18152e] text-amber-300" }, "30 phút"),
            React.createElement("option", { value: 40, className: "bg-[#18152e] text-amber-300" }, "40 phút"),
            React.createElement("option", { value: 50, className: "bg-[#18152e] text-amber-300" }, "50 phút"),
            React.createElement("option", { value: 60, className: "bg-[#18152e] text-amber-300" }, "60 phút")
          )
        ),
        // Niche Selector
        React.createElement("div", { className: "flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/[0.08]" },
          Object.values(NICHE_TEMPLATES).map(n => 
            React.createElement("button", {
              key: n.id,
              onClick: () => handleSelectNiche(n.id),
              className: `px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                currentNiche === n.id 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-gray-400 hover:text-white hover:bg-white/[0.05]'
              }`
            },
              React.createElement("span", null, n.icon),
              React.createElement("span", null, n.name)
            )
          )
        ),

        // Image Engine & Account Selector (Banana Pro vs Muse AI - Showroom)
        React.createElement("div", {
          className: "flex items-center rounded-xl bg-black/40 border border-white/10 p-0.5 shadow-sm"
        },
          React.createElement("button", {
            type: "button",
            onClick: () => { setImageEngine("banana"); try { localStorage.setItem("aivideo_factory_image_engine", "banana"); } catch(e){} },
            className: `px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all ${imageEngine === "banana" ? "bg-amber-500 text-black shadow-md font-black" : "text-gray-400 hover:text-white"}`
          }, React.createElement("span", null, "🍌"), React.createElement("span", null, "Banana")),
          React.createElement("button", {
            type: "button",
            onClick: () => { setImageEngine("muse"); try { localStorage.setItem("aivideo_factory_image_engine", "muse"); } catch(e){} },
            className: `px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all ${imageEngine === "muse" ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md font-black" : "text-gray-400 hover:text-white"}`
          }, React.createElement("span", null, "⚡"), React.createElement("span", null, "Muse AI"))
        ),
        React.createElement("div", { 
          title: imageEngine === "muse" ? "Tài khoản tạo Ảnh Showroom (Muse AI)" : "Tài khoản tạo Ảnh Showroom (Banana Pro / Google Flow)",
          className: `flex items-center gap-1.5 px-2.5 py-1 rounded-xl border shadow-sm ${imageEngine === "muse" ? "bg-purple-500/10 border-purple-500/30 text-purple-300" : "bg-amber-500/10 border-amber-500/30 text-amber-300"}` 
        },
          React.createElement("span", { className: "text-xs" }, imageEngine === "muse" ? "⚡" : "🍌"),
          (() => {
            const availAccs = accounts.filter(a => imageEngine === "muse" ? (a.providerId === "muse" || (a.provider && a.provider.toLowerCase().includes("muse"))) : (a.providerId === "banana"));
            return availAccs.length > 0 ? React.createElement("select", {
              value: selectedBananaAccountId,
              onChange: (e) => handleSelectBananaAccount(e.target.value),
              className: `bg-transparent text-[11px] font-bold outline-none cursor-pointer max-w-[140px] truncate ${imageEngine === "muse" ? "text-purple-200" : "text-amber-300"}`
            },
              React.createElement("option", { key: "auto", value: "auto", className: "bg-[#0b101f] text-yellow-300 font-bold" }, imageEngine === "muse" ? "🔄 Tự chia đều Muse" : "🔄 Tự động chia đều Acc"),
              availAccs.map(acc => 
                React.createElement("option", { key: acc.accountId, value: acc.accountId, className: "bg-[#0b101f] text-white" },
                  (imageEngine === "muse" ? "⚡ " : "🍌 ") + (acc.accountDisplayName || acc.accountEmail || acc.accountId)
                )
              )
            ) : React.createElement("span", { className: "text-[11px] font-bold opacity-80" }, imageEngine === "muse" ? "Chưa có Muse AI" : "Chưa có Banana");
          })()
        ),

        // Video Account Selector (Muse AI hoặc Veo 3)
        React.createElement("div", { 
          title: `Tài khoản tạo Video Clip (${videoEngine === 'muse' ? 'Muse AI' : 'Veo 3'})`,
          className: `flex items-center gap-1.5 px-2.5 py-1 rounded-xl border shadow-sm ${videoEngine === 'muse' ? 'bg-purple-500/10 border-purple-500/35' : 'bg-cyan-500/10 border-cyan-500/35'}` 
        },
          React.createElement("span", { className: "text-xs" }, videoEngine === 'muse' ? "⚡" : "🎬"),
          (() => {
            const isMuse = videoEngine === 'muse';
            const vAccs = accounts.filter(a => isMuse ? (a.providerId === 'muse' || a.provider?.toLowerCase().includes('muse')) : (a.providerId === 'veo3'));
            return vAccs.length > 0 ? React.createElement("select", {
              value: selectedVideoAccountId,
              onChange: (e) => handleSelectVideoAccount(e.target.value),
              className: `bg-transparent text-[11px] font-bold outline-none cursor-pointer max-w-[140px] truncate ${isMuse ? 'text-purple-300' : 'text-cyan-300'}`
            },
              React.createElement("option", { key: "auto", value: "auto", className: "bg-[#0b101f] text-amber-300 font-bold" }, isMuse ? "⚡ Tự động đổi Acc" : "🔄 Tự động chia đều Acc"),
              vAccs.map(acc => 
                React.createElement("option", { key: acc.accountId, value: acc.accountId, className: "bg-[#0b101f] text-gray-200" },
                  `${isMuse ? '⚡' : '🎬'} ${acc.accountEmail || acc.accountDisplayName || acc.accountId}`
                )
              )
            ) : React.createElement("span", { className: "text-[11px] text-red-400 font-semibold" }, `Chưa có ${isMuse ? 'Muse' : 'Veo3'}`);
          })()
        )
      )
    ),

    // Main 2-Column Layout
    React.createElement("div", {
      style: { display: 'flex', flex: 1, height: 'calc(100% - 50px)', overflow: 'hidden' }
    },
      // LEFT SIDEBAR (CỐ ĐỊNH 340PX)
      React.createElement("aside", {
        style: { width: '340px', minWidth: '340px', maxWidth: '340px', height: '100%', flexShrink: 0, display: 'flex', flexDirection: 'column' },
        className: "border-r border-white/[0.08] bg-[#080d1a] z-20 shadow-xl overflow-hidden"
      },
        // Header
        React.createElement("div", { className: "p-4 pb-1 flex-shrink-0" },
          React.createElement("h2", { className: "text-base font-black tracking-tight uppercase text-white" }, "AI STUDIO"),
          React.createElement("p", { className: "text-[9px] font-bold text-gray-400 uppercase tracking-[0.15em]" },
            `CẤU HÌNH ${nicheObj.name.toUpperCase()}`
          )
        ),

        // Scrollable Body
        React.createElement("div", {
          style: { flex: 1, overflowY: 'auto' },
          className: "no-scrollbar p-4 flex flex-col gap-3.5"
        },
          // 1. HÌNH ẢNH SẢN PHẨM (Khung 75px cố định)
          React.createElement("div", { className: "space-y-1" },
            React.createElement(SectionLabel, null, "1. HÌNH ẢNH SẢN PHẨM"),
            React.createElement("div", { className: "grid grid-cols-3 gap-2" },
              products.map((p, i) => 
                React.createElement("div", {
                  key: i,
                  style: { height: '75px', maxHeight: '75px', width: '100%' },
                  className: "bg-white/[0.03] border border-white/[0.1] rounded-xl flex items-center justify-center cursor-pointer overflow-hidden transition-all hover:border-cyan-500/50 relative group"
                },
                  p ? React.createElement(React.Fragment, null,
                    React.createElement("img", {
                      src: p.base64,
                      style: { width: '100%', height: '100%', objectFit: 'contain', background: '#0a0f1d' }
                    }),
                    React.createElement("button", {
                      onClick: (e) => { e.stopPropagation(); removeProductImage(i); },
                      className: "absolute top-1 right-1 w-4 h-4 rounded-full bg-black/80 hover:bg-red-600 text-white text-[9px] flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                    }, "×")
                  ) : React.createElement("label", { className: "w-full h-full flex flex-col items-center justify-center cursor-pointer text-gray-500 hover:text-cyan-400" },
                    React.createElement("span", { className: "text-xl font-light leading-none" }, "+"),
                    React.createElement("span", { className: "text-[9px] text-gray-500 mt-1" }, `Ảnh ${i + 1}`),
                    React.createElement("input", {
                      type: "file",
                      accept: "image/*",
                      className: "hidden",
                      onChange: (e) => handleProductUpload(i, e)
                    })
                  )
                )
              )
            )
          ),

          // 2. THÔNG TIN SẢN PHẨM
          React.createElement(TextArea, {
            label: "2. THÔNG TIN SẢN PHẨM",
            value: productInfo,
            onChange: (v) => setProductInfo(v),
            placeholder: "Mô tả công dụng, tính năng, ưu đãi..."
          }),

          // 3. NHÂN VẬT KOC
          React.createElement("div", { className: "space-y-1.5" },
            React.createElement(SectionLabel, null, "3. NHÂN VẬT KOC"),
            React.createElement(SegmentedToggle, {
              value: bgMode,
              onChange: (v) => setBgMode(v),
              items: [
                { value: 'auto', label: 'AI Tự Sinh', icon: React.createElement("span", { className: "text-xs" }, "🤖") },
                { value: 'reference', label: 'Dùng KOC Mẫu', icon: React.createElement("span", { className: "text-xs" }, "👤") }
              ]
            }),
            bgMode === 'reference' && React.createElement("div", {
              style: { height: '70px', maxHeight: '70px', width: '100%' },
              className: "bg-white/[0.02] border border-dashed border-white/[0.15] rounded-xl flex flex-col items-center justify-center cursor-pointer overflow-hidden hover:bg-white/[0.04] transition-colors relative"
            },
              kocImage ? React.createElement(React.Fragment, null,
                React.createElement("img", {
                  src: kocImage.base64,
                  style: { width: '100%', height: '100%', objectFit: 'contain', background: '#0a0f1d' }
                }),
                React.createElement("button", {
                  onClick: (e) => { e.stopPropagation(); setKocImage(null); setKocProfile(null); },
                  className: "absolute top-1 right-1 w-5 h-5 rounded-full bg-black/80 hover:bg-red-600 text-white text-xs flex items-center justify-center transition-colors"
                }, "×"),
                React.createElement("div", {
                  className: "absolute bottom-1 left-1 right-1 bg-black/80 backdrop-blur-sm rounded px-1.5 py-0.5 flex items-center justify-between text-[9px] text-cyan-300 font-semibold border border-cyan-500/30 select-none cursor-pointer hover:bg-black/95 transition-all",
                  title: "Nhấp để đổi KOC Nữ / KOC Nam",
                  onClick: (e) => {
                    e.stopPropagation();
                    const currIsFem = kocProfile?.isFemale !== undefined ? kocProfile.isFemale : isFemaleVoice(selectedVoice);
                    const nextIsFem = !currIsFem;
                    const newProf = {
                      ...(kocProfile || {}),
                      isFemale: nextIsFem,
                      gender: nextIsFem ? 'female' : 'male',
                      presenterNoun: nextIsFem ? 'attractive young Asian female presenter' : 'handsome young Asian male presenter'
                    };
                    setKocProfile(newProf);
                    setKocImage(prev => prev ? { ...prev, profile: newProf } : prev);
                    toast?.info?.(nextIsFem ? "Đã chuyển sang: 👩 KOC Nữ" : "Đã chuyển sang: 👨 KOC Nam");
                  }
                },
                  React.createElement("span", null, (kocProfile?.isFemale ?? isFemaleVoice(selectedVoice)) ? "👩 Nữ • Khóa đồ gốc" : "👨 Nam • Khóa đồ gốc"),
                  React.createElement("span", { className: "text-emerald-400 font-bold" }, "✨ Tươi tắn")
                )
              ) : React.createElement("label", { className: "w-full h-full flex flex-col items-center justify-center cursor-pointer text-gray-400 hover:text-cyan-400 p-2 text-center" },
                React.createElement("span", { className: "text-base mb-0.5" }, "📷"),
                React.createElement("span", { className: "text-[9px] font-bold uppercase tracking-wider" }, "Tải ảnh KOC mẫu"),
                React.createElement("input", {
                  type: "file",
                  accept: "image/*",
                  className: "hidden",
                  onChange: handleKocUpload
                })
              )
            )
          ),

          // 4. THIẾT LẬP AI & CHỌN SỐ LƯỢNG CẢNH (3, 4, 5 CẢNH)
          React.createElement("div", { className: "space-y-2" },
            React.createElement("div", { className: "flex items-center justify-between" },
              React.createElement(SectionLabel, null, "4. THIẾT LẬP AI"),
              React.createElement("button", {
                type: "button",
                onClick: () => { setTempApiKeyInput(geminiApiKey || ''); setShowApiKeyModal(true); },
                className: "text-[9px] font-bold text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20"
              },
                "🔑 AI Key: Đã kết nối ⚡"
              )
            ),

            // TÙY CHỌN SỐ LƯỢNG CẢNH
            React.createElement("div", { className: "space-y-1" },
              React.createElement("p", { className: "text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-0.5" }, "SỐ LƯỢNG PHÂN ĐOẠN"),
              React.createElement(SegmentedToggle, {
                value: sceneCount,
                onChange: (v) => handleSceneCountChange(v),
                items: [
                  { value: 3, label: '3 Cảnh (Ngắn)', icon: React.createElement("span", { className: "text-xs font-bold" }, "3️⃣") },
                  { value: 4, label: '4 Cảnh', icon: React.createElement("span", { className: "text-xs font-bold" }, "4️⃣") },
                  { value: 5, label: '5 Cảnh (Chuẩn)', icon: React.createElement("span", { className: "text-xs font-bold" }, "5️⃣") }
                ]
              })
            ),
            
            // TÊN THƯƠNG HIỆU
            React.createElement(TextInput, {
              label: "TÊN THƯƠNG HIỆU",
              value: brandName,
              onChange: (v) => setBrandName(v),
              placeholder: "Ví dụ: GIA DỤNG VIỆT"
            }),

            // NỀN TẢNG TẠO ẢNH SHOWROOM (ENGINE)
            React.createElement("div", { className: "space-y-1" },
              React.createElement("div", { className: "flex items-center justify-between" },
                React.createElement("p", { className: "text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-0.5" }, "NỀN TẢNG TẠO ẢNH SHOWROOM"),
                React.createElement("span", { className: "text-[9px] text-amber-300 font-bold" }, imageEngine === "muse" ? "⚡ Muse AI" : "🍌 Banana Pro")
              ),
              React.createElement(SegmentedToggle, {
                value: imageEngine,
                onChange: (v) => {
                  setImageEngine(v);
                  try { localStorage.setItem('aivideo_factory_image_engine', v); } catch(e){}
                },
                items: [
                  { value: 'banana', label: '🍌 Banana Pro', icon: React.createElement("span", { className: "text-xs font-bold text-amber-400" }, "🍌") },
                  { value: 'muse', label: '⚡ Muse AI (Ưu tiên)', icon: React.createElement("span", { className: "text-xs font-bold text-purple-400" }, "⚡") }
                ]
              })
            ),

            // NỀN TẢNG TẠO VIDEO (ENGINE)
            React.createElement("div", { className: "space-y-1" },
              React.createElement("div", { className: "flex items-center justify-between" },
                React.createElement("p", { className: "text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-0.5" }, "NỀN TẢNG VIDEO"),
                videoEngine === 'muse' && React.createElement("span", { className: "text-[9px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30" }, "✓ Không lo chặn mặt")
              ),
              React.createElement(SegmentedToggle, {
                value: videoEngine,
                onChange: (v) => {
                  setVideoEngine(v);
                  try { localStorage.setItem('aiforge_vfs_video_engine', v); } catch(e){}
                },
                items: [
                  { value: 'muse', label: '⚡ Muse AI (Ưu tiên)', icon: React.createElement("span", { className: "text-xs font-bold text-amber-400" }, "⚡") },
                  { value: 'veo3', label: '🎬 Veo 3.1 Flow', icon: React.createElement("span", { className: "text-xs font-bold text-cyan-400" }, "🎬") }
                ]
              })
            ),
            videoEngine === 'muse' ? React.createElement("div", { className: "text-[9px] text-emerald-300 font-medium px-2.5 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/25 flex items-start gap-1.5" },
              React.createElement("span", { className: "text-xs" }, "💡"),
              React.createElement("span", null, "Muse AI tự động lấy ảnh Showroom từ Banana Pro làm chuẩn, tạo video mượt mà không bao giờ bị dính lỗi vi phạm chính sách gương mặt KOC!")
            ) : React.createElement(React.Fragment, null,
              React.createElement(FieldDropdown, {
                label: "MODEL VIDEO VEO 3",
                value: videoModel,
                options: VIDEO_MODELS,
                onChange: (v) => setVideoModel(v)
              }),
              videoModel.includes('Omni') && React.createElement("div", { className: "text-[9px] text-amber-300 font-medium px-2 py-1 -mt-1 mb-1 rounded bg-amber-950/40 border border-amber-500/20 flex items-center gap-1" },
                "⚠️ Omni Flash có bộ lọc gương mặt rất gắt. Khuyên chọn 'Veo 3.1 - Lite [Lower Priority]' hoặc chuyển sang Muse AI!"
              )
            ),

            // GIỌNG NÓI NHÂN VẬT (KHÓA ĐỒNG NHẤT 100% CÁC CẢNH)
            React.createElement(FieldDropdown, {
              label: "GIỌNG NÓI KOC (KHÓA 100% CÁC CẢNH)",
              value: selectedVoice,
              options: KOC_VOICES.map(v => v.label),
              onChange: (v) => {
                setSelectedVoice(v);
                const isFem = isFemaleVoice(v);
                setKocProfile(prev => ({
                  ...(prev || {}),
                  isFemale: isFem,
                  gender: isFem ? 'female' : 'male',
                  presenterNoun: isFem ? 'attractive young Asian female presenter' : 'handsome young Asian male presenter'
                }));
                setKocImage(prev => prev ? {
                  ...prev,
                  profile: {
                    ...(prev.profile || {}),
                    isFemale: isFem,
                    gender: isFem ? 'female' : 'male',
                    presenterNoun: isFem ? 'attractive young Asian female presenter' : 'handsome young Asian male presenter'
                  }
                } : prev);
              }
            }),

            // NÚT ĐIỀU KHIỂN CHẤT LƯỢNG & XÓA WATERMARK CHO CẢ ẢNH & VIDEO
            React.createElement("div", { className: "space-y-2 p-2 rounded-xl bg-white/[0.02] border border-white/[0.08]" },
              // 1. Độ nét Ảnh Showroom
              React.createElement("div", { className: "flex items-center justify-between" },
                React.createElement("span", { className: "text-[10px] font-bold text-gray-300 uppercase tracking-wider" }, "ĐỘ NÉT ẢNH SHOWROOM:"),
                React.createElement("div", { className: "flex gap-1" },
                  React.createElement("button", {
                    type: "button",
                    onClick: () => setImageResolution('standard'),
                    className: `px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${imageResolution !== '2k' ? 'bg-cyan-500 text-black shadow-md' : 'bg-white/5 text-gray-400 hover:text-white'}`
                  }, "⚡ Chuẩn"),
                  React.createElement("button", {
                    type: "button",
                    onClick: () => setImageResolution('2k'),
                    className: `px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${imageResolution === '2k' ? 'bg-amber-400 text-black shadow-md' : 'bg-white/5 text-gray-400 hover:text-white'}`
                  }, "🌟 2K Siêu Nét")
                )
              ),
              // 2. Độ nét Video Clip
              React.createElement("div", { className: "flex items-center justify-between pt-1 border-t border-white/[0.05]" },
                React.createElement("span", { className: "text-[10px] font-bold text-gray-300 uppercase tracking-wider" }, "ĐỘ NÉT VIDEO CLIP:"),
                React.createElement("div", { className: "flex gap-1" },
                  React.createElement("button", {
                    type: "button",
                    onClick: () => setVideoResolution('720p'),
                    className: `px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${videoResolution === '720p' ? 'bg-cyan-500 text-black shadow-md' : 'bg-white/5 text-gray-400 hover:text-white'}`
                  }, "⚡ 720p (Nhanh)"),
                  React.createElement("button", {
                    type: "button",
                    onClick: () => setVideoResolution('1080p'),
                    className: `px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${videoResolution === '1080p' ? 'bg-amber-400 text-black shadow-md' : 'bg-white/5 text-gray-400 hover:text-white'}`
                  }, "🌟 1080p Full HD")
                )
              ),
              // 3. Xóa Watermark (Ảnh & Video)
              React.createElement("div", { className: "flex items-center justify-between pt-1 border-t border-white/[0.05]" },
                React.createElement("span", { className: "text-[10px] font-bold text-gray-300 uppercase tracking-wider" }, "XÓA WATERMARK (ẢNH & CLIP):"),
                React.createElement("div", { className: "flex gap-1" },
                  React.createElement("button", {
                    type: "button",
                    onClick: () => setRemoveWatermark(false),
                    className: `px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${!removeWatermark ? 'bg-gray-600 text-white shadow-md' : 'bg-white/5 text-gray-400 hover:text-white'}`
                  }, "🏷️ Giữ Gốc"),
                  React.createElement("button", {
                    type: "button",
                    onClick: () => setRemoveWatermark(true),
                    className: `px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${removeWatermark ? 'bg-emerald-500 text-black shadow-md' : 'bg-white/5 text-gray-400 hover:text-white'}`
                  }, "✨ Bật Xóa Logo")
                )
              )
            ),
                // NÚT TẠO SHOWROOM (X CẢNH)
            React.createElement(PillButton, {
              variant: "solid",
              onClick: handleGenerateShowroomAllScenes,
              disabled: isShowroomGenerating || products.every(o => o === null),
              loading: isShowroomGenerating,
              className: "mt-0.5 !h-[38px] !text-[12px] !font-bold"
            },
              isShowroomGenerating ? `ĐANG TẠO ${sceneCount} GÓC ẢNH SHOWROOM...` : `TẠO SHOWROOM (${sceneCount} GÓC CẢNH)`
            )
          ),

          // 5. XUẤT BẢN NỘI DUNG
          React.createElement("div", { className: "space-y-2 pt-2 border-t border-white/[0.08]" },
            React.createElement(SectionLabel, null, "5. XUẤT BẢN NỘI DUNG"),
            
            // LÊN KỊCH BẢN KOC
            React.createElement(PillButton, {
              variant: "outline",
              onClick: handleGenerateScript,
              disabled: isScriptGenerating,
              loading: isScriptGenerating,
              icon: "🧠"
            },
              isScriptGenerating ? "Đang suy nghĩ kịch bản (AI Thinking)..." : `LÊN KỊCH BẢN KOC (${sceneCount} CẢNH)`
            ),

            // NÚT CẤU HÌNH GEMINI KEY NHANH
            React.createElement("button", {
              type: "button",
              onClick: () => {
                setTempApiKeyInput(geminiApiKey || DEFAULT_GEMINI_KEY);
                setShowApiKeyModal(true);
              },
              className: "w-full py-1 px-2 rounded-lg text-[10px] font-bold text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 border border-cyan-500/20 transition-all flex items-center justify-center gap-1 cursor-pointer"
            },
              "🔑 Cấu hình Gemini Key",
              React.createElement("span", { className: "text-gray-500 font-normal" }, "(Đổi key khi cần)")
            ),

            // SẢN XUẤT TOÀN BỘ CLIPS
            React.createElement(PillButton, {
              variant: "filled",
              onClick: handleGenerateAllVideos,
              disabled: isBatchGenerating || !scenes.some(s => s.voiceScript || s.motionPrompt),
              loading: isBatchGenerating,
              icon: "🎬"
            },
              isBatchGenerating ? `Đang gửi lệnh ${sceneCount} clips...` : `SẢN XUẤT TOÀN BỘ ${sceneCount} CLIPS`
            ),

            // TẢI GÓI ZIP (.ZIP)
            React.createElement(PillButton, {
              variant: "outline",
              onClick: handleDownloadZip,
              disabled: isDownloading || !scenes.some(s => s.videoUrl),
              loading: isDownloading,
              icon: "📦"
            },
              "TẢI GÓI ZIP (.ZIP)"
            )
          )
        )
      ),

      // RIGHT CANVAS: PREVIEW SHOWROOM GÓC MÁY ĐƯỢC CHỌN & CÁC THẺ CẢNH
      React.createElement("main", {
        style: { flex: 1, minWidth: 0, height: '100%', overflowY: 'auto' },
        className: "bg-[#060913] p-4 flex flex-col items-center justify-between no-scrollbar"
      },
        // SECTION 1: PREVIEW SHOWROOM CỦA CẢNH ĐƯỢC CHỌN
        React.createElement("section", { className: "flex flex-col items-center pt-0.5 w-full max-w-4xl" },
          // Thanh chuyển đổi góc preview cảnh
          React.createElement("div", { className: "flex items-center gap-2 mb-2 bg-white/[0.04] p-1 rounded-2xl border border-white/[0.08]" },
            scenes.map((s, idx) => 
              React.createElement("button", {
                key: s.id,
                onClick: () => setActivePreviewIndex(idx),
                className: `px-3 py-1 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activePreviewIndex === idx 
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm' 
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.05]'
                }`
              },
                React.createElement("span", null, `Cảnh 0${s.id}:`),
                React.createElement("span", { className: "font-medium opacity-80" }, s.angleName.split(' ')[0])
              )
            )
          ),

          // Khung điện thoại 9:16 hiển thị ảnh Showroom của cảnh active
          React.createElement("div", {
            style: { width: '230px', height: '408px', minWidth: '230px', maxWidth: '230px' },
            className: "rounded-[30px] overflow-hidden shadow-2xl relative border border-white/[0.12] bg-[#0c1122] flex items-center justify-center group flex-shrink-0"
          },
            (isShowroomGenerating || activeScene?.showroomStatus === 'generating') ? (
              React.createElement("div", {
                className: "flex flex-col items-center justify-center p-6 text-center w-full h-full relative z-10 bg-[#0c1122]/95 backdrop-blur-md rounded-[30px]"
              },
                React.createElement("div", { className: "relative mb-3 flex items-center justify-center" },
                  React.createElement("div", { className: "w-16 h-16 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin" }),
                  React.createElement("span", { className: "absolute text-2xl" }, "🍌")
                ),
                React.createElement("span", { className: "text-xs font-bold text-cyan-300 uppercase tracking-wider animate-pulse" },
                  `Đang tạo Showroom Cảnh 0${activeScene?.id || 1}...`
                ),
                React.createElement("span", { className: "text-[10px] text-gray-400 mt-1" },
                  "Banana AI đang render 8K KOC Showroom..."
                )
              )
            ) : activeScene?.showroomImage ? (
              React.createElement(React.Fragment, null,
                React.createElement("img", {
                  src: activeScene.showroomImage.thumbnailUrl || activeScene.showroomImage.url || activeScene.showroomImage.base64,
                  onError: (e) => { if (activeScene.showroomImage?.localPath) e.target.src = 'file:///' + activeScene.showroomImage.localPath.replace(/\\/g, '/'); },
                  style: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' }
                }),
                React.createElement("div", {
                  className: "absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-[30px]"
                },
                  React.createElement("span", { className: "text-xs font-semibold text-white px-3 py-1 bg-black/70 rounded-full backdrop-blur-md" },
                    `Showroom Cảnh 0${activeScene.id}: ${activeScene.angleName}`
                  )
                )
              )
            ) : (
              React.createElement("div", { className: "flex flex-col items-center text-center p-4 text-gray-500" },
                React.createElement("span", { className: "text-3xl mb-1.5 opacity-30" }, "🖼️"),
                React.createElement("span", { className: "text-xs font-bold text-gray-400 uppercase tracking-wider" }, `Showroom Cảnh 0${activeScene?.id}`),
                React.createElement("span", { className: "text-[10px] text-cyan-400/80 font-medium mt-0.5" }, activeScene?.angleName),
                React.createElement("span", { className: "text-[9px] text-gray-500 mt-1" }, "Bấm 'TẠO SHOWROOM' để vẽ ảnh riêng!")
              )
            )
          )
        ),

        // SECTION 2: DANH SÁCH THẺ CLIPS (TỰ ĐỘNG CÂN XỨNG CHO 3, 4 HOẶC 5 CẢNH)
        React.createElement("section", { className: "w-full max-w-5xl flex flex-col items-center mt-3 pb-1" },
          React.createElement("div", { className: "flex items-center gap-3 mb-2.5 w-full justify-center" },
            React.createElement("h3", { className: "text-[10px] font-black uppercase tracking-[0.25em] text-gray-400" },
              `${sceneCount} PHÂN ĐOẠN VIDEO KOC (MỖI CẢNH 1 FRAME KHÁC BIỆT)`
            ),
            React.createElement("span", { className: "h-px w-20 bg-white/10" })
          ),

          // CÁC THẺ CẢNH
          React.createElement("div", { className: "flex gap-2.5 w-full justify-center" },
            scenes.map((scene, idx) => {
              const cardWidth = sceneCount === 3 ? '240px' : sceneCount === 4 ? '195px' : '170px';
              const isSelected = activePreviewIndex === idx;

              return React.createElement("div", {
                key: scene.id,
                style: { width: cardWidth, minWidth: cardWidth, maxWidth: cardWidth },
                onClick: () => setActivePreviewIndex(idx),
                className: `rounded-2xl overflow-hidden shadow-xl border transition-all flex flex-col relative flex-shrink-0 cursor-pointer ${
                  isSelected ? 'border-cyan-400/60 ring-2 ring-cyan-500/20 bg-[#0e1529]' : 'border-white/[0.09] bg-[#0c1122] hover:border-white/20'
                }`
              },
                // Video hoặc Showroom Preview của riêng cảnh này
                React.createElement("div", {
                  style: { height: '190px' },
                  className: "w-full bg-[#080d1a] relative flex items-center justify-center overflow-hidden border-b border-white/[0.08]",
                  onClick: (e) => {
                    if (scene.videoUrl) {
                      e.stopPropagation();
                      setSelectedVideo(scene.videoUrl);
                    }
                  }
                },
                  scene.videoUrl ? React.createElement(React.Fragment, null,
                    React.createElement("video", {
                      src: scene.videoUrl,
                      autoPlay: true,
                      loop: true,
                      muted: true,
                      playsInline: true,
                      style: { width: '100%', height: '100%', objectFit: 'cover' }
                    }),
                    React.createElement("div", {
                      className: "absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                    },
                      React.createElement("div", { className: "w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center text-white text-sm shadow-lg font-bold" }, "▶")
                    )
                  ) : scene.videoStatus === 'generating' ? (
                    React.createElement("div", { className: "flex flex-col items-center justify-center text-center p-3 gap-2" },
                      React.createElement("div", { className: "relative flex items-center justify-center" },
                        React.createElement("div", { className: "w-11 h-11 rounded-full border-3 border-cyan-500/20 border-t-cyan-400 animate-spin shadow-[0_0_15px_rgba(6,182,212,0.4)]" }),
                        React.createElement("span", { className: "absolute text-[11px] font-black text-cyan-300" }, `${scene.videoProgress || 10}%`)
                      ),
                      React.createElement("span", { className: "text-[11px] font-bold text-cyan-300 animate-pulse" }, "Đang sản xuất..."),
                      React.createElement("span", { className: "text-[8px] text-slate-400 font-mono" }, "AI đang render video")
                    )
                  ) : scene.videoStatus === 'error' ? (
                    React.createElement("div", { className: "flex flex-col items-center justify-center p-2 text-center bg-red-950/40 rounded-lg border border-red-500/30 w-full h-full relative" },
                      React.createElement("span", { className: "text-base" }, "⚠️"),
                      React.createElement("span", { className: "text-[8px] font-bold text-red-300 mt-1 line-clamp-2 px-1", title: scene.videoError },
                        scene.videoError && (scene.videoError.includes('Prominent') || scene.videoError.includes('Chân dung') || scene.videoError.includes('deepfake'))
                          ? "Chặn do mặt cận (Chọn Veo 3.1)"
                          : "Lỗi tạo clip"
                      ),
                      React.createElement("span", { className: "text-[7px] text-gray-400 mt-0.5" }, "Bấm nút dưới để thử lại")
                    )
                  ) : scene.showroomStatus === 'generating' ? (
                    React.createElement(ProgressCircle, { progress: scene.showroomProgress, size: 40, color: "#3b82f6" })
                  ) : (
                    scene.showroomImage ? React.createElement(React.Fragment, null,
                      React.createElement("img", {
                        src: scene.showroomImage.thumbnailUrl || scene.showroomImage.url || scene.showroomImage.base64,
                        onError: (e) => { if (scene.showroomImage?.localPath) e.target.src = 'file:///' + scene.showroomImage.localPath.replace(/\\/g, '/'); },
                        style: { width: '100%', height: '100%', objectFit: 'cover', opacity: 0.35, filter: 'grayscale(50%)' }
                      }),
                      React.createElement("div", { className: "absolute inset-0 flex flex-col items-center justify-center text-center p-2 bg-black/40 backdrop-blur-[2px]" },
                        React.createElement("div", { className: "w-11 h-11 rounded-full border-2 border-dashed border-amber-400/80 bg-amber-400/20 flex items-center justify-center text-2xl font-black text-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.3)] mb-1" }, "?"),
                        React.createElement("span", { className: "text-[10px] font-bold text-amber-200 uppercase tracking-wider bg-black/60 px-2 py-0.5 rounded-full" }, "Chưa tạo video"),
                        React.createElement("span", { className: "text-[8px] text-slate-300 mt-0.5" }, "Bấm 'Sản xuất' để tạo clip")
                      )
                    ) : (
                      React.createElement("div", { className: "flex flex-col items-center justify-center text-center p-3 select-none" },
                        React.createElement("div", { className: "w-12 h-12 rounded-full border-2 border-dashed border-amber-400/80 bg-amber-400/15 flex items-center justify-center text-2xl font-black text-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.25)] mb-1" }, "?"),
                        React.createElement("span", { className: "text-[10px] font-bold text-amber-200 uppercase tracking-wider" }, "Chưa tạo video"),
                        React.createElement("span", { className: "text-[8px] text-slate-400 mt-0.5" }, "Bấm 'Sản xuất' để tạo clip")
                      )
                    )
                  )
                ),

                // Script Box
                React.createElement("div", {
                  className: "p-2.5 flex-1 flex flex-col justify-between bg-[#0a0e1c] gap-1.5 cursor-pointer hover:bg-white/[0.02] transition-colors",
                  onClick: (e) => { e.stopPropagation(); setEditingScene(scene); }
                },
                  React.createElement("div", { className: "flex items-center justify-between" },
                    React.createElement("span", { className: "text-[9px] font-black uppercase tracking-wider text-cyan-400 truncate" },
                      `CẢNH 0${scene.id}: ${scene.stage}`
                    ),
                    React.createElement("span", { className: "text-[9px] text-gray-500 hover:text-cyan-300 flex-shrink-0" }, "✏️")
                  ),
                  React.createElement("span", { className: "text-[8px] text-gray-400 font-medium truncate" },
                    `📐 ${scene.angleName}`
                  ),
                  React.createElement("div", { className: "flex gap-2 items-start mt-0.5" },
                    scene.showroomImage ? React.createElement("div", {
                      className: "w-8 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-cyan-400/40 relative shadow-sm bg-black/40"
                    },
                      React.createElement("img", {
                        src: scene.showroomImage.thumbnailUrl || scene.showroomImage.url || scene.showroomImage.base64,
                        onError: (e) => { if (scene.showroomImage?.localPath) e.target.src = 'file:///' + scene.showroomImage.localPath.replace(/\\/g, '/'); },
                        style: { width: '100%', height: '100%', objectFit: 'cover' }
                      }),
                      React.createElement("div", { className: "absolute bottom-0 inset-x-0 bg-black/80 text-[6px] text-cyan-300 text-center font-bold py-0.5" }, "FRAME")
                    ) : null,
                    React.createElement("p", { className: "text-[9px] text-gray-300 italic line-clamp-3 leading-relaxed flex-1" },
                      scene.voiceScript || "Chưa có kịch bản (bấm 'Lên kịch bản KOC')"
                    )
                  )
                ),

                // Button: TẠO CLIP / LÀM LẠI
                React.createElement("div", { className: "p-2 bg-[#090d18] border-t border-white/[0.06]" },
                  React.createElement("button", {
                    onClick: (e) => { e.stopPropagation(); handleGenerateSingleVideo(idx); },
                    disabled: scene.videoStatus === 'generating' || (!scene.voiceScript && !scene.motionPrompt),
                    className: "w-full py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white text-[9px] font-bold rounded-lg uppercase tracking-wider shadow transition-all cursor-pointer"
                  },
                    scene.videoUrl ? "LÀM LẠI" : "TẠO CLIP"
                  )
                )
              );
            })
          )
        )
      )
    ),

    // MODAL CẤU HÌNH GEMINI API KEY
    showApiKeyModal && React.createElement("div", {
      className: "fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4",
      onClick: () => setShowApiKeyModal(false)
    },
      React.createElement("div", {
        className: "bg-[#0d1428] border border-cyan-500/30 rounded-3xl p-6 w-full max-w-md shadow-2xl flex flex-col gap-4 text-left",
        onClick: (e) => e.stopPropagation()
      },
        React.createElement("div", { className: "flex justify-between items-center pb-2 border-b border-white/10" },
          React.createElement("div", { className: "flex items-center gap-2" },
            React.createElement("span", { className: "text-lg" }, "🧠"),
            React.createElement("h3", { className: "text-sm font-bold text-white uppercase tracking-wider" }, "Cấu Hình Gemini Thinking AI")
          ),
          React.createElement("button", {
            onClick: () => setShowApiKeyModal(false),
            className: "text-gray-400 hover:text-white text-lg w-7 h-7 rounded-full bg-white/5 flex items-center justify-center"
          }, "×")
        ),

        React.createElement("div", { className: "space-y-3" },
          React.createElement("p", { className: "text-xs text-gray-300 leading-relaxed" },
            "Hệ thống đã kết nối sẵn mã API Key chính thức của Google Gemini 3.6 Flash. Nếu muốn thay đổi key riêng của bạn, bạn có thể dán vào bên dưới."
          ),

          React.createElement("div", { className: "space-y-1.5" },
            React.createElement("div", { className: "flex justify-between items-center text-[10px] font-bold uppercase tracking-wider" },
              React.createElement("span", { className: "text-cyan-400" }, "Gemini API Key:"),
              React.createElement("a", {
                href: "https://aistudio.google.com/app/apikey",
                target: "_blank",
                className: "text-cyan-400 hover:text-cyan-300 underline font-semibold flex items-center gap-1"
              },
                "Lấy key miễn phí tại đây ↗"
              )
            ),
            React.createElement("input", {
              type: "text",
              value: tempApiKeyInput,
              onChange: (e) => setTempApiKeyInput(e.target.value),
              placeholder: "Dán mã AIzaSy... hoặc AQ.Ab8... vào đây",
              className: "w-full h-11 px-4 rounded-xl border border-white/20 bg-[#141b30] text-white text-xs font-mono outline-none focus:border-cyan-500"
            })
          )
        ),

        React.createElement("div", { className: "flex justify-end gap-2 pt-2 border-t border-white/10" },
          React.createElement("button", {
            onClick: () => setShowApiKeyModal(false),
            className: "px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white bg-white/5"
          }, "Đóng"),
          React.createElement("button", {
            onClick: () => {
              if (!tempApiKeyInput || tempApiKeyInput.trim().length < 10) {
                toast?.error?.("Vui lòng dán mã API Key hợp lệ!");
                return;
              }
              handleSaveGeminiKey(tempApiKeyInput.trim());
            },
            className: "px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/30"
          }, "Lưu Key Mới")
        )
      )
    ),

    // MODAL SỬA KỊCH BẢN TRỰC TIẾP
    editingScene && React.createElement("div", {
      className: "fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4",
      onClick: () => setEditingScene(null)
    },
      React.createElement("div", {
        className: "bg-[#0c1224] border border-white/20 rounded-3xl p-6 w-full max-w-lg shadow-2xl flex flex-col gap-4",
        onClick: (e) => e.stopPropagation()
      },
        React.createElement("div", { className: "flex justify-between items-center pb-2 border-b border-white/10" },
          React.createElement("h3", { className: "text-sm font-bold text-white uppercase tracking-wider" },
            `Chỉnh Sửa Cảnh 0${editingScene.id}: ${editingScene.stage} (${editingScene.angleName})`
          ),
          React.createElement("button", {
            onClick: () => setEditingScene(null),
            className: "text-gray-400 hover:text-white text-lg w-7 h-7 rounded-full bg-white/5 flex items-center justify-center"
          }, "×")
        ),

        React.createElement("div", { className: "space-y-3" },
          editingScene.showroomImage ? React.createElement("div", {
            className: "flex items-center gap-3 p-3 rounded-2xl bg-cyan-950/30 border border-cyan-500/40 shadow-inner"
          },
            React.createElement("div", {
              className: "w-12 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-cyan-400/50 shadow-md bg-black/50 relative"
            },
              React.createElement("img", {
                src: editingScene.showroomImage.thumbnailUrl || editingScene.showroomImage.url || editingScene.showroomImage.base64,
                onError: (e) => { if (editingScene.showroomImage?.localPath) e.target.src = 'file:///' + editingScene.showroomImage.localPath.replace(/\\/g, '/'); },
                style: { width: '100%', height: '100%', objectFit: 'cover' }
              }),
              React.createElement("div", { className: "absolute bottom-0 inset-x-0 bg-black/80 text-[7px] text-cyan-300 text-center font-bold" }, "START")
            ),
            React.createElement("div", { className: "flex-1 flex flex-col gap-0.5" },
              React.createElement("div", { className: "flex items-center gap-2" },
                React.createElement("span", { className: "text-[11px] font-black text-cyan-300 uppercase tracking-wider" },
                  `ẢNH SHOWROOM CẢNH 0${editingScene.id}`
                ),
                React.createElement("span", { className: "px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-bold border border-emerald-500/30" },
                  "ĐÃ NẠP SẴN"
                )
              ),
              React.createElement("span", { className: "text-[10px] text-gray-400 font-medium" },
                `📐 Góc máy: ${editingScene.angleName}`
              ),
              React.createElement("span", { className: "text-[9px] text-gray-300 italic" },
                "Ảnh này được nạp trực tiếp làm Start Frame (I2V) khi bấm Tạo Clip."
              )
            )
          ) : null,

          React.createElement("div", null,
            React.createElement("label", { className: "block text-[10px] font-bold text-cyan-300 uppercase tracking-wider mb-1" },
              "Lời Thoại KOC (Tiếng Việt - Dưới 25 từ):"
            ),
            React.createElement("textarea", {
              id: "editVoiceScriptInput",
              defaultValue: editingScene.voiceScript,
              rows: 3,
              className: "w-full p-3 rounded-xl border border-white/15 bg-[#12192c] text-white text-xs font-medium outline-none focus:border-cyan-500 resize-none leading-relaxed"
            })
          ),

          React.createElement("div", null,
            React.createElement("label", { className: "block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1" },
              "Motion Prompt (Tiếng Anh - Diễn xuất KOC cho Model Video):"
            ),
            React.createElement("textarea", {
              id: "editMotionPromptInput",
              defaultValue: editingScene.motionPrompt,
              rows: 3,
              className: "w-full p-3 rounded-xl border border-white/15 bg-[#12192c] text-gray-300 text-xs font-mono outline-none focus:border-cyan-500 resize-none leading-relaxed"
            })
          )
        ),

        React.createElement("div", { className: "flex justify-end gap-2 pt-2 border-t border-white/10" },
          React.createElement("button", {
            onClick: () => setEditingScene(null),
            className: "px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white bg-white/5"
          }, "Hủy"),
          React.createElement("button", {
            onClick: () => {
              const vVal = document.getElementById('editVoiceScriptInput')?.value || '';
              const mVal = document.getElementById('editMotionPromptInput')?.value || '';
              handleSaveSceneScript(editingScene.id, vVal, mVal);
            },
            className: "px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/30"
          }, "Lưu Kịch Bản")
        )
      )
    ),

    // MODAL PHÁT VIDEO FULLSCREEN
    selectedVideo && React.createElement("div", {
      className: "fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-6",
      onClick: () => setSelectedVideo(null)
    },
      React.createElement("div", {
        style: { width: '300px', height: '533px' },
        className: "relative rounded-3xl overflow-hidden bg-black border border-white/20 shadow-2xl",
        onClick: (e) => e.stopPropagation()
      },
        React.createElement("video", {
          src: selectedVideo,
          className: "w-full h-full object-contain",
          controls: true,
          autoPlay: true
        }),
        React.createElement("button", {
          onClick: () => setSelectedVideo(null),
          className: "absolute top-4 right-4 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center text-lg border border-white/20"
        }, "×")
      )
    )
  );
}
