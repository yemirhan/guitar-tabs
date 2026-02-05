import { useRef, useState, useCallback, useEffect } from 'react'
import * as alphaTab from '@coderline/alphatab'

export interface AlphaTabState {
  api: alphaTab.AlphaTabApi | null
  score: alphaTab.model.Score | null
  tracks: alphaTab.model.Track[]
  selectedTracks: alphaTab.model.Track[]
  playerState: alphaTab.synth.PlayerState
  isLoading: boolean
  isPlayerReady: boolean
  tempo: number
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
  soloTrack: (track: alphaTab.model.Track, solo: boolean) => void
  loadTex: (tex: string) => void
  getScore: () => alphaTab.model.Score | null
  changeTrackProgram: (track: alphaTab.model.Track, program: number) => void
  setStaveProfile: (profile: alphaTab.StaveProfile) => void
}

function applyThemeColors(settings: alphaTab.Settings, theme: 'light' | 'dark') {
  const res = settings.display.resources
  if (theme === 'dark') {
    res.mainGlyphColor = new alphaTab.model.Color(232, 234, 240, 255)       // #e8eaf0
    res.secondaryGlyphColor = new alphaTab.model.Color(232, 234, 240, 100)  // #e8eaf0 @ 40%
    res.scoreInfoColor = new alphaTab.model.Color(232, 234, 240, 255)
    res.barSeparatorColor = new alphaTab.model.Color(74, 77, 94, 255)       // #4a4d5e
    res.barNumberColor = new alphaTab.model.Color(139, 143, 160, 255)       // #8b8fa0
    res.staffLineColor = new alphaTab.model.Color(74, 77, 94, 255)          // #4a4d5e
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
  theme: 'light' | 'dark' = 'dark'
): [AlphaTabState, AlphaTabActions] {
  const apiRef = useRef<alphaTab.AlphaTabApi | null>(null)
  const [score, setScore] = useState<alphaTab.model.Score | null>(null)
  const [tracks, setTracks] = useState<alphaTab.model.Track[]>([])
  const [selectedTracks, setSelectedTracks] = useState<alphaTab.model.Track[]>([])
  const [playerState, setPlayerState] = useState<alphaTab.synth.PlayerState>(
    alphaTab.synth.PlayerState.Paused
  )
  const [isLoading, setIsLoading] = useState(false)
  const [isPlayerReady, setIsPlayerReady] = useState(false)
  const [tempo, setTempoState] = useState(1)
  const [staveProfile, setStaveProfileState] = useState<alphaTab.StaveProfile>(() => {
    const saved = localStorage.getItem('staveProfile')
    return saved !== null ? (Number(saved) as alphaTab.StaveProfile) : alphaTab.StaveProfile.Default
  })

  useEffect(() => {
    const container = containerRef.current
    const viewport = viewportRef.current
    if (!container || !viewport) return

    const settings = new alphaTab.Settings()
    settings.core.fontDirectory = '/font/'
    settings.player.enablePlayer = true
    settings.player.soundFont = '/soundfont/sonivox.sf2'
    settings.player.scrollElement = viewport
    settings.player.scrollOffsetY = -30
    settings.display.layoutMode = alphaTab.LayoutMode.Page
    const savedProfile = localStorage.getItem('staveProfile')
    if (savedProfile !== null) {
      settings.display.staveProfile = Number(savedProfile) as alphaTab.StaveProfile
    }
    applyThemeColors(settings, theme)

    const api = new alphaTab.AlphaTabApi(container, settings)
    apiRef.current = api

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

    return () => {
      api.destroy()
      apiRef.current = null
    }
  }, [containerRef, viewportRef])

  // Update colors when theme changes
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
    apiRef.current?.changeTrackMute([track], mute)
  }, [])

  const soloTrack = useCallback((track: alphaTab.model.Track, solo: boolean) => {
    apiRef.current?.changeTrackSolo([track], solo)
  }, [])

  const loadTex = useCallback((tex: string) => {
    apiRef.current?.tex(tex)
  }, [])

  const getScore = useCallback(() => {
    return apiRef.current?.score ?? null
  }, [])

  const changeTrackProgram = useCallback(
    (track: alphaTab.model.Track, program: number) => {
      const api = apiRef.current
      if (!api || !api.score) return
      track.playbackInfo.program = program
      // Re-render the score to regenerate the MIDI with the new program
      const trackIndexes = api.tracks.map((t) => t.index)
      api.renderScore(api.score, trackIndexes)
    },
    []
  )

  const setStaveProfile = useCallback(
    (profile: alphaTab.StaveProfile) => {
      const api = apiRef.current
      if (!api) return
      api.settings.display.staveProfile = profile
      api.updateSettings()
      api.render()
      setStaveProfileState(profile)
      localStorage.setItem('staveProfile', String(profile))
    },
    []
  )

  const state: AlphaTabState = {
    api: apiRef.current,
    score,
    tracks,
    selectedTracks,
    playerState,
    isLoading,
    isPlayerReady,
    tempo,
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
    soloTrack,
    loadTex,
    getScore,
    changeTrackProgram,
    setStaveProfile
  }

  return [state, actions]
}
