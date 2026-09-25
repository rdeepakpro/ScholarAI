import { mkdir, rm, cp, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { basename, join } from 'node:path'
import { spawn } from 'node:child_process'

const VERSION = 'b10982'
const base = `https://github.com/ggml-org/llama.cpp/releases/download/${VERSION}`
const platform = process.env.TARGET_PLATFORM || process.platform
const arch = process.env.TARGET_ARCH || process.arch
const target = join(process.cwd(), 'runtime', `${platform}-${arch}`)
const cache = join(process.cwd(), '.runtime-cache')

const assets = {
  'darwin-arm64': [{ kind: 'accelerated', name: `llama-${VERSION}-bin-macos-arm64.tar.gz` }],
  'darwin-x64': [{ kind: 'cpu', name: `llama-${VERSION}-bin-macos-x64.tar.gz` }],
  'win32-x64': [{ kind: 'accelerated', name: `llama-${VERSION}-bin-win-vulkan-x64.zip` }, { kind: 'cpu', name: `llama-${VERSION}-bin-win-cpu-x64.zip` }],
  'win32-arm64': [{ kind: 'cpu', name: `llama-${VERSION}-bin-win-cpu-arm64.zip` }],
  'linux-x64': [{ kind: 'accelerated', name: `llama-${VERSION}-bin-ubuntu-vulkan-x64.tar.gz` }, { kind: 'cpu', name: `llama-${VERSION}-bin-ubuntu-x64.tar.gz` }],
  'linux-arm64': [{ kind: 'accelerated', name: `llama-${VERSION}-bin-ubuntu-vulkan-arm64.tar.gz` }, { kind: 'cpu', name: `llama-${VERSION}-bin-ubuntu-arm64.tar.gz` }],
}

async function run(command, args) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' })
    child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`)))
  })
}

async function findRuntimeRoot(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  if (entries.some((entry) => entry.name === 'llama-server' || entry.name === 'llama-server.exe')) return directory
  for (const entry of entries) if (entry.isDirectory()) {
    const found = await findRuntimeRoot(join(directory, entry.name)).catch(() => null)
    if (found) return found
  }
  throw new Error('llama-server was not present in the official runtime archive.')
}

const selected = assets[`${platform}-${arch}`]
if (!selected) throw new Error(`Unsupported desktop target: ${platform}-${arch}`)
await mkdir(cache, { recursive: true })
await rm(target, { recursive: true, force: true })

for (const asset of selected) {
  const archive = join(cache, basename(asset.name))
  if (!existsSync(archive)) {
    const response = await fetch(`${base}/${asset.name}`)
    if (!response.ok) throw new Error(`Could not download official llama.cpp runtime (${response.status}).`)
    await import('node:fs/promises').then(({ writeFile }) => response.arrayBuffer().then((bytes) => writeFile(archive, Buffer.from(bytes))))
  }
  const extractTo = join(cache, `${asset.kind}-${platform}-${arch}`)
  await rm(extractTo, { recursive: true, force: true }); await mkdir(extractTo, { recursive: true })
  if (asset.name.endsWith('.zip')) await run(process.platform === 'win32' ? 'powershell' : 'unzip', process.platform === 'win32' ? ['-NoProfile', '-Command', `Expand-Archive -LiteralPath '${archive}' -DestinationPath '${extractTo}' -Force`] : ['-q', archive, '-d', extractTo])
  else await run('tar', ['-xzf', archive, '-C', extractTo])
  const root = await findRuntimeRoot(extractTo)
  await mkdir(join(target, asset.kind), { recursive: true })
  // Dereference symlinks: fs.cp otherwise rewrites the archive's relative dylib/so links into
  // absolute paths pointing at this build machine, which breaks the runtime on every other computer.
  await cp(root, join(target, asset.kind), { recursive: true, dereference: true })
  if (platform === process.platform && arch === process.arch) {
    const executable = join(target, asset.kind, platform === 'win32' ? 'llama-server.exe' : 'llama-server')
    await run(executable, ['--version'])
  }
}

console.log(`Prepared official llama.cpp ${VERSION} runtime for ${platform}-${arch}`)
