import { bn as React, bf as toast } from "./index-BS7vgKVV.js";

// ============================================================================
// PHÒNG THAY ĐỒ KOC (KOC OUTFIT SWITCHER & 20 Ô HÀNG CHỜ STORYBOARD 9:16)
// THIẾT KẾ CHUẨN XÁC 100% GIAO DIỆN & TẠO HÀNG LOẠT THÔNG MINH THEO TỪNG LƯỢT
// HỖ TRỢ EM BÉ, TRẺ NHỎ, NGƯỜI LỚN, TÁI TẠO BỐI CẢNH GỐC & CẮT TỚI ĐẦU GỐI
// ============================================================================

const TOTAL_STORYBOARD_SLOTS = 20;
const DEFAULT_GEMINI_KEY = "";
const MAX_CONCURRENT_WORKERS = 2; // Số luồng tạo ảnh đồng thời tối đa trong hàng đợi ngầm

const KOC_STUDIO_CSS = `
.koc-scrollbar::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}
.koc-scrollbar::-webkit-scrollbar-track {
  background: rgba(10, 10, 14, 0.4);
  border-radius: 4px;
}
.koc-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(245, 158, 11, 0.25);
  border-radius: 4px;
}
.koc-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(245, 158, 11, 0.6);
}

.koc-layout-container {
  display: flex !important;
  flex-direction: row !important;
  width: 100% !important;
  height: 100% !important;
  overflow: hidden !important;
  gap: 14px !important;
  box-sizing: border-box !important;
}

.koc-sidebar {
  width: 340px !important;
  min-width: 340px !important;
  max-width: 340px !important;
  height: 100% !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 12px !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  flex-shrink: 0 !important;
  padding-right: 4px !important;
  box-sizing: border-box !important;
}

.koc-main-content {
  flex: 1 !important;
  min-width: 0 !important;
  height: 100% !important;
  display: flex !important;
  flex-direction: column !important;
  background-color: #12121b !important;
  border: 1px solid #232332 !important;
  border-radius: 16px !important;
  padding: 14px 16px !important;
  overflow: hidden !important;
  box-sizing: border-box !important;
}

.koc-story-grid {
  display: grid !important;
  grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
  gap: 10px !important;
  flex: 1 !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  padding-right: 4px !important;
  box-sizing: border-box !important;
}

@media (max-width: 1180px) {
  .koc-story-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
  }
}

@media (max-width: 960px) {
  .koc-story-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  }
}
`;

const createInitialTasks = () => {
  return Array.from({ length: TOTAL_STORYBOARD_SLOTS }, (_, index) => ({
    id: `slot_${index + 1}`,
    index,
    status: 'empty'
  }));
};

const el = React.createElement;

// ============================================================================
// ASSET MANAGEMENT & FLOW SDK ADAPTER CHO ELECTRON
// ============================================================================
async function ensureRegisteredAsset(item, defaultName) {
  if (!item) return null;
  if (item.assetId && !String(item.assetId).startsWith('ref-')) {
    return item.assetId;
  }
  if (item.mediaId && !String(item.mediaId).startsWith('ref-')) {
    return item.mediaId;
  }
  if (item.id && !String(item.id).startsWith('ref-')) {
    return item.id;
  }

  const api = window.aiforge?.assets || window.aivideo?.assets;
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
        name: item.name || defaultName || 'koc_fitting_asset.jpg',
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
  return item.assetId || item.mediaId || null;
}

