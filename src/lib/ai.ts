import { z } from 'zod'
import { CourseSchema, type LessonSection, type SourceMaterial } from '../models'
import type { StructuredCourseProvider } from './generation'

export type LocalAIState = {
  available: boolean
  status: 'not-installed' | 'downloading' | 'verifying' | 'installed' | 'ready' | 'error'
  modelId: string | null
  modelName: string | null
  modelPath: string | null
  downloadedBytes: number
  totalBytes: number
  error: string | null
  catalog: Record<string, { id: string; displayName: string; bytes: number; source: string }>
}

type GenerateInput = { system: string; prompt: string; maxTokens?: number; temperature?: number }
type ProviderConfig = { type: 'local' | 'custom'; name?: string; endpoint?: string; model?: string; apiKey?: string }

declare global {
  interface Window {
    scholarAI?: {
      localAI: {
        getState(): Promise<LocalAIState>
        install(modelId: string): Promise<LocalAIState>
        cancel(): Promise<void>
        remove(): Promise<LocalAIState>
        test(): Promise<{ ok: boolean; response: string }>
        generate(input: GenerateInput): Promise<string>
        onProgress(callback: (state: LocalAIState) => void): () => void
      }
      provider: { get(): Promise<ProviderConfig>; set(config: ProviderConfig): Promise<ProviderConfig> }
      generate(input: GenerateInput): Promise<string>
    }
  }
}

const DraftSchema = z.object({
  title: z.string().min(1), description: z.string().min(1),
  lessons: z.array(z.object({
    title: z.string().min(1), objective: z.string().min(1), estimatedMinutes: z.number().int().min(3).max(10), concepts: z.array(z.string()).min(1),
    sections: z.array(z.object({ kind: z.enum(['explanation', 'key-idea', 'example', 'definition', 'comparison', 'formula', 'diagram', 'important']), eyebrow: z.string(), title: z.string(), body: z.string(), sourceChunkIds: z.array(z.string()).default([]) })).min(1),
    checkpoints: z.array(z.object({ kind: z.enum(['multiple-choice', 'true-false', 'short-recall']), concept: z.string(), question: z.string(), options: z.array(z.string()).optional(), correctAnswer: z.string(), explanation: z.string(), sourceChunkIds: z.array(z.string()).default([]) })).min(1),
  })).min(1),
})

function sourceContext(sources: SourceMaterial[], limit = 26000) {
  const ordered = sources.flatMap((source) => source.chunks.map((chunk) => `[SOURCE ${source.name} | CHUNK ${chunk.id}]\n${chunk.content}`))
  let length = 0
  return ordered.filter((item) => { length += item.length; return length <= limit }).join('\n\n')
}

function parseJson(raw: string) {
  const cleaned = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  const start = Math.min(...['{', '['].map((char) => { const index = cleaned.indexOf(char); return index < 0 ? Infinity : index }))
  const end = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'))
  if (!Number.isFinite(start) || end < start) throw new Error('The AI response did not contain valid structured data.')
  return JSON.parse(cleaned.slice(start, end + 1))
}

async function generate(input: GenerateInput) {
  if (!window.scholarAI) throw new Error('AI generation is available in the ScholarAI desktop app.')
  return window.scholarAI.generate(input)
}

