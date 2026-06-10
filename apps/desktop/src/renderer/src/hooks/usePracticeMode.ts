import { useState, useCallback, useEffect, useRef } from 'react'
import * as alphaTab from '@coderline/alphatab'
import type { AlphaTabActions, PlaybackRange } from './useAlphaTab'

export interface PracticeModeState {
  isActive: boolean
  startBar: number
  endBar: number
  loopTempo: number
  isGradualIncrease: boolean
  tempoIncrement: number
  maxTempo: number
  currentLoopCount: number
  countInEnabled: boolean
}

export interface PracticeModeActions {
  activate: () => void
  deactivate: () => void
  setRange: (start: number, end: number) => void
  setLoopTempo: (tempo: number) => void
  setGradualIncrease: (enabled: boolean) => void
  setTempoIncrement: (increment: number) => void
  setMaxTempo: (max: number) => void
  toggleCountIn: () => void
  startLoop: () => void
  stopLoop: () => void
}

export function usePracticeMode(
  alphaTabActions: AlphaTabActions,
  score: alphaTab.model.Score | null,
  currentTempo: number
): [PracticeModeState, PracticeModeActions] {
  const [isActive, setIsActive] = useState(false)
  const [startBar, setStartBar] = useState(1)
  const [endBar, setEndBar] = useState(4)
  const [loopTempo, setLoopTempoState] = useState(1)
  const [isGradualIncrease, setIsGradualIncrease] = useState(false)
  const [tempoIncrement, setTempoIncrementState] = useState(0.05)
  const [maxTempo, setMaxTempoState] = useState(1)
  const [currentLoopCount, setCurrentLoopCount] = useState(0)
  const [countInEnabled, setCountInEnabled] = useState(false)

  const savedTempoRef = useRef(1)
  const isLoopingRef = useRef(false)
  const loopTempoRef = useRef(loopTempo)
  loopTempoRef.current = loopTempo

  const totalBars = score?.masterBars.length ?? 0

  const getTickRange = useCallback((): PlaybackRange | null => {
    if (!score) return null
    const startIdx = Math.max(0, startBar - 1)
    const endIdx = Math.min(totalBars - 1, endBar - 1)
    if (startIdx > endIdx || startIdx >= score.masterBars.length) return null

    const startTick = score.masterBars[startIdx].start
    const endMasterBar = score.masterBars[endIdx]
    const endTick = endMasterBar.start + endMasterBar.calculateDuration()

    return { startTick, endTick }
  }, [score, startBar, endBar, totalBars])

  const activate = useCallback(() => {
    savedTempoRef.current = currentTempo
    setIsActive(true)
  }, [currentTempo])

  const deactivate = useCallback(() => {
    alphaTabActions.stop()
    alphaTabActions.setPlaybackRange(null)
    alphaTabActions.setLooping(false)
    alphaTabActions.setTempo(savedTempoRef.current)
    alphaTabActions.setCountIn(0)
    setIsActive(false)
    setCurrentLoopCount(0)
    isLoopingRef.current = false
  }, [alphaTabActions])

  const setRange = useCallback((start: number, end: number) => {
    setStartBar(Math.max(1, start))
    setEndBar(Math.max(start, end))
  }, [])

  const setLoopTempo = useCallback((tempo: number) => {
    setLoopTempoState(tempo)
  }, [])

  const toggleCountIn = useCallback(() => {
    setCountInEnabled((prev) => !prev)
  }, [])

  const startLoop = useCallback(() => {
    const range = getTickRange()
    if (!range) return

    // Stop any current playback first
    alphaTabActions.stop()

    alphaTabActions.setPlaybackRange(range)
    alphaTabActions.setLooping(true)
    alphaTabActions.setTempo(loopTempo)
    alphaTabActions.setCountIn(countInEnabled ? 1 : 0)
    setCurrentLoopCount(0)
    isLoopingRef.current = true

    // Small delay to let alphaTab process the range before playing
    setTimeout(() => {
      alphaTabActions.playPause()
    }, 50)
  }, [alphaTabActions, getTickRange, loopTempo, countInEnabled])

  const stopLoop = useCallback(() => {
    alphaTabActions.stop()
    alphaTabActions.setPlaybackRange(null)
    alphaTabActions.setLooping(false)
    alphaTabActions.setTempo(savedTempoRef.current)
    alphaTabActions.setCountIn(0)
    isLoopingRef.current = false
    setCurrentLoopCount(0)
  }, [alphaTabActions])

  // Listen for playerFinished for gradual tempo increase
  useEffect(() => {
    const api = alphaTabActions.getApi()
    if (!api || !isActive) return

    const onPlayerFinished = () => {
      if (!isLoopingRef.current) return
      setCurrentLoopCount((prev) => {
        const next = prev + 1
        if (isGradualIncrease) {
          const newTempo = Math.min(
            loopTempoRef.current + tempoIncrement,
            maxTempo
          )
          setLoopTempoState(newTempo)
          alphaTabActions.setTempo(newTempo)
        }
        return next
      })
    }

    api.playerFinished.on(onPlayerFinished)
    return () => {
      api.playerFinished.off(onPlayerFinished)
    }
  }, [alphaTabActions, isActive, isGradualIncrease, tempoIncrement, maxTempo])

  const state: PracticeModeState = {
    isActive,
    startBar,
    endBar,
    loopTempo,
    isGradualIncrease,
    tempoIncrement,
    maxTempo,
    currentLoopCount,
    countInEnabled
  }

  const actions: PracticeModeActions = {
    activate,
    deactivate,
    setRange,
    setLoopTempo,
    setGradualIncrease: setIsGradualIncrease,
    setTempoIncrement: setTempoIncrementState,
    setMaxTempo: setMaxTempoState,
    toggleCountIn,
    startLoop,
    stopLoop
  }

  return [state, actions]
}