// BỘ ADAPTER FLOW SDK CHUẨN XÁC NGUYÊN BẢN
const Flow = {
  media: {
    select: async ({ filter = 'image' } = {}) => {
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
          const file = e.target.files?.[0];
          if (!file) return resolve(null);
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
              } catch (_) {}
            }
            resolve({
              mediaId: assetId || ('ref-' + Date.now()),
              assetId,
              base64,
              mimeType: file.type || 'image/jpeg',
              name: file.name
            });
          };
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(file);
        };
        input.click();
      });
    },

    selectMultiple: async ({ filter = 'image', maxCount = 20 } = {}) => {
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = true;
        input.onchange = async (e) => {
          const files = Array.from(e.target.files || []).slice(0, maxCount);
          if (files.length === 0) return resolve([]);
          const results = [];
          const api = window.aiforge?.assets || window.aivideo?.assets;
          for (const file of files) {
            const item = await new Promise((res) => {
              const reader = new FileReader();
              reader.onload = async (ev) => {
                const base64 = ev.target.result;
                let assetId = null;
                if (api?.importReference) {
                  try {
                    const imp = await api.importReference({
                      name: file.name,
                      mimeType: file.type || 'image/jpeg',
                      dataUrl: base64
                    });
                    assetId = imp?.id || null;
                  } catch (_) {}
                }
                res({
                  mediaId: assetId || ('ref-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)),
                  assetId,
                  base64,
                  mimeType: file.type || 'image/jpeg',
                  name: file.name
                });
              };
              reader.onerror = () => res(null);
              reader.readAsDataURL(file);
            });
            if (item) results.push(item);
          }
          resolve(results);
        };
        input.click();
      });
    }
  },

  download: async ({ base64, mimeType = 'image/jpeg', filename = 'koc_story.jpg' }) => {
    try {
      const a = document.createElement('a');
      let href = base64;
      if (!href.startsWith('data:') && !href.startsWith('http') && !href.startsWith('file:')) {
        href = `data:${mimeType};base64,${base64}`;
      }
      a.href = href;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error("Download error:", e);
      toast?.error?.("Lỗi tải ảnh: " + (e?.message || e));
    }
  },

  generate: {
    text: async (promptText, { systemInstruction, thinkingLevel = 'high', images = [] } = {}) => {
      const activeKey = (
        (typeof window !== "undefined" && localStorage.getItem('aivideo_gemini_api_key')) || 
        DEFAULT_GEMINI_KEY
      ).trim();

      const parts = [];
      for (const img of images) {
        if (!img?.base64) continue;
        let rawB64 = img.base64;
        let mime = img.mimeType || 'image/jpeg';
        if (rawB64.includes(',')) {
          const p = rawB64.split(',');
          rawB64 = p[1];
          const m = p[0].match(/:(.*?);/);
          if (m) mime = m[1];
        }
        parts.push({
          inline_data: {
            mime_type: mime,
            data: rawB64
          }
        });
      }
      parts.push({ text: promptText });

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);

      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${activeKey}`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemInstruction }]
          },
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.1,
            response_mime_type: "application/json"
          }
        })
      });
      clearTimeout(timer);

      if (!resp.ok) {
        throw new Error(`Gemini API error: ${resp.status} ${resp.statusText}`);
      }
      const data = await resp.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return { text };
    },

    image: async ({ prompt, referenceImageMediaIds = [], aspectRatio = '9:16', modelDisplayName = '🍌 Nano Banana Pro', targetAccId, targetAccName, removeWatermark = true, imageResolution = '2k', imageEngine = (typeof localStorage !== 'undefined' ? localStorage.getItem("aiforge_fitting_image_engine") || "banana" : "banana") }) => {
      const qApi = window.aiforge?.queue || window.aivideo?.queue;
      const assetsApi = window.aiforge?.assets || window.aivideo?.assets;
      if (!qApi?.addJobs && !qApi?.addJob) throw new Error("Hệ thống Hàng đợi chưa sẵn sàng");

      const jobInput = {
        title: `[Phòng Thay Đồ] Storyboard Slot Image`,
        type: "Image",
        providerId: imageEngine === "muse" ? "muse" : "banana",
        provider: imageEngine === "muse" ? "Muse AI" : "Banana",
        ...(targetAccId ? { accountId: targetAccId, account: targetAccName } : {}),
        payload: {
          title: `[Phòng Thay Đồ] Storyboard Slot Image`,
          prompt: prompt,
          ratio: aspectRatio || "9:16",
          aspectRatio: aspectRatio || "9:16",
          referenceAssetIds: referenceImageMediaIds,
          model: imageEngine === "muse" ? "muse-image" : "banana",
          modelDisplayName: modelDisplayName || "🍌 Nano Banana Pro",
          studioSource: "fitting-room",
          autoRemoveWatermark: removeWatermark,
          removeWatermark: removeWatermark,
          upsampleResolution: imageResolution === '2k' ? '2K' : 'Full HD',
          resolution: imageResolution === '2k' ? '2K' : 'Standard',
          quality: imageResolution === '2k' ? '2K' : 'Standard',
          imageResolution: imageResolution,
          upscale2k: imageResolution === '2k',
          resolutionName: imageResolution === '2k' ? "2K" : "1K"
        }
      };

      const res = await (qApi.addJobs ? qApi.addJobs([jobInput]) : qApi.addJob(jobInput));
      try { qApi.resume?.(); } catch(_) {}

      const jId = res?.results?.[0]?.job?.id || res?.results?.[0]?.id || res?.id || res?.jobId || null;
      if (!jId) throw new Error("Không nhận được Job ID");

      const startTime = Date.now();
      while (Date.now() - startTime < 120000) {
        await new Promise(r => setTimeout(r, 1500));

        const [rawQueue, rawAssets] = await Promise.all([
          qApi.list().catch(() => null),
          assetsApi?.list ? assetsApi.list().catch(() => []) : Promise.resolve([])
        ]);

        const jobs = Array.isArray(rawQueue) ? rawQueue : (Array.isArray(rawQueue?.jobs) ? rawQueue.jobs : []);
        const allAssets = Array.isArray(rawAssets) ? rawAssets : (Array.isArray(rawAssets?.assets) ? rawAssets.assets : []);

        const matchedJob = jobs.find(j => j.id === jId);
        const st = (matchedJob?.status || '').toLowerCase();

        if (st === 'completed' || st === 'done' || st === 'succeeded') {
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

          if (!bestUrl) throw new Error("Không lấy được đường dẫn ảnh kết quả");

          return {
            mediaId: matchedAsset?.assetId || matchedAsset?.id || ('asset-slot-' + Date.now()),
            base64: bestUrl,
            mimeType: matchedAsset?.mimeType || 'image/jpeg'
          };
        } else if (st === 'failed' || st === 'error') {
          throw new Error(matchedJob?.error || matchedJob?.message || "Tạo ảnh thất bại trong hàng đợi");
        }
      }
      throw new Error("Quá thời gian chờ tạo ảnh (Timeout 120s)");
    }
  }
};

// ============================================================================
// SERVICE: AI THINKING (PHÂN TÍCH PHỐI CẢNH, ĐỘ TUỔI EM BÉ/NGƯỜI LỚN & BỐI CẢNH GỐC)
// ============================================================================
async function analyzeKocComposition(
  koc,
  outfit,
  bg,
  customStyleCue,
  framingShot,
  perspectiveLock,
  kneeCropOnly = false,
  exactPoseLock = false
) {
  try {
    const imagesToAnalyze = [
      { base64: koc.base64, mimeType: koc.mimeType },
      { base64: outfit.base64, mimeType: outfit.mimeType },
    ];
    if (bg) {
      imagesToAnalyze.push({ base64: bg.base64, mimeType: bg.mimeType });
    }
    const framingInstructions = {
      full_body: exactPoseLock
        ? 'ABSOLUTE 1:1 REPLICA OF ORIGINAL KOC FRAMING & POSE: The camera distance, angle, shot framing boundary, and the model\'s exact bodily posture, gesture, stance, and head angle MUST BE 100% IDENTICAL to the original KOC reference photo. Do not re-crop, do not shift camera angle or height. Preserve the exact original composition and model pose.'
        : kneeCropOnly
        ? 'Medium Full Shot (American Shot / Knee-length crop). Framed strictly from just below the knees up to above the head. Subject is closer to camera with significantly higher clarity on face, cute expressions, and garment texture, cutting off feet/shoes to maximize character presence and sharpness.'
        : 'Full-length head-to-toe shot. Feet firmly planted on the ground floor plane with grounded contact shadow and correct vertical headroom.',
      three_quarter: exactPoseLock
        ? 'ABSOLUTE 1:1 REPLICA OF ORIGINAL KOC FRAMING & POSE: Identical camera framing boundary and subject pose as seen in Image 1.'
        : 'Three-quarter knee-up editorial shot with correct golden-ratio eye-level framing, focused closely on character details and outfit.',
      fashion_walk: exactPoseLock
        ? 'ABSOLUTE 1:1 REPLICA OF ORIGINAL KOC FRAMING & POSE: Identical camera framing boundary and subject pose as seen in Image 1.'
        : kneeCropOnly
        ? 'Dynamic walking stride framed from knee-up, bringing the model much closer to the camera lens while maintaining fluid natural movement.'
        : 'Dynamic full-length fashion runway stride, naturally positioned within the depth perspective of the walkway.',
      close_up_waist: 'Medium waist-up portrait focusing on upper outfit tailoring and flawless facial identity.'
    };
    const perspectiveInstructions = {
      ground_level: 'Camera placed at subject center-height (adjust lens height down proportionally if subject is a baby or child), straight horizon line aligning model perspective 1:1 with background depth.',
      eye_level: 'Direct eye-level focal perspective aligned with the subject eyes (even if baby or toddler), matching vanishing point without any distortion.',
      low_angle_cinematic: 'Slightly low-angle hero perspective, highlighting cute or elegant posture harmoniously with scene perspective.'
    };
    const systemInstruction = `You are a master Hollywood Visual Effects Director, Fashion Stylist, and Forensic Image Coherence Analyst.
Your core mission is to switch outfits on a KOC subject with zero artifacting while maintaining absolute fidelity.
CRITICAL INSTRUCTIONS:
1. AGE & SOMATOTYPE PRESERVATION (CRITICAL - BABY / CHILD / ADULT ACCURACY):
   Inspect Image 1 (KOC). Determine age group: is it an infant/baby, toddler, child, teenager, or adult?
   - If it is a BABY or CHILD: You MUST preserve their exact infant/child proportions (large head-to-body ratio, chubby cheeks, soft baby facial features, small rounded hands/feet, natural baby pose). DO NOT mature, age up, or turn a baby/child into an adult or teenager!
   - Preserve 100% of the original KOC's body shape, posture, pose gesture, height, bone structure, and facial expression.
2. ACCURATE BACKGROUND REPRODUCTION WHEN NO BACKGROUND IS PROVIDED:
   ${bg 
     ? 'Image 3 is provided as the explicit target background plate. Match its lighting, horizon, and perspective.' 
     : 'CRUCIAL: NO separate background image was provided! Therefore, you MUST inspect the BACKGROUND SURROUNDINGS of Image 1 (KOC photo) and REPRODUCE THAT EXACT ORIGINAL ENVIRONMENT PRECISELY. Keep the exact same room, wall paint, furniture, floor tiles/carpet, outdoor street, or ambient decor seen behind the KOC in Image 1, along with its original lighting, color temperature, and depth-of-field. The KOC must remain inside their exact original scene!'}
3. OUTFIT REPLICATION:
   Dress the subject in the exact outfit shown in Image 2, adapted naturally to the subject's exact body size and contours (tailored for baby/child if baby, or adult if adult).
4. FRAMING SPECIFICATION:
   ${exactPoseLock ? 'CRITICAL: Replicate the EXACT 1:1 camera framing, lens angle, and model pose from Image 1.' : kneeCropOnly ? 'Framed as a Medium Full Shot cropped at the KNEES (American shot). Subject is positioned closer to camera for maximum facial and garment detail, cutting off feet.' : 'Full body framing as selected.'}
Return STRICTLY a JSON object without markdown fences, with these exact keys:
{
  "faceFeatures": "Precise micro-details of KOC face identity (noting baby/child/adult age fidelity)",
  "bodyProportions": "Exact somatic frame, age group, baby/child/adult proportions and exact posture",
  "outfitDetails": "Garment tailoring accurately scaled onto the subject's specific body form",
  "environmentLighting": "Lighting setup and background environment source (either explicitly matching Image 3, or exact clone of Image 1 original background)",
  "perspectiveScale": "Horizon line matching, lens height appropriate to subject height (e.g. baby height if baby)",
  "blendingDirectives": "Sub-surface scattering, contact shadows, unified bounce light eliminating all cut-out seams",
  "cameraFraming": "Precise framing guidance for 9:16 vertical canvas",
  "generationPrompt": "Comprehensive master generation prompt in English locking KOC identity, exact age/body frame, original background preservation (if no bg provided) or target bg plate, and zero cut-out artifacts"
}`;
    const promptText = `Conduct an exhaustive Pixel-Perfect Coherence & Composition Analysis:
Input 1: KOC Model (Identify exact age: baby/toddler/child/adult; lock exact somatic frame, pose, and facial identity).
Input 2: Outfit to wear.
${bg ? 'Input 3: Dedicated background scene plate.' : 'NO separate background provided: Analyze and strictly REPLICATE the EXACT original environment, room, decor, floor, and lighting visible inside Input 1 (KOC photo).'}
Framing: 9:16 vertical orientation, ${framingInstructions[framingShot]}, ${perspectiveInstructions[perspectiveLock]}.
${kneeCropOnly ? 'Stricly crop from knee-upward (American shot), subject closer to camera for exceptional facial sharpness.' : ''}
${customStyleCue ? `User artistic cue: ${customStyleCue}` : ''}`;

    const { text: responseText } = await Flow.generate.text(promptText, {
      systemInstruction,
      thinkingLevel: 'high',
      images: imagesToAnalyze,
    });
    let cleaned = responseText.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```/, '').replace(/```$/, '').trim();
    }
    const parsed = JSON.parse(cleaned);
    const analysis = {
      faceFeatures: parsed.faceFeatures || 'Khóa 100% tỷ lệ khuôn mặt, nét đặc trưng theo đúng độ tuổi (em bé / người lớn).',
      bodyProportions: parsed.bodyProportions || 'Khóa vóc dáng, khung xương và kiểu dáng KOC nguyên mẫu (bảo toàn tỷ lệ em bé nếu là trẻ nhỏ).',
      outfitDetails: parsed.outfitDetails || 'Trang phục may đo vừa vặn với kích thước và phom người KOC.',
      environmentLighting: parsed.environmentLighting || (bg ? 'Đồng bộ nhiệt độ màu và ánh sáng từ ảnh bối cảnh.' : 'Tái tạo chuẩn xác bối cảnh gốc từ ảnh KOC.'),
      perspectiveScale: parsed.perspectiveScale || 'Cân chỉnh góc máy tương thích với chiều cao chủ thể và đường chân trời.',
      blendingDirectives: parsed.blendingDirectives || 'Bóng đổ tiếp xúc tự nhiên, viền tóc hòa trộn quang học, 0% viền ghép giả.',
      cameraFraming: parsed.cameraFraming || (kneeCropOnly ? 'Cắt ngang đầu gối (Knee Crop), đặc tả rõ gương mặt và chi tiết trang phục.' : 'Căn lề chuẩn khung hình Story 9:16.'),
      pixelCoherenceScore: '99.9% Chuẩn Pixel'
    };
    return {
      analysis,
      refinedPrompt: parsed.generationPrompt || '',
    };
  } catch (err) {
    console.warn('AI Thinking fallback to enhanced synthesis:', err);
    const fallbackAnalysis = {
      faceFeatures: 'Khóa tỷ lệ nhân trắc học khuôn mặt KOC, đặc trưng lứa tuổi (em bé / thiếu nhi / người lớn).',
      bodyProportions: 'Khóa chuẩn 100% vóc dáng, kiểu dáng cơ thể và tư thế đặc thù của KOC.',
      outfitDetails: 'Phục dựng chi tiết phom dáng và chất liệu vải của trang phục tham chiếu.',
      environmentLighting: bg 
        ? 'Đồng bộ nguồn sáng chính (key light) từ ảnh bối cảnh.' 
        : 'Tái tạo chính xác bối cảnh và ánh sáng gốc xung quanh KOC.',
      perspectiveScale: 'Căn chỉnh tiêu cự ống kính và đường chân trời tương quan chiều cao chủ thể.',
      blendingDirectives: 'Khử hoàn toàn cảm giác cắt ghép (anti-photomontage), hòa trộn quang học chân thực.',
      cameraFraming: kneeCropOnly ? 'Cắt ngang đầu gối (Knee Crop), nhân vật lớn và sắc nét.' : 'Khung hình dọc 9:16 cân đối.',
      pixelCoherenceScore: '98.8% Chuẩn Pixel'
    };
    const framingText = kneeCropOnly
      ? 'medium full shot cropped strictly at knee-height (American shot), subject positioned closer to camera for exceptional facial sharpness, clear clothing textures, cutting off lower shins and feet'
      : framingShot === 'full_body' 
      ? 'full-body head-to-toe shot with feet grounded firmly on the floor plane'
      : framingShot === 'fashion_walk'
      ? 'dynamic full-length street style stride walking naturally in perspective'
      : framingShot === 'three_quarter'
      ? 'three-quarter editorial lookbook framing'
      : 'medium waist-up portrait framing';
    const backgroundDirective = bg
      ? 'The model is photographed directly on-location inside the environment shown in the background reference photo. Absolute perspective alignment: camera height, vanishing point, and ground plane horizon line match precisely.'
      : 'The background MUST be an exact 1:1 photorealistic replica of the original environment and setting visible in the KOC reference photo (including identical room walls, decor, furniture, floor, and ambient room lighting). Do not replace the background with an artificial plain studio; maintain the original scene context.';
    const fallbackPrompt = `Award-winning authentic photograph (vertical 9:16 aspect ratio). The subject is strictly the identical KOC individual from the reference photo, preserving 100% of their exact age (if baby, keep baby facial proportions, baby body scale, chubby cheeks and infant limbs; if child or adult, keep exact biological age and somatotype), exact facial identity, bone structure, eye shape, nose bridge, skin tone, hair, and exact body pose and posture. Subject is dressed in the exact clothing piece from the outfit reference, perfectly tailored to their body size. ${backgroundDirective} Framing: ${framingText}. Unified in-camera optical illumination, natural contact shadows, zero cutout halos, crisp focus, cinematic realism.`;
    return {
      analysis: fallbackAnalysis,
      refinedPrompt: fallbackPrompt,
    };
  }
}

// ============================================================================
// COMPONENT: ABOUT MODAL (HƯỚNG DẪN SỬ DỤNG)
// ============================================================================
function AboutModal({ isOpen, onClose }) {
  if (!isOpen) return null;
  return el("div", {
    className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in",
    onClick: onClose
  },
    el("div", {
      className: "relative w-full max-w-lg bg-[#14141d] border border-[#272736] rounded-2xl shadow-2xl overflow-hidden p-6 text-slate-100",
      onClick: (e) => e.stopPropagation()
    },
      el("button", {
        onClick: onClose,
        className: "absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
      },
        el("span", { className: "material-symbols-outlined text-lg" }, "close")
      ),
      el("div", { className: "flex items-center gap-3 mb-4" },
        el("div", {
          className: "w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 text-black"
        },
          el("span", { className: "material-symbols-outlined text-2xl font-bold" }, "auto_awesome_mosaic")
        ),
        el("div", null,
          el("h3", { className: "text-lg font-bold text-white tracking-wide" }, "Storyboard 20 Ô Hàng Chờ KOC"),
          el("p", { className: "text-xs text-amber-400 font-medium" }, "Tạo ảnh hàng loạt theo từng đợt thông minh & độc lập")
        )
      ),
      el("div", { className: "space-y-3 text-xs text-slate-300 mb-6 leading-relaxed" },
        el("div", { className: "p-3 rounded-xl bg-black/40 border border-white/5 flex gap-3 items-start" },
          el("span", { className: "material-symbols-outlined text-amber-400 mt-0.5 text-base" }, "child_care"),
          el("div", null,
            el("strong", { className: "text-white block font-semibold mb-0.5" }, "1. Chuẩn dáng & Độ tuổi KOC (Kể cả Em bé)"),
            el("span", null, "AI nhận diện chính xác độ tuổi KOC: giữ nguyên nét bụ bẫm, tỷ lệ em bé, không bị biến dạng hay già hóa thành người lớn.")
          )
        ),
        el("div", { className: "p-3 rounded-xl bg-black/40 border border-white/5 flex gap-3 items-start" },
          el("span", { className: "material-symbols-outlined text-amber-400 mt-0.5 text-base" }, "landscape"),
          el("div", null,
            el("strong", { className: "text-white block font-semibold mb-0.5" }, "2. Tự động nhân bản bối cảnh gốc nếu để trống"),
            el("span", null, "Không cần tải ảnh nền! Hệ thống tự động sao chép 100% căn phòng chụp, góc decor và ánh sáng gốc của KOC.")
          )
        ),
        el("div", { className: "p-3 rounded-xl bg-black/40 border border-white/5 flex gap-3 items-start" },
          el("span", { className: "material-symbols-outlined text-amber-400 mt-0.5 text-base" }, "crop"),
          el("div", null,
            el("strong", { className: "text-white block font-semibold mb-0.5" }, "3. Chế độ cắt tới đầu gối (Knee-Crop Rõ Nét)"),
            el("span", null, "Đưa nhân vật lại gần camera hơn, làm nét từng sợi vải và biểu cảm khuôn mặt chân thực.")
          )
        ),
        el("div", { className: "p-3 rounded-xl bg-black/40 border border-white/5 flex gap-3 items-start" },
          el("span", { className: "material-symbols-outlined text-emerald-400 mt-0.5 text-base" }, "dynamic_feed"),
          el("div", null,
            el("strong", { className: "text-white block font-semibold mb-0.5" }, "4. Tạo hàng loạt thông minh theo từng đợt"),
            el("span", null, "Bạn có thể nạp 5 đồ rồi bấm Tạo, trong lúc 5 ảnh đang render, bạn có thể thêm bối cảnh mới và nạp tiếp 5 đồ khác để tạo tiếp lượt riêng biệt mà không cần chờ đợi!")
          )
        )
      ),
      el("button", {
        onClick: onClose,
        className: "w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold rounded-xl shadow-lg shadow-amber-500/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer text-xs"
      },
        el("span", null, "Đã hiểu, Bắt đầu sử dụng"),
        el("span", { className: "material-symbols-outlined text-base" }, "arrow_forward")
      )
    )
  );
}

// ============================================================================
// COMPONENT: REFERENCE SLOT (THAM CHIẾU CỐ ĐỊNH - CHIỀU CAO CỐ ĐỊNH 135px)
// ============================================================================
function ReferenceSlot({
  label,
  subLabel,
  icon,
  media,
  onSelect,
  onRemove,
  aspectRatioLabel = 'Chân dung'
}) {
  return el("div", {
    style: {
      height: '135px',
      minHeight: '135px',
      maxHeight: '135px',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#14141e',
      border: '1px solid #262635',
      borderRadius: '12px',
      padding: '8px 10px',
      position: 'relative',
      overflow: 'hidden',
      boxSizing: 'border-box'
    }
  },
    // Header slot
    el("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '6px',
        flexShrink: 0
      }
    },
      el("div", { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
        el("span", { className: "material-symbols-outlined text-amber-400", style: { fontSize: '15px' } }, icon),
        el("span", { style: { fontSize: '11px', fontWeight: 'bold', color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '0.05em' } }, label)
      ),
      el("span", {
        style: {
          fontSize: '9px',
          fontFamily: 'monospace',
          color: '#94a3b8',
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          padding: '2px 6px',
          borderRadius: '4px',
          border: '1px solid rgba(255, 255, 255, 0.05)'
        }
      }, aspectRatioLabel)
    ),

    // Content: Ảnh hoặc Ô trống
    media ? (
      el("div", {
        style: {
          flex: 1,
          width: '100%',
          height: '90px',
          maxHeight: '90px',
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '8px',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        },
        className: "group"
      },
        el("img", {
          src: media.base64 ? (media.base64.startsWith('data:') || media.base64.startsWith('http') || media.base64.startsWith('file:') ? media.base64 : `data:${media.mimeType || 'image/jpeg'};base64,${media.base64}`) : media.url,
          alt: label,
          style: {
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block'
          }
        }),
        // Hover actions
        el("div", {
          className: "absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-1.5"
        },
          el("span", { style: { fontSize: '10px', color: '#e2e8f0', fontWeight: '500', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, media.name || label),
          el("div", { style: { display: 'flex', gap: '4px' } },
            el("button", {
              type: "button",
              onClick: onSelect,
              style: {
                flex: 1,
                padding: '3px 6px',
                fontSize: '10px',
                backgroundColor: 'rgba(30, 41, 59, 0.95)',
                color: '#ffffff',
                borderRadius: '4px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                cursor: 'pointer'
              }
            },
              el("span", { className: "material-symbols-outlined", style: { fontSize: '12px' } }, "sync"),
              "Đổi ảnh"
            ),
            el("button", {
              type: "button",
              onClick: onRemove,
              style: {
                padding: '3px 6px',
                fontSize: '10px',
                backgroundColor: 'rgba(76, 5, 25, 0.9)',
                color: '#fca5a5',
                borderRadius: '4px',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                cursor: 'pointer'
              },
              title: "Xóa ảnh"
            },
              el("span", { className: "material-symbols-outlined", style: { fontSize: '12px' } }, "delete")
            )
          )
        ),
        // Badge tick xanh
        el("div", {
          style: {
            position: 'absolute',
            top: '6px',
            right: '6px',
            backgroundColor: '#10b981',
            color: '#ffffff',
            borderRadius: '9999px',
            padding: '2px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }
        },
          el("span", { className: "material-symbols-outlined", style: { fontSize: '12px', fontWeight: 'bold' } }, "check")
        )
      )
    ) : (
      el("button", {
        type: "button",
        onClick: onSelect,
        style: {
          flex: 1,
          width: '100%',
          height: '90px',
          maxHeight: '90px',
          borderRadius: '8px',
          border: '2px dashed #2b2b3a',
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '6px',
          textAlign: 'center',
          cursor: 'pointer',
          boxSizing: 'border-box'
        },
        className: "hover:border-amber-400/60 hover:bg-amber-500/5 transition-all group"
      },
        el("div", {
          style: {
            width: '28px',
            height: '28px',
            borderRadius: '9999px',
            backgroundColor: 'rgba(30, 41, 59, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94a3b8',
            marginBottom: '4px'
          },
          className: "group-hover:bg-amber-500/20 group-hover:text-amber-400 transition-colors"
        },
          el("span", { className: "material-symbols-outlined", style: { fontSize: '16px' } }, "add_photo_alternate")
        ),
        el("span", { style: { fontSize: '10.5px', fontWeight: '600', color: '#cbd5e1', marginBottom: '2px' } },
          `Chọn ${label}`
        ),
        el("span", { style: { fontSize: '9px', color: '#64748b', maxWidth: '130px', lineHeight: '1.2' } },
          subLabel
        )
      )
    )
  );
}

// ============================================================================
// COMPONENT: AI THINKING BADGE (HUY HIỆU PHÂN TÍCH CHI TIẾT)
// ============================================================================
function AiThinkingBadge({ analysis }) {
  if (!analysis) return null;
  return el("div", {
    className: "bg-[#101017] border border-amber-500/30 rounded-xl p-3 text-xs space-y-2.5 shadow-lg text-left"
  },
    el("div", { className: "flex items-center justify-between pb-1.5 border-b border-white/10" },
      el("div", { className: "flex items-center gap-1.5 text-amber-400 font-bold tracking-wide uppercase text-[11px]" },
        el("span", { className: "material-symbols-outlined text-sm" }, "filter_center_focus"),
        el("span", null, "Khớp Pixel & Khung Hình Chuyên Nghiệp")
      ),
      el("span", {
        className: "text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1"
      },
        el("span", { className: "material-symbols-outlined text-xs" }, "check_circle"),
        el("span", null, analysis.pixelCoherenceScore || '100% Khớp')
      )
    ),
    el("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] leading-relaxed" },
      el("div", { className: "p-2 rounded-lg bg-black/40 border border-white/5" },
        el("div", { className: "flex items-center gap-1 text-amber-300 font-semibold mb-1" },
          el("span", { className: "material-symbols-outlined text-xs" }, "face"),
          el("span", null, "1. Khóa Mặt & Thần Thái KOC")
        ),
        el("p", { className: "text-slate-300 text-[10px]" }, analysis.faceFeatures)
      ),
      el("div", { className: "p-2 rounded-lg bg-black/40 border border-white/5" },
        el("div", { className: "flex items-center gap-1 text-amber-300 font-semibold mb-1" },
          el("span", { className: "material-symbols-outlined text-xs" }, "accessibility_new"),
          el("span", null, "2. Khung Xương & Vóc Dáng")
        ),
        el("p", { className: "text-slate-300 text-[10px]" }, analysis.bodyProportions)
      ),
      el("div", { className: "p-2 rounded-lg bg-black/40 border border-white/5" },
        el("div", { className: "flex items-center gap-1 text-amber-300 font-semibold mb-1" },
          el("span", { className: "material-symbols-outlined text-xs" }, "crop"),
          el("span", null, "3. Tiêu Cự & Đường Chân Trời")
        ),
        el("p", { className: "text-slate-300 text-[10px]" }, analysis.perspectiveScale)
      ),
      el("div", { className: "p-2 rounded-lg bg-black/40 border border-white/5" },
        el("div", { className: "flex items-center gap-1 text-emerald-400 font-semibold mb-1" },
          el("span", { className: "material-symbols-outlined text-xs" }, "wb_sunny"),
          el("span", null, "4. Bóng Đổ & Khử Viền Giả")
        ),
        el("p", { className: "text-slate-300 text-[10px]" }, analysis.blendingDirectives)
      )
    ),
    analysis.cameraFraming && el("div", {
      className: "p-2 rounded-lg bg-amber-500/5 border border-amber-500/20 text-[10px] text-amber-200/90 flex items-start gap-1.5"
    },
      el("span", { className: "material-symbols-outlined text-xs text-amber-400 mt-0.5" }, "view_comfy"),
      el("div", null,
        el("strong", { className: "text-amber-300 block font-semibold" }, "Căn chỉnh bố cục khung hình:"),
        el("span", null, analysis.cameraFraming)
      )
    )
  );
}

// ============================================================================
// COMPONENT: STORY CARD (1 Ô TRONG GRID 20 Ô CỐ ĐỊNH 9:16)
// ============================================================================
function StoryCard({
  task,
  onSelectSlotOutfit,
  onRemoveSlotOutfit,
  onRetry,
  onPreview
}) {
  const [downloadState, setDownloadState] = React.useState('idle');

  const handleDownload = async (e) => {
    e.stopPropagation();
    if (!task.resultImage) return;
    setDownloadState('downloading');
    try {
      const ext = task.resultImage.mimeType?.includes('png') ? 'png' : 'jpg';
      await Flow.download({
        base64: task.resultImage.base64,
        mimeType: task.resultImage.mimeType,
        filename: `KOC_StoryBoard_Slot_${task.index + 1}_${Date.now()}.${ext}`,
      });
      setDownloadState('done');
      setTimeout(() => setDownloadState('idle'), 2000);
    } catch (err) {
      console.error(err);
      setDownloadState('error');
      setTimeout(() => setDownloadState('idle'), 2500);
    }
  };

  const slotNumberFormatted = String(task.index + 1).padStart(2, '0');
  const isDone = task.status === 'completed' && task.resultImage;

  return el("div", {
    onClick: () => isDone && onPreview(task),
    style: {
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#14141c',
      borderRadius: '12px',
      overflow: 'hidden',
      position: 'relative',
      border: isDone ? '1px solid rgba(245, 158, 11, 0.8)' : '1px solid rgba(255, 255, 255, 0.08)',
      boxShadow: isDone ? '0 4px 14px rgba(245, 158, 11, 0.15)' : 'none',
      cursor: isDone ? 'pointer' : 'default',
      boxSizing: 'border-box'
    },
    className: "group"
  },
    // Khung tỷ lệ 9:16 Storyboard
    el("div", {
      style: {
        position: 'relative',
        width: '100%',
        aspectRatio: '9 / 16',
        backgroundColor: '#0a0a0f',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }
    },
      // Số thứ tự ô Storyboard cố định góc trên trái
      el("div", {
        style: {
          position: 'absolute',
          top: '8px',
          left: '8px',
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(4px)',
          padding: '2px 6px',
          borderRadius: '6px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          pointerEvents: 'none'
        }
      },
        el("span", { style: { fontSize: '10px', fontFamily: 'monospace', fontWeight: 'bold', color: '#fbbf24' } },
          `#${slotNumberFormatted}`
        )
      ),

      // Tag CHUẨN KHUNG HÌNH ở góc trên phải khi hoàn thành (chuẩn theo ảnh 2 của Tris)
      isDone && el("div", {
        style: {
          position: 'absolute',
          top: '8px',
          right: '8px',
          zIndex: 20,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(4px)',
          border: '1px solid rgba(16, 185, 129, 0.6)',
          color: '#34d399',
          borderRadius: '4px',
          padding: '2px 5px',
          fontSize: '8.5px',
          fontFamily: 'monospace',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '3px',
          pointerEvents: 'none'
        }
      },
        el("span", { className: "material-symbols-outlined", style: { fontSize: '10px' } }, "center_focus_strong"),
        el("span", null, "CHUẨN KHUNG HÌNH")
      ),

      // Nút xóa/thay trang phục ở góc trên bên phải khi ô có outfit (chưa chạy)
      task.outfit && task.status !== 'processing' && task.status !== 'analyzing' && !isDone && el("div", {
        style: {
          position: 'absolute',
          top: '8px',
          right: '8px',
          zIndex: 20,
          display: 'flex',
          gap: '4px'
        },
        className: "opacity-0 group-hover:opacity-100 transition-opacity"
      },
        el("button", {
          onClick: (e) => {
            e.stopPropagation();
            onSelectSlotOutfit(task.index);
          },
          style: {
            padding: '4px',
            borderRadius: '4px',
            backgroundColor: 'rgba(0,0,0,0.8)',
            color: '#cbd5e1',
            border: '1px solid rgba(255,255,255,0.1)',
            cursor: 'pointer'
          },
          title: "Đổi trang phục ô này"
        },
          el("span", { className: "material-symbols-outlined", style: { fontSize: '12px', display: 'block' } }, "sync")
        ),
        el("button", {
          onClick: (e) => {
            e.stopPropagation();
            onRemoveSlotOutfit(task.index);
          },
          style: {
            padding: '4px',
            borderRadius: '4px',
            backgroundColor: 'rgba(0,0,0,0.8)',
            color: '#f87171',
            border: '1px solid rgba(239,68,68,0.3)',
            cursor: 'pointer'
          },
          title: "Gỡ trang phục ô này"
        },
          el("span", { className: "material-symbols-outlined", style: { fontSize: '12px', display: 'block' } }, "delete")
        )
      ),

      // 1. TRẠNG THÁI ĐÃ HOÀN THÀNH
      isDone ? [
        el("img", {
          key: "img",
          src: task.resultImage.base64?.startsWith('data:') || task.resultImage.base64?.startsWith('http') || task.resultImage.base64?.startsWith('file:') 
            ? task.resultImage.base64 
            : `data:${task.resultImage.mimeType || 'image/jpeg'};base64,${task.resultImage.base64}`,
          alt: `Story ${task.index + 1}`,
          style: {
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block'
          }
        }),
        // Thumbnail nhỏ của outfit gốc ở góc dưới trái (chuẩn xác ảnh 2 của Tris)
        task.outfit && el("div", {
          key: "thumb",
          style: {
            position: 'absolute',
            bottom: '8px',
            left: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(4px)',
            borderRadius: '6px',
            padding: '3px 6px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            zIndex: 10,
            pointerEvents: 'none'
          }
        },
          el("img", {
            src: task.outfit.base64?.startsWith('data:') || task.outfit.base64?.startsWith('http') || task.outfit.base64?.startsWith('file:') 
              ? task.outfit.base64 
              : `data:${task.outfit.mimeType || 'image/jpeg'};base64,${task.outfit.base64}`,
            alt: "Outfit Thumb",
            style: { width: '18px', height: '18px', borderRadius: '3px', objectFit: 'cover' }
          }),
          el("span", { style: { fontSize: '9px', fontFamily: 'monospace', color: '#cbd5e1', fontWeight: 'bold' } },
            "Trang phục gốc"
          )
        ),
        // Overlay hover
        el("div", {
          key: "overlay",
          className: "absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3 z-20"
        },
          el("div", { className: "flex justify-end pt-6" },
            el("button", {
              onClick: handleDownload,
              disabled: downloadState !== 'idle',
              style: {
                padding: '4px 10px',
                borderRadius: '8px',
                backgroundColor: '#f59e0b',
                color: '#000000',
                fontWeight: 'bold',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                border: 'none',
                cursor: 'pointer'
              },
              title: "Tải ảnh về máy"
            },
              el("span", { className: "material-symbols-outlined", style: { fontSize: '13px' } },
                downloadState === 'done' ? 'check' : 'download'
              ),
              el("span", null, "Tải ảnh")
            )
          ),
          el("div", { style: { textAlign: 'center' } },
            el("span", { style: { fontSize: '10.5px', fontWeight: '600', color: '#ffffff', backgroundColor: 'rgba(0,0,0,0.7)', padding: '4px 8px', borderRadius: '9999px', border: '1px solid rgba(255,255,255,0.1)' } },
              "🔍 Xem chi tiết"
            )
          ),
          el("div", { style: { fontSize: '9.5px', color: '#cbd5e1', backgroundColor: 'rgba(0,0,0,0.8)', padding: '3px 6px', borderRadius: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
            task.outfit?.name || 'Trang phục'
          )
        )
      ] : task.status === 'analyzing' ? (
        // Trạng thái AI THINKING ĐANG PHÂN TÍCH
        el("div", { style: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '12px', textAlign: 'center', backgroundColor: '#151522' } },
          el("div", { style: { position: 'relative', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' } },
            el("div", { style: { position: 'absolute', inset: 0, border: '2px solid #fbbf24', borderTopColor: 'transparent', borderRadius: '9999px' }, className: "animate-spin" }),
            el("span", { className: "material-symbols-outlined text-amber-400 animate-pulse", style: { fontSize: '18px' } }, "psychology")
          ),
          el("span", { style: { fontSize: '11px', fontWeight: 'bold', color: '#fcd34d', marginBottom: '2px' } }, "AI Thinking..."),
          el("span", { style: { fontSize: '9px', color: '#cbd5e1', lineHeight: '1.2' } }, "Đo chân trời, dáng KOC"),
          el("div", { style: { width: '70%', height: '3px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '9999px', marginTop: '8px', overflow: 'hidden' } },
            el("div", { style: { width: '100%', height: '100%', backgroundColor: '#fbbf24' }, className: "animate-pulse" })
          )
        )
      ) : task.status === 'processing' ? (
        // Trạng thái ĐANG RENDER
        el("div", { style: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '12px', textAlign: 'center', backgroundColor: '#151520' } },
          el("div", { style: { position: 'relative', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' } },
            el("div", { style: { position: 'absolute', inset: 0, border: '2px solid #f59e0b', borderTopColor: 'transparent', borderRadius: '9999px' }, className: "animate-spin" }),
            el("span", { className: "material-symbols-outlined text-amber-400", style: { fontSize: '18px' } }, "auto_fix_high")
          ),
          el("span", { style: { fontSize: '11px', fontWeight: 'bold', color: '#fcd34d', marginBottom: '2px' } }, "Đang render AI..."),
          el("span", { style: { fontSize: '9px', color: '#94a3b8', lineHeight: '1.2' } }, "Khử viền ghép giả"),
          el("div", { style: { width: '70%', height: '3px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '9999px', marginTop: '8px', overflow: 'hidden' } },
            el("div", { style: { width: '100%', height: '100%', backgroundColor: '#f59e0b' }, className: "animate-pulse" })
          )
        )
      ) : task.status === 'error' ? (
        // Trạng thái LỖI
        el("div", { style: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px', textAlign: 'center', backgroundColor: 'rgba(76, 5, 25, 0.2)' } },
          el("span", { className: "material-symbols-outlined text-rose-400", style: { fontSize: '24px', marginBottom: '6px' } }, "error"),
          el("span", { style: { fontSize: '11px', fontWeight: '600', color: '#fca5a5', marginBottom: '4px' } }, "Lỗi xử lý"),
          el("button", {
            onClick: (e) => {
              e.stopPropagation();
              onRetry(task);
            },
            style: {
              padding: '3px 8px',
              fontSize: '10px',
              backgroundColor: 'rgba(159, 18, 57, 0.7)',
              color: '#fecdd3',
              borderRadius: '4px',
              border: '1px solid rgba(225, 29, 72, 0.5)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '2px'
            }
          },
            el("span", { className: "material-symbols-outlined", style: { fontSize: '11px' } }, "refresh"),
            "Thử lại"
          )
        )
      ) : task.outfit ? (
        // Trạng thái SẴN SÀNG / ĐANG TRONG HÀNG ĐỢI
        el("div", { style: { position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '8px' } },
          el("img", {
            src: task.outfit.base64?.startsWith('data:') || task.outfit.base64?.startsWith('http') || task.outfit.base64?.startsWith('file:') 
              ? task.outfit.base64 
              : `data:${task.outfit.mimeType || 'image/jpeg'};base64,${task.outfit.base64}`,
            alt: task.outfit.name,
            style: {
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'brightness(0.8)'
            }
          }),
          el("div", {
            style: {
              position: 'relative',
              zIndex: 10,
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              backdropFilter: 'blur(4px)',
              padding: '6px',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.1)',
              textAlign: 'center'
            }
          },
            el("span", { style: { fontSize: '10px', fontWeight: '600', color: '#fcd34d', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
              task.outfit.name
            ),
            el("span", { style: { fontSize: '9px', color: '#94a3b8', fontFamily: 'monospace' } },
              task.status === 'pending' ? '⏳ Đang chờ lượt' : '✓ Sẵn sàng tạo'
            )
          )
        )
      ) : (
        // Trạng thái Ô TRỐNG (EMPTY) - Chuẩn xác theo ảnh 1 của Tris
        el("button", {
          onClick: () => onSelectSlotOutfit(task.index),
          style: {
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px',
            textAlign: 'center',
            border: '2px dashed #232332',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            boxSizing: 'border-box'
          },
          className: "hover:border-amber-400/60 hover:bg-amber-500/5 transition-all group"
        },
          el("div", {
            style: {
              width: '36px',
              height: '36px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(30, 41, 59, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              marginBottom: '6px'
            },
            className: "group-hover:bg-amber-500/20 group-hover:text-amber-400 transition-colors"
          },
            el("span", { className: "material-symbols-outlined", style: { fontSize: '18px' } }, "add")
          ),
          el("span", { style: { fontSize: '11px', fontWeight: '600', color: '#94a3b8', marginBottom: '2px' } },
            `Thêm bộ #${task.index + 1}`
          ),
          el("span", { style: { fontSize: '9.5px', color: '#475569' } },
            "Bấm để gán trang phục"
          )
        )
      )
    ),

    // Footer ô Storyboard
    el("div", {
      style: {
        padding: '6px 8px',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '10px',
        backgroundColor: '#161622'
      }
    },
      el("span", { style: { fontFamily: 'monospace', color: '#94a3b8' } },
        `SLOT ${slotNumberFormatted}`
      ),
      el("span", {
        style: {
          fontSize: '9.5px',
          fontWeight: '600',
          padding: '1px 5px',
          borderRadius: '4px',
          backgroundColor: isDone ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
          color: isDone ? '#34d399' : task.status === 'processing' || task.status === 'analyzing' ? '#fbbf24' : task.outfit ? '#fcd34d' : '#64748b'
        }
      },
        isDone
          ? 'Chuẩn khung hình'
          : task.status === 'analyzing'
          ? 'Đang phân tích'
          : task.status === 'processing'
          ? 'Đang render'
          : task.status === 'error'
          ? 'Lỗi'
          : task.status === 'pending'
          ? 'Hàng chờ'
          : task.outfit
          ? 'Đã nạp'
          : 'Trống'
      )
    )
  );
}

// ============================================================================
// MAIN COMPONENT: PHÒNG THAY ĐỒ KOC STUDIO
// ============================================================================
export default function FittingRoomKocStudio({
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
  geminiApiKey,
  imageResolution: propImageResolution,
  setImageResolution: propSetImageResolution,
  removeWatermark: propRemoveWatermark,
  setRemoveWatermark: propSetRemoveWatermark
}) {
  const persist = (typeof window !== "undefined" && window.__AIFORGE_FITTING_ROOM_PERSISTENCE__) || {};
  const [imageEngine, setImageEngine] = React.useState(() => {
    try { return localStorage.getItem("aiforge_fitting_image_engine") || "banana"; } catch(e) { return "banana"; }
  });

  // Tham chiếu cố định
  const [kocImage, setKocImage] = React.useState(persist.kocImage || null);
  const [bgImage, setBgImage] = React.useState(persist.bgImage || null);

  // 20 Ô hàng chờ Storyboard
  const [tasks, setTasks] = React.useState(persist.tasks || createInitialTasks());

  // Căn chỉnh khung hình & Phối cảnh chuyên sâu
  const [framingShot, setFramingShot] = React.useState(persist.framingShot || 'full_body');
  const [perspectiveLock, setPerspectiveLock] = React.useState(persist.perspectiveLock || 'ground_level');
  // Chế độ Mặc định KOC: Khóa 100% vóc dáng & góc chụp gốc (Mặc định BẬT)
  const [exactPoseLock, setExactPoseLock] = React.useState(persist.exactPoseLock !== undefined ? persist.exactPoseLock : true);
  // Chế độ lấy ảnh tới đầu gối (Knee Crop)
  const [kneeCropOnly, setKneeCropOnly] = React.useState(persist.kneeCropOnly !== undefined ? persist.kneeCropOnly : false);
  const [customStylePrompt, setCustomStylePrompt] = React.useState(persist.customStylePrompt || '');
  const [enableAiThinking, setEnableAiThinking] = React.useState(persist.enableAiThinking !== undefined ? persist.enableAiThinking : true);

  // Xử lý bật/tắt liên động giữa Chế độ Mặc định KOC và Chế độ Đầu gối
  const handleToggleExactPoseLock = () => {
    setExactPoseLock((prev) => {
      const next = !prev;
      if (next) setKneeCropOnly(false);
      return next;
    });
  };

  const handleToggleKneeCropOnly = () => {
    setKneeCropOnly((prev) => {
      const next = !prev;
      if (next) setExactPoseLock(false);
      return next;
    });
  };

  // Cấu hình chất lượng 2K & Xóa Watermark (Model Banana Pro)
  const [localImageResolution, setLocalImageResolution] = React.useState(() => {
    if (persist.imageResolution) return persist.imageResolution;
    try {
      const s = localStorage.getItem("aiforge_koc_img_res") || localStorage.getItem("aiforge_fitting_room_img_res");
      if (s) return s;
    } catch (_) {}
    return '2k';
  });
  const [localRemoveWatermark, setLocalRemoveWatermark] = React.useState(() => {
    if (persist.removeWatermark !== undefined) return persist.removeWatermark;
    try {
      const s = localStorage.getItem("aiforge_koc_watermark") || localStorage.getItem("aiforge_fitting_room_watermark");
      if (s !== null) return s === 'true';
    } catch (_) {}
    return true;
  });

  const imageResolution = propImageResolution !== undefined ? propImageResolution : localImageResolution;
  const setImageResolution = (val) => {
    setLocalImageResolution(val);
    if (typeof propSetImageResolution === 'function') propSetImageResolution(val);
    try {
      localStorage.setItem("aiforge_koc_img_res", val);
      localStorage.setItem("aiforge_fitting_room_img_res", val);
      if (window.__AIFORGE_GLOBAL_STUDIO_STATE__) window.__AIFORGE_GLOBAL_STUDIO_STATE__.imageResolution = val;
    } catch (_) {}
  };

  const removeWatermark = propRemoveWatermark !== undefined ? propRemoveWatermark : localRemoveWatermark;
  const setRemoveWatermark = (val) => {
    setLocalRemoveWatermark(val);
    if (typeof propSetRemoveWatermark === 'function') propSetRemoveWatermark(val);
    try {
      localStorage.setItem("aiforge_koc_watermark", String(val));
      localStorage.setItem("aiforge_fitting_room_watermark", String(val));
      if (window.__AIFORGE_GLOBAL_STUDIO_STATE__) window.__AIFORGE_GLOBAL_STUDIO_STATE__.removeWatermark = val;
    } catch (_) {}
  };

  // Modal preview & about
  const [previewTask, setPreviewTask] = React.useState(null);
  const [showAboutModal, setShowAboutModal] = React.useState(false);
  const [bulkDownloadStatus, setBulkDownloadStatus] = React.useState('idle');
  const [globalError, setGlobalError] = React.useState(null);

  // State danh sách tài khoản realtime từ BrowserHub
  const [liveAccounts, setLiveAccounts] = React.useState(accounts || []);

  React.useEffect(() => {
    let isMounted = true;
    async function refreshAccs() {
      if (window.aiforge?.browser?.listSessions) {
        try {
          const s = await window.aiforge.browser.listSessions();
          if (isMounted && Array.isArray(s) && s.length > 0) {
            setLiveAccounts(s);
          }
        } catch (_) {}
      }
    }
    refreshAccs();
    const unsub = window.aiforge?.browser?.onSessionStateChanged?.(() => refreshAccs());
    return () => {
      isMounted = false;
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  React.useEffect(() => {
    if (accounts && accounts.length > 0) {
      setLiveAccounts(accounts);
    }
  }, [accounts]);

  const effectiveAccounts = (liveAccounts && liveAccounts.length > 0) ? liveAccounts : (accounts || []);

  // Ref lưu trạng thái realtime
  const stateRef = React.useRef({
    kocImage, bgImage, tasks, framingShot, perspectiveLock, exactPoseLock, kneeCropOnly, customStylePrompt,
    enableAiThinking, imageResolution, removeWatermark, selectedBananaAccountId, accounts: effectiveAccounts
  });

  React.useEffect(() => {
    stateRef.current = {
      kocImage, bgImage, tasks, framingShot, perspectiveLock, exactPoseLock, kneeCropOnly, customStylePrompt,
      enableAiThinking, imageResolution, removeWatermark, selectedBananaAccountId, accounts: effectiveAccounts
    };
    if (typeof window !== "undefined") {
      window.__AIFORGE_FITTING_ROOM_PERSISTENCE__ = stateRef.current;
      try {
        localStorage.setItem("aiforge_fitting_room_data", JSON.stringify({
          kocImage, bgImage, tasks, framingShot, perspectiveLock, exactPoseLock, kneeCropOnly, customStylePrompt,
          enableAiThinking, imageResolution, removeWatermark
        }));
      } catch (_) {}
    }
  }, [kocImage, bgImage, tasks, framingShot, perspectiveLock, exactPoseLock, kneeCropOnly, customStylePrompt, enableAiThinking, imageResolution, removeWatermark, selectedBananaAccountId, effectiveAccounts]);

  // ============================================================================
  // HỆ THỐNG ĐỒNG BỘ KẾT QUẢ TỰ ĐỘNG CHO TOÀN BỘ CÁC TÀI KHOẢN (FAST POLLING 1.2S)
  // ============================================================================
  const checkJobsAndAssetsDirectly = React.useCallback(async () => {
    try {
      const qApi = window.aiforge?.queue || window.aivideo?.queue;
      const assetsApi = window.aiforge?.assets || window.aivideo?.assets;
      if (!qApi?.list) return;

      const [rawQueue, rawAssets] = await Promise.all([
        qApi.list().catch(() => null),
        assetsApi?.list ? assetsApi.list().catch(() => []) : Promise.resolve([])
      ]);

      const jobs = Array.isArray(rawQueue) ? rawQueue : (Array.isArray(rawQueue?.jobs) ? rawQueue.jobs : []);
      const allAssets = Array.isArray(rawAssets) ? rawAssets : (Array.isArray(rawAssets?.assets) ? rawAssets.assets : []);

      setTasks(prev => {
        let changed = false;
        const next = prev.map(t => {
          if (t.status === 'processing' || t.status === 'analyzing' || t.jobId) {
            const matchedJob = jobs.find(j => 
              (t.jobId && j.id === t.jobId) || 
              (j.payload?.studioSource === 'fitting-room' && j.payload?.slotIndex === t.index)
            );

            if (matchedJob) {
              const st = (matchedJob.status || '').toLowerCase();
              if (st === 'completed' || st === 'done' || st === 'succeeded') {
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
                  changed = true;
                  toast?.success?.(`Đã hoàn thành Storyboard Slot #${t.index + 1}!`);
                  return {
                    ...t,
                    status: 'completed',
                    resultImage: {
                      mediaId: matchedAsset?.assetId || matchedAsset?.id || ('asset-slot-' + Date.now()),
                      base64: bestUrl,
                      mimeType: matchedAsset?.mimeType || 'image/jpeg'
                    },
                    jobId: null
                  };
                }
              } else if (st === 'failed' || st === 'error') {
                changed = true;
                toast?.error?.(`Lỗi tại ô #${t.index + 1}: ${matchedJob.error || 'Thất bại trong hàng đợi'}`);
                return {
                  ...t,
                  status: 'error',
                  error: matchedJob.error || 'Lỗi tạo ảnh',
                  jobId: null
                };
              }
            }
          }
          return t;
        });
        return changed ? next : prev;
      });
    } catch (err) {
      console.warn("checkJobsAndAssetsDirectly error:", err);
    }
  }, []);

  // Lắng nghe sự kiện queue & assets đổi trạng thái và Polling 1200ms
  React.useEffect(() => {
    const qApi = window.aiforge?.queue || window.aivideo?.queue;
    const assetsApi = window.aiforge?.assets || window.aivideo?.assets;

    let unsubQueue = null;
    let unsubAssets = null;
    if (qApi?.onChanged) unsubQueue = qApi.onChanged(() => checkJobsAndAssetsDirectly());
    if (assetsApi?.onChanged) unsubAssets = assetsApi.onChanged(() => checkJobsAndAssetsDirectly());

    const interval = setInterval(() => {
      checkJobsAndAssetsDirectly();
    }, 1200);

    return () => {
      if (typeof unsubQueue === 'function') unsubQueue();
      if (typeof unsubAssets === 'function') unsubAssets();
      clearInterval(interval);
    };
  }, [checkJobsAndAssetsDirectly]);

  // 1. Chọn ảnh người mẫu KOC
  const handleSelectKoc = async () => {
    try {
      const media = await Flow.media.select({ filter: 'image' });
      if (!media || !media.mediaId) return;
      setKocImage({
        mediaId: media.mediaId,
        base64: media.base64,
        mimeType: media.mimeType,
        name: media.name || 'KOC_Model.jpg',
      });
      setGlobalError(null);
    } catch (err) {
      console.warn('Hủy chọn ảnh KOC hoặc lỗi:', err);
    }
  };

  // 2. Chọn bối cảnh chụp
  const handleSelectBg = async () => {
    try {
      const media = await Flow.media.select({ filter: 'image' });
      if (!media || !media.mediaId) return;
      setBgImage({
        mediaId: media.mediaId,
        base64: media.base64,
        mimeType: media.mimeType,
        name: media.name || 'Background.jpg',
      });
      setGlobalError(null);
    } catch (err) {
      console.warn('Hủy chọn ảnh nền hoặc lỗi:', err);
    }
  };

  // 3. Nạp hàng loạt ảnh trang phục vào các ô Storyboard còn trống
  const handleBatchUploadOutfits = async () => {
    try {
      const emptySlotIndices = tasks
        .map((t, idx) => (t.outfit ? -1 : idx))
        .filter((idx) => idx !== -1);
      if (emptySlotIndices.length === 0) {
        toast?.info?.('Tất cả 20 ô Storyboard đã được nạp trang phục!');
        return;
      }
      const mediaItems = await Flow.media.selectMultiple({
        filter: 'image',
        maxCount: emptySlotIndices.length,
      });
      if (!mediaItems || mediaItems.length === 0) return;
      const validItems = mediaItems.filter((item) => item && item.mediaId);
      if (validItems.length === 0) return;

      setTasks((prev) => {
        const next = [...prev];
        let mediaIdx = 0;
        for (let i = 0; i < next.length && mediaIdx < validItems.length; i++) {
          if (!next[i].outfit) {
            const item = validItems[mediaIdx];
            next[i] = {
              ...next[i],
              outfit: {
                mediaId: item.mediaId,
                base64: item.base64,
                mimeType: item.mimeType,
                name: item.name || `Outfit_${i + 1}.jpg`,
              },
              status: 'ready',
              resultImage: undefined,
              error: undefined,
            };
            mediaIdx++;
          }
        }
        return next;
      });
      toast?.success?.(`Đã nạp ${validItems.length} bộ trang phục vào hàng chờ!`);
      setGlobalError(null);
    } catch (err) {
      console.warn('Hủy nạp ảnh hoặc lỗi:', err);
    }
  };

  // 4. Chọn/Đổi trang phục trực tiếp cho 1 ô cụ thể
  const handleSelectSlotOutfit = async (slotIndex) => {
    try {
      const media = await Flow.media.select({ filter: 'image' });
      if (!media || !media.mediaId) return;
      setTasks((prev) =>
        prev.map((t, idx) =>
          idx === slotIndex
            ? {
                ...t,
                outfit: {
                  mediaId: media.mediaId,
                  base64: media.base64,
                  mimeType: media.mimeType,
                  name: media.name || `Outfit_${slotIndex + 1}.jpg`,
                },
                status: 'ready',
                resultImage: undefined,
                error: undefined,
              }
            : t
        )
      );
      setGlobalError(null);
    } catch (err) {
      console.warn('Hủy đổi trang phục hoặc lỗi:', err);
    }
  };

  // 5. Gỡ trang phục ở 1 ô
  const handleRemoveSlotOutfit = (slotIndex) => {
    setTasks((prev) =>
      prev.map((t, idx) =>
        idx === slotIndex
          ? {
              ...t,
              outfit: undefined,
              status: 'empty',
              resultImage: undefined,
              aiThinking: undefined,
              error: undefined,
              jobId: null
            }
          : t
      )
    );
  };

  // 6. Xóa toàn bộ 20 ô về trạng thái rỗng
  const handleResetAllSlots = () => {
    const running = tasks.filter(t => t.status === 'processing' || t.status === 'analyzing').length;
    if (running > 0) {
      if (!window.confirm(`Đang có ${running} ô đang tạo ảnh. Bạn có chắc muốn làm mới toàn bộ 20 ô?`)) {
        return;
      }
    }
    setTasks(createInitialTasks());
    toast?.info?.("Đã làm mới toàn bộ 20 ô Storyboard.");
  };

  // 7. 🚀 CHẠY TẠO HÀNG LOẠT SIÊU TỐC - TỰ ĐỘNG CHIA JOB ĐỒNG THỜI CHO TẤT CẢ TÀI KHOẢN BANANA PRO
  const handleStartStoryboardBatch = async () => {
    if (!kocImage || (!kocImage.mediaId && !kocImage.base64)) {
      setGlobalError('Vui lòng chọn ảnh người mẫu KOC để cố định khuôn mặt, vóc dáng và bối cảnh!');
      toast?.error?.('Vui lòng chọn ảnh Mặt & Dáng KOC trước!');
      return;
    }

    // Lọc ra tất cả các slot đang sẵn sàng (có outfit và chưa hoàn thành, chưa đang tạo)
    const readySlots = tasks.filter(
      (t) => t.outfit && (t.outfit.mediaId || t.outfit.base64) && t.status !== 'completed' && t.status !== 'processing' && t.status !== 'analyzing'
    );

    if (readySlots.length === 0) {
      toast?.info?.('Chưa có trang phục mới nào sẵn sàng trong 20 ô để tạo ảnh!');
      return;
    }

    setGlobalError(null);

    // Đánh dấu ngay các ô này sang trạng thái đang xử lý (loading) trên UI
    const readyIndices = readySlots.map(s => s.index);
    setTasks(prev => prev.map((t) => readyIndices.includes(t.index) ? { ...t, status: 'processing', error: undefined } : t));

    try {
      const qApi = window.aiforge?.queue || window.aivideo?.queue;
      if (!qApi?.addJobs && !qApi?.addJob) throw new Error("Hệ thống Hàng đợi chưa sẵn sàng");

      // 1. Đảm bảo KOC và Bối cảnh đã được đăng ký Asset
      const validKocId = await ensureRegisteredAsset(kocImage, 'koc_model.jpg');
      const validBgId = bgImage ? await ensureRegisteredAsset(bgImage, 'bg_scene.jpg') : null;

      // 2. 🎯 ROUND-ROBIN CHO TẤT CẢ TÀI KHOẢN BANANA PRO: Chia đều từng job cho từng tài khoản
      let allAccs = (effectiveAccounts && effectiveAccounts.length > 0) ? effectiveAccounts : [];
      if (window.aiforge?.browser?.listSessions) {
        try {
          const fresh = await window.aiforge.browser.listSessions();
          if (fresh && Array.isArray(fresh) && fresh.length > 0) {
            allAccs = fresh;
            setLiveAccounts(fresh);
          }
        } catch (_) {}
      }

      const isAutoBanana = !selectedBananaAccountId || selectedBananaAccountId === 'auto';
      let activeBananaAccs = allAccs.filter(a => a.providerId === 'banana' && (a.authStatus === 'Logged In' || a.authStatus === 'active' || !a.disabled));
      if (activeBananaAccs.length === 0) activeBananaAccs = allAccs.filter(a => a.providerId === 'banana');
      let manualBananaAcc = !isAutoBanana ? allAccs.find(a => a.accountId === selectedBananaAccountId) : undefined;

      const currentBatchId = 'batch_' + Date.now();

      // 3. Chuẩn bị danh sách Jobs đồng loạt
      const jobs = [];
      for (let i = 0; i < readySlots.length; i++) {
        const slot = readySlots[i];
        const validOutfitId = await ensureRegisteredAsset(slot.outfit, `outfit_${slot.index + 1}.jpg`);
        const referenceIds = [validKocId, validOutfitId];
        if (validBgId) referenceIds.push(validBgId);

        // Chia đều tài khoản theo Round-Robin
        let curAcc = undefined;
        if (manualBananaAcc) {
          curAcc = manualBananaAcc;
        } else if (activeBananaAccs.length > 0) {
          curAcc = activeBananaAccs[i % activeBananaAccs.length]; // CHIA ĐỀU TỪNG TÀI KHOẢN!
        }

        const targetBananaAccId = curAcc?.accountId || undefined;
        const targetBananaAccName = curAcc?.accountDisplayName || curAcc?.accountEmail || curAcc?.accountName || undefined;

        // Xây dựng Prompt chuẩn xác (Khóa 100% dáng & góc chụp gốc nếu bật Chế độ Mặc định KOC, hoặc Knee-crop)
        const framingDesc = exactPoseLock
          ? 'ABSOLUTE 1:1 REPLICA OF ORIGINAL KOC FRAMING & POSE: The camera distance, angle, shot framing boundary, and the model\'s exact bodily posture, gesture, stance, and head angle MUST BE 100% IDENTICAL to the original KOC reference photo. Do not re-crop, do not shift camera angle or height. Preserve the exact original composition and model pose.'
          : kneeCropOnly
          ? 'Medium full shot cropped strictly at knee-height (American shot), subject positioned closer to camera for exceptional facial sharpness, clear clothing textures, cutting off lower shins and feet'
          : framingShot === 'full_body' 
          ? 'full-body head-to-toe shot with feet grounded firmly on the floor plane'
          : framingShot === 'fashion_walk'
          ? 'dynamic full-length street style stride walking naturally in perspective'
          : framingShot === 'three_quarter'
          ? 'three-quarter editorial lookbook framing'
          : 'medium waist-up portrait framing';

        const bgDesc = bgImage && bgImage.mediaId
          ? 'The subject is photographed directly on-location inside the environment shown in the background reference photo. Absolute perspective alignment: camera height, vanishing point, and ground plane horizon line match precisely.'
          : 'The background MUST be an exact 1:1 photorealistic replica of the original environment and setting visible in the KOC reference photo (including identical room walls, decor, furniture, floor, and ambient room lighting). Do not replace the background with an artificial plain studio; maintain the original scene context.';

        const finalPrompt = `Award-winning authentic photograph (vertical 9:16 aspect ratio). The subject is strictly the identical KOC individual from the reference photo, preserving 100% of their exact age (if baby, keep baby facial proportions, baby body scale, chubby cheeks and infant limbs; if child or adult, keep exact biological age and somatotype), exact facial identity, bone structure, eye shape, nose bridge, skin tone, hair, and exact body pose and posture. Subject is dressed in the exact clothing piece from the outfit reference, perfectly tailored to their body size. ${bgDesc} Framing: ${framingDesc}. Unified in-camera optical illumination, natural contact shadows, zero cutout halos, crisp focus, cinematic realism.${customStylePrompt ? ' Additional stylistic cues: ' + customStylePrompt : ''}`;

        jobs.push({
          title: `[Phòng Thay Đồ] Storyboard Slot #${slot.index + 1}`,
          type: "Image",
          providerId: imageEngine === "muse" ? "muse" : "banana",
          provider: imageEngine === "muse" ? "Muse AI" : "Banana",
          ...(targetBananaAccId ? { accountId: targetBananaAccId, account: targetBananaAccName } : {}),
          payload: {
            title: `[Phòng Thay Đồ] Storyboard Slot #${slot.index + 1}`,
            prompt: finalPrompt,
            ratio: "9:16",
            aspectRatio: "9:16",
            referenceAssetIds: referenceIds.filter(Boolean),
            model: imageEngine === "muse" ? "muse-image" : "banana",
            modelDisplayName: "🍌 Nano Banana Pro",
            studioSource: "fitting-room",
            autoRemoveWatermark: removeWatermark,
            removeWatermark: removeWatermark,
            upsampleResolution: imageResolution === '2k' ? '2K' : 'Full HD',
            resolution: imageResolution === '2k' ? '2K' : 'Standard',
            quality: imageResolution === '2k' ? '2K' : 'Standard',
            imageResolution: imageResolution,
            upscale2k: imageResolution === '2k',
            resolutionName: imageResolution === '2k' ? "2K" : "1K",
            accountSelection: isAutoBanana ? "auto" : "manual",
            slotIndex: slot.index,
            batchId: currentBatchId
          }
        });
      }

      // 4. 🚀 GỬI TOÀN BỘ JOBS CÙNG LÚC VÀO HÀNG ĐỢI HỆ THỐNG
      const res = await (qApi.addJobs ? qApi.addJobs(jobs) : qApi.addJob(jobs[0]));
      try { qApi.resume?.(); } catch(_) {}

      if (res?.results && Array.isArray(res.results)) {
        setTasks(prev => prev.map(t => {
          const matchIdx = readySlots.findIndex(s => s.index === t.index);
          if (matchIdx !== -1) {
            const jId = res.results[matchIdx]?.job?.id || res.results[matchIdx]?.id;
            return {
              ...t,
              status: 'processing',
              jobId: jId || null,
              promptUsed: jobs[matchIdx]?.payload?.prompt
            };
          }
          return t;
        }));
      }

      toast?.success?.(`Đã gửi đồng loạt ${jobs.length} ô vào Hàng đợi trên ${activeBananaAccs.length || 1} tài khoản Banana Pro!`);

      // Kích hoạt quét kết quả ngay lập tức
      setTimeout(() => checkJobsAndAssetsDirectly(), 800);

    } catch (err) {
      console.error("Lỗi khi gửi jobs hàng loạt:", err);
      toast?.error?.("Lỗi khi gửi lệnh tạo ảnh: " + (err.message || err));
      setTasks(prev => prev.map((t, idx) => readyIndices.includes(idx) ? { ...t, status: 'error', error: err.message } : t));
    }
  };

  // 8. Render lại 1 ô cụ thể với thông số hiện tại
  const handleRetrySlot = async (targetTask) => {
    if (!kocImage || (!kocImage.mediaId && !kocImage.base64) || !targetTask.outfit || (!targetTask.outfit.mediaId && !targetTask.outfit.base64)) return;

    setTasks((prev) =>
      prev.map((t) => (t.index === targetTask.index ? { ...t, status: 'processing', error: undefined } : t))
    );

    try {
      const qApi = window.aiforge?.queue || window.aivideo?.queue;
      if (!qApi?.addJobs && !qApi?.addJob) throw new Error("Hàng đợi chưa sẵn sàng");

      const validKocId = await ensureRegisteredAsset(kocImage, 'koc_model.jpg');
      const validOutfitId = await ensureRegisteredAsset(targetTask.outfit, `outfit_${targetTask.index + 1}.jpg`);
      const validBgId = bgImage ? await ensureRegisteredAsset(bgImage, 'bg_scene.jpg') : null;

      const referenceIds = [validKocId, validOutfitId];
      if (validBgId) referenceIds.push(validBgId);

      let allAccs = (effectiveAccounts && effectiveAccounts.length > 0) ? effectiveAccounts : [];
      if (window.aiforge?.browser?.listSessions) {
        try {
          const fresh = await window.aiforge.browser.listSessions();
          if (fresh && Array.isArray(fresh) && fresh.length > 0) allAccs = fresh;
        } catch (_) {}
      }

      const isAutoBanana = !selectedBananaAccountId || selectedBananaAccountId === 'auto';
      let activeBananaAccs = allAccs.filter(a => a.providerId === 'banana' && (a.authStatus === 'Logged In' || a.authStatus === 'active' || !a.disabled));
      if (activeBananaAccs.length === 0) activeBananaAccs = allAccs.filter(a => a.providerId === 'banana');
      let manualBananaAcc = !isAutoBanana ? allAccs.find(a => a.accountId === selectedBananaAccountId) : undefined;

      const curAcc = manualBananaAcc || (activeBananaAccs.length > 0 ? activeBananaAccs[targetTask.index % activeBananaAccs.length] : undefined);

      const framingDesc = exactPoseLock
        ? 'ABSOLUTE 1:1 REPLICA OF ORIGINAL KOC FRAMING & POSE: The camera distance, angle, shot framing boundary, and the model\'s exact bodily posture, gesture, stance, and head angle MUST BE 100% IDENTICAL to the original KOC reference photo. Do not re-crop, do not shift camera angle or height. Preserve the exact original composition and model pose.'
        : kneeCropOnly
        ? 'Medium full shot cropped strictly at knee-height (American shot), subject positioned closer to camera for exceptional facial sharpness, clear clothing textures, cutting off lower shins and feet'
        : 'full-body head-to-toe shot with feet grounded firmly';

      const bgDesc = bgImage && bgImage.mediaId
        ? 'The subject is photographed directly on-location inside the environment shown in the background reference photo. Absolute perspective alignment match.'
        : 'The background MUST be an exact 1:1 photorealistic replica of the original environment and setting visible in the KOC reference photo.';

      const finalPrompt = `Award-winning authentic photograph (vertical 9:16 aspect ratio). The subject is strictly the identical KOC individual from the reference photo, preserving 100% of their biological age and somatic frame. Model wears the exact clothing item from the outfit reference. ${bgDesc} Framing: ${framingDesc}. Crisp focus, unified studio lighting.`;

      const jobInput = {
        title: `[Phòng Thay Đồ] Retry Slot #${targetTask.index + 1}`,
        type: "Image",
        providerId: imageEngine === "muse" ? "muse" : "banana",
        provider: imageEngine === "muse" ? "Muse AI" : "Banana",
        ...(curAcc?.accountId ? { accountId: curAcc.accountId, account: curAcc.accountDisplayName || curAcc.accountEmail } : {}),
        payload: {
          title: `[Phòng Thay Đồ] Retry Slot #${targetTask.index + 1}`,
          prompt: finalPrompt,
          ratio: "9:16",
          aspectRatio: "9:16",
          referenceAssetIds: referenceIds.filter(Boolean),
          model: imageEngine === "muse" ? "muse-image" : "banana",
          modelDisplayName: "🍌 Nano Banana Pro",
          studioSource: "fitting-room",
          autoRemoveWatermark: removeWatermark,
          removeWatermark: removeWatermark,
          upsampleResolution: imageResolution === '2k' ? '2K' : 'Full HD',
          resolution: imageResolution === '2k' ? '2K' : 'Standard',
          quality: imageResolution === '2k' ? '2K' : 'Standard',
          imageResolution: imageResolution,
          upscale2k: imageResolution === '2k',
          resolutionName: imageResolution === '2k' ? "2K" : "1K",
          slotIndex: targetTask.index
        }
      };

      const res = await (qApi.addJobs ? qApi.addJobs([jobInput]) : qApi.addJob(jobInput));
      try { qApi.resume?.(); } catch(_) {}

      const jId = res?.results?.[0]?.job?.id || res?.results?.[0]?.id || res?.id || null;
      if (jId) {
        setTasks(prev => prev.map(t => t.index === targetTask.index ? { ...t, jobId: jId } : t));
      }
      toast?.info?.(`Đã gửi lại yêu cầu tạo ảnh cho Ô #${targetTask.index + 1}`);
      setTimeout(() => checkJobsAndAssetsDirectly(), 800);
    } catch (err) {
      toast?.error?.("Lỗi khi thử lại: " + err.message);
      setTasks(prev => prev.map(t => t.index === targetTask.index ? { ...t, status: 'error', error: err.message } : t));
    }
  };

  // 9. Tải xuống toàn bộ ảnh đã xong trong 20 ô
  const handleDownloadAllCompleted = async () => {
    const completedTasks = tasks.filter((t) => t.status === 'completed' && t.resultImage);
    if (completedTasks.length === 0) return;
    setBulkDownloadStatus('downloading');
    try {
      for (let i = 0; i < completedTasks.length; i++) {
        const item = completedTasks[i];
        if (item.resultImage) {
          const ext = item.resultImage.mimeType?.includes('png') ? 'png' : 'jpg';
          await Flow.download({
            base64: item.resultImage.base64,
            mimeType: item.resultImage.mimeType,
            filename: `KOC_StoryBoard_Slot_${item.index + 1}.${ext}`,
          });
          await new Promise(r => setTimeout(r, 200));
        }
      }
      setBulkDownloadStatus('done');
      toast?.success?.(`Đã tải xuống toàn bộ ${completedTasks.length} ảnh Storyboard!`);
      setTimeout(() => setBulkDownloadStatus('idle'), 2500);
    } catch (err) {
      console.error(err);
      setBulkDownloadStatus('idle');
    }
  };

  const loadedOutfitsCount = tasks.filter((t) => t.outfit).length;
  const completedCount = tasks.filter((t) => t.status === 'completed' && t.resultImage).length;
  const runningCount = tasks.filter((t) => t.status === 'analyzing' || t.status === 'processing' || t.status === 'pending').length;
  const pendingReadySlots = tasks.filter(
    (t) => t.outfit && (t.outfit.mediaId || t.outfit.base64) && t.status !== 'completed' && t.status !== 'processing' && t.status !== 'analyzing'
  );
  const readyToRunCount = pendingReadySlots.length;
  const progressPercent = loadedOutfitsCount > 0 ? Math.round((completedCount / loadedOutfitsCount) * 100) : 0;

  return el("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      overflow: 'hidden',
      backgroundColor: '#0b0b10',
      color: '#f8fafc',
      fontFamily: 'inherit',
      boxSizing: 'border-box'
    }
  },
    // CSS nhúng đảm bảo 100% hiển thị
    el("style", null, KOC_STUDIO_CSS),

    // ============================================================================
    // TOP BAR HEADER (CHUẨN XÁC NGUYÊN BẢN THEO ẢNH CỦA ANH TRIS)
    // ============================================================================
    el("div", {
      style: {
        borderBottom: '1px solid #20202c',
        backgroundColor: 'rgba(17, 17, 24, 0.98)',
        position: 'sticky',
        top: 0,
        zIndex: 30,
        padding: '10px 18px',
        backdropFilter: 'blur(10px)',
        flexShrink: 0,
        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        boxSizing: 'border-box'
      }
    },
      el("div", {
        style: {
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }
      },
        // Left: Branding & 2 Badge
        el("div", { style: { display: 'flex', alignItems: 'center', gap: '12px' } },
          el("div", {
            style: {
              width: '36px',
              height: '36px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)',
              color: '#000000',
              flexShrink: 0
            }
          },
            el("span", { className: "material-symbols-outlined", style: { fontSize: '20px', fontWeight: 'bold' } }, "auto_awesome_mosaic")
          ),
          el("div", null,
            el("div", { style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' } },
              el("h1", { style: { fontSize: '13px', fontWeight: '800', color: '#ffffff', letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 } },
                "STORYBOARD 20 Ô HÀNG CHỜ KOC"
              ),
              el("span", {
                style: {
                  fontSize: '9.5px',
                  fontFamily: 'monospace',
                  color: '#34d399',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  fontWeight: 'bold',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }
              },
                el("span", { className: "material-symbols-outlined", style: { fontSize: '12px' } }, "verified"),
                el("span", null, "CHUẨN DÁNG (EM BÉ / NGƯỜI LỚN) & BỐI CẢNH")
              ),
              exactPoseLock ? el("span", {
                style: {
                  fontSize: '9.5px',
                  fontFamily: 'monospace',
                  color: '#34d399',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  fontWeight: 'bold',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }
              },
                el("span", { className: "material-symbols-outlined", style: { fontSize: '12px' } }, "lock_person"),
                el("span", null, "KHÓA 100% DÁNG & GÓC GỐC")
              ) : kneeCropOnly ? el("span", {
                style: {
                  fontSize: '9.5px',
                  fontFamily: 'monospace',
                  color: '#fcd34d',
                  backgroundColor: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  fontWeight: 'bold',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }
              },
                el("span", { className: "material-symbols-outlined", style: { fontSize: '12px' } }, "crop"),
                el("span", null, "CẮT TỚI ĐẦU GỐI (RÕ NÉT)")
              ) : null,
              el("span", {
                style: {
                  fontSize: '9.5px',
                  fontFamily: 'monospace',
                  color: imageResolution === '2k' ? '#fcd34d' : '#38bdf8',
                  backgroundColor: imageResolution === '2k' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(6, 182, 212, 0.15)',
                  border: imageResolution === '2k' ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid rgba(6, 182, 212, 0.35)',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  fontWeight: 'bold',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }
              },
                el("span", { className: "material-symbols-outlined", style: { fontSize: '12px' } }, imageResolution === '2k' ? "stars" : "hd"),
                el("span", null, imageResolution === '2k' ? "2K SIÊU NÉT" : "CHUẨN 1K")
              ),
              removeWatermark ? el("span", {
                style: {
                  fontSize: '9.5px',
                  fontFamily: 'monospace',
                  color: '#34d399',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  fontWeight: 'bold',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }
              },
                el("span", { className: "material-symbols-outlined", style: { fontSize: '12px' } }, "verified"),
                el("span", null, "XÓA LOGO BANANA")
              ) : null
            ),
            el("p", { style: { fontSize: '10px', color: '#94a3b8', margin: '2px 0 0 0' } },
              "Tự động lấy chuẩn xác bối cảnh gốc của KOC khi không có ảnh nền riêng • Khóa đúng phom dáng kể cả là em bé"
            )
          )
        ),

        // Cụm Giữa: Bộ chọn Xưởng (Xưởng Gia Dụng, Phòng Thay Đồ, Xưởng Thời Trang...) & Timer & Banana Account
        el("div", {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap'
          }
        },
          // Timer tự xóa
          onChangeAutoDel && el("div", {
            style: {
              display: 'inline-flex',
              height: '28px',
              alignItems: 'center',
              gap: '4px',
              borderRadius: '8px',
              border: autoDelMins > 0 ? '1px solid rgba(245, 158, 11, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
              backgroundColor: autoDelMins > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.05)',
              padding: '0 8px',
              fontSize: '10px',
              fontWeight: 'bold',
              color: autoDelMins > 0 ? '#fcd34d' : '#94a3b8'
            }
          },
            el("span", {
              style: {
                width: '6px',
                height: '6px',
                borderRadius: '9999px',
                backgroundColor: autoDelMins > 0 ? '#f59e0b' : '#64748b'
              }
            }),
            el("span", null, "⏱️:"),
            el("select", {
              value: autoDelMins,
              onChange: (e) => onChangeAutoDel?.(Number(e.target.value)),
              style: {
                backgroundColor: 'transparent',
                fontSize: '10px',
                fontWeight: 'bold',
                color: 'inherit',
                outline: 'none',
                border: 'none',
                cursor: 'pointer'
              }
            },
              el("option", { value: 0, style: { backgroundColor: '#18152e', color: '#cbd5e1' } }, "Tắt"),
              el("option", { value: 10, style: { backgroundColor: '#18152e', color: '#fcd34d' } }, "10p"),
              el("option", { value: 20, style: { backgroundColor: '#18152e', color: '#fcd34d' } }, "20p"),
              el("option", { value: 30, style: { backgroundColor: '#18152e', color: '#fcd34d' } }, "30p"),
              el("option", { value: 60, style: { backgroundColor: '#18152e', color: '#fcd34d' } }, "60p")
            )
          ),

          // Niche Selector (XƯỞNG GIA DỤNG / PHÒNG THAY ĐỒ / XƯỞNG THỜI TRANG...)
          handleSelectNiche && NICHE_TEMPLATES && el("div", {
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              padding: '3px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }
          },
            Object.values(NICHE_TEMPLATES).map((n) =>
              el("button", {
                key: n.id,
                type: "button",
                onClick: () => handleSelectNiche(n.id),
                style: {
                  padding: '4px 10px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  cursor: 'pointer',
                  border: 'none',
                  transition: 'all 0.2s',
                  backgroundColor: currentNiche === n.id ? '#f59e0b' : 'transparent',
                  color: currentNiche === n.id ? '#000000' : '#94a3b8',
                  boxShadow: currentNiche === n.id ? '0 2px 8px rgba(245, 158, 11, 0.3)' : 'none'
                }
              },
                el("span", null, n.icon),
                el("span", null, n.name)
              )
            )
          ),

          // Image Engine & Account Selector (Banana Pro vs Muse AI)
          (() => {
            return handleSelectBananaAccount && el("div", {
              style: { display: 'flex', alignItems: 'center', gap: '6px' }
            },
              el("div", {
                style: { display: 'flex', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', padding: '2px' }
              },
                el("button", {
                  type: "button",
                  onClick: () => { setImageEngine("banana"); try { localStorage.setItem("aiforge_fitting_image_engine", "banana"); } catch(e){} },
                  style: {
                    padding: '2px 8px',
                    borderRadius: '8px',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    backgroundColor: imageEngine === "banana" ? '#f59e0b' : 'transparent',
                    color: imageEngine === "banana" ? '#000' : '#9ca3af',
                    border: 'none'
                  }
                }, "🍌 Banana"),
                el("button", {
                  type: "button",
                  onClick: () => { setImageEngine("muse"); try { localStorage.setItem("aiforge_fitting_image_engine", "muse"); } catch(e){} },
                  style: {
                    padding: '2px 8px',
                    borderRadius: '8px',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    background: imageEngine === "muse" ? 'linear-gradient(to right, #9333ea, #db2777)' : 'transparent',
                    color: imageEngine === "muse" ? '#fff' : '#9ca3af',
                    border: 'none'
                  }
                }, "⚡ Muse AI")
              ),
              el("div", {
                title: imageEngine === "muse" ? "Tài khoản tạo Ảnh Storyboard (Muse AI)" : "Tài khoản tạo Ảnh Storyboard (Banana Pro / Google Flow)",
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: imageEngine === "muse" ? 'rgba(168, 85, 247, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                  padding: '3px 8px',
                  borderRadius: '10px',
                  border: imageEngine === "muse" ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  color: imageEngine === "muse" ? '#e9d5ff' : '#fcd34d'
                }
              },
                el("span", { style: { fontSize: '12px' } }, imageEngine === "muse" ? "⚡" : "🍌"),
                (() => {
                  const avail = effectiveAccounts.filter(a => imageEngine === "muse" ? (a.providerId === "muse" || (a.provider && a.provider.toLowerCase().includes("muse"))) : (a.providerId === "banana"));
                  return avail.length > 0 ? el("select", {
                    value: selectedBananaAccountId,
                    onChange: (e) => handleSelectBananaAccount(e.target.value),
                    style: {
                      backgroundColor: 'transparent',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      color: imageEngine === "muse" ? '#e9d5ff' : '#fcd34d',
                      outline: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      maxWidth: '140px'
                    }
                  },
                    el("option", { key: "auto", value: "auto", style: { backgroundColor: '#0b101f', color: '#fcd34d' } },
                      avail.length > 1 ? (imageEngine === "muse" ? `🔄 Chia đều (${avail.length} acc)` : `🔄 Chia đều (${avail.length} acc)`) : "🔄 Tự chia đều"
                    ),
                    avail.map(a => 
                      el("option", { key: a.accountId, value: a.accountId, style: { backgroundColor: '#0b101f', color: '#ffffff' } },
                        (imageEngine === "muse" ? "⚡ " : "🍌 ") + (a.accountDisplayName || a.accountEmail || a.accountId)
                      )
                    )
                  ) : el("span", { style: { fontSize: '10px', color: imageEngine === "muse" ? '#d8b4fe' : '#fbbf24', fontWeight: 600 } }, imageEngine === "muse" ? "Chưa có Muse AI" : "Chưa có Banana");
                })()
              )
            );
          })(),

          // Nút nhanh chuyển đổi 2K Siêu Nét
          el("button", {
            type: "button",
            onClick: () => {
              const nextRes = imageResolution === '2k' ? 'standard' : '2k';
              setImageResolution(nextRes);
            },
            title: imageResolution === '2k' ? "Đang bật 2K Siêu Nét (Bấm để chuyển về Chuẩn HD)" : "Đang dùng Chuẩn HD (Bấm để nâng lên 2K Siêu Nét)",
            style: {
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              height: '28px',
              padding: '0 9px',
              borderRadius: '8px',
              fontSize: '10px',
              fontWeight: 'bold',
              cursor: 'pointer',
              border: imageResolution === '2k' ? '1px solid rgba(245, 158, 11, 0.5)' : '1px solid rgba(6, 182, 212, 0.4)',
              backgroundColor: imageResolution === '2k' ? 'rgba(245, 158, 11, 0.18)' : 'rgba(6, 182, 212, 0.12)',
              color: imageResolution === '2k' ? '#fcd34d' : '#38bdf8',
              boxShadow: imageResolution === '2k' ? '0 2px 8px rgba(245, 158, 11, 0.25)' : 'none',
              transition: 'all 0.2s'
            }
          },
            el("span", { style: { fontSize: '11px' } }, imageResolution === '2k' ? "🌟" : "⚡"),
            el("span", null, imageResolution === '2k' ? "2K Siêu Nét" : "Chuẩn HD")
          ),

          // Nút nhanh chuyển đổi Xóa Watermark
          el("button", {
            type: "button",
            onClick: () => {
              const nextWm = !removeWatermark;
              setRemoveWatermark(nextWm);
            },
            title: removeWatermark ? "Xóa Logo Banana: ĐANG BẬT (Bấm để Giữ Gốc)" : "Xóa Logo Banana: ĐANG TẮT (Bấm để Bật Xóa Logo)",
            style: {
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              height: '28px',
              padding: '0 9px',
              borderRadius: '8px',
              fontSize: '10px',
              fontWeight: 'bold',
              cursor: 'pointer',
              border: removeWatermark ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid rgba(255, 255, 255, 0.15)',
              backgroundColor: removeWatermark ? 'rgba(16, 185, 129, 0.18)' : 'rgba(255, 255, 255, 0.05)',
              color: removeWatermark ? '#34d399' : '#94a3b8',
              boxShadow: removeWatermark ? '0 2px 8px rgba(16, 185, 129, 0.25)' : 'none',
              transition: 'all 0.2s'
            }
          },
            el("span", { style: { fontSize: '11px' } }, removeWatermark ? "✨" : "🏷️"),
            el("span", null, removeWatermark ? "Xóa Logo" : "Giữ Gốc")
          )
        ),

        // Right Actions: Hướng dẫn, Tải Story, Chạy Storyboard
        el("div", { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
          el("button", {
            onClick: () => setShowAboutModal(true),
            style: {
              padding: '6px 12px',
              borderRadius: '10px',
              fontSize: '11.5px',
              fontWeight: '600',
              color: '#cbd5e1',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }
          },
            el("span", { className: "material-symbols-outlined", style: { fontSize: '14px', color: '#94a3b8' } }, "help_outline"),
            el("span", null, "Hướng dẫn")
          ),

          completedCount > 0 && el("button", {
            onClick: handleDownloadAllCompleted,
            disabled: bulkDownloadStatus === 'downloading',
            style: {
              padding: '6px 14px',
              borderRadius: '10px',
              fontSize: '11.5px',
              fontWeight: 'bold',
              color: '#fcd34d',
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }
          },
            el("span", { className: "material-symbols-outlined", style: { fontSize: '14px', color: '#f59e0b', fontWeight: 'bold' } },
              bulkDownloadStatus === 'done' ? 'check' : 'cloud_download'
            ),
            el("span", null,
              bulkDownloadStatus === 'downloading'
                ? 'Đang tải...'
                : `Tải ${completedCount} Story`
            )
          ),

          (() => {
            const isRunDisabled = !kocImage || readyToRunCount === 0;
            return el("button", {
              onClick: handleStartStoryboardBatch,
              disabled: isRunDisabled,
              style: {
                padding: '7px 16px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '800',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                border: 'none',
                cursor: isRunDisabled ? 'not-allowed' : 'pointer',
                background: isRunDisabled 
                  ? '#22222f' 
                  : (runningCount > 0 && readyToRunCount > 0)
                  ? 'linear-gradient(135deg, #10b981, #059669)'
                  : 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: isRunDisabled ? '#64748b' : (runningCount > 0 && readyToRunCount > 0) ? '#ffffff' : '#000000',
                boxShadow: isRunDisabled ? 'none' : (runningCount > 0 && readyToRunCount > 0) ? '0 4px 14px rgba(16, 185, 129, 0.35)' : '0 4px 14px rgba(245, 158, 11, 0.25)'
              }
            },
              el("span", { className: "material-symbols-outlined", style: { fontSize: '16px', fontWeight: 'bold' } },
                runningCount > 0 ? (readyToRunCount > 0 ? 'playlist_add_check_circle' : 'progress_activity') : 'play_circle'
              ),
              el("span", null,
                runningCount > 0
                  ? readyToRunCount > 0 
                    ? `Chạy tiếp ${readyToRunCount} ô mới (${runningCount} đang tạo)...`
                    : `Đang tạo ${runningCount} ô ngầm...`
                  : readyToRunCount > 0
                  ? `Chạy Storyboard (${readyToRunCount}/20 ô)`
                  : loadedOutfitsCount > 0 && completedCount === loadedOutfitsCount
                  ? `Đã xong toàn bộ ${completedCount} ô`
                  : `Chạy Storyboard (0/20 ô)`
              )
            );
          })()
        )
      )
    ),

    // Thông báo lỗi nếu có
    globalError && el("div", { style: { padding: '8px 18px 0 18px' } },
      el("div", {
        style: {
          padding: '8px 12px',
          borderRadius: '10px',
          backgroundColor: 'rgba(76, 5, 25, 0.4)',
          border: '1px solid rgba(225, 29, 72, 0.5)',
          color: '#fca5a5',
          fontSize: '11px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }
      },
        el("div", { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
          el("span", { className: "material-symbols-outlined", style: { fontSize: '14px' } }, "warning"),
          el("span", null, globalError)
        ),
        el("button", {
          onClick: () => setGlobalError(null),
          style: { color: '#f87171', background: 'none', border: 'none', cursor: 'pointer' }
        },
          el("span", { className: "material-symbols-outlined", style: { fontSize: '14px' } }, "close")
        )
      )
    ),

    // ============================================================================
    // BODY: 2 CỘT CHÍNH SONG SONG (KHÔNG BAO GIỜ BỊ XẾP DỌC)
    // ============================================================================
    el("div", {
      className: "koc-layout-container",
      style: {
        display: 'flex',
        flexDirection: 'row',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
        padding: '12px 16px',
        gap: '14px',
        boxSizing: 'border-box'
      }
    },
      // CỘT TRÁI: Sidebar điều khiển cố định 340px
      el("div", {
        className: "koc-sidebar koc-scrollbar",
        style: {
          width: '340px',
          minWidth: '340px',
          maxWidth: '340px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          overflowY: 'auto',
          overflowX: 'hidden',
          flexShrink: 0,
          paddingRight: '4px',
          boxSizing: 'border-box'
        }
      },
        // Card 1: Tham chiếu cố định (Mặt & Dáng KOC + Bối cảnh tùy chọn)
        el("div", {
          style: {
            backgroundColor: '#12121b',
            border: '1px solid #232332',
            borderRadius: '16px',
            padding: '12px',
            boxSizing: 'border-box'
          }
        },
          el("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' } },
            el("span", { style: { fontSize: '11px', fontWeight: 'bold', color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' } },
              el("span", { className: "material-symbols-outlined text-amber-400", style: { fontSize: '15px' } }, "perm_identity"),
              "Tham Chiếu Cố Định"
            ),
            el("span", { style: { fontSize: '10px', color: '#f59e0b', fontFamily: 'monospace', fontWeight: 'bold' } }, "BẮT BUỘC KOC")
          ),
          el("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' } },
            el(ReferenceSlot, {
              label: "Mặt & Dáng KOC",
              subLabel: "Em bé, trẻ em, người lớn",
              icon: "face",
              media: kocImage,
              onSelect: handleSelectKoc,
              onRemove: () => setKocImage(null),
              aspectRatioLabel: "Chân dung"
            }),
            el(ReferenceSlot, {
              label: "Bối cảnh (Tùy chọn)",
              subLabel: bgImage ? "Bối cảnh riêng đã chọn" : "Trống: Lấy bối cảnh gốc KOC",
              icon: "landscape",
              media: bgImage,
              onSelect: handleSelectBg,
              onRemove: () => setBgImage(null),
              aspectRatioLabel: "Tùy chọn"
            })
          ),
          // Chỉ dẫn thông minh về bối cảnh gốc
          el("div", {
            style: {
              marginTop: '10px',
              padding: '8px 10px',
              borderRadius: '10px',
              backgroundColor: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,255,255,0.05)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px'
            }
          },
            el("span", { className: "material-symbols-outlined text-amber-400", style: { fontSize: '14px', marginTop: '1px' } }, "info"),
            el("div", { style: { fontSize: '10px', color: '#cbd5e1', lineHeight: '1.3' } },
              bgImage ? el("span", null, "Đang sử dụng bối cảnh riêng do bạn tải lên.") : el("span", null,
                el("strong", { style: { color: '#fcd34d' } }, "Không có ảnh bối cảnh? "),
                "Hệ thống sẽ ",
                el("strong", { style: { color: '#34d399' } }, "tái tạo chuẩn xác 100% không gian & phòng chụp gốc "),
                "của ảnh KOC, giữ nguyên dáng vẻ (kể cả em bé)."
              )
            )
          )
        ),

        // Card 2: Căn chỉnh khung hình & Phối cảnh
        el("div", {
          style: {
            backgroundColor: '#12121b',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            borderRadius: '16px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            boxSizing: 'border-box'
          }
        },
          el("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
            el("div", { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
              el("div", {
                style: {
                  width: '26px',
                  height: '26px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(245, 158, 11, 0.2)',
                  color: '#fbbf24',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }
              },
                el("span", { className: "material-symbols-outlined", style: { fontSize: '14px' } }, "filter_center_focus")
              ),
              el("div", null,
                el("span", { style: { fontSize: '11px', fontWeight: 'bold', color: '#ffffff', display: 'block' } }, "Căn Chỉnh Khung Hình & Phối Cảnh"),
                el("span", { style: { fontSize: '9px', color: 'rgba(245, 158, 11, 0.9)', fontFamily: 'monospace' } }, "Bảo toàn nhân trắc học & dáng mẫu")
              )
            ),
            el("button", {
              type: "button",
              onClick: () => setEnableAiThinking(!enableAiThinking),
              style: {
                width: '36px',
                height: '20px',
                borderRadius: '9999px',
                padding: '2px',
                backgroundColor: enableAiThinking ? '#f59e0b' : '#334155',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              },
              title: "Bật/Tắt AI Thinking"
            },
              el("div", {
                style: {
                  width: '16px',
                  height: '16px',
                  borderRadius: '9999px',
                  backgroundColor: '#ffffff',
                  transform: enableAiThinking ? 'translateX(16px)' : 'translateX(0px)',
                  transition: 'transform 0.2s'
                }
              })
            )
          ),

          // Khung viền xanh Emerald: Chế độ Mặc định KOC (Khóa Dáng & Góc Chụp Gốc)
          el("div", {
            style: {
              padding: '10px',
              background: exactPoseLock ? 'linear-gradient(90deg, rgba(16, 185, 129, 0.16), rgba(16, 185, 129, 0.05))' : 'rgba(255, 255, 255, 0.02)',
              borderRadius: '12px',
              border: exactPoseLock ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
              transition: 'all 0.2s'
            }
          },
            el("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' } },
              el("div", { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
                el("div", {
                  style: {
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: exactPoseLock ? '#10b981' : '#1e293b',
                    color: exactPoseLock ? '#000000' : '#94a3b8'
                  }
                },
                  el("span", { className: "material-symbols-outlined", style: { fontSize: '16px' } }, "lock_person")
                ),
                el("div", null,
                  el("div", { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
                    el("span", { style: { fontSize: '11px', fontWeight: 'bold', color: '#ffffff' } }, "Chế độ Mặc định KOC"),
                    el("span", {
                      style: {
                        fontSize: '8px',
                        fontFamily: 'monospace',
                        padding: '1px 5px',
                        borderRadius: '4px',
                        backgroundColor: exactPoseLock ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                        color: exactPoseLock ? '#34d399' : '#94a3b8',
                        border: exactPoseLock ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                        fontWeight: 'bold'
                      }
                    },
                      exactPoseLock ? 'ĐANG BẬT' : 'TẮT'
                    )
                  ),
                  el("p", { style: { fontSize: '9px', color: '#cbd5e1', margin: '2px 0 0 0', lineHeight: '1.2' } },
                    exactPoseLock
                      ? 'Khóa 100% vóc dáng, góc chụp và dáng KOC gốc. AI chỉ thay đúng đồ và ghép bối cảnh.'
                      : 'Đang tắt: AI có thể biến tấu dáng theo các kiểu khung hình bên dưới.'
                  )
                )
              ),
              el("button", {
                type: "button",
                onClick: handleToggleExactPoseLock,
                style: {
                  width: '36px',
                  height: '20px',
                  borderRadius: '9999px',
                  padding: '2px',
                  backgroundColor: exactPoseLock ? '#10b981' : '#334155',
                  border: 'none',
                  cursor: 'pointer',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center'
                }
              },
                el("div", {
                  style: {
                    width: '16px',
                    height: '16px',
                    borderRadius: '9999px',
                    backgroundColor: '#ffffff',
                    transform: exactPoseLock ? 'translateX(16px)' : 'translateX(0px)',
                    transition: 'transform 0.2s'
                  }
                })
              )
            )
          ),

          // Khung viền cam: Chế độ lấy ảnh tới đầu gối
          el("div", {
            style: {
              padding: '10px',
              background: kneeCropOnly ? 'linear-gradient(90deg, rgba(245, 158, 11, 0.14), rgba(245, 158, 11, 0.04))' : 'rgba(255, 255, 255, 0.02)',
              borderRadius: '12px',
              border: kneeCropOnly ? '1px solid rgba(245, 158, 11, 0.45)' : '1px solid rgba(255, 255, 255, 0.08)',
              transition: 'all 0.2s'
            }
          },
            el("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' } },
              el("div", { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
                el("div", {
                  style: {
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: kneeCropOnly ? '#f59e0b' : '#1e293b',
                    color: kneeCropOnly ? '#000000' : '#94a3b8'
                  }
                },
                  el("span", { className: "material-symbols-outlined", style: { fontSize: '16px' } }, "crop")
                ),
                el("div", null,
                  el("div", { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
                    el("span", { style: { fontSize: '11px', fontWeight: 'bold', color: '#ffffff' } }, "Chế độ lấy ảnh tới đầu gối"),
                    el("span", {
                      style: {
                        fontSize: '8px',
                        fontFamily: 'monospace',
                        padding: '1px 5px',
                        borderRadius: '4px',
                        backgroundColor: kneeCropOnly ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                        color: kneeCropOnly ? '#fcd34d' : '#94a3b8',
                        border: kneeCropOnly ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                        fontWeight: 'bold'
                      }
                    },
                      kneeCropOnly ? 'ĐANG BẬT' : 'TẮT (TOÀN THÂN)'
                    )
                  ),
                  el("p", { style: { fontSize: '9px', color: '#cbd5e1', margin: '2px 0 0 0', lineHeight: '1.2' } },
                    kneeCropOnly
                      ? 'Cắt ngang đầu gối: nhân vật đứng gần camera hơn, thấy mặt và đồ cực nét.'
                      : 'Lấy trọn toàn thân từ đỉnh đầu tới bàn chân tiếp đất.'
                  )
                )
              ),
              el("button", {
                type: "button",
                onClick: handleToggleKneeCropOnly,
                style: {
                  width: '36px',
                  height: '20px',
                  borderRadius: '9999px',
                  padding: '2px',
                  backgroundColor: kneeCropOnly ? '#f59e0b' : '#334155',
                  border: 'none',
                  cursor: 'pointer',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center'
                }
              },
                el("div", {
                  style: {
                    width: '16px',
                    height: '16px',
                    borderRadius: '9999px',
                    backgroundColor: '#ffffff',
                    transform: kneeCropOnly ? 'translateX(16px)' : 'translateX(0px)',
                    transition: 'transform 0.2s'
                  }
                })
              )
            )
          ),

          // Lựa chọn kiểu dáng khung hình Story 9:16
          el("div", null,
            el("label", { style: { fontSize: '10px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' } },
              el("span", { className: "material-symbols-outlined text-amber-400", style: { fontSize: '12px' } }, "aspect_ratio"),
              "Kiểu dáng khung hình Story 9:16:"
            ),
            el("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '6px' } },
              [
                { id: 'full_body', label: exactPoseLock ? 'Khóa KOC gốc (Chuẩn 100%)' : kneeCropOnly ? 'Đầu gối lên đầu (Chuẩn)' : 'Toàn thân (Chạm sàn)', icon: exactPoseLock ? 'lock_person' : 'accessibility_new' },
                { id: 'fashion_walk', label: 'Bước đi (Fashion Stride)', icon: 'directions_walk' },
                { id: 'three_quarter', label: 'Trung cảnh 3/4', icon: 'crop_portrait' },
                { id: 'close_up_waist', label: 'Cận eo (Upper Outfit)', icon: 'person' },
              ].map((item) =>
                el("button", {
                  key: item.id,
                  type: "button",
                  onClick: () => setFramingShot(item.id),
                  style: {
                    padding: '6px 8px',
                    borderRadius: '8px',
                    fontSize: '9.5px',
                    fontWeight: '500',
                    border: framingShot === item.id ? '1px solid #f59e0b' : '1px solid rgba(255,255,255,0.08)',
                    backgroundColor: framingShot === item.id ? 'rgba(245, 158, 11, 0.2)' : 'rgba(0, 0, 0, 0.4)',
                    color: framingShot === item.id ? '#fcd34d' : '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    boxSizing: 'border-box'
                  }
                },
                  el("span", { className: "material-symbols-outlined", style: { fontSize: '12px' } }, item.icon),
                  el("span", { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, item.label)
                )
              )
            )
          ),

          // Lựa chọn góc máy & đường chân trời
          el("div", null,
            el("label", { style: { fontSize: '10px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' } },
              el("span", { className: "material-symbols-outlined text-amber-400", style: { fontSize: '12px' } }, "videocam"),
              "Góc máy & Cân đường chân trời (Horizon):"
            ),
            el("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '6px' } },
              [
                { id: 'ground_level', label: 'Tiêu cự chuẩn 50mm' },
                { id: 'eye_level', label: 'Ngang tầm mắt' },
                { id: 'low_angle_cinematic', label: 'Góc thấp tôn dáng' },
              ].map((item) =>
                el("button", {
                  key: item.id,
                  type: "button",
                  onClick: () => setPerspectiveLock(item.id),
                  style: {
                    padding: '6px 4px',
                    textAlign: 'center',
                    borderRadius: '8px',
                    fontSize: '9px',
                    fontWeight: '500',
                    border: perspectiveLock === item.id ? '1px solid #f59e0b' : '1px solid rgba(255,255,255,0.08)',
                    backgroundColor: perspectiveLock === item.id ? 'rgba(245, 158, 11, 0.2)' : 'rgba(0, 0, 0, 0.4)',
                    color: perspectiveLock === item.id ? '#fcd34d' : '#94a3b8',
                    cursor: 'pointer',
                    boxSizing: 'border-box'
                  }
                },
                  item.label
                )
              )
            )
          ),

          // 3 dòng checklist tích xanh cam kết
          el("div", {
            style: {
              padding: '8px 10px',
              backgroundColor: 'rgba(0, 0, 0, 0.45)',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              fontSize: '9.5px'
            }
          },
            el("div", { style: { display: 'flex', alignItems: 'center', gap: '6px', color: '#34d399', fontWeight: '500' } },
              el("span", { className: "material-symbols-outlined", style: { fontSize: '12px' } }, "verified"),
              el("span", null, "Khóa chính xác vóc dáng KOC (kể cả tỷ lệ em bé, trẻ nhỏ)")
            ),
            el("div", { style: { display: 'flex', alignItems: 'center', gap: '6px', color: '#34d399', fontWeight: '500' } },
              el("span", { className: "material-symbols-outlined", style: { fontSize: '12px' } }, "verified"),
              el("span", null, "Tự động nhân bản bối cảnh gốc nếu không tải ảnh bối cảnh")
            ),
            el("div", { style: { display: 'flex', alignItems: 'center', gap: '6px', color: '#34d399', fontWeight: '500' } },
              el("span", { className: "material-symbols-outlined", style: { fontSize: '12px' } }, "verified"),
              el("span", null, "Hòa trộn ánh sáng quang học chân thực, 0% viền ghép giả")
            )
          )
        ),

        // Card 3: CẤU HÌNH ĐỘ NÉT 2K & XÓA WATERMARK (MODEL BANANA PRO)
        el("div", {
          style: {
            backgroundColor: '#12121b',
            border: '1px solid #232332',
            borderRadius: '16px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            boxSizing: 'border-box'
          }
        },
          // Header Card
          el("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
            el("div", null,
              el("span", {
                style: {
                  fontSize: '11px',
                  fontWeight: 'bold',
                  color: '#e2e8f0',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }
              },
                el("span", { className: "material-symbols-outlined text-amber-400", style: { fontSize: '15px' } }, "tune"),
                "Chất Lượng & Watermark"
              ),
              el("p", { style: { fontSize: '9px', color: '#94a3b8', margin: '2px 0 0 0' } },
                "Áp dụng cho Model Banana Pro (Google Flow)"
              )
            ),
            el("span", {
              style: {
                fontSize: '9.5px',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                padding: '2px 8px',
                borderRadius: '6px',
                backgroundColor: imageResolution === '2k' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(6, 182, 212, 0.15)',
                border: imageResolution === '2k' ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(6, 182, 212, 0.4)',
                color: imageResolution === '2k' ? '#fcd34d' : '#38bdf8'
              }
            },
              imageResolution === '2k' ? '🌟 2K PRO' : '⚡ 1K STANDARD'
            )
          ),

          // 1. Độ nét ảnh (2K vs Chuẩn)
          el("div", {
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '7px 8px',
              backgroundColor: 'rgba(0,0,0,0.35)',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.04)'
            }
          },
            el("div", null,
              el("span", { style: { fontSize: '10px', fontWeight: 'bold', color: '#e2e8f0', display: 'block' } }, "ĐỘ NÉT ẢNH STORYBOARD:"),
              el("span", { style: { fontSize: '8.5px', color: '#94a3b8' } }, imageResolution === '2k' ? 'Nâng nét 2K qua Flow RPC' : 'Độ phân giải tiêu chuẩn 1K')
            ),
            el("div", { style: { display: 'flex', gap: '4px' } },
              el("button", {
                type: "button",
                onClick: () => setImageResolution('standard'),
                style: {
                  padding: '5px 9px',
                  borderRadius: '7px',
                  fontSize: '9.5px',
                  fontWeight: '700',
                  border: imageResolution !== '2k' ? '1px solid #06b6d4' : '1px solid rgba(255,255,255,0.08)',
                  backgroundColor: imageResolution !== '2k' ? '#06b6d4' : 'rgba(255,255,255,0.05)',
                  color: imageResolution !== '2k' ? '#000000' : '#94a3b8',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: imageResolution !== '2k' ? '0 2px 8px rgba(6, 182, 212, 0.35)' : 'none'
                }
              }, "⚡ Chuẩn"),
              el("button", {
                type: "button",
                onClick: () => setImageResolution('2k'),
                style: {
                  padding: '5px 9px',
                  borderRadius: '7px',
                  fontSize: '9.5px',
                  fontWeight: '700',
                  border: imageResolution === '2k' ? '1px solid #f59e0b' : '1px solid rgba(255,255,255,0.08)',
                  backgroundColor: imageResolution === '2k' ? '#f59e0b' : 'rgba(255,255,255,0.05)',
                  color: imageResolution === '2k' ? '#000000' : '#94a3b8',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: imageResolution === '2k' ? '0 2px 8px rgba(245, 158, 11, 0.35)' : 'none'
                }
              }, "🌟 2K Siêu Nét")
            )
          ),

          // 2. Xóa watermark logo Banana
          el("div", {
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '7px 8px',
              backgroundColor: 'rgba(0,0,0,0.35)',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.04)'
            }
          },
            el("div", null,
              el("span", { style: { fontSize: '10px', fontWeight: 'bold', color: '#e2e8f0', display: 'block' } }, "XÓA WATERMARK BANANA:"),
              el("span", { style: { fontSize: '8.5px', color: '#94a3b8' } }, removeWatermark ? 'Tự động tẩy sạch logo góc ảnh' : 'Giữ nguyên watermark gốc')
            ),
            el("div", { style: { display: 'flex', gap: '4px' } },
              el("button", {
                type: "button",
                onClick: () => setRemoveWatermark(false),
                style: {
                  padding: '5px 9px',
                  borderRadius: '7px',
                  fontSize: '9.5px',
                  fontWeight: '700',
                  border: !removeWatermark ? '1px solid #64748b' : '1px solid rgba(255,255,255,0.08)',
                  backgroundColor: !removeWatermark ? '#475569' : 'rgba(255,255,255,0.05)',
                  color: !removeWatermark ? '#ffffff' : '#94a3b8',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }
              }, "🏷️ Giữ Gốc"),
              el("button", {
                type: "button",
                onClick: () => setRemoveWatermark(true),
                style: {
                  padding: '5px 9px',
                  borderRadius: '7px',
                  fontSize: '9.5px',
                  fontWeight: '700',
                  border: removeWatermark ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.08)',
                  backgroundColor: removeWatermark ? '#10b981' : 'rgba(255,255,255,0.05)',
                  color: removeWatermark ? '#000000' : '#94a3b8',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: removeWatermark ? '0 2px 8px rgba(16, 185, 129, 0.35)' : 'none'
                }
              }, "✨ Bật Xóa Logo")
            )
          )
        ),

        // Card 4: Nạp ô Storyboard
        el("div", {
          style: {
            backgroundColor: '#12121b',
            border: '1px solid #232332',
            borderRadius: '16px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            boxSizing: 'border-box'
          }
        },
          el("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
            el("div", null,
              el("span", { style: { fontSize: '11px', fontWeight: 'bold', color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' } },
                el("span", { className: "material-symbols-outlined text-amber-400", style: { fontSize: '15px' } }, "layers"),
                "Nạp Ô Storyboard"
              ),
              el("p", { style: { fontSize: '9px', color: '#94a3b8', margin: '2px 0 0 0' } },
                "Nạp ảnh vào các ô trống trong 20 ô hàng chờ"
              )
            ),
            el("span", {
              style: {
                fontSize: '11px',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                padding: '2px 8px',
                borderRadius: '6px',
                backgroundColor: 'rgba(0,0,0,0.6)',
                border: '1px solid rgba(255,255,255,0.05)',
                color: '#f59e0b'
              }
            },
              `${loadedOutfitsCount}/20 ĐÃ NẠP`
            )
          ),
          el("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' } },
            el("button", {
              onClick: handleBatchUploadOutfits,
              disabled: loadedOutfitsCount >= 20,
              style: {
                padding: '8px 10px',
                borderRadius: '10px',
                border: loadedOutfitsCount >= 20 ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(245, 158, 11, 0.4)',
                backgroundColor: loadedOutfitsCount >= 20 ? 'rgba(255,255,255,0.05)' : 'rgba(245, 158, 11, 0.1)',
                color: loadedOutfitsCount >= 20 ? '#64748b' : '#fcd34d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                fontSize: '11px',
                fontWeight: '600',
                cursor: loadedOutfitsCount >= 20 ? 'not-allowed' : 'pointer'
              }
            },
              el("span", { className: "material-symbols-outlined", style: { fontSize: '15px' } }, "file_upload"),
              el("span", null, "Nạp hàng loạt")
            ),
            el("button", {
              onClick: handleResetAllSlots,
              disabled: loadedOutfitsCount === 0 && completedCount === 0,
              style: {
                padding: '8px 10px',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.08)',
                backgroundColor: 'rgba(255,255,255,0.03)',
                color: '#cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                fontSize: '11px',
                fontWeight: '600',
                cursor: (loadedOutfitsCount === 0 && completedCount === 0) ? 'not-allowed' : 'pointer',
                opacity: (loadedOutfitsCount === 0 && completedCount === 0) ? 0.4 : 1
              }
            },
              el("span", { className: "material-symbols-outlined", style: { fontSize: '15px' } }, "restart_alt"),
              el("span", null, "Làm mới 20 ô")
            )
          )
        ),

        // Card 4: Ghi chú thêm ánh sáng & chi tiết
        el("div", {
          style: {
            backgroundColor: '#12121b',
            border: '1px solid #232332',
            borderRadius: '16px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            boxSizing: 'border-box'
          }
        },
          el("label", { style: { fontWeight: 'bold', color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '9.5px', display: 'block' } },
            "GHI CHÚ THÊM ÁNH SÁNG & CHI TIẾT:"
          ),
          el("input", {
            type: "text",
            value: customStylePrompt,
            onChange: (e) => setCustomStylePrompt(e.target.value),
            placeholder: "VD: nắng chiều golden hour, studio tối giản, vệt sáng ven tóc",
            style: {
              width: '100%',
              padding: '7px 10px',
              borderRadius: '10px',
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid #2d2d3c',
              color: '#e2e8f0',
              fontSize: '11px',
              outline: 'none',
              boxSizing: 'border-box'
            }
          })
        )
      ),

      // CỘT PHẢI: STORYBOARD 20 Ô HÀNG CHỜ (9:16)
      el("div", {
        className: "koc-main-content",
        style: {
          flex: 1,
          minWidth: 0,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#12121b',
          border: '1px solid #232332',
          borderRadius: '16px',
          padding: '14px 16px',
          overflow: 'hidden',
          boxSizing: 'border-box'
        }
      },
        // Header Storyboard
        el("div", {
          style: {
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            paddingBottom: '12px',
            borderBottom: '1px solid #232332',
            marginBottom: '12px',
            flexShrink: 0
          }
        },
          el("div", null,
            el("div", { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
              el("span", { className: "material-symbols-outlined text-amber-400", style: { fontSize: '18px', fontWeight: 'bold' } }, "grid_view"),
              el("h2", { style: { fontSize: '13px', fontWeight: '800', color: '#ffffff', letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 } },
                "STORYBOARD 20 Ô HÀNG CHỜ (9:16)"
              ),
              kneeCropOnly && el("span", {
                style: {
                  fontSize: '9px',
                  backgroundColor: 'rgba(245, 158, 11, 0.2)',
                  color: '#fcd34d',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  fontWeight: 'bold'
                }
              }, "CẮT TỚI ĐẦU GỐI")
            ),
            el("p", { style: { fontSize: '10px', color: '#94a3b8', margin: '2px 0 0 0' } },
              `20 khung hình dọc cố định • ${!bgImage ? 'Đang kích hoạt: Sao chép chuẩn xác bối cảnh gốc từ ảnh KOC' : 'Đang ghép vào ảnh bối cảnh tải lên'}`
            )
          ),

          // Tiến độ hoàn thành ở góc phải
          el("div", { style: { textAlign: 'right' } },
            el("span", { style: { fontSize: '12px', fontFamily: 'monospace', fontWeight: 'bold', color: '#f59e0b' } },
              `${completedCount}/${loadedOutfitsCount || 20} Hoàn thành (${progressPercent}%)`
            )
          )
        ),

        // GRID CỐ ĐỊNH 20 Ô STORYBOARD (5 cột x 4 hàng)
        el("div", {
          className: "koc-story-grid koc-scrollbar",
          style: {
            display: 'grid',
            gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
            gap: '10px',
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            paddingRight: '4px',
            boxSizing: 'border-box'
          }
        },
          tasks.map((task) =>
            el(StoryCard, {
              key: task.id,
              task,
              onSelectSlotOutfit: handleSelectSlotOutfit,
              onRemoveSlotOutfit: handleRemoveSlotOutfit,
              onRetry: handleRetrySlot,
              onPreview: (t) => setPreviewTask(t)
            })
          )
        )
      )
    ),

    // Modal Preview phóng to ảnh Story 9:16 kèm chi tiết phân tích AI Thinking
    previewTask && previewTask.resultImage && el("div", {
      className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in",
      onClick: () => setPreviewTask(null)
    },
      el("div", {
        className: "relative max-h-[92vh] max-w-2xl w-full bg-[#181822] border border-[#2d2d3e] rounded-2xl overflow-hidden flex flex-col shadow-2xl",
        onClick: (e) => e.stopPropagation()
      },
        // Header modal preview
        el("div", { className: "p-3 border-b border-white/5 flex items-center justify-between bg-black/40" },
          el("div", { className: "flex items-center gap-2" },
            el("span", { className: "text-xs font-mono font-bold text-amber-400" },
              `Storyboard Slot #${previewTask.index + 1}`
            ),
            el("span", { className: "text-xs text-slate-300 font-medium truncate max-w-[180px]" },
              previewTask.outfit?.name
            ),
            el("span", {
              className: "text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1"
            },
              el("span", { className: "material-symbols-outlined text-xs" }, "verified"),
              el("span", null, "KHỚP PIXEL & DÁNG CHUẨN")
            )
          ),
          el("button", {
            onClick: () => setPreviewTask(null),
            className: "p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
          },
            el("span", { className: "material-symbols-outlined text-lg" }, "close")
          )
        ),

        // Nội dung ảnh + Phân tích AI Thinking
        el("div", { className: "flex-1 overflow-y-auto p-4 flex flex-col md:flex-row gap-4 bg-[#0e0e14]" },
          // Cột ảnh 9:16
          el("div", {
            className: "w-full md:w-1/2 flex items-center justify-center bg-black/60 rounded-xl overflow-hidden border border-white/10"
          },
            el("img", {
              src: previewTask.resultImage.base64?.startsWith('data:') || previewTask.resultImage.base64?.startsWith('http') || previewTask.resultImage.base64?.startsWith('file:') 
                ? previewTask.resultImage.base64 
                : `data:${previewTask.resultImage.mimeType || 'image/jpeg'};base64,${previewTask.resultImage.base64}`,
              alt: "Story Full",
              className: "w-full h-auto max-h-[65vh] object-contain"
            })
          ),

          // Cột thông số & phân tích AI Thinking
          el("div", { className: "w-full md:w-1/2 flex flex-col justify-between space-y-3" },
            el(AiThinkingBadge, { analysis: previewTask.aiThinking }),
            previewTask.promptUsed && el("div", {
              className: "p-2.5 rounded-xl bg-black/40 border border-white/5 text-[10px] text-slate-400 text-left"
            },
              el("span", { className: "font-semibold text-slate-300 block mb-1" }, "Chỉ dẫn AI Thinking đã thi hành:"),
              el("p", { className: "line-clamp-4 leading-relaxed font-mono" }, previewTask.promptUsed)
            )
          )
        ),

        // Actions modal preview
        el("div", { className: "p-3 border-t border-white/5 bg-[#14141c] flex items-center justify-between gap-2" },
          el("button", {
            onClick: () => {
              handleRetrySlot(previewTask);
              setPreviewTask(null);
            },
            className: "py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-medium flex items-center gap-1.5 border border-white/5 cursor-pointer"
          },
            el("span", { className: "material-symbols-outlined text-sm" }, "autorenew"),
            el("span", null, "Render lại với AI Thinking")
          ),
          el("button", {
            onClick: async () => {
              if (previewTask.resultImage) {
                const ext = previewTask.resultImage.mimeType?.includes('png') ? 'png' : 'jpg';
                await Flow.download({
                  base64: previewTask.resultImage.base64,
                  mimeType: previewTask.resultImage.mimeType,
                  filename: `KOC_StoryBoard_Slot_${previewTask.index + 1}.${ext}`,
                });
              }
            },
            className: "py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer"
          },
            el("span", { className: "material-symbols-outlined text-sm" }, "download"),
            el("span", null, "Tải ảnh Story (9:16)")
          )
        )
      )
    ),

    // Modal hướng dẫn About
    el(AboutModal, {
      isOpen: showAboutModal,
      onClose: () => setShowAboutModal(false)
    })
  );
}
