import { useState, useCallback } from 'react'
import { AlphaTabState } from '@/hooks/useAlphaTab'
import { cn } from '@/lib/utils'

const VALID_EXTENSIONS = ['.gp', '.gp3', '.gp4', '.gp5', '.gpx', '.gp7']

interface TabViewerProps {
  state: AlphaTabState
  containerRef: React.RefObject<HTMLDivElement | null>
  viewportRef: React.RefObject<HTMLDivElement | null>
  practiceLoopActive?: boolean
  onFileDrop?: (data: Uint8Array, fileName: string, filePath: string) => void
}

export function TabViewer({ state, containerRef, viewportRef, practiceLoopActive, onFileDrop }: TabViewerProps) {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragOver(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)

      if (!onFileDrop) return

      const files = e.dataTransfer.files
      if (files.length === 0) return

      const file = files[0]
      const ext = '.' + file.name.split('.').pop()?.toLowerCase()
      if (!VALID_EXTENSIONS.includes(ext)) return

      // Electron adds a path property to File objects
      const filePath = (file as File & { path?: string }).path ?? ''

      const reader = new FileReader()
      reader.onload = () => {
        const data = new Uint8Array(reader.result as ArrayBuffer)
        onFileDrop(data, file.name, filePath)
      }
      reader.readAsArrayBuffer(file)
    },
    [onFileDrop]
  )

  return (
    <div
      className={cn(
        'relative flex-1 overflow-hidden bg-[var(--tab-viewer-bg)]',
        practiceLoopActive && 'practice-loop-active'
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[var(--accent-primary)]/5 border-2 border-dashed border-[var(--accent-primary)] rounded-lg m-2">
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-primary)]/10">
              <span className="text-xl text-[var(--accent-primary)]">+</span>
            </div>
            <p className="text-sm font-medium text-[var(--accent-primary)]">Drop file to open</p>
            <p className="text-xs text-[var(--text-dim)]">.gp, .gp3, .gp4, .gp5, .gpx, .gp7</p>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {state.isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--tab-viewer-bg)]/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="studio-spinner" />
            <span className="font-mono text-xs font-medium tracking-widest text-[var(--text-dim)] uppercase">
              Rendering
            </span>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!state.score && !state.isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
          {/* Waveform visualization */}
          <div className="flex items-end gap-1">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="waveform-bar" />
            ))}
          </div>
          <div className="flex flex-col items-center gap-2">
            <p className="font-display text-base font-medium text-[var(--text-secondary)]">
              No file loaded
            </p>
            <p className="text-sm text-[var(--text-dim)]">
              Open a Guitar Pro file or drag & drop to get started{' '}
              <kbd className="ml-1 inline-flex items-center rounded border border-[var(--border-default)] bg-[var(--bg-surface-raised)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-dim)]">
                Ctrl+O
              </kbd>
            </p>
          </div>
        </div>
      )}

      {/* alphaTab viewport */}
      <div
        ref={viewportRef}
        className="h-full w-full overflow-auto"
      >
        <div ref={containerRef} className="at-main" />
      </div>
    </div>
  )
}
