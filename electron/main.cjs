const { app, BrowserWindow, shell } = require('electron');

const APP_URL = new URL('https://praisecyber-chatimall-frontend.vercel.app/');

function openExternalUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    console.error('Blocked an invalid external URL:', rawUrl);
    return;
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    console.error('Blocked an unsupported external URL protocol:', url.protocol);
    return;
  }

  shell.openExternal(url.href).catch((error) => {
    console.error('Could not open external URL:', error);
  });
}

async function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 760,
    minHeight: 560,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#f7f9f7',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    openExternalUrl(url);
    return { action: 'deny' };
  });

  window.webContents.on('will-navigate', (event, targetUrl) => {
    const target = new URL(targetUrl);
    if (target.origin === APP_URL.origin) return;

    event.preventDefault();
    openExternalUrl(targetUrl);
  });

  window.once('ready-to-show', () => window.show());
  await window.loadURL(APP_URL.href);
}

app.whenReady().then(async () => {
  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow().catch((error) => console.error('Could not create the Chatimall window:', error));
    }
  });
}).catch((error) => {
  console.error('Could not start Chatimall:', error);
  app.quit();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
