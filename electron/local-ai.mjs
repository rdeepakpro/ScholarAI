import { createHash } from 'node:crypto'
import { createReadStream, createWriteStream, existsSync } from 'node:fs'
import { mkdir, readFile, rename, rm, stat, statfs, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { MODEL_CATALOG, getModel } from './model-catalog.mjs'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function formatError(error) {
  return error instanceof Error ? error.message : String(error)
}

export class LocalAIManager {
  constructor({ appDataPath, resourcesPath, emit }) {
    this.modelsDir = join(appDataPath, 'models')
    this.statePath = join(this.modelsDir, 'local-ai.json')
    this.resourcesPath = resourcesPath
    this.emit = emit
    this.download = null
    this.child = null
    this.port = null
    this.serverStarting = null
    this.lastError = null
  }

  async readInstallRecord() {
    try { return JSON.parse(await readFile(this.statePath, 'utf8')) } catch { return null }
  }

  async getState() {
    const record = await this.readInstallRecord()
    const model = record ? getModel(record.modelId) : null
    const path = model ? join(this.modelsDir, model.fileName) : null
    const installed = Boolean(record?.verified && record?.ready && path && existsSync(path))
    let downloadedBytes = 0
    if (this.download) downloadedBytes = this.download.downloadedBytes
    else if (model) {
      try { downloadedBytes = (await stat(installed ? path : `${path}.part`)).size } catch { /* no partial file */ }
    }
    return {
      available: this.runtimeCandidates().some(existsSync),
      status: this.download ? 'downloading' : installed ? (this.child ? 'ready' : 'installed') : this.lastError ? 'error' : 'not-installed',
      modelId: model?.id || null,
      modelName: model?.displayName || null,
      modelPath: installed ? path : null,
      downloadedBytes,
      totalBytes: this.download?.totalBytes || model?.bytes || 0,
      error: this.lastError,
      catalog: MODEL_CATALOG,
    }
  }

  runtimeCandidates() {
    if (process.env.SPEEDYAI_LLAMA_SERVER) return [process.env.SPEEDYAI_LLAMA_SERVER]
    const platform = process.platform
    const arch = process.arch
    const executable = platform === 'win32' ? 'llama-server.exe' : 'llama-server'
    const base = join(this.resourcesPath, 'llama-runtime', `${platform}-${arch}`)
    return [join(base, 'accelerated', executable), join(base, 'cpu', executable), join(base, executable)]
  }

  runtimePath() {
    const path = this.runtimeCandidates().find(existsSync)
    if (!path) throw new Error('The local AI runtime is missing from this app build. Reinstall SpeedyAI.')
    return path
  }

  async ensureDiskSpace(model) {
    await mkdir(this.modelsDir, { recursive: true })
    const info = await statfs(this.modelsDir)
    const available = Number(info.bavail) * Number(info.bsize)
    const partial = await stat(join(this.modelsDir, `${model.fileName}.part`)).catch(() => ({ size: 0 }))
    const required = Math.max(0, model.bytes - partial.size) + 512 * 1024 * 1024
    if (available < required) throw new Error(`Not enough disk space. Free at least ${Math.ceil((required - available) / 1e9)} GB and try again.`)
    return available
  }

  async install(modelId) {
    if (this.download) throw new Error('A model download is already running.')
    const model = getModel(modelId)
    this.runtimePath()
    await this.stop()
    await this.ensureDiskSpace(model)
    await mkdir(this.modelsDir, { recursive: true })
    const finalPath = join(this.modelsDir, model.fileName)
    const partPath = `${finalPath}.part`
    if (existsSync(finalPath) && await this.hashFile(finalPath) === model.sha256) {
      const digest = model.sha256
      await writeFile(this.statePath, JSON.stringify({ modelId, verified: true, ready: false, sha256: digest, installedAt: new Date().toISOString() }, null, 2))
      try {
        await this.ensureServer(); await this.test()
        await writeFile(this.statePath, JSON.stringify({ modelId, verified: true, ready: true, sha256: digest, installedAt: new Date().toISOString() }, null, 2))
        this.lastError = null; this.emit('local-ai:progress', await this.getState()); return this.getState()
      } catch (error) { this.lastError = formatError(error); this.emit('local-ai:progress', await this.getState()); throw error }
    }
    let offset = (await stat(partPath).catch(() => ({ size: 0 }))).size
    if (offset > model.bytes) { await rm(partPath, { force: true }); offset = 0 }
    const controller = new AbortController()
    this.download = { controller, modelId, downloadedBytes: offset, totalBytes: model.bytes }
    this.lastError = null
    this.emit('local-ai:progress', await this.getState())
    try {
      const response = await fetch(model.url, { signal: controller.signal, headers: offset ? { Range: `bytes=${offset}-` } : {} })
      if (!(response.ok || response.status === 206) || !response.body) throw new Error(`Download failed with status ${response.status}.`)
      if (offset && response.status !== 206) { await rm(partPath, { force: true }); offset = 0; this.download.downloadedBytes = 0 }
      const totalHeader = response.headers.get('content-range')?.split('/').pop() || response.headers.get('content-length')
      const totalBytes = totalHeader ? Number(totalHeader) + (response.status === 206 ? 0 : offset) : model.bytes
      this.download.totalBytes = totalBytes
      const output = createWriteStream(partPath, { flags: offset ? 'a' : 'w' })
      const reader = response.body.getReader()
      let lastEmit = 0
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (!output.write(value)) await new Promise((resolve) => output.once('drain', resolve))
        this.download.downloadedBytes += value.byteLength
        if (Date.now() - lastEmit > 200) { lastEmit = Date.now(); this.emit('local-ai:progress', await this.getState()) }
      }
      await new Promise((resolve, reject) => output.end((error) => error ? reject(error) : resolve()))
      this.emit('local-ai:progress', { ...(await this.getState()), status: 'verifying' })
      const digest = await this.hashFile(partPath)
      if (digest !== model.sha256) { await rm(partPath, { force: true }); throw new Error('The downloaded model did not pass its safety check. It was not installed.') }
      await rename(partPath, finalPath)
      await writeFile(this.statePath, JSON.stringify({ modelId, verified: true, ready: false, sha256: digest, installedAt: new Date().toISOString() }, null, 2))
      this.download = null
      await this.ensureServer()
      await this.test()
      await writeFile(this.statePath, JSON.stringify({ modelId, verified: true, ready: true, sha256: digest, installedAt: new Date().toISOString() }, null, 2))
      this.emit('local-ai:progress', await this.getState())
      return this.getState()
    } catch (error) {
      this.download = null
      if (error?.name === 'AbortError') { this.emit('local-ai:progress', await this.getState()); return this.getState() }
      this.lastError = formatError(error)
      this.emit('local-ai:progress', await this.getState())
      throw error
    }
  }

  cancelInstall() {
    this.download?.controller.abort()
  }

  async hashFile(path) {
    const hash = createHash('sha256')
    for await (const chunk of createReadStream(path)) hash.update(chunk)
    return hash.digest('hex')
  }

  async remove() {
    const record = await this.readInstallRecord()
    await this.stop()
    this.cancelInstall()
    if (record) {
      const model = getModel(record.modelId)
      await rm(join(this.modelsDir, model.fileName), { force: true })
      await rm(join(this.modelsDir, `${model.fileName}.part`), { force: true })
    }
    await rm(this.statePath, { force: true })
    this.lastError = null
    return this.getState()
  }

  async freePort() {
    return new Promise((resolve, reject) => {
      const server = createServer()
      server.once('error', reject)
      server.listen(0, '127.0.0.1', () => {
        const address = server.address()
        server.close(() => resolve(address.port))
      })
    })
  }

  async ensureServer() {
    if (this.child && this.port && await this.health()) return
    if (this.serverStarting) return this.serverStarting
    this.serverStarting = this.startServer()
    try { await this.serverStarting } finally { this.serverStarting = null }
  }

  async startServer() {
    const record = await this.readInstallRecord()
    if (!record?.verified) throw new Error('Install Local AI first.')
    const model = getModel(record.modelId)
    const modelPath = join(this.modelsDir, model.fileName)
    if (!existsSync(modelPath)) throw new Error('The installed model file is missing. Reinstall Local AI.')
    this.port = await this.freePort()
    const runtime = this.runtimePath()
    const accelerated = runtime.includes(`${join('', 'accelerated')}`)
    const args = ['--model', modelPath, '--host', '127.0.0.1', '--port', String(this.port), '--ctx-size', '4096', '--parallel', '1', '--threads', String(Math.max(2, Math.min(8, Math.floor((process.availableParallelism?.() || 4) * .75))))]
    if (accelerated || process.platform === 'darwin') args.push('--n-gpu-layers', '99')
    this.child = spawn(runtime, args, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true })
    let output = ''
    const capture = (chunk) => { output = (output + chunk).slice(-4000) }
    this.child.stdout.on('data', capture)
    this.child.stderr.on('data', capture)
    this.child.once('error', (error) => capture(`\n${formatError(error)}`))
    const child = this.child
    this.child.once('exit', () => { if (this.child === child) { this.child = null; this.port = null } })
    const deadline = Date.now() + 90000
    while (Date.now() < deadline) {
      if (!this.child) {
        const detail = output.trim().split('\n').slice(-3).join(' ')
        throw new Error(`Local AI stopped while starting.${detail ? ` ${detail}` : ''}`)
      }
      if (await this.health()) return
      await new Promise((resolve) => setTimeout(resolve, 450))
    }
    await this.stop()
    throw new Error('Local AI took too long to start.')
  }

  async health() {
    if (!this.port) return false
    try { return (await fetch(`http://127.0.0.1:${this.port}/health`, { signal: AbortSignal.timeout(800) })).ok } catch { return false }
  }

  async test() {
    const text = await this.generate({ system: 'Reply with only the word Ready.', prompt: 'Confirm that you are ready.', maxTokens: 8 })
    if (!text.toLowerCase().includes('ready')) throw new Error('Local AI started, but its test response was unexpected. Try again.')
    return { ok: true, response: text }
  }

  async generate({ system, prompt, maxTokens = 1200, temperature = 0.35 }) {
    await this.ensureServer()
    const request = async () => fetch(`http://127.0.0.1:${this.port}/v1/chat/completions`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, signal: AbortSignal.timeout(180000),
      body: JSON.stringify({ model: 'local', messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }], temperature, max_tokens: maxTokens, stream: false }),
    })
    let response = await request()
    if (!response.ok) {
      await this.stop(); await this.ensureServer(); response = await request()
    }
    if (!response.ok) throw new Error(`Local AI generation failed (${response.status}).`)
    const body = await response.json()
    return body.choices?.[0]?.message?.content || ''
  }

  async stop() {
    const child = this.child
    this.child = null
    this.port = null
    if (!child) return
    let exited = child.exitCode !== null
    child.once('exit', () => { exited = true })
    child.kill('SIGTERM')
    await Promise.race([new Promise((resolve) => child.once('exit', resolve)), new Promise((resolve) => setTimeout(resolve, 2500))])
    if (!exited) child.kill('SIGKILL')
  }
}
