import { Directory, File, Paths } from 'expo-file-system'
import type { ProjectEntry } from '@gtr/shared'

const scoresDir = new Directory(Paths.document, 'scores')
const indexFile = new File(Paths.document, 'library.json')

export async function loadLibrary(): Promise<ProjectEntry[]> {
  try {
    if (!indexFile.exists) return []
    const text = await indexFile.text()
    const parsed = JSON.parse(text)
    return Array.isArray(parsed) ? (parsed as ProjectEntry[]) : []
  } catch {
    return []
  }
}

function saveLibrary(entries: ProjectEntry[]): void {
  indexFile.write(JSON.stringify(entries))
}

export async function importScore(sourceUri: string, fileName: string): Promise<ProjectEntry[]> {
  scoresDir.create({ intermediates: true, idempotent: true })
  const dest = new File(scoresDir, fileName)
  if (dest.exists) dest.delete()
  await new File(sourceUri).copy(dest)
  const entry: ProjectEntry = { filePath: fileName, fileName, addedAt: Date.now() }
  const next = [entry, ...loadLibrary().filter((e) => e.fileName !== fileName)]
  saveLibrary(next)
  return next
}

export function removeScore(fileName: string): ProjectEntry[] {
  const f = new File(scoresDir, fileName)
  if (f.exists) f.delete()
  const next = loadLibrary().filter((e) => e.fileName !== fileName)
  saveLibrary(next)
  return next
}
