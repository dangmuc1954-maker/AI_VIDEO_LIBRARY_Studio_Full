const { execSync } = require('child_process');

try {
  const out = execSync('powershell "Get-Process -Name *AI*LIBRARY* -ErrorAction SilentlyContinue | Select-Object Id, ProcessName"', { encoding: 'utf8' });
  console.log('Running processes:', out.trim() || 'None');
} catch (e) {
  console.log('Error checking processes:', e.message);
}
