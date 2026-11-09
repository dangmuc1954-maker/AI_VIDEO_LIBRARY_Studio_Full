#!/usr/bin/env node
/*
 * KHÓA LÕI GỌI MODEL (Model Core Guard)
 *
 * Đóng dấu (hash) các file lõi gọi model tạo ảnh / tạo video.
 * Nếu file lõi bị đổi mà Tris chưa duyệt -> báo lỗi, không cho đóng gói.
 * Đồng thời kiểm tra cú pháp toàn bộ file JS của app.
 *
 * Cách dùng:
 *   node scripts/guard_model_core.cjs                      Kiểm tra (chạy trước khi đóng gói)
 *   node scripts/guard_model_core.cjs --accept "lý do"     Chỉ chạy khi Tris ĐÃ DUYỆT sửa lõi
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const LOCK_FILE = path.join(__dirname, "model_core.lock.json");

// Lõi gọi model: hàng đợi, luân phiên tài khoản, gọi Veo3/Muse/Grok/Banana, lấy kết quả.
// Mọi studio đều dùng chung các file này -> sửa 1 chỗ là ảnh hưởng tất cả.
const CORE_FILES = [
  { file: "app/out/main/index.js", role: "Lõi chính: hàng đợi, luân phiên tài khoản, gọi model, tải kết quả" },
  { file: "app/out/main/google_flow_native_transport.cjs", role: "Kết nối Google Flow (Veo3)" },
  { file: "app/out/preload/index.cjs", role: "Cổng API window.aiforge / window.aivideo" },
  { file: "app/out/renderer/assets/useWorkflowRunner-DGw6Ekx4.js", role: "Bộ chạy workflow node" },
  { file: "app/out/renderer/assets/VideoStudio-frcr8V6s.js", role: "Studio Video" },
  { file: "app/out/renderer/assets/ImageStudio-4nmpUX3j.js", role: "Studio Ảnh" },
  { file: "app/out/renderer/assets/StudioFailedBulkActions-Zv2NpUPy.js", role: "Modal nhập prompt hàng loạt dùng chung" },
  { file: "app/out/renderer/assets/index-BS7vgKVV.js", role: "Store + router + menu (chỉ được thêm route/menu cho studio mới)" },
];

const sha = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
const hashFile = (rel) => {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return null;
  // Bỏ khác biệt xuống dòng CRLF/LF để không báo nhầm
  return sha(fs.readFileSync(abs, "utf8").replace(/\r\n/g, "\n"));
};

function readLock() {
  if (!fs.existsSync(LOCK_FILE)) return null;
  return JSON.parse(fs.readFileSync(LOCK_FILE, "utf8"));
}

function writeLock(reason, previous) {
  const files = {};
  for (const { file } of CORE_FILES) files[file] = hashFile(file);
  const history = (previous && previous.history) || [];
  history.push({ at: new Date().toISOString(), reason });
  fs.writeFileSync(LOCK_FILE, JSON.stringify({ files, history }, null, 2) + "\n", "utf8");
}

function syntaxCheck() {
  const dirs = ["app/out/main", "app/out/preload", "app/out/renderer/assets"];
  const bad = [];
  for (const d of dirs) {
    const abs = path.join(ROOT, d);
    if (!fs.existsSync(abs)) continue;
    for (const name of fs.readdirSync(abs)) {
      if (!/\.(c?js|mjs)$/.test(name)) continue; // bỏ qua .bak, .css...
      try {
        execFileSync(process.execPath, ["--check", path.join(abs, name)], { stdio: "pipe" });
      } catch (e) {
        bad.push(`${d}/${name}\n      ${String(e.stderr || e.message).split("\n").slice(0, 4).join("\n      ")}`);
      }
    }
  }
  return bad;
}

const args = process.argv.slice(2);
const acceptIdx = args.indexOf("--accept");
const lock = readLock();

if (acceptIdx !== -1) {
  const reason = (args[acceptIdx + 1] || "").trim();
  if (!reason) {
    console.error("❌ Cần ghi lý do: --accept \"Tris duyệt: sửa ... vì ...\"");
    process.exit(1);
  }
  writeLock(reason, lock);
  console.log("🔒 Đã đóng dấu lại lõi gọi model. Lý do: " + reason);
  process.exit(0);
}

if (!lock) {
  writeLock("Khởi tạo khóa lõi lần đầu", null);
  console.log("🔒 Lần đầu chạy: đã đóng dấu " + CORE_FILES.length + " file lõi gọi model.");
}

let failed = false;
const current = readLock();
const changed = CORE_FILES.filter(({ file }) => current.files[file] !== hashFile(file));
if (changed.length) {
  failed = true;
  console.error("\n⛔ LÕI GỌI MODEL ĐÃ BỊ SỬA (chưa được Tris duyệt):");
  for (const c of changed) console.error(`   - ${c.file}  →  ${c.role}`);
  console.error("\n   Thêm chức năng mới thì KHÔNG được sửa các file này.");
  console.error("   - Nếu sửa nhầm: hoàn tác bằng  git checkout -- <file>");
  console.error("   - Nếu Tris ĐÃ DUYỆT: node scripts/guard_model_core.cjs --accept \"lý do\"");
} else {
  console.log("✅ Lõi gọi model nguyên vẹn (" + CORE_FILES.length + " file).");
}

const bad = syntaxCheck();
if (bad.length) {
  failed = true;
  console.error("\n⛔ LỖI CÚ PHÁP JS:");
  for (const b of bad) console.error("   - " + b);
} else {
  console.log("✅ Toàn bộ file JS của app đúng cú pháp.");
}

process.exit(failed ? 1 : 0);
