import { app, BrowserWindow, ipcMain, safeStorage } from 'electron'
import { join } from 'node:path'
import { readFile, writeFile } from 'node:fs/promises'
import { LocalAIManager } from './local-ai.mjs'

let window
let localAI
const isDev = !app.isPackaged

async function createWindow() {
  window = new BrowserWindow({
    width: 1280, height: 820, minWidth: 900, minHeight: 640,
    backgroundColor: '#f5f5f3', titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: { preload: join(import.meta.dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  })
  if (isDev) await window.loadURL(process.env.SPEEDYAI_DEV_URL || 'http://127.0.0.1:5173')
  else await window.loadFile(join(app.getAppPath(), 'dist', 'index.html'))
}

function configPath() { return join(app.getPath('userData'), 'ai-provider.json') }
async function getProviderConfig() {
  try {
    const stored = JSON.parse(await readFile(configPath(), 'utf8'))
    if (stored.encryptedKey && safeStorage.isEncryptionAvailable()) stored.apiKey = safeStorage.decryptString(Buffer.from(stored.encryptedKey, 'base64'))
    delete stored.encryptedKey
    return stored
  } catch { return { type: 'local' } }
}
async function saveProviderConfig(config) {
  const stored = { ...config }
  if (stored.apiKey && safeStorage.isEncryptionAvailable()) stored.encryptedKey = safeStorage.encryptString(stored.apiKey).toString('base64')
  delete stored.apiKey
  await writeFile(configPath(), JSON.stringify(stored, null, 2))
  return getProviderConfig()
}

app.whenReady().then(async () => {
  localAI = new LocalAIManager({ appDataPath: app.getPath('userData'), resourcesPath: process.resourcesPath, emit: (channel, payload) => window?.webContents.send(channel, payload) })
  ipcMain.handle('local-ai:state', () => localAI.getState())
  ipcMain.handle('local-ai:install', (_, modelId) => localAI.install(modelId))
  ipcMain.handle('local-ai:cancel', () => localAI.cancelInstall())
  ipcMain.handle('local-ai:remove', () => localAI.remove())
  ipcMain.handle('local-ai:test', () => localAI.test())
  ipcMain.handle('local-ai:generate', (_, input) => localAI.generate(input))
  ipcMain.handle('provider:get', () => getProviderConfig())
  ipcMain.handle('provider:set', (_, config) => saveProviderConfig(config))
  ipcMain.handle('ai:generate', async (_, input) => {
    const localState = await localAI.getState()
    if (localState.status === 'installed' || localState.status === 'ready') return localAI.generate(input)
    const provider = await getProviderConfig()
    if (provider.type !== 'custom' || !provider.endpoint || !provider.model) throw new Error('Set up Local AI or configure another provider in Settings.')
    const endpoint = `${provider.endpoint.replace(/\/$/, '')}/chat/completions`
    const response = await fetch(endpoint, {
      method: 'POST', signal: AbortSignal.timeout(180000),
      headers: { 'content-type': 'application/json', ...(provider.apiKey ? { authorization: `Bearer ${provider.apiKey}` } : {}) },
      body: JSON.stringify({ model: provider.model, messages: [{ role: 'system', content: input.system }, { role: 'user', content: input.prompt }], max_tokens: input.maxTokens || 1200, temperature: input.temperature ?? .35 }),
    })
    if (!response.ok) throw new Error(`Provider request failed (${response.status}).`)
    const body = await response.json()
    return body.choices?.[0]?.message?.content || ''
  })
  await createWindow()
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('before-quit', (event) => {
  if (localAI?.child) { event.preventDefault(); localAI.stop().finally(() => { localAI = null; app.quit() }) }
})
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
