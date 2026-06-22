export interface PlaybackRange {
  startTick: number
  endTick: number
}

export interface ExportFilter {
  name: string
  extensions: string[]
}

export interface ProjectEntry {
  filePath: string
  fileName: string
  addedAt: number
}

export type ThemeName = 'light' | 'dark'

export const MIN_ZOOM = 0.3
export const MAX_ZOOM = 3.0

/** alphaTab synth.PlayerState.Playing — mirrored so native code can compare without importing alphaTab. */
export const PLAYER_STATE_PLAYING = 1

export interface TrackSummary {
  index: number
  name: string
  isMute: boolean
  isSolo: boolean
}

export interface ScoreSummary {
  title: string
  artist: string
  tracks: TrackSummary[]
  /** Number of master bars; drives practice-range pickers. */
  barCount?: number
}

export interface PracticeConfig {
  startBar: number
  endBar: number
  /** Playback speed for the loop (1 = 100%). */
  loopTempo: number
  gradualIncrease: boolean
  /** Speed added after each completed loop when gradualIncrease is on. */
  tempoIncrement: number
  maxTempo: number
  countIn: boolean
}

export type TabCommand =
  | { type: 'playPause' }
  | { type: 'stop' }
  | { type: 'setTempo'; value: number }
  | { type: 'setZoom'; value: number }
  | { type: 'selectTrack'; trackIndex: number }
  | { type: 'muteTrack'; trackIndex: number; value: boolean }
  | { type: 'muteAllTracks' }
  | { type: 'unmuteAllTracks' }
  | { type: 'soloTrack'; trackIndex: number; value: boolean }
  | { type: 'clearSoloTracks' }
  | { type: 'setTrackVolume'; trackIndex: number; value: number }
  | { type: 'practiceStart'; config: PracticeConfig }
  | { type: 'practiceStop' }

export interface TabCommandEnvelope {
  seq: number
  cmd: TabCommand
}
