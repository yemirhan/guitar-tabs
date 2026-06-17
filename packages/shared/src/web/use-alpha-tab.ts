import { useRef, useState, useCallback, useEffect } from 'react'
import * as alphaTab from '@coderline/alphatab'
import { MIN_ZOOM, MAX_ZOOM } from '../types/index'
import type { ExportFilter, PlaybackRange, ThemeName } from '../types/index'

export type { PlaybackRange }

export interface UseAlphaTabOptions {
  /** Directory URL containing the Bravura font files (must end with '/'). */
  fontDirectory?: string | null
  /** Alternative to fontDirectory: explicit font URLs per format (use when asset URLs are hash-renamed). */
  smuflFontSources?: Map<alphaTab.FontFileFormat, string> | null
  /** Explicit alphaTab worker script URL. Use when bundlers cannot auto-detect alphaTab's script URL. */
  scriptFile?: string | null
  /** URL of the .sf2 soundfont. */
  soundFontUrl: string
  /** Raw soundfont bytes. When provided, loaded via api.loadSoundFont() instead of fetching
   *  soundFontUrl — required where the webview can't fetch the URL (file:// release builds). */
  soundFontBytes?: Uint8Array | null
  /** Set false in environments where alphaTab's web workers can't be bundled (Expo DOM components). Default true. */
  useWorkers?: boolean
  /** Audio output mode. Use WebAudioScriptProcessor where the audio worklet can't be bundled (Expo DOM components). */
  outputMode?: alphaTab.PlayerOutputMode
  /** Auto-scroll offset from the viewport top (negative scrolls the target lower). Default -30. */
  scrollOffsetY?: number
  /** Receives export payloads (desktop wires this to the Electron save dialog). */
  onExportFile?: (data: Uint8Array, defaultName: string, filters: ExportFilter[]) => Promise<boolean>
  /** Receives alphaTab runtime errors (load/parse/render/player failures). */
  onError?: (error: unknown) => void
}

export interface AlphaTabState {
  api: alphaTab.AlphaTabApi | null
  score: alphaTab.model.Score | null
  tracks: alphaTab.model.Track[]
  selectedTracks: alphaTab.model.Track[]
  playerState: alphaTab.synth.PlayerState
  isLoading: boolean
  isPlayerReady: boolean
  tempo: number
  zoom: number
  staveProfile: alphaTab.StaveProfile
}

export interface AlphaTabActions {
  loadFile: (data: Uint8Array) => void
  playPause: () => void
  stop: () => void
  setTempo: (speed: number) => void
  setVolume: (vol: number) => void
  selectTrack: (track: alphaTab.model.Track, append?: boolean) => void
  muteTrack: (track: alphaTab.model.Track, mute: boolean) => void
  muteAllTracks: () => void
  unmuteAllTracks: () => void
  soloTrack: (track: alphaTab.model.Track, solo: boolean) => void
  loadTex: (tex: string) => void
  getScore: () => alphaTab.model.Score | null
  getApi: () => alphaTab.AlphaTabApi | null
  changeTrackProgram: (track: alphaTab.model.Track, program: number) => void
  setStaveProfile: (profile: alphaTab.StaveProfile) => void
  setZoom: (scale: number) => void
  exportPdf: () => void
  exportMidi: () => void
  exportAlphaTex: () => Promise<void>
  setPlaybackRange: (range: PlaybackRange | null) => void
  setLooping: (enabled: boolean) => void
  setCountIn: (volume: number) => void
}

