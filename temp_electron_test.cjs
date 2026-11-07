
const { app, session } = require('electron');

app.whenReady().then(async () => {
  console.log('[ELECTRON TEST] Electron ready!');
  const dataDir = path.join(app.getPath('appData'), 'AI_VIDEO_LIBRARY_DATA');
  console.log('[ELECTRON TEST] Data dir:', dataDir);
  app.quit();
});
