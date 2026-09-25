import type { SourceChunk, SourceMaterial } from '../models'

function chunkText(text: string, sourceId: string): SourceChunk[] {
  const clean = text.replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
  const sections = clean.split(/\n\s*\n|(?<=[.!?])\s+(?=[A-Z])/).filter((part) => part.trim().length > 35)
  const chunks: SourceChunk[] = []
  let buffer = ''
  for (const section of sections) {
    if (`${buffer} ${section}`.length > 900 && buffer) {
      chunks.push({ id: `${sourceId}-chunk-${chunks.length + 1}`, sourceId, content: buffer.trim() })
      buffer = section
    } else buffer += `${buffer ? ' ' : ''}${section}`
  }
  if (buffer) chunks.push({ id: `${sourceId}-chunk-${chunks.length + 1}`, sourceId, content: buffer.trim() })
  if (!chunks.length && clean) chunks.push({ id: `${sourceId}-chunk-1`, sourceId, content: clean })
  return chunks
}

async function extractPdf(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist')
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  const bytes = new Uint8Array(await file.arrayBuffer())
  const doc = await pdfjs.getDocument({ data: bytes }).promise
  const pages: string[] = []
  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
    const page = await doc.getPage(pageNumber)
    const content = await page.getTextContent()
    pages.push(content.items.map((item) => ('str' in item ? item.str : '')).join(' '))
  }
  return pages.join('\n\n')
}

async function extractPptx(file: File): Promise<string> {
  const { default: JSZip } = await import('jszip')
  const archive = await JSZip.loadAsync(await file.arrayBuffer())
  const slideNames = Object.keys(archive.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => Number(a.match(/\d+/)?.[0]) - Number(b.match(/\d+/)?.[0]))
  const slides = await Promise.all(slideNames.map(async (name) => {
    const xml = await archive.file(name)?.async('string')
    if (!xml) return ''
    const document = new DOMParser().parseFromString(xml, 'application/xml')
    return [...document.getElementsByTagName('a:t')].map((node) => node.textContent || '').join(' ')
  }))
  return slides.filter(Boolean).join('\n\n')
}

export async function extractSource(file: File): Promise<SourceMaterial> {
  const id = crypto.randomUUID()
  const extension = file.name.split('.').pop()?.toLowerCase()
  let text: string
  if (extension === 'docx') {
    const { default: mammoth } = await import('mammoth/mammoth.browser')
    text = (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value
  } else if (extension === 'pdf') {
    text = await extractPdf(file)
  } else if (extension === 'pptx') {
    text = await extractPptx(file)
  } else {
    text = await file.text()
  }
  if (text.trim().length < 60) throw new Error(`${file.name} did not contain enough readable text.`)
  return {
    id,
    name: file.name,
    type: extension || file.type || 'text',
    addedAt: new Date().toISOString(),
    text,
    chunks: chunkText(text, id),
  }
}
