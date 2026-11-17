const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const { spawn } = require('child_process')
const path = require('path')
const http = require('http')

const isDev = !!process.env.ELECTRON_DEV
let backend = null
let win = null

/** Dossier du backend Python : ../backend en dev, resources/backend une fois packagé. */
function backendDir() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'backend')
    : path.join(__dirname, '..', '..', 'backend')
}

function startBackend() {
  const python = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3')
  backend = spawn(python, ['run.py'], { cwd: backendDir(), stdio: 'inherit' })
  backend.on('error', (err) => {
    dialog.showErrorBox(
      'Backend Python introuvable',
      `Impossible de lancer « ${python} run.py » :\n${err.message}\n\n` +
        'Installez Python 3.11+ et les dépendances (pip install -r backend/requirements.txt).'
    )
  })
}

function waitForBackend(retries = 60) {
  return new Promise((resolve, reject) => {
    const ping = (n) => {
      http
        .get('http://127.0.0.1:8000/api/health', (res) => (res.statusCode === 200 ? resolve() : retry(n)))
        .on('error', () => retry(n))
    }
    const retry = (n) => (n <= 0 ? reject(new Error('Le backend ne répond pas')) : setTimeout(() => ping(n - 1), 500))
    ping(retries)
  })
}

async function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1180,
    minHeight: 720,
    title: "Gestion de Caisse d'une Église",
    backgroundColor: '#EEF3FB',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) win.loadURL('http://localhost:5173')
  else win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
}

app.whenReady().then(async () => {
  startBackend()
  try {
    await waitForBackend()
  } catch (e) {
    dialog.showErrorBox('Erreur', e.message + '\nVérifiez votre fichier backend/.env (DATABASE_URL Supabase).')
  }
  await createWindow()
})

ipcMain.on('app:quit', () => app.quit())

function stopBackend() {
  if (backend && !backend.killed) backend.kill()
}
app.on('before-quit', stopBackend)
app.on('window-all-closed', () => {
  stopBackend()
  app.quit()
})
