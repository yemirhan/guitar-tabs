import { useState, useCallback } from 'react'

export interface ProjectEntry {
  filePath: string
  fileName: string
  addedAt: number
}

const STORAGE_KEY = 'guitar-tab-reader-projects'

function loadProjects(): ProjectEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (entry: unknown): entry is ProjectEntry =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as ProjectEntry).filePath === 'string' &&
        typeof (entry as ProjectEntry).fileName === 'string' &&
        typeof (entry as ProjectEntry).addedAt === 'number'
    )
  } catch {
    return []
  }
}

function saveProjects(projects: ProjectEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
}

export interface ProjectActions {
  addProject: (filePath: string, fileName: string) => void
  removeProject: (filePath: string) => void
}

export function useProjects(): [ProjectEntry[], ProjectActions] {
  const [projects, setProjects] = useState<ProjectEntry[]>(loadProjects)

  const addProject = useCallback((filePath: string, fileName: string) => {
    setProjects((prev) => {
      const filtered = prev.filter((p) => p.filePath !== filePath)
      const next = [{ filePath, fileName, addedAt: Date.now() }, ...filtered]
      saveProjects(next)
      return next
    })
  }, [])

  const removeProject = useCallback((filePath: string) => {
    setProjects((prev) => {
      const next = prev.filter((p) => p.filePath !== filePath)
      saveProjects(next)
      return next
    })
  }, [])

  return [projects, { addProject, removeProject }]
}