function applyThemeColors(settings: alphaTab.Settings, theme: ThemeName) {
  const res = settings.display.resources
  if (theme === 'dark') {
    res.mainGlyphColor = new alphaTab.model.Color(232, 234, 240, 255)
    res.secondaryGlyphColor = new alphaTab.model.Color(232, 234, 240, 100)
    res.scoreInfoColor = new alphaTab.model.Color(232, 234, 240, 255)
    res.barSeparatorColor = new alphaTab.model.Color(74, 77, 94, 255)
    res.barNumberColor = new alphaTab.model.Color(139, 143, 160, 255)
    res.staffLineColor = new alphaTab.model.Color(74, 77, 94, 255)
  } else {
    res.mainGlyphColor = new alphaTab.model.Color(0, 0, 0, 255)
    res.secondaryGlyphColor = new alphaTab.model.Color(0, 0, 0, 100)
    res.scoreInfoColor = new alphaTab.model.Color(0, 0, 0, 255)
    res.barSeparatorColor = new alphaTab.model.Color(34, 34, 17, 255)
    res.barNumberColor = new alphaTab.model.Color(200, 0, 0, 255)
    res.staffLineColor = new alphaTab.model.Color(165, 165, 165, 255)
  }
}

export function useAlphaTab(
  containerRef: React.RefObject<HTMLDivElement | null>,
  viewportRef: React.RefObject<HTMLDivElement | null>,
  theme: ThemeName = 'dark',
  options: UseAlphaTabOptions
): [AlphaTabState, AlphaTabActions] {
  const apiRef = useRef<alphaTab.AlphaTabApi | null>(null)
  const optionsRef = useRef(options)
  optionsRef.current = options
  const [score, setScore] = useState<alphaTab.model.Score | null>(null)
  const [tracks, setTracks] = useState<alphaTab.model.Track[]>([])
  const [selectedTracks, setSelectedTracks] = useState<alphaTab.model.Track[]>([])
  const [playerState, setPlayerState] = useState<alphaTab.synth.PlayerState>(
    alphaTab.synth.PlayerState.Paused
  )
  const [isLoading, setIsLoading] = useState(false)
  const [isPlayerReady, setIsPlayerReady] = useState(false)
  const [tempo, setTempoState] = useState(1)
  const [zoom, setZoomState] = useState<number>(() => {
    const saved = localStorage.getItem('zoom')
    return saved !== null ? Number(saved) : 1.0
  })
  const [staveProfile, setStaveProfileState] = useState<alphaTab.StaveProfile>(() => {
    const saved = localStorage.getItem('staveProfile')
    return saved !== null ? (Number(saved) as alphaTab.StaveProfile) : alphaTab.StaveProfile.Default
  })

  useEffect(() => {
    const container = containerRef.current
    const viewport = viewportRef.current
    if (!container || !viewport) return

    const opts = optionsRef.current
    const settings = new alphaTab.Settings()
    settings.core.fontDirectory = opts.fontDirectory ?? null
    settings.core.scriptFile = opts.scriptFile ?? null
    if (opts.smuflFontSources) {
      settings.core.smuflFontSources = opts.smuflFontSources
    }
    settings.core.useWorkers = opts.useWorkers ?? true
    settings.player.enablePlayer = true
    settings.player.playerMode = alphaTab.PlayerMode.EnabledSynthesizer
    if (opts.outputMode !== undefined) {
      settings.player.outputMode = opts.outputMode
    }
    // With explicit bytes, don't set a soundFont URL — alphaTab would try to fetch it (and
    // fail under file://). The bytes are loaded via api.loadSoundFont() right after construction.
    if (!opts.soundFontBytes) {
      settings.player.soundFont = opts.soundFontUrl
    }
    settings.player.scrollElement = viewport
    settings.player.scrollOffsetY = opts.scrollOffsetY ?? -30
    settings.display.layoutMode = alphaTab.LayoutMode.Page
    const savedProfile = localStorage.getItem('staveProfile')
    if (savedProfile !== null) {
      settings.display.staveProfile = Number(savedProfile) as alphaTab.StaveProfile
    }
    const savedZoom = localStorage.getItem('zoom')
    if (savedZoom !== null) {
      settings.display.scale = Number(savedZoom)
    }
    applyThemeColors(settings, theme)

    const api = new alphaTab.AlphaTabApi(container, settings)
    apiRef.current = api

    // Load soundfont from explicit bytes when a URL fetch isn't possible (file:// builds).
    if (opts.soundFontBytes) {
      api.loadSoundFont(opts.soundFontBytes, false)
    }

    api.scoreLoaded.on((s) => {
      setScore(s)
      setTracks([...s.tracks])
      if (s.tracks.length > 0) {
        setSelectedTracks([s.tracks[0]])
      }
    })

    api.renderStarted.on(() => {
      setIsLoading(true)
    })

    api.renderFinished.on(() => {
      setIsLoading(false)
    })

    api.playerStateChanged.on((e) => {
      setPlayerState(e.state)
    })

    api.playerReady.on(() => {
      setIsPlayerReady(true)
    })

    // Attach the error listener here, on the live api instance, so failures during the
    // very first load() (which fire before any state-driven re-render) are not swallowed.
    api.error.on((e) => {
      optionsRef.current.onError?.(e)
    })

    return () => {
      api.destroy()
      apiRef.current = null
    }
  }, [containerRef, viewportRef])

  useEffect(() => {
    const api = apiRef.current
    if (!api) return
    applyThemeColors(api.settings, theme)
    api.updateSettings()
    api.render()
  }, [theme])

  const loadFile = useCallback((data: Uint8Array) => {
    const api = apiRef.current
    if (!api) return
    api.load(data, [0])
  }, [])

  const playPause = useCallback(() => {
    apiRef.current?.playPause()
  }, [])

  const stop = useCallback(() => {
    apiRef.current?.stop()
  }, [])

  const setTempo = useCallback((speed: number) => {
    if (apiRef.current) {
      apiRef.current.playbackSpeed = speed
    }
    setTempoState(speed)
  }, [])

  const setVolume = useCallback((vol: number) => {
    if (apiRef.current) {
      apiRef.current.masterVolume = vol
    }
  }, [])

  const selectTrack = useCallback(
    (track: alphaTab.model.Track, append = false) => {
      const api = apiRef.current
      if (!api) return

      let newSelection: alphaTab.model.Track[]
      if (append) {
        const existing = selectedTracks.find((t) => t.index === track.index)
        if (existing) {
          newSelection = selectedTracks.filter((t) => t.index !== track.index)
          if (newSelection.length === 0) newSelection = [track]
        } else {
          newSelection = [...selectedTracks, track]
        }
      } else {
        newSelection = [track]
      }

      setSelectedTracks(newSelection)
      api.renderTracks(newSelection)
    },
    [selectedTracks]
  )

  const muteTrack = useCallback((track: alphaTab.model.Track, mute: boolean) => {
    const api = apiRef.current
    if (!api?.score) return
    api.changeTrackMute([track], mute)
    setTracks([...api.score.tracks])
  }, [])

  const soloTrack = useCallback((track: alphaTab.model.Track, solo: boolean) => {
    const api = apiRef.current
    if (!api?.score) return
    api.changeTrackSolo([track], solo)
    setTracks([...api.score.tracks])
  }, [])

  const muteAllTracks = useCallback(() => {
    const api = apiRef.current
    if (!api?.score || api.score.tracks.length === 0) return
    api.changeTrackMute(api.score.tracks, true)
    setTracks([...api.score.tracks])
  }, [])

  const unmuteAllTracks = useCallback(() => {
    const api = apiRef.current
    if (!api?.score || api.score.tracks.length === 0) return
    api.changeTrackMute(api.score.tracks, false)
    api.changeTrackSolo(api.score.tracks, false)
    setTracks([...api.score.tracks])
  }, [])

  const loadTex = useCallback((tex: string) => {
    apiRef.current?.tex(tex)
  }, [])

  const getScore = useCallback(() => {
    return apiRef.current?.score ?? null
  }, [])

  const getApi = useCallback(() => {
    return apiRef.current
  }, [])

  const changeTrackProgram = useCallback(
    (track: alphaTab.model.Track, program: number) => {
      const api = apiRef.current
      if (!api || !api.score) return

      // Program changes require MIDI regeneration so the synth receives new patch events.
      track.playbackInfo.program = program

      // Some files store explicit per-beat instrument automations that override track program.
      // Keep them in sync with the selected program so playback actually changes timbre.
      for (const staff of track.staves) {
        for (const bar of staff.bars) {
          for (const voice of bar.voices) {
            for (const beat of voice.beats) {
              for (const automation of beat.automations) {
                if (automation.type === alphaTab.model.AutomationType.Instrument) {
                  automation.value = program
                }
              }
            }
          }
        }
      }

      api.loadMidiForScore()
      setTracks([...api.score.tracks])
    },
    []
  )

  const setStaveProfile = useCallback((profile: alphaTab.StaveProfile) => {
    const api = apiRef.current
    if (!api) return
    api.settings.display.staveProfile = profile
    api.updateSettings()
    api.render()
    setStaveProfileState(profile)
    localStorage.setItem('staveProfile', String(profile))
  }, [])

  const setZoom = useCallback((scale: number) => {
    const api = apiRef.current
    if (!api) return
    const clamped = Math.round(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, scale)) * 100) / 100
    api.settings.display.scale = clamped
    api.updateSettings()
    api.render()
    setZoomState(clamped)
    localStorage.setItem('zoom', String(clamped))
  }, [])

  const exportPdf = useCallback(() => {
    const api = apiRef.current
    if (!api) return
    // Always print with light colors so glyphs are visible on white paper
    api.print(undefined, {
      display: {
        resources: {
          mainGlyphColor: '#000000',
          secondaryGlyphColor: 'rgba(0,0,0,0.4)',
          scoreInfoColor: '#000000',
          barSeparatorColor: '#222211',
          barNumberColor: '#c80000',
          staffLineColor: '#a5a5a5'
        }
      }
    })
  }, [])

  const exportMidi = useCallback(() => {
    apiRef.current?.downloadMidi()
  }, [])

  const exportAlphaTex = useCallback(async () => {
    const api = apiRef.current
    const onExportFile = optionsRef.current.onExportFile
    if (!api?.score || !onExportFile) return
    const exporter = new alphaTab.exporter.AlphaTexExporter()
    exporter.export(api.score)
    const tex = exporter.toString()
    await onExportFile(new TextEncoder().encode(tex), 'score.alphatex', [
      { name: 'AlphaTex', extensions: ['alphatex', 'tex', 'txt'] }
    ])
  }, [])

  const setPlaybackRange = useCallback((range: PlaybackRange | null) => {
    const api = apiRef.current
    if (!api) return
    if (range) {
      const pr = new alphaTab.synth.PlaybackRange()
      pr.startTick = range.startTick
      pr.endTick = range.endTick
      api.playbackRange = pr
    } else {
      api.playbackRange = null
    }
  }, [])

  const setLooping = useCallback((enabled: boolean) => {
    const api = apiRef.current
    if (!api) return
    api.isLooping = enabled
  }, [])

  const setCountIn = useCallback((volume: number) => {
    const api = apiRef.current
    if (!api) return
    api.countInVolume = volume
  }, [])

  const state: AlphaTabState = {
    api: apiRef.current,
    score,
    tracks,
    selectedTracks,
    playerState,
    isLoading,
    isPlayerReady,
    tempo,
    zoom,
    staveProfile
  }

  const actions: AlphaTabActions = {
    loadFile,
    playPause,
    stop,
    setTempo,
    setVolume,
    selectTrack,
    muteTrack,
    muteAllTracks,
    unmuteAllTracks,
    soloTrack,
    loadTex,
    getScore,
    getApi,
    changeTrackProgram,
    setStaveProfile,
    setZoom,
    exportPdf,
    exportMidi,
    exportAlphaTex,
    setPlaybackRange,
    setLooping,
    setCountIn
  }

  return [state, actions]
}
