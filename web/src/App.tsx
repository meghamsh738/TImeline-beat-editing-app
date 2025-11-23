import { useEffect, useMemo, useRef, useState } from 'react'
import type React from 'react'
import './App.css'

type Clip = {
  id: string
  title: string
  track: string
  color: string
  start: number // seconds
  duration: number // seconds
}

type Marker = { time: number; label: string; color: string }

type Track = { id: string; name: string; type: 'video' | 'audio' }

type ProjectState = {
  tracks: Track[]
  clips: Clip[]
  markers: Marker[]
}

const DEFAULT_TRACKS: Track[] = [
  { id: 'v1', name: 'V1 · Motion', type: 'video' },
  { id: 'v2', name: 'V2 · Titles', type: 'video' },
  { id: 'a1', name: 'A1 · Music', type: 'audio' },
  { id: 'a2', name: 'A2 · Foley', type: 'audio' }
]

const DEFAULT_CLIPS: Clip[] = [
  { id: 'c1', title: 'Intro', track: 'v1', color: '#4ade80', start: 0, duration: 6 },
  { id: 'c2', title: 'Scene A', track: 'v1', color: '#60a5fa', start: 6.5, duration: 8 },
  { id: 'c3', title: 'Lower Third', track: 'v2', color: '#f472b6', start: 6.7, duration: 4 },
  { id: 'c4', title: 'Chorus', track: 'a1', color: '#fbbf24', start: 2, duration: 12 },
  { id: 'c5', title: 'Steps', track: 'a2', color: '#a78bfa', start: 4, duration: 5.5 }
]

const DEFAULT_MARKERS: Marker[] = [
  { time: 2, label: 'Beat drop', color: '#22d3ee' },
  { time: 8.5, label: 'Cut to B-roll', color: '#f97316' },
  { time: 12, label: 'Logo hit', color: '#e11d48' }
]

const TOTAL_DURATION = 18

const STORAGE_KEY = 'timeline-builder-project-v1'

type HistoryOpts = { push?: boolean }

function useHistoryState<T>(initial: T, limit = 80) {
  const [state, setState] = useState<T>(initial)
  const historyRef = useRef<T[]>([initial])
  const pointerRef = useRef(0)

  const commit = (updater: T | ((prev: T) => T), opts: HistoryOpts = { push: true }) => {
    setState(prev => {
      const next = typeof updater === 'function' ? (updater as (p: T) => T)(prev) : updater
      if (opts.push !== false) {
        const sliced = historyRef.current.slice(0, pointerRef.current + 1)
        const nextHistory = [...sliced, next]
        if (nextHistory.length > limit) nextHistory.shift()
        historyRef.current = nextHistory
        pointerRef.current = historyRef.current.length - 1
      }
      return next
    })
  }

  const pushCheckpoint = () => {
    const current = historyRef.current[pointerRef.current]
    const sliced = historyRef.current.slice(0, pointerRef.current + 1)
    const nextHistory = [...sliced, current]
    if (nextHistory.length > limit) nextHistory.shift()
    historyRef.current = nextHistory
    pointerRef.current = historyRef.current.length - 1
  }

  const undo = () => {
    if (pointerRef.current === 0) return
    pointerRef.current -= 1
    setState(historyRef.current[pointerRef.current])
  }

  const redo = () => {
    if (pointerRef.current >= historyRef.current.length - 1) return
    pointerRef.current += 1
    setState(historyRef.current[pointerRef.current])
  }

  const canUndo = pointerRef.current > 0
  const canRedo = pointerRef.current < historyRef.current.length - 1

  return { state, set: commit, undo, redo, canUndo, canRedo, pushCheckpoint }
}

const formatTime = (t: number) => {
  const mins = Math.floor(t / 60)
  const secs = t % 60
  return `${String(mins).padStart(2, '0')}:${secs.toFixed(2).padStart(5, '0')}`
}

