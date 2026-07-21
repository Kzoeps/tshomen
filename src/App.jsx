import { useCallback, useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'
import {
  Check,
  ChevronDown,
  Clipboard,
  Code2,
  Copy,
  Download,
  ExternalLink,
  FilePlus2,
  Focus,
  GripVertical,
  Maximize2,
  Minus,
  Move,
  Plus,
  RotateCcw,
  Sparkles,
  X,
  ZoomIn,
} from 'lucide-react'

const STORAGE_KEY = 'meridian-diagrams-v1'
const MIN_ZOOM = 0.1
const MAX_ZOOM = 16
const ZOOM_STEP = 1.25
const FIT_PADDING = 64

const starterDiagram = `flowchart LR
  A[Paste Mermaid here] --> B{Make it yours}
  B -->|yes| C[Keep exploring]
  B -->|not yet| D[Try another idea]
`

const defaultDiagrams = [
  {
    id: createId(),
    title: 'Untitled diagram',
    content: starterDiagram,
  },
]

mermaid.initialize({
  startOnLoad: false,
  securityLevel: 'strict',
  theme: 'base',
  themeVariables: {
    background: '#f8faf7',
    primaryColor: '#d9f99d',
    primaryTextColor: '#172018',
    primaryBorderColor: '#536b4d',
    lineColor: '#536b4d',
    secondaryColor: '#d7e7f5',
    tertiaryColor: '#f8e4bd',
    fontFamily: 'DM Sans, sans-serif',
  },
})

function createId() {
  return `diagram-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function getInitialDiagrams() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (!saved) return defaultDiagrams

    const parsed = JSON.parse(saved)
    if (!Array.isArray(parsed) || parsed.length === 0) return defaultDiagrams
    const diagrams = parsed.filter((diagram) => diagram?.id && diagram?.title && typeof diagram?.content === 'string')
    return diagrams.length > 0 ? diagrams : defaultDiagrams
  } catch {
    return defaultDiagrams
  }
}

function App() {
  const [diagrams, setDiagrams] = useState(getInitialDiagrams)
  const [activeId, setActiveId] = useState(() => diagrams[0]?.id)
  const [notice, setNotice] = useState('')
  const activeTabRef = useRef(null)
  const activeDiagram = diagrams.find((diagram) => diagram.id === activeId) ?? diagrams[0]

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(diagrams))
  }, [diagrams])

  useEffect(() => {
    if (!notice) return undefined
    const timeout = window.setTimeout(() => setNotice(''), 2400)
    return () => window.clearTimeout(timeout)
  }, [notice])

  useEffect(() => {
    activeTabRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [activeId, diagrams.length])

  const updateActiveDiagram = useCallback((updates) => {
    setDiagrams((current) => current.map((diagram) => (
      diagram.id === activeId ? { ...diagram, ...updates } : diagram
    )))
  }, [activeId])

  const createDiagram = () => {
    const number = diagrams.length + 1
    const next = {
      id: createId(),
      title: `Untitled ${String(number).padStart(2, '0')}`,
      content: 'flowchart TD\n  Start --> Finish',
    }
    setDiagrams((current) => [...current, next])
    setActiveId(next.id)
  }

  const closeDiagram = (id, event) => {
    event?.stopPropagation()
    if (diagrams.length === 1) {
      setNotice('Keep one tab open — create a new diagram before closing this one.')
      return
    }

    const index = diagrams.findIndex((diagram) => diagram.id === id)
    const remaining = diagrams.filter((diagram) => diagram.id !== id)
    setDiagrams(remaining)
    if (id === activeId) setActiveId(remaining[Math.max(0, index - 1)]?.id ?? remaining[0].id)
  }

  const copySource = async () => {
    if (!activeDiagram?.content) {
      setNotice('There is no Mermaid source to copy yet.')
      return
    }
    try {
      await navigator.clipboard.writeText(activeDiagram.content)
      setNotice('Mermaid source copied')
    } catch {
      setNotice('Copy failed — select the source and copy it manually.')
    }
  }

  const resetSource = () => {
    updateActiveDiagram({ content: starterDiagram })
    setNotice('Starter diagram restored')
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true"><Sparkles size={16} strokeWidth={2.5} /></div>
          <div>
            <div className="brand-name">Meridian</div>
            <div className="brand-kicker">Mermaid workspace</div>
          </div>
        </div>

        <div className="workspace-status">
          <span className="status-dot" aria-hidden="true" />
          <span>Local only</span>
          <span className="status-divider" />
          <span>{diagrams.length} {diagrams.length === 1 ? 'diagram' : 'diagrams'}</span>
        </div>

        <div className="top-actions">
          <button className="new-button" type="button" onClick={createDiagram}>
            <FilePlus2 size={16} />
            <span>New diagram</span>
          </button>
        </div>
      </header>

      <nav className="tab-strip" aria-label="Diagram tabs">
        <div className="tabs-scroll">
          {diagrams.map((diagram, index) => (
            <div
              className={`diagram-tab ${diagram.id === activeId ? 'active' : ''}`}
              key={diagram.id}
              ref={diagram.id === activeId ? activeTabRef : null}
            >
              <button
                className="tab-select"
                type="button"
                onClick={() => setActiveId(diagram.id)}
                title={diagram.title}
              >
                <span className="tab-index">{String(index + 1).padStart(2, '0')}</span>
                <span className="tab-title">{diagram.title}</span>
              </button>
              <button
                className="tab-close"
                type="button"
                onClick={(event) => closeDiagram(diagram.id, event)}
                aria-label={`Close ${diagram.title}`}
                title={`Close ${diagram.title}`}
              >
                <X size={14} />
              </button>
            </div>
          ))}
          <button className="add-tab" type="button" onClick={createDiagram} aria-label="Add diagram tab" title="Add diagram tab">
            <Plus size={17} />
          </button>
        </div>
        <div className="tab-hint"><ChevronDown size={13} /> Tabs autosave locally</div>
      </nav>

      <main className="workspace">
        <section className="editor-panel" aria-label="Mermaid source editor">
          <div className="panel-header editor-header">
            <div>
              <div className="panel-eyebrow"><Code2 size={14} /> Source</div>
              <div className="panel-title-row">
                <input
                  className="diagram-title-input"
                  aria-label="Diagram name"
                  value={activeDiagram?.title ?? ''}
                  onChange={(event) => updateActiveDiagram({ title: event.target.value || 'Untitled diagram' })}
                />
                <span className="saved-badge"><Check size={12} /> Saved</span>
              </div>
            </div>
            <div className="editor-actions">
              <button className="text-button" type="button" onClick={resetSource} title="Restore the starter diagram">
                <RotateCcw size={14} /> Reset
              </button>
              <button className="text-button accent" type="button" onClick={copySource} title="Copy Mermaid source">
                <Copy size={14} /> Copy
              </button>
            </div>
          </div>

          <div className="editor-meta">
            <span>MERMAID</span>
            <span className="meta-separator">·</span>
            <span>{activeDiagram?.content.split('\n').length ?? 0} lines</span>
          </div>

          <SourceEditor
            value={activeDiagram?.content ?? ''}
            onChange={(content) => updateActiveDiagram({ content })}
          />

          <div className="editor-footer">
            <div className="tip"><span className="tip-spark">✦</span> Tip: start with <code>flowchart TD</code> or <code>sequenceDiagram</code></div>
            <a href="https://mermaid.js.org/intro/" target="_blank" rel="noreferrer" className="docs-link">
              Mermaid docs <ExternalLink size={12} />
            </a>
          </div>
        </section>

        <section className="preview-panel" aria-label="Diagram preview">
          <DiagramPreview
            content={activeDiagram?.content ?? ''}
            diagramId={activeDiagram?.id ?? 'preview'}
            fileName={activeDiagram?.title ?? 'mermaid-diagram'}
            onNotice={setNotice}
          />
        </section>
      </main>

      {notice && <div className="toast" role="status"><Check size={15} /> {notice}</div>}
    </div>
  )
}

function SourceEditor({ value, onChange }) {
  const textareaRef = useRef(null)
  const lineNumbersRef = useRef(null)
  const lineCount = Math.max(1, value.split('\n').length)

  const syncScroll = () => {
    if (lineNumbersRef.current && textareaRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }

  return (
    <div className="source-editor">
      <div className="line-numbers" ref={lineNumbersRef} aria-hidden="true">
        {Array.from({ length: lineCount }, (_, index) => <span key={index}>{String(index + 1).padStart(2, '0')}</span>)}
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onScroll={syncScroll}
        spellCheck="false"
        autoCapitalize="off"
        autoCorrect="off"
        aria-label="Mermaid source"
        placeholder="Paste Mermaid syntax here..."
      />
    </div>
  )
}

function DiagramPreview({ content, diagramId, fileName, onNotice }) {
  const [svg, setSvg] = useState('')
  const [error, setError] = useState('')
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 })
  const [diagramSize, setDiagramSize] = useState({ width: 1, height: 1 })
  const [isFullscreen, setIsFullscreen] = useState(false)
  const previewRef = useRef(null)
  const stageRef = useRef(null)
  const dragRef = useRef(null)
  const renderNumber = useRef(0)

  useEffect(() => {
    let cancelled = false
    const renderDiagram = async () => {
      if (!content.trim()) {
        setSvg('')
        setError('')
        return
      }

      const renderId = `meridian-${diagramId.replace(/[^a-zA-Z0-9]/g, '')}-${renderNumber.current++}`
      try {
        const result = await mermaid.render(renderId, content)
        if (!cancelled) {
          setSvg(result.svg)
          setDiagramSize(getSvgDimensions(result.svg))
          setError('')
        }
      } catch (renderError) {
        if (!cancelled) {
          setSvg('')
          setError(getMermaidError(renderError))
        }
      }
    }

    const timeout = window.setTimeout(renderDiagram, 180)
    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [content, diagramId])

  const fitDiagram = useCallback(() => {
    if (!stageRef.current) return
    setView(getFitView(stageRef.current, diagramSize))
  }, [diagramSize])

  useEffect(() => {
    if (!svg) return undefined
    const frame = window.requestAnimationFrame(fitDiagram)
    return () => window.cancelAnimationFrame(frame)
  }, [fitDiagram, svg])

  const showActualSize = () => setView({ scale: 1, x: 0, y: 0 })

  const zoomBy = (factor, focalPoint = { x: 0, y: 0 }) => {
    setView((current) => {
      const scale = clamp(current.scale * factor, MIN_ZOOM, MAX_ZOOM)
      if (scale === current.scale) return current

      const ratio = scale / current.scale
      return {
        scale,
        x: focalPoint.x - (focalPoint.x - current.x) * ratio,
        y: focalPoint.y - (focalPoint.y - current.y) * ratio,
      }
    })
  }

  const handlePointerDown = (event) => {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { pointerX: event.clientX, pointerY: event.clientY, x: view.x, y: view.y }
  }

  const handlePointerMove = (event) => {
    if (!dragRef.current) return
    const drag = dragRef.current
    setView((current) => ({
      ...current,
      x: drag.x + event.clientX - drag.pointerX,
      y: drag.y + event.clientY - drag.pointerY,
    }))
  }

  const stopDragging = () => { dragRef.current = null }

  const handleWheel = (event) => {
    event.preventDefault()
    const stage = event.currentTarget.getBoundingClientRect()
    const focalPoint = {
      x: event.clientX - stage.left - stage.width / 2,
      y: event.clientY - stage.top - stage.height / 2,
    }
    const factor = clamp(Math.exp(-event.deltaY * 0.002), 0.77, 1.3)
    zoomBy(factor, focalPoint)
  }

  const toggleFullscreen = async () => {
    if (!previewRef.current) return
    try {
      if (!document.fullscreenElement) {
        await previewRef.current.requestFullscreen()
        setIsFullscreen(true)
      } else {
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
    } catch {
      onNotice('Fullscreen is not available in this browser.')
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(document.fullscreenElement === previewRef.current)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const exportSvg = () => {
    if (!svg) {
      onNotice('Render a valid diagram before exporting.')
      return
    }
    downloadBlob(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), `${slugify(fileName)}.svg`)
    onNotice('SVG downloaded')
  }

  const exportPng = async () => {
    if (!svg) {
      onNotice('Render a valid diagram before exporting.')
      return
    }

    let url
    try {
      const serializedSvg = serializeSvgForImage(svg)
      const svgBlob = new Blob([serializedSvg], { type: 'image/svg+xml;charset=utf-8' })
      url = URL.createObjectURL(svgBlob)
      const image = await loadImage(url)
      const canvas = document.createElement('canvas')
      const ratio = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = image.width * ratio
      canvas.height = image.height * ratio
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Could not create a canvas context for PNG export.')

      context.scale(ratio, ratio)
      context.fillStyle = '#f8faf7'
      context.fillRect(0, 0, image.width, image.height)
      context.drawImage(image, 0, 0)

      const pngBlob = await canvasToBlob(canvas, 'image/png')
      downloadBlob(pngBlob, `${slugify(fileName)}.png`)
      onNotice('PNG downloaded')
    } catch {
      onNotice('PNG export failed — try exporting SVG instead.')
    } finally {
      if (url) URL.revokeObjectURL(url)
    }
  }

  return (
    <div className={`preview-shell ${isFullscreen ? 'fullscreen-preview' : ''}`} ref={previewRef}>
      <div className="panel-header preview-header">
        <div>
          <div className="panel-eyebrow"><Focus size={14} /> Canvas</div>
          <div className="preview-heading">Live preview <span className="live-beacon" aria-hidden="true" /></div>
        </div>
        <div className="preview-actions">
          <button className="fit-button" type="button" onClick={fitDiagram} title="Fit the whole diagram" aria-label="Fit the whole diagram">
            <Move size={14} /> <span>Fit</span>
          </button>
          <div className="zoom-controls" aria-label="Zoom controls">
            <button
              className="zoom-button"
              type="button"
              onClick={() => zoomBy(1 / ZOOM_STEP)}
              disabled={view.scale <= MIN_ZOOM}
              title="Zoom out"
              aria-label="Zoom out"
            ><Minus size={14} /></button>
            <span aria-live="polite">{Math.round(view.scale * 100)}%</span>
            <button
              className="zoom-button"
              type="button"
              onClick={() => zoomBy(ZOOM_STEP)}
              disabled={view.scale >= MAX_ZOOM}
              title="Zoom in"
              aria-label="Zoom in"
            ><ZoomIn size={14} /></button>
          </div>
          <button className="actual-size-button" type="button" onClick={showActualSize} title="Show at 100% actual size">1:1</button>
          <button className="icon-button" type="button" onClick={toggleFullscreen} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}><Maximize2 size={16} /></button>
        </div>
      </div>

      <div
        className="diagram-stage"
        ref={stageRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        onWheel={handleWheel}
      >
        <div className="stage-grid" aria-hidden="true" />
        {svg && !error && (
          <div
            className="diagram-artwork"
            style={{
              width: diagramSize.width,
              height: diagramSize.height,
              transform: `translate(-50%, -50%) translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
            }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        )}
        {!svg && !error && (
          <div className="empty-preview">
            <div className="empty-icon"><Clipboard size={23} /></div>
            <h2>Your canvas is waiting</h2>
            <p>Paste Mermaid syntax into the editor<br />to bring a diagram to life.</p>
          </div>
        )}
        {error && (
          <div className="error-card" role="alert">
            <div className="error-label"><span className="error-mark">!</span> Could not render diagram</div>
            <p>{error}</p>
            <span className="error-help">Check the source on the left and try again.</span>
          </div>
        )}
        {svg && <div className="drag-hint"><GripVertical size={13} /> Drag canvas to pan</div>}
      </div>

      <div className="preview-footer">
        <div className={`render-status ${error ? 'error' : ''}`}>
          <span className="render-status-dot" />
          {error ? 'Needs attention' : svg ? 'Rendered locally' : 'Waiting for source'}
        </div>
        <div className="export-actions">
          <button className="export-button" type="button" onClick={exportSvg}><Download size={14} /> SVG</button>
          <button className="export-button primary" type="button" onClick={exportPng}><Download size={14} /> PNG</button>
        </div>
      </div>
    </div>
  )
}

