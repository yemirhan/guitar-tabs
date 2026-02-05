import { useState, useRef, useCallback, useEffect } from 'react'
import * as alphaTab from '@coderline/alphatab'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useAlphaTab } from '@/hooks/useAlphaTab'
import { useResizable } from '@/hooks/useResizable'
import { useProjects } from '@/hooks/useProjects'
import { useTheme } from '@/contexts/ThemeContext'
import { Toolbar } from '@/components/Toolbar'
import { TrackPanel } from '@/components/TrackPanel'
import { ProjectsPanel } from '@/components/ProjectsPanel'
import { ResizeHandle } from '@/components/ResizeHandle'
import { TabViewer } from '@/components/TabViewer'
import { EditPanel } from '@/components/EditPanel'
import { cn } from '@/lib/utils'

export default function App() {
  const { theme } = useTheme()
  const containerRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const [state, actions] = useAlphaTab(containerRef, viewportRef, theme)
  const { width: trackPanelWidth, onMouseDown: onResizeMouseDown, isDragging: isResizing } = useResizable({
    initialWidth: 224,
    minWidth: 160,
    maxWidth: 400,
    storageKey: 'trackPanelWidth'
  })

  const [projects, projectActions] = useProjects()
  const [fileName, setFileName] = useState<string | null>(null)
  const [filePath, setFilePath] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [errorPaths, setErrorPaths] = useState<Set<string>>(new Set())

  const handleFileOpened = useCallback(
    (result: { data: number[]; filePath: string; fileName: string }) => {
      setFileName(result.fileName)
      setFilePath(result.filePath)
      projectActions.addProject(result.filePath, result.fileName)
      setErrorPaths((prev) => {
        if (!prev.has(result.filePath)) return prev
        const next = new Set(prev)
        next.delete(result.filePath)
        return next
      })
    },
    [projectActions]
  )

  const handleProjectSelect = useCallback(
    async (path: string) => {
      if (path === filePath) return
      actions.stop()
      const result = await window.api.readFile(path)
      if ('error' in result) {
        setErrorPaths((prev) => new Set(prev).add(path))
        return
      }
      handleFileOpened(result)
      actions.loadFile(new Uint8Array(result.data))
      setIsDirty(false)
    },
    [actions, filePath, handleFileOpened]
  )

  const handleProjectRemove = useCallback(
    (path: string) => {
      projectActions.removeProject(path)
      setErrorPaths((prev) => {
        if (!prev.has(path)) return prev
        const next = new Set(prev)
        next.delete(path)
        return next
      })
    },
    [projectActions]
  )

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
      // Space = play/pause (skip when focused on inputs)
      if (e.code === 'Space' && tag !== 'textarea' && tag !== 'input') {
        e.preventDefault()
        if (state.score && state.isPlayerReady) {
          actions.playPause()
        }
      }

      // Ctrl/Cmd+O = open
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault()
        window.api.openFile().then((result) => {
          if (result) {
            handleFileOpened(result)
            actions.loadFile(new Uint8Array(result.data))
            setIsDirty(false)
          }
        })
      }

      // Ctrl/Cmd+S = save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        const score = actions.getScore()
        if (score && filePath) {
          const exporter = new alphaTab.exporter.Gp7Exporter()
          const data = exporter.export(score, new alphaTab.Settings())
          window.api.saveToPath(filePath, Array.from(data)).then((success) => {
            if (success) setIsDirty(false)
          })
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [state.score, state.isPlayerReady, actions, filePath, handleFileOpened])

  // Update window title
  useEffect(() => {
    const title = fileName
      ? `${fileName}${isDirty ? ' •' : ''} — Guitar Tab Reader`
      : 'Guitar Tab Reader'
    document.title = title
  }, [fileName, isDirty])

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-screen flex-col">
        <Toolbar
          state={state}
          actions={actions}
          fileName={fileName}
          filePath={filePath}
          isDirty={isDirty}
          onFileOpened={handleFileOpened}
          onDirtyChange={setIsDirty}
        />
        <div className={cn('flex flex-1 overflow-hidden', isResizing && 'select-none')}>
          <div
            className="flex shrink-0 flex-col border-r border-[var(--border-default)] bg-[var(--bg-surface)]"
            style={{ width: trackPanelWidth }}
          >
            <ProjectsPanel
              projects={projects}
              activeFilePath={filePath}
              errorPaths={errorPaths}
              onSelect={handleProjectSelect}
              onRemove={handleProjectRemove}
            />
            <TrackPanel state={state} actions={actions} />
          </div>
          <ResizeHandle onMouseDown={onResizeMouseDown} />
          <div className="flex flex-1 flex-col overflow-hidden">
            <TabViewer
              state={state}
              containerRef={containerRef}
              viewportRef={viewportRef}
            />
            <EditPanel actions={actions} onDirtyChange={setIsDirty} />
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
