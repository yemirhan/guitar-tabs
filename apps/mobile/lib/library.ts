import { Directory, File, Paths } from 'expo-file-system'
import type { ProjectEntry } from '@gtr/shared'

const scoresDir = new Directory(Paths.document, 'scores')
const indexFile = new File(Paths.document, 'library.json')

function entryExists(entry: ProjectEntry): boolean {
  return Boolean(
    entry &&
      typeof entry.fileName === 'string' &&
      entry.fileName &&
      new File(scoresDir, entry.fileName).exists
  )
}

export async function loadLibrary(): Promise<ProjectEntry[]> {
  try {
    if (!indexFile.exists) return []
    const text = await indexFile.text()
    const parsed = JSON.parse(text)
    if (!Array.isArray(parsed)) return []

    const seen = new Set<string>()
    const entries = (parsed as ProjectEntry[]).filter((entry) => {
      if (!entryExists(entry) || seen.has(entry.fileName)) return false
      seen.add(entry.fileName)
      return true
    })

    if (entries.length !== parsed.length) saveLibrary(entries)
    return entries
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
  const library = await loadLibrary()
  const next = [entry, ...library.filter((e) => e.fileName !== fileName)]
  saveLibrary(next)
  return next
}

export async function removeScore(fileName: string): Promise<ProjectEntry[]> {
  const f = new File(scoresDir, fileName)
  if (f.exists) f.delete()
  const library = await loadLibrary()
  const next = library.filter((e) => e.fileName !== fileName)
  saveLibrary(next)
  return next
}
