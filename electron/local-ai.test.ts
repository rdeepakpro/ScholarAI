// @vitest-environment node
import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LocalAIManager } from './local-ai.mjs'
import { MODEL_CATALOG } from './model-catalog.mjs'

const originalModel = { ...MODEL_CATALOG.recommended }
const directories: string[] = []

afterEach(async () => {
  Object.assign(MODEL_CATALOG.recommended, originalModel)
  vi.unstubAllGlobals()
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

describe('LocalAIManager downloads', () => {
  it('reports real bytes, verifies the hash, persists, and removes a model', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'speedyai-local-ai-'))
    directories.push(directory)
    const runtime = join(directory, 'llama-server')
    await writeFile(runtime, '')
    const bytes = new TextEncoder().encode('a tiny verified model payload')
    Object.assign(MODEL_CATALOG.recommended, {
      bytes: bytes.byteLength,
      fileName: 'test.gguf',
      url: 'https://models.example/test.gguf',
      sha256: createHash('sha256').update(bytes).digest('hex'),
    })
    vi.stubGlobal('fetch', vi.fn(async () => new Response(bytes, { status: 200, headers: { 'content-length': String(bytes.byteLength) } })))
    const events: Array<{ downloadedBytes: number; status: string }> = []
    const manager = new LocalAIManager({ appDataPath: directory, resourcesPath: directory, emit: (_channel: string, state: { downloadedBytes: number; status: string }) => events.push(state) })
    manager.runtimePath = () => runtime
    manager.ensureServer = async () => undefined
    manager.test = async () => ({ ok: true, response: 'Ready' })

    const installed = await manager.install('qwen2.5-3b-instruct-q4km')
    expect(installed.status).toBe('installed')
    expect(installed.downloadedBytes).toBe(bytes.byteLength)
    expect(events.some((event) => event.downloadedBytes === bytes.byteLength)).toBe(true)
    expect(JSON.parse(await readFile(join(directory, 'models', 'local-ai.json'), 'utf8')).verified).toBe(true)

    const removed = await manager.remove()
    expect(removed.status).toBe('not-installed')
    expect(removed.modelPath).toBeNull()
  })

  it('resumes a partial download with an HTTP byte range', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'speedyai-local-ai-resume-'))
    directories.push(directory)
    const runtime = join(directory, 'llama-server')
    await writeFile(runtime, '')
    const allBytes = new TextEncoder().encode('resume this download exactly')
    const partialLength = 7
    Object.assign(MODEL_CATALOG.recommended, {
      bytes: allBytes.byteLength,
      fileName: 'resume.gguf',
      url: 'https://models.example/resume.gguf',
      sha256: createHash('sha256').update(allBytes).digest('hex'),
    })
    await mkdir(join(directory, 'models'), { recursive: true })
    await writeFile(join(directory, 'models', 'resume.gguf.part'), allBytes.slice(0, partialLength))
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      expect((init.headers as Record<string, string>).Range).toBe(`bytes=${partialLength}-`)
      return new Response(allBytes.slice(partialLength), { status: 206, headers: { 'content-range': `bytes ${partialLength}-${allBytes.byteLength - 1}/${allBytes.byteLength}` } })
    })
    vi.stubGlobal('fetch', fetchMock)
    const manager = new LocalAIManager({ appDataPath: directory, resourcesPath: directory, emit: () => undefined })
    manager.runtimePath = () => runtime
    manager.ensureServer = async () => undefined
    manager.test = async () => ({ ok: true, response: 'Ready' })

    const installed = await manager.install('qwen2.5-3b-instruct-q4km')
    expect(installed.downloadedBytes).toBe(allBytes.byteLength)
    expect(fetchMock).toHaveBeenCalledOnce()
  })
})