function App() {
  const [activeTab, setActiveTab] = useState<'edit' | 'assets' | 'export'>('edit')
  const [playhead, setPlayhead] = useState(4.5)
  const [zoom, setZoom] = useState(1.4) // multiplier for px/sec
  const { state: project, set: setProject, undo, redo, canUndo, canRedo, pushCheckpoint } = useHistoryState<ProjectState>(
    { tracks: DEFAULT_TRACKS, clips: DEFAULT_CLIPS, markers: DEFAULT_MARKERS }
  )
  const { tracks, clips, markers } = project
  const [selectedClip, setSelectedClip] = useState<string | null>(null)

  const timelineRef = useRef<HTMLDivElement | null>(null)

  type DragInfo = {
    id: string
    mode: 'move' | 'trim-start' | 'trim-end'
    startX: number
    origStart: number
    origDuration: number
  }
  const dragRef = useRef<DragInfo | null>(null)
  const dragStartedState = useRef<ProjectState | null>(null)

  // Restore project from localStorage once
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setProject({
          tracks: parsed.tracks ?? DEFAULT_TRACKS,
          clips: parsed.clips ?? DEFAULT_CLIPS,
          markers: parsed.markers ?? DEFAULT_MARKERS
        })
      } catch (err) {
        console.warn('Failed to parse saved project', err)
      }
    }
  }, [])

  // Persist project
  useEffect(() => {
    const payload = JSON.stringify(project)
    localStorage.setItem(STORAGE_KEY, payload)
  }, [project])

  // Keyboard nudging for selected clip
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!selectedClip) return
      const step = e.shiftKey ? 0.5 : 0.1
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        setProject(prev => ({
          ...prev,
          clips: prev.clips.map(c => c.id === selectedClip
            ? { ...c, start: Math.max(0, c.start + (e.key === 'ArrowLeft' ? -step : step)) }
            : c)
        }), { push: false })
        pushCheckpoint()
      }
      if (e.metaKey || e.ctrlKey) {
        if (e.key.toLowerCase() === 'z' && !e.shiftKey) undo()
        if (e.key.toLowerCase() === 'z' && e.shiftKey) redo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedClip, setProject, pushCheckpoint, undo, redo])

  const pxPerSec = useMemo(() => 80 * zoom, [zoom])

  const timelineWidth = TOTAL_DURATION * pxPerSec + 200

  const timeTicks = useMemo(() => {
    const ticks = []
    for (let t = 0; t <= TOTAL_DURATION; t += 0.5) ticks.push(t)
    return ticks
  }, [])

  const clampTime = (value: number) => Math.min(Math.max(value, 0), TOTAL_DURATION)
  const handleScrub = (value: number) => setPlayhead(clampTime(value))

  const addMarker = () => {
    const palette = ['#22d3ee', '#f97316', '#e11d48', '#a78bfa', '#22c55e']
    const color = palette[(markers.length) % palette.length]
    const label = `Marker ${markers.length + 1}`
    setProject(prev => ({ ...prev, markers: [...prev.markers, { time: playhead, label, color }] }))
  }

  const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const seconds = x / pxPerSec
    setPlayhead(clampTime(seconds))
  }

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ tracks, clips, markers }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'timeline_project.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const importJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    file.text().then(txt => {
      const data = JSON.parse(txt)
      setProject({
        tracks: data.tracks ?? DEFAULT_TRACKS,
        clips: data.clips ?? DEFAULT_CLIPS,
        markers: data.markers ?? DEFAULT_MARKERS
      })
    }).catch(err => console.error('Import failed', err))
  }

  const startDrag = (e: React.MouseEvent<HTMLDivElement>, clip: Clip) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const offsetX = e.clientX - rect.left
    const handleZone = 10
    let mode: DragInfo['mode'] = 'move'
    if (offsetX < handleZone) mode = 'trim-start'
    else if (offsetX > rect.width - handleZone) mode = 'trim-end'

    dragRef.current = {
      id: clip.id,
      mode,
      startX: e.clientX,
      origStart: clip.start,
      origDuration: clip.duration
    }
    dragStartedState.current = project
    setSelectedClip(clip.id)
  }

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return
      const { id, mode, startX, origStart, origDuration } = dragRef.current
      const deltaSec = (e.clientX - startX) / pxPerSec
      const minDur = 0.2
      setProject(prev => ({
        ...prev,
        clips: prev.clips.map(c => {
          if (c.id !== id) return c
          if (mode === 'move') {
            return { ...c, start: clampTime(origStart + deltaSec) }
          }
          if (mode === 'trim-start') {
            const newStart = clampTime(origStart + deltaSec)
            const newDur = Math.max(minDur, origDuration - (newStart - origStart))
            return { ...c, start: newStart, duration: newDur }
          }
          const newDur = Math.max(minDur, origDuration + deltaSec)
          return { ...c, duration: newDur }
        })
      }), { push: false })
    }

    const onUp = () => {
      if (dragRef.current) {
        dragRef.current = null
        pushCheckpoint()
      }
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [pxPerSec, setProject, pushCheckpoint])

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <p className="eyebrow">Timeline Builder · fastfx</p>
          <h1>Premiere-style timeline prototype</h1>
        </div>
          <div className="controls-row">
            <label className="pill">
              FPS
            <select defaultValue="30">
              <option value="24">24</option>
              <option value="30">30</option>
              <option value="60">60</option>
            </select>
          </label>
          <div className="pill">Timecode {formatTime(playhead)}</div>
          <div className="transport">
            <button>⏮</button>
            <button>▶</button>
            <button>⏭</button>
          </div>
          <div className="pill">
            <button disabled={!canUndo} onClick={undo}>⌘Z Undo</button>
            <button disabled={!canRedo} onClick={redo}>⇧⌘Z Redo</button>
          </div>
        </div>
      </header>

      <div className="tabs">
        {['edit', 'assets', 'export'].map(tab => (
          <button
            key={tab}
            className={activeTab === tab ? 'tab active' : 'tab'}
            onClick={() => setActiveTab(tab as typeof activeTab)}
          >
            {tab === 'edit' && 'Edit'}
            {tab === 'assets' && 'Assets'}
            {tab === 'export' && 'Export'}
          </button>
        ))}
      </div>

      {activeTab === 'edit' && (
        <div className="layout">
          <aside className="sidepanel">
            <div className="panel-head">Assets</div>
            <ul className="asset-list">
              {['intro.mp4', 'broll.mov', 'main.wav', 'foley.wav'].map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
            <div className="panel-head">Markers</div>
            <ul className="marker-list">
              {markers.map((m) => (
                <li key={m.label} style={{ borderLeftColor: m.color }}>
                  <span>{formatTime(m.time)}</span>
                  <strong>{m.label}</strong>
                </li>
              ))}
            </ul>
          </aside>

          <section className="timeline-shell">
            <div className="timeline-toolbar">
              <div className="pill">Zoom</div>
              <input
                type="range"
                min={0.6}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
              />
              <div className="pill">Playhead</div>
              <input
                type="range"
                min={0}
                max={TOTAL_DURATION}
                step={0.1}
                value={playhead}
                onChange={(e) => handleScrub(parseFloat(e.target.value))}
              />
            </div>

            <div className="timeline-wrapper">
              <div className="ruler" style={{ width: timelineWidth }} onClick={handleRulerClick}>
                {timeTicks.map((t) => (
                  <div key={t} className="tick" style={{ left: t * pxPerSec }}>
                    <span>{t % 1 === 0 ? t.toFixed(0) : ''}</span>
                  </div>
                ))}
                <div className="playhead" style={{ left: playhead * pxPerSec }} />
              </div>

              <div className="tracks" style={{ width: timelineWidth }} ref={timelineRef}>
                {tracks.map((track) => (
                  <div key={track.id} className="track-row">
                    <div className="track-label">
                      <span className="badge">{track.type === 'video' ? 'V' : 'A'}</span>
                      {track.name}
                    </div>
                    <div className="track-lane">
                      {clips.filter(c => c.track === track.id).map((clip) => (
                        <div
                          key={clip.id}
                          className={`clip ${selectedClip === clip.id ? 'selected' : ''}`}
                          style={{
                            left: clip.start * pxPerSec,
                            width: clip.duration * pxPerSec,
                            background: clip.color
                          }}
                          title={`${clip.title} (${formatTime(clip.start)} - ${formatTime(clip.start + clip.duration)})`}
                          onMouseDown={(e) => startDrag(e, clip)}
                          onClick={() => setSelectedClip(clip.id)}
                        >
                          <span>{clip.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}

      {activeTab === 'assets' && (
        <div className="placeholder">
          <p>Asset bin will live here (imports, waveform/thumb extraction).</p>
          <p>Planned: drag to timeline, search, filter by type.</p>
        </div>
      )}
      {activeTab === 'export' && (
        <div className="placeholder export-box">
          <div className="export-actions">
            <button className="ghost" onClick={exportJson}>Export JSON</button>
            <label className="ghost">
              Import JSON
              <input type="file" accept="application/json" hidden onChange={importJson} />
            </label>
            <button className="ghost" onClick={addMarker}>Add marker @ playhead</button>
          </div>
          <p>Later: choose render target (mp4/webm), codec, range, burn-in markers.</p>
        </div>
      )}
    </div>
  )
}

export default App
