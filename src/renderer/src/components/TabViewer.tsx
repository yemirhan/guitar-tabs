import { AlphaTabState } from '@/hooks/useAlphaTab'

interface TabViewerProps {
  state: AlphaTabState
  containerRef: React.RefObject<HTMLDivElement | null>
  viewportRef: React.RefObject<HTMLDivElement | null>
}

export function TabViewer({ state, containerRef, viewportRef }: TabViewerProps) {
  return (
    <div className="relative flex-1 overflow-hidden bg-[var(--tab-viewer-bg)]">
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
              Open a Guitar Pro file to get started{' '}
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
