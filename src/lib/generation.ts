import { CourseSchema, type Course, type SourceChunk, type SourceMaterial } from '../models'

export type CourseGenerationInput = {
  sources: SourceMaterial[]
  title?: string
  topic?: string
}

export type StructuredCourseProvider = {
  generateCourse(input: CourseGenerationInput): Promise<unknown>
}

const STOP_WORDS = new Set('about after again also and are because been before being between both can could did does doing down during each few for from further had has have having here how into its itself just more most other our out over own same should some such than that the their theirs them themselves then there these they this those through too under until very was were what when where which while who will with would your'.split(' '))

function sentences(text: string) {
  return text.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length > 45 && s.length < 360)
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase())
}

function conceptCandidates(sources: SourceMaterial[]) {
  const text = sources.map((s) => s.text).join(' ')
  const counts = new Map<string, number>()
  for (const match of text.toLowerCase().matchAll(/\b[a-z][a-z-]{4,}\b/g)) {
    const word = match[0]
    if (!STOP_WORDS.has(word)) counts.set(word, (counts.get(word) || 0) + 1)
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([word]) => titleCase(word))
}

function findChunk(concept: string, chunks: SourceChunk[]) {
  return chunks.find((chunk) => chunk.content.toLowerCase().includes(concept.toLowerCase())) || chunks[0]
}

function buildFallbackCourse({ sources, title }: CourseGenerationInput): Course {
  const now = new Date().toISOString()
  const id = crypto.randomUUID()
  const chunks = sources.flatMap((source) => source.chunks)
  const candidates = conceptCandidates(sources)
  const concepts = candidates.length >= 3 ? candidates : ['Core Ideas', 'How It Works', 'Putting It Together']
  const courseTitle = title?.trim() || sources[0].name.replace(/\.[^.]+$/, '')
  const lessons = concepts.map((concept, index) => {
    const chunk = findChunk(concept, chunks)
    const supportingSentences = sentences(chunk.content)
    const explanation = supportingSentences.slice(0, 2).join(' ') || chunk.content.slice(0, 500)
    const example = supportingSentences.slice(2, 4).join(' ') || `In the source material, ${concept.toLowerCase()} connects to the larger topic by building on the ideas introduced before it.`
    const lessonId = `${id}-lesson-${index + 1}`
    const checkpointId = `${lessonId}-check-1`
    const correctAnswer = `Recognize and explain ${concept.toLowerCase()}`
    return {
      id: lessonId,
      title: index === 0 ? `Foundations: ${concept}` : concept,
      objective: `Understand ${concept.toLowerCase()} and connect it to the surrounding material.`,
      estimatedMinutes: Math.min(10, Math.max(3, Math.ceil(chunk.content.length / 650) + 3)),
      concepts: [concept],
      sections: [
        {
          id: `${lessonId}-section-1`,
          kind: index === 0 ? 'explanation' as const : 'key-idea' as const,
          eyebrow: index === 0 ? 'START HERE' : 'KEY IDEA',
          title: concept,
          body: explanation,
          sourceChunkIds: [chunk.id],
        },
        {
          id: `${lessonId}-section-2`,
          kind: 'example' as const,
          eyebrow: 'MAKE THE CONNECTION',
          title: `How ${concept} fits`,
          body: example,
          sourceChunkIds: [chunk.id],
        },
      ],
      checkpoints: [{
        id: checkpointId,
        kind: 'multiple-choice' as const,
        concept,
        question: `Which statement best captures the lesson goal for ${concept}?`,
        options: [correctAnswer, 'Memorize the source filename', 'Skip the underlying mechanism', 'Treat it as unrelated detail'],
        correctAnswer,
        explanation: `The lesson focuses on understanding ${concept.toLowerCase()} and how it connects to the rest of the source material.`,
        sourceChunkIds: [chunk.id],
      }],
      progress: { completed: false, currentStep: 0, checkpointAnswers: {} },
    }
  })
  return CourseSchema.parse({
    id,
    title: courseTitle,
    description: `An interactive course grounded in ${sources.map((source) => source.name).join(', ')}.`,
    sourceIds: sources.map((source) => source.id),
    estimatedMinutes: lessons.reduce((sum, lesson) => sum + lesson.estimatedMinutes, 0),
    lessons,
    createdAt: now,
    updatedAt: now,
  })
}

export async function generateCourse(input: CourseGenerationInput, provider?: StructuredCourseProvider) {
  if (!input.sources.length) {
    if (!input.topic?.trim()) throw new Error('Enter a topic or select at least one source.')
    if (!provider) throw new Error('Set up Local AI in Settings → Models to generate lessons from a topic.')
  }
  if (provider) return CourseSchema.parse(await provider.generateCourse(input))
  return buildFallbackCourse(input)
}
