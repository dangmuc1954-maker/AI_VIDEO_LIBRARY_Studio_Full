const { execSync } = require('child_process');
const fs = require('fs');

const ps = `
$w = New-Object -ComObject WScript.Shell
Get-ChildItem -Path 'C:\\Users\\admin\\Desktop\\*.lnk' | ForEach-Object {
    $sc = $w.CreateShortcut($_.FullName)
    Write-Output "LNK: $($_.Name) -> $($sc.TargetPath)"
}
`;
fs.writeFileSync('temp_lnk.ps1', ps);
const out = execSync('powershell -NoProfile -ExecutionPolicy Bypass -File temp_lnk.ps1').toString();
console.log(out);
fs.unlinkSync('temp_lnk.ps1');
