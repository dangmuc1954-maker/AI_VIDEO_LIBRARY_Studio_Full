const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const psScript = `
$w = New-Object -ComObject WScript.Shell
$s = $w.CreateShortcut('C:\\Users\\admin\\Desktop\\AIForge Studio.lnk')
Write-Output $s.TargetPath
`;
fs.writeFileSync('scripts/get_shortcut.ps1', psScript);
const out = execSync('powershell -ExecutionPolicy Bypass -File scripts/get_shortcut.ps1').toString().trim();
console.log('REAL_TARGET_EXE:', out);
try { fs.unlinkSync('scripts/get_shortcut.ps1'); } catch (_) {}
