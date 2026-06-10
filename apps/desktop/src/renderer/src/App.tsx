import { useState, useRef, useCallback, useEffect } from 'react'
import * as alphaTab from '@coderline/alphatab'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useAlphaTab } from '@/hooks/useAlphaTab'
import { useResizable } from '@/hooks/useResizable'
import { useProjects } from '@/hooks/useProjects'
import { usePracticeMode } from '@/hooks/usePracticeMode'
import { useTheme } from '@/contexts/ThemeContext'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Toolbar } from '@/components/Toolbar'
import { TrackPanel } from '@/components/TrackPanel'
import { ProjectsPanel } from '@/components/ProjectsPanel'
import { ResizeHandle } from '@/components/ResizeHandle'
import { TabViewer } from '@/components/TabViewer'
import { EditPanel } from '@/components/EditPanel'
import { FretboardPanel } from '@/components/FretboardPanel'
import { PracticeModePanel } from '@/components/PracticeModePanel'
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
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isPracticePanelOpen, setIsPracticePanelOpen] = useState(false)

  const [practiceState, practiceActions] = usePracticeMode(actions, state.score, state.tempo)

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

  const handleFileDrop = useCallback(
    (data: Uint8Array, droppedFileName: string, droppedFilePath: string) => {
      handleFileOpened({ data: Array.from(data), filePath: droppedFilePath, fileName: droppedFileName })
      actions.loadFile(data)
      setIsDirty(false)
    },
    [actions, handleFileOpened]
  )

  const handleToggleFullscreen = useCallback(() => {
    window.api.toggleFullscreen()
  }, [])

  const handleTogglePracticeMode = useCallback(() => {
    setIsPracticePanelOpen((prev) => !prev)
  }, [])

  // Fullscreen state sync
  useEffect(() => {
    const cleanup = window.api.onFullscreenChanged((fs) => {
      setIsFullscreen(fs)
    })
    return cleanup
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
      const mod = e.ctrlKey || e.metaKey

      // Space = play/pause (skip when focused on inputs)
      if (e.code === 'Space' && tag !== 'textarea' && tag !== 'input') {
        e.preventDefault()
        if (state.score && state.isPlayerReady) {
          actions.playPause()
        }
      }

      // Ctrl/Cmd+O = open
      if (mod && e.key === 'o') {
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
      if (mod && e.key === 's') {
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

      // Ctrl/Cmd+= / Ctrl/Cmd+- = tempo up/down
      if (mod && !e.shiftKey && (e.key === '=' || e.key === '+')) {
        e.preventDefault()
        actions.setTempo(Math.min(2, state.tempo + 0.05))
      }
      if (mod && !e.shiftKey && e.key === '-') {
        e.preventDefault()
        actions.setTempo(Math.max(0.25, state.tempo - 0.05))
      }

      // Ctrl/Cmd+Shift+= / Ctrl/Cmd+Shift+- = zoom in/out
      if (mod && e.shiftKey && (e.key === '=' || e.key === '+')) {
        e.preventDefault()
        actions.setZoom(state.zoom + 0.1)
      }
      if (mod && e.shiftKey && e.key === '-') {
        e.preventDefault()
        actions.setZoom(state.zoom - 0.1)
      }

      // Ctrl/Cmd+] / Ctrl/Cmd+[ = next/prev track
      if (mod && e.key === ']' && state.tracks.length > 0) {
        e.preventDefault()
        const currentIdx = state.selectedTracks[0]?.index ?? 0
        const nextIdx = (currentIdx + 1) % state.tracks.length
        actions.selectTrack(state.tracks[nextIdx])
      }
      if (mod && e.key === '[' && state.tracks.length > 0) {
        e.preventDefault()
        const currentIdx = state.selectedTracks[0]?.index ?? 0
        const prevIdx = (currentIdx - 1 + state.tracks.length) % state.tracks.length
        actions.selectTrack(state.tracks[prevIdx])
      }

      // F11 = toggle fullscreen
      if (e.key === 'F11') {
        e.preventDefault()
        handleToggleFullscreen()
      }

      // Ctrl/Cmd+L = toggle practice mode
      if (mod && e.key === 'l') {
        e.preventDefault()
        handleTogglePracticeMode()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [state.score, state.isPlayerReady, state.tempo, state.zoom, state.tracks, state.selectedTracks, actions, filePath, handleFileOpened, handleToggleFullscreen, handleTogglePracticeMode])

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
          isFullscreen={isFullscreen}
          isPracticeModeActive={practiceState.isActive}
          onFileOpened={handleFileOpened}
          onDirtyChange={setIsDirty}
          onToggleFullscreen={handleToggleFullscreen}
          onTogglePracticeMode={handleTogglePracticeMode}
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
            <ErrorBoundary fallbackLabel="Track Panel">
              <TrackPanel state={state} actions={actions} />
            </ErrorBoundary>
          </div>
          <ResizeHandle onMouseDown={onResizeMouseDown} />
          <div className="flex flex-1 flex-col overflow-hidden">
            <ErrorBoundary fallbackLabel="Tab Viewer">
              <TabViewer
                state={state}
                containerRef={containerRef}
                viewportRef={viewportRef}
                practiceLoopActive={practiceState.isActive}
                onFileDrop={handleFileDrop}
              />
            </ErrorBoundary>
            <ErrorBoundary fallbackLabel="Fretboard">
              <FretboardPanel
                api={state.api}
                selectedTracks={state.selectedTracks}
              />
            </ErrorBoundary>
            <ErrorBoundary fallbackLabel="Practice Mode">
              <PracticeModePanel
                state={practiceState}
                actions={practiceActions}
                totalBars={state.score?.masterBars.length ?? 0}
                isOpen={isPracticePanelOpen}
                onToggle={handleTogglePracticeMode}
              />
            </ErrorBoundary>
            <ErrorBoundary fallbackLabel="Edit Panel">
              <EditPanel actions={actions} onDirtyChange={setIsDirty} />
            </ErrorBoundary>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