function getSvgDimensions(svgMarkup) {
  const parsedDocument = new DOMParser().parseFromString(svgMarkup, 'text/html')
  const svg = parsedDocument.querySelector('svg')
  if (!svg) return { width: 800, height: 600 }
  const viewBox = svg.getAttribute('viewBox')?.trim().split(/[\s,]+/).map(Number)

  if (viewBox?.length === 4 && viewBox[2] > 0 && viewBox[3] > 0) {
    return { width: viewBox[2], height: viewBox[3] }
  }

  const width = Number.parseFloat(svg.getAttribute('width'))
  const height = Number.parseFloat(svg.getAttribute('height'))
  return {
    width: Number.isFinite(width) && width > 0 ? width : 800,
    height: Number.isFinite(height) && height > 0 ? height : 600,
  }
}

function getFitView(stage, diagramSize) {
  const availableWidth = Math.max(1, stage.clientWidth - FIT_PADDING)
  const availableHeight = Math.max(1, stage.clientHeight - FIT_PADDING)
  const scale = clamp(
    Math.min(availableWidth / diagramSize.width, availableHeight / diagramSize.height),
    MIN_ZOOM,
    MAX_ZOOM,
  )
  return { scale, x: 0, y: 0 }
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value))
}

function getMermaidError(error) {
  const message = error instanceof Error ? error.message : String(error)
  return message
    .replace(/^Error:\s*/i, '')
    .replace(/\s+/g, ' ')
    .slice(0, 280)
}

