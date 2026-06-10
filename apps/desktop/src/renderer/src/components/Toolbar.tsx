import { useCallback } from 'react'
import * as alphaTab from '@coderline/alphatab'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  FolderOpen,
  Save,
  SaveAll,
  Play,
  Pause,
  Square,
  Gauge,
  Volume2,
  Sun,
  Moon,
  Music,
  TableProperties,
  Rows3,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Repeat
} from 'lucide-react'
import { AlphaTabState, AlphaTabActions } from '@/hooks/useAlphaTab'
import { ExportMenu } from '@/components/ExportMenu'
import { useTheme } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'

interface ToolbarProps {
  state: AlphaTabState
  actions: AlphaTabActions
  fileName: string | null
  filePath: string | null
  isDirty: boolean
  isFullscreen: boolean
  isPracticeModeActive: boolean
  onFileOpened: (result: { data: number[]; filePath: string; fileName: string }) => void
  onDirtyChange: (dirty: boolean) => void
  onToggleFullscreen: () => void
  onTogglePracticeMode: () => void
}

export function Toolbar({
  state,
  actions,
  fileName,
  filePath,
  isDirty,
  isFullscreen,
  isPracticeModeActive,
  onFileOpened,
  onDirtyChange,
  onToggleFullscreen,
  onTogglePracticeMode
}: ToolbarProps) {
  const isPlaying = state.playerState === alphaTab.synth.PlayerState.Playing
  const { theme, toggleTheme } = useTheme()

  const handleOpen = useCallback(async () => {
    const result = await window.api.openFile()
    if (result) {
      onFileOpened(result)
      actions.loadFile(new Uint8Array(result.data))
      onDirtyChange(false)
    }
  }, [actions, onFileOpened, onDirtyChange])

  const handleSave = useCallback(async () => {
    const score = actions.getScore()
    if (!score || !filePath) return

    const exporter = new alphaTab.exporter.Gp7Exporter()
    const data = exporter.export(score, new alphaTab.Settings())
    const success = await window.api.saveToPath(filePath, Array.from(data))
    if (success) {
      onDirtyChange(false)
    }
  }, [actions, filePath, onDirtyChange])

  const handleSaveAs = useCallback(async () => {
    const score = actions.getScore()
    if (!score) return

    const exporter = new alphaTab.exporter.Gp7Exporter()
    const data = exporter.export(score, new alphaTab.Settings())
    const success = await window.api.saveFile(Array.from(data))
    if (success) {
      onDirtyChange(false)
    }
  }, [actions, onDirtyChange])

  const handleTempoChange = useCallback(
    (value: number[]) => {
      actions.setTempo(value[0])
    },
    [actions]
  )

  const handleVolumeChange = useCallback(
    (value: number[]) => {
      actions.setVolume(value[0])
    },
    [actions]
  )

  return (
    <div className="flex h-14 shrink-0 items-center border-b border-[var(--toolbar-border)] bg-[var(--toolbar-bg)] backdrop-blur-xl px-3 drag-region">
      {/* macOS traffic lights spacer */}
      <div className="w-16 shrink-0" />

      {/* Left zone: File actions */}
      <div className="flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={handleOpen} className="no-drag">
              <FolderOpen className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Open (Ctrl+O)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSave}
              disabled={!state.score || !filePath}
              className="no-drag"
            >
              <Save className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Save (Ctrl+S)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSaveAs}
              disabled={!state.score}
              className="no-drag"
            >
              <SaveAll className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Save As</TooltipContent>
        </Tooltip>

        <ExportMenu actions={actions} disabled={!state.score} />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Center zone: Transport controls */}
      <div className="flex items-center gap-1.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="transport"
              size="icon"
              onClick={actions.stop}
              disabled={!state.isPlayerReady || !state.score}
              className="no-drag"
            >
              <Square className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Stop</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="transport"
              size="icon-lg"
              onClick={actions.playPause}
              disabled={!state.isPlayerReady || !state.score}
              className={cn(
                'no-drag',
                isPlaying &&
                  'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-[var(--bg-base)] animate-pulse-glow'
              )}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isPlaying ? 'Pause' : 'Play'} (Space)</TooltipContent>
        </Tooltip>
      </div>

      {/* Notation toggle */}
      <div className="ml-3 flex items-center rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-0.5 no-drag">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => actions.setStaveProfile(alphaTab.StaveProfile.Score)}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-md text-xs transition-all',
                state.staveProfile === alphaTab.StaveProfile.Score
                  ? 'bg-[var(--accent-primary)] text-[var(--bg-base)] shadow-sm'
                  : 'text-[var(--text-dim)] hover:text-[var(--text-primary)]'
              )}
            >
              <Music className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Standard Notation</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => actions.setStaveProfile(alphaTab.StaveProfile.Tab)}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-md text-xs transition-all',
                state.staveProfile === alphaTab.StaveProfile.Tab
                  ? 'bg-[var(--accent-primary)] text-[var(--bg-base)] shadow-sm'
                  : 'text-[var(--text-dim)] hover:text-[var(--text-primary)]'
              )}
            >
              <TableProperties className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Tablature</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => actions.setStaveProfile(alphaTab.StaveProfile.ScoreTab)}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-md text-xs transition-all',
                (state.staveProfile === alphaTab.StaveProfile.ScoreTab ||
                  state.staveProfile === alphaTab.StaveProfile.Default)
                  ? 'bg-[var(--accent-primary)] text-[var(--bg-base)] shadow-sm'
                  : 'text-[var(--text-dim)] hover:text-[var(--text-primary)]'
              )}
            >
              <Rows3 className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Score + Tab</TooltipContent>
        </Tooltip>
      </div>

      {/* Zoom controls */}
      <div className="ml-3 flex items-center gap-1 no-drag">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => actions.setZoom(state.zoom - 0.1)}
              className="no-drag h-7 w-7"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zoom Out</TooltipContent>
        </Tooltip>
        <span className="w-10 text-center font-mono text-[10px] font-medium text-[var(--text-secondary)]">
          {Math.round(state.zoom * 100)}%
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => actions.setZoom(state.zoom + 0.1)}
              className="no-drag h-7 w-7"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zoom In</TooltipContent>
        </Tooltip>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right zone: Sliders + file info + theme + fullscreen */}
      <div className="flex items-center gap-3 no-drag">
        {/* Tempo */}
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-[var(--text-dim)]" />
          <Slider
            defaultValue={[1]}
            min={0.25}
            max={2}
            step={0.05}
            onValueChange={handleTempoChange}
            className="w-24"
          />
          <span className="w-12 text-right font-mono text-xs font-medium text-[var(--accent-amber)]">
            {state.tempo.toFixed(2)}x
          </span>
        </div>

        <Separator orientation="vertical" className="mx-0.5 h-6" />

        {/* Volume */}
        <div className="flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-[var(--text-dim)]" />
          <Slider
            defaultValue={[1]}
            min={0}
            max={1}
            step={0.01}
            onValueChange={handleVolumeChange}
            className="w-20"
          />
        </div>

        {/* File name pill */}
        {fileName && (
          <>
            <Separator orientation="vertical" className="mx-0.5 h-6" />
            <div className="flex items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-1">
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  isDirty ? 'bg-[var(--accent-amber)]' : 'bg-[var(--accent-success)]'
                )}
              />
              <span className="max-w-[160px] truncate font-body text-xs text-[var(--text-secondary)]">
                {fileName}
              </span>
            </div>
          </>
        )}

        <Separator orientation="vertical" className="mx-0.5 h-6" />

        {/* Practice mode toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onTogglePracticeMode}
              className={cn('no-drag', isPracticeModeActive && 'text-[var(--accent-amber)]')}
            >
              <Repeat className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Practice Mode (Ctrl+L)</TooltipContent>
        </Tooltip>

        {/* Theme toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="no-drag">
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</TooltipContent>
        </Tooltip>

        {/* Fullscreen toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onToggleFullscreen} className="no-drag">
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'} (F11)</TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}
