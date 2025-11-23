import { useEffect, useMemo, useRef, useState } from 'react'
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

const formatTime = (t: number) => {
  const mins = Math.floor(t / 60)
  const secs = t % 60
  return `${String(mins).padStart(2, '0')}:${secs.toFixed(2).padStart(5, '0')}`
}

function App() {
  const [activeTab, setActiveTab] = useState<'edit' | 'assets' | 'export'>('edit')
  const [playhead, setPlayhead] = useState(4.5)
  const [zoom, setZoom] = useState(1.4) // multiplier for px/sec
  const [tracks, setTracks] = useState<Track[]>(() => DEFAULT_TRACKS)
  const [clips, setClips] = useState<Clip[]>(() => DEFAULT_CLIPS)
  const [markers, setMarkers] = useState<Marker[]>(() => DEFAULT_MARKERS)
  const [selectedClip, setSelectedClip] = useState<string | null>(null)

  const timelineRef = useRef<HTMLDivElement | null>(null)

  // Restore project from localStorage once
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setTracks(parsed.tracks ?? DEFAULT_TRACKS)
        setClips(parsed.clips ?? DEFAULT_CLIPS)
        setMarkers(parsed.markers ?? DEFAULT_MARKERS)
      } catch (err) {
        console.warn('Failed to parse saved project', err)
      }
    }
  }, [])

  // Persist project
  useEffect(() => {
    const payload = JSON.stringify({ tracks, clips, markers })
    localStorage.setItem(STORAGE_KEY, payload)
  }, [tracks, clips, markers])

  // Keyboard nudging for selected clip
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!selectedClip) return
      const step = e.shiftKey ? 0.5 : 0.1
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        setClips(prev => prev.map(c => c.id === selectedClip
          ? { ...c, start: Math.max(0, c.start + (e.key === 'ArrowLeft' ? -step : step)) }
          : c))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedClip])

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
    setMarkers([...markers, { time: playhead, label, color }])
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
      setTracks(data.tracks ?? DEFAULT_TRACKS)
      setClips(data.clips ?? DEFAULT_CLIPS)
      setMarkers(data.markers ?? DEFAULT_MARKERS)
    }).catch(err => console.error('Import failed', err))
  }

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