function serializeSvgForImage(svgMarkup) {
  const parsedDocument = new DOMParser().parseFromString(svgMarkup, 'text/html')
  const svg = parsedDocument.querySelector('svg')
  if (!svg) throw new Error('The rendered diagram does not contain an SVG element.')

  const viewBox = svg.getAttribute('viewBox')?.trim().split(/[\s,]+/).map(Number)
  if (viewBox?.length === 4 && viewBox[2] > 0 && viewBox[3] > 0) {
    svg.setAttribute('width', String(viewBox[2]))
    svg.setAttribute('height', String(viewBox[3]))
  }

  svg.querySelectorAll('foreignObject').forEach((foreignObject) => {
    replaceHtmlLabelWithSvgText(parsedDocument, foreignObject)
  })

  return new XMLSerializer().serializeToString(svg)
}

function replaceHtmlLabelWithSvgText(document, foreignObject) {
  const lines = getHtmlLabelLines(foreignObject)
  if (lines.length === 0) {
    foreignObject.remove()
    return
  }

  const width = Number.parseFloat(foreignObject.getAttribute('width')) || 0
  const height = Number.parseFloat(foreignObject.getAttribute('height')) || 0
  const lineHeight = 22
  const centerY = height / 2
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
  text.setAttribute('class', foreignObject.querySelector('span')?.getAttribute('class') || 'nodeLabel')
  text.setAttribute('text-anchor', 'middle')
  text.setAttribute('dominant-baseline', 'middle')

  lines.forEach((line, index) => {
    const lineElement = document.createElementNS('http://www.w3.org/2000/svg', 'tspan')
    lineElement.setAttribute('x', String(width / 2))
    lineElement.setAttribute('y', String(centerY + (index - (lines.length - 1) / 2) * lineHeight))

    line.forEach((run) => {
      const runElement = document.createElementNS('http://www.w3.org/2000/svg', 'tspan')
      if (run.isCode) {
        runElement.setAttribute('style', 'font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 0.82em;')
      }
      runElement.textContent = run.text
      lineElement.appendChild(runElement)
    })

    text.appendChild(lineElement)
  })

  foreignObject.replaceWith(text)
}

function getHtmlLabelLines(foreignObject) {
  const label = foreignObject.querySelector('.nodeLabel, .edgeLabel') || foreignObject
  const lines = [[]]

  const visit = (node, isCode = false) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.replace(/\s+/g, ' ')
      if (text.trim()) lines.at(-1).push({ text, isCode })
      return
    }

    if (node.nodeName.toLowerCase() === 'br') {
      lines.push([])
      return
    }

    const childIsCode = isCode || node.nodeName.toLowerCase() === 'code'
    node.childNodes.forEach((child) => visit(child, childIsCode))
  }

  visit(label)
  return lines.filter((line) => line.length > 0)
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('The browser could not decode the rendered SVG.'))
    image.src = url
  })
}

function canvasToBlob(canvas, type) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error(`The browser could not encode the canvas as ${type}.`))
    }, type)
  })
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'mermaid-diagram'
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default App