export async function desktopCourseProvider(preferences: string[] = []): Promise<StructuredCourseProvider | undefined> {
  if (!window.scholarAI) return undefined
  const state = await window.scholarAI.localAI.getState()
  const provider = await window.scholarAI.provider.get()
  if (!['installed', 'ready'].includes(state.status) && provider.type !== 'custom') return undefined
  return {
    async generateCourse({ sources, title, topic }) {
      const allowedIds = new Set(sources.flatMap((source) => source.chunks.map((chunk) => chunk.id)))
      const grounded = sources.length > 0
      const shared = `Create a logically ordered course of 3–5 lessons, each 3–10 minutes. Identify prerequisites before advanced concepts. Keep each section short and interactive. Include mixed checkpoint types where practical; multiple-choice checkpoints need 4 options that include the correct answer.\n\nLEARNING PREFERENCES: ${preferences.length ? preferences.join(', ') : 'balanced'}\n\n${topic ? `LEARNER REQUEST: ${topic}\n\n` : ''}Requested title: ${title || 'Choose a concise title'}\n\nRequired JSON shape:\n${JSON.stringify(z.toJSONSchema(DraftSchema))}`
      const raw = await generate(grounded ? {
        system: 'You are ScholarAI, an expert instructional designer. Use only claims supported by the supplied source chunks. Return JSON only. Never add unsupported course-specific facts.',
        prompt: `${shared}\n\nEvery section and checkpoint must cite one or more exact sourceChunkIds from the context.\n\nSOURCE CONTEXT:\n${sourceContext(sources, 16000)}`,
        maxTokens: 6000, temperature: .25,
      } : {
        system: 'You are ScholarAI, an expert instructional designer and teacher. Teach accurately from well-established knowledge. If you are unsure of a fact, leave it out. Return JSON only.',
        prompt: `${shared}\n\nThere is no uploaded material: teach the topic from your own knowledge and set every sourceChunkIds to [].`,
        maxTokens: 6000, temperature: .3,
      })
      const draft = DraftSchema.parse(parseJson(raw))
      for (const lesson of draft.lessons) for (const item of [...lesson.sections, ...lesson.checkpoints]) {
        if (!grounded) { item.sourceChunkIds = []; continue }
        if (!item.sourceChunkIds.length || item.sourceChunkIds.some((id) => !allowedIds.has(id))) throw new Error('The generated course cited a source section that was not provided.')
      }
      const id = crypto.randomUUID()
      const now = new Date().toISOString()
      const lessons = draft.lessons.map((lesson, lessonIndex) => ({
        ...lesson, id: `${id}-lesson-${lessonIndex + 1}`,
        sections: lesson.sections.map((section, index) => ({ ...section, id: `${id}-lesson-${lessonIndex + 1}-section-${index + 1}` })),
        checkpoints: lesson.checkpoints.map((checkpoint, index) => ({ ...checkpoint, id: `${id}-lesson-${lessonIndex + 1}-checkpoint-${index + 1}` })),
        progress: { completed: false, currentStep: 0, checkpointAnswers: {} },
      }))
      return CourseSchema.parse({ id, title: title || draft.title, description: draft.description, sourceIds: sources.map((source) => source.id), estimatedMinutes: lessons.reduce((sum, lesson) => sum + lesson.estimatedMinutes, 0), lessons, createdAt: now, updatedAt: now })
    },
  }
}

export async function explainSection(section: LessonSection, sources: SourceMaterial[], mode: 'different' | 'simple' | 'example') {
  const chunks = sources.flatMap((source) => source.chunks).filter((chunk) => section.sourceChunkIds.includes(chunk.id))
  if (!chunks.length) return generate({
    system: 'Explain educational content clearly and accurately. If you are unsure of a fact, leave it out.',
    prompt: `${mode === 'simple' ? 'Simplify this' : mode === 'example' ? 'Give one concrete example of this' : 'Explain this in a substantially different way'}:\n${section.body}`,
    maxTokens: 350,
  })
  return generate({
    system: 'Explain educational content clearly using only the supplied source excerpt. If the source does not support a claim, do not make it.',
    prompt: `${mode === 'simple' ? 'Simplify this' : mode === 'example' ? 'Give one concrete example that stays within the source' : 'Explain this in a substantially different way'}:\n${section.body}\n\nSOURCE:\n${chunks.map((chunk) => chunk.content).join('\n')}`,
    maxTokens: 350,
  })
}

export async function generateNotes(sources: SourceMaterial[]) {
  return generate({ system: 'Create concise study notes grounded only in supplied sources.', prompt: sourceContext(sources), maxTokens: 1800 })
}

export async function generateFlashcards(sources: SourceMaterial[]) {
  const schema = z.array(z.object({ front: z.string(), back: z.string(), sourceChunkIds: z.array(z.string()) }))
  return schema.parse(parseJson(await generate({ system: 'Create source-grounded flashcards. Return JSON only.', prompt: `${JSON.stringify(z.toJSONSchema(schema))}\n${sourceContext(sources)}`, maxTokens: 1800 })))
}

export async function generateQuiz(sources: SourceMaterial[]) {
  const schema = z.array(z.object({ question: z.string(), options: z.array(z.string()).length(4), correctAnswer: z.string(), explanation: z.string(), sourceChunkIds: z.array(z.string()) }))
  return schema.parse(parseJson(await generate({ system: 'Create a source-grounded quiz. Return JSON only.', prompt: `${JSON.stringify(z.toJSONSchema(schema))}\n${sourceContext(sources)}`, maxTokens: 2200 })))
}

export async function askSources(question: string, sources: SourceMaterial[]) {
  return generate({ system: 'Answer only from supplied class material. Say when the material does not answer the question.', prompt: `QUESTION: ${question}\n\n${sourceContext(sources)}`, maxTokens: 900 })
}

export async function generateStudySession(progressSummary: string, sources: SourceMaterial[]) {
  return generate({ system: 'Create a short study session based on real performance. Do not claim mastery.', prompt: `PERFORMANCE:\n${progressSummary}\n\nSOURCES:\n${sourceContext(sources, 12000)}`, maxTokens: 900 })
}
