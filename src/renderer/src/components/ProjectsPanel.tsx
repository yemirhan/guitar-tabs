import { useState, useCallback } from 'react'
import { ChevronDown, ChevronRight, Music, AlertTriangle, X } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { ProjectEntry } from '@/hooks/useProjects'
import { cn } from '@/lib/utils'

interface ProjectsPanelProps {
  projects: ProjectEntry[]
  activeFilePath: string | null
  errorPaths: Set<string>
  onSelect: (filePath: string) => void
  onRemove: (filePath: string) => void
}

export function ProjectsPanel({
  projects,
  activeFilePath,
  errorPaths,
  onSelect,
  onRemove
}: ProjectsPanelProps) {
  const [collapsed, setCollapsed] = useState(false)

  const handleRemove = useCallback(
    (e: React.MouseEvent, filePath: string) => {
      e.stopPropagation()
      onRemove(filePath)
    },
    [onRemove]
  )

  return (
    <div className="flex shrink-0 flex-col">
      {/* Header */}
      <button
        className="flex h-10 w-full items-center justify-between px-3 hover:bg-[var(--track-hover)] transition-colors"
        onClick={() => setCollapsed((c) => !c)}
      >
        <div className="flex items-center gap-1.5">
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5 text-[var(--text-dim)]" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-[var(--text-dim)]" />
          )}
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--text-dim)]">
            Projects
          </span>
        </div>
        {projects.length > 0 && (
          <span className="rounded-full bg-[var(--bg-surface-raised)] px-2 py-0.5 font-mono text-[10px] text-[var(--text-dim)]">
            {projects.length}
          </span>
        )}
      </button>
      <Separator />

      {/* List */}
      {!collapsed && (
        <div className="max-h-[240px] overflow-y-auto">
          {projects.length === 0 ? (
            <div className="flex items-center justify-center p-4">
              <p className="font-mono text-[10px] text-[var(--text-dim)]">No projects yet</p>
            </div>
          ) : (
            <div className="flex flex-col gap-0.5 p-1.5">
              {projects.map((project) => {
                const isActive = project.filePath === activeFilePath
                const isError = errorPaths.has(project.filePath)

                return (
                  <div
                    key={project.filePath}
                    className={cn(
                      'group flex items-center gap-2 rounded-md border-l-2 px-2.5 py-1.5 transition-all',
                      isError
                        ? 'border-l-red-500/70 opacity-60'
                        : isActive
                          ? 'border-l-[var(--accent-success)] bg-[var(--track-selected)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]'
                          : 'border-l-transparent hover:bg-[var(--track-hover)] cursor-pointer'
                    )}
                    onClick={() => !isError && onSelect(project.filePath)}
                    title={project.filePath}
                  >
                    {/* Icon */}
                    {isError ? (
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-400" />
                    ) : (
                      <Music className="h-3.5 w-3.5 shrink-0 text-[var(--text-dim)]" />
                    )}

                    {/* File name */}
                    <span
                      className={cn(
                        'flex-1 truncate font-display text-xs',
                        isError
                          ? 'text-red-400 line-through'
                          : isActive
                            ? 'text-[var(--text-primary)]'
                            : 'text-[var(--text-secondary)]'
                      )}
                    >
                      {project.fileName}
                    </span>

                    {/* Remove button */}
                    <button
                      className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded transition-opacity hover:bg-[var(--bg-surface-raised)]',
                        isError ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      )}
                      onClick={(e) => handleRemove(e, project.filePath)}
                      aria-label="Remove project"
                    >
                      <X className="h-3 w-3 text-[var(--text-dim)]" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
          <Separator />
        </div>
      )}
    </div>
  )
}
