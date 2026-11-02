const { execSync } = require('child_process');
const fs = require('fs');

try {
  const psScript = `
$w = New-Object -ComObject WScript.Shell
$sc = $w.CreateShortcut('C:\\Users\\admin\\Desktop\\AIForge Studio (Unlocked).lnk')
Write-Output "TARGET: $($sc.TargetPath)"
Write-Output "WORKING_DIR: $($sc.WorkingDirectory)"
Write-Output "ARGUMENTS: $($sc.Arguments)"
`;
  fs.writeFileSync('temp_resolve_lnk.ps1', psScript);
  const out = execSync('powershell -NoProfile -ExecutionPolicy Bypass -File temp_resolve_lnk.ps1').toString();
  console.log(out);
  fs.unlinkSync('temp_resolve_lnk.ps1');
} catch (e) {
  console.error('Error:', e);
}
