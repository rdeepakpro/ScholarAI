import { describe, expect, it } from 'vitest'
import { generateCourse } from './generation'
import type { SourceMaterial } from '../models'

const source: SourceMaterial = {
  id: 'source-1', name: 'photosynthesis.txt', type: 'txt', addedAt: new Date().toISOString(),
  text: 'Photosynthesis captures light energy in chloroplasts. Photosynthesis uses chlorophyll to produce chemical energy. Chloroplasts contain thylakoids where light reactions occur. Chemical energy supports the Calvin cycle.',
  chunks: [{ id: 'chunk-1', sourceId: 'source-1', content: 'Photosynthesis captures light energy in chloroplasts. Photosynthesis uses chlorophyll to produce chemical energy. Chloroplasts contain thylakoids where light reactions occur. Chemical energy supports the Calvin cycle.' }],
}

describe('generateCourse', () => {
  it('returns a schema-valid, source-grounded course', async () => {
    const course = await generateCourse({ sources: [source], title: 'Photosynthesis' })
    expect(course.title).toBe('Photosynthesis')
    expect(course.sourceIds).toEqual(['source-1'])
    expect(course.lessons.length).toBeGreaterThanOrEqual(3)
    expect(course.lessons[0].sections[0].sourceChunkIds).toEqual(['chunk-1'])
    expect(course.lessons.every((lesson) => lesson.estimatedMinutes >= 3 && lesson.estimatedMinutes <= 10)).toBe(true)
  })

  it('rejects malformed structured provider output', async () => {
    await expect(generateCourse({ sources: [source] }, { generateCourse: async () => ({ title: 'Missing fields' }) })).rejects.toThrow()
  })
})
