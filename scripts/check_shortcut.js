const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const psScript = `
$wscript = New-Object -ComObject WScript.Shell
$lnk = $wscript.CreateShortcut("C:\\Users\\admin\\Desktop\\AIForge Studio.lnk")
Write-Output "TARGET:"
Write-Output $lnk.TargetPath
Write-Output "ARGS:"
Write-Output $lnk.Arguments
Write-Output "CWD:"
Write-Output $lnk.WorkingDirectory
`;

const res = execSync('powershell -NoProfile -Command -', { input: psScript }).toString();
console.log(res);
