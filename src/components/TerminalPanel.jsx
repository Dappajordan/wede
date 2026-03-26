import { useState, useCallback } from 'react'
import { Plus, X, TerminalSquare, Maximize2, Minimize2 } from 'lucide-react'
import Terminal from './Terminal'
import { useTheme } from '../hooks/useTheme'

let nextId = 1

export default function TerminalPanel({ token, visible, isFullscreen, onToggleFullscreen, isMobile }) {
  const { terminalTheme } = useTheme()
  const [terminals, setTerminals] = useState(() => [{ id: nextId++, name: 'Terminal 1' }])
  const [activeId, setActiveId] = useState(1)

  const addTerminal = useCallback(() => {
    const id = nextId++
    setTerminals((prev) => [...prev, { id, name: `Terminal ${id}` }])
    setActiveId(id)
  }, [])

  const closeTerminal = useCallback((id) => {
    setTerminals((prev) => {
      const next = prev.filter((t) => t.id !== id)
      if (next.length === 0) {
        const newId = nextId++
        next.push({ id: newId, name: `Terminal ${newId}` })
        setActiveId(newId)
      } else if (activeId === id) {
        setActiveId(next[next.length - 1].id)
      }
      return next
    })
  }, [activeId])

  if (!visible) return null

  return (
    <div className="h-full flex flex-col bg-bg-tertiary">
      {/* Terminal tab bar */}
      <div className="flex items-center border-b border-border compact-touch">
        <div className="flex items-center flex-1 overflow-x-auto">
          <div className="flex items-center px-2 py-1 gap-0.5">
            <TerminalSquare className="w-3.5 h-3.5 text-text-muted mr-1.5 shrink-0" />
          </div>
          {terminals.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveId(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-r border-border shrink-0 transition-colors ${
                activeId === t.id
                  ? 'text-text-primary bg-bg-primary'
                  : 'text-text-muted hover:text-text-secondary hover:bg-bg-hover'
              }`}
            >
              <span>{t.name}</span>
              {terminals.length > 1 && (
                <span
                  onClick={(e) => { e.stopPropagation(); closeTerminal(t.id) }}
                  className="p-0.5 rounded hover:bg-bg-active text-text-muted hover:text-text-primary"
                >
                  <X className="w-2.5 h-2.5" />
                </span>
              )}
            </button>
          ))}
          <button
            onClick={addTerminal}
            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-hover rounded mx-1 shrink-0"
            title="New Terminal"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        {onToggleFullscreen && (
          <button
            onClick={onToggleFullscreen}
            className="p-1.5 mr-1 text-text-muted hover:text-text-primary hover:bg-bg-hover rounded shrink-0"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* Terminal instances */}
      <div className="flex-1 min-h-0">
        {terminals.map((t) => (
          <Terminal
            key={t.id}
            token={token}
            visible={activeId === t.id && visible}
            terminalTheme={terminalTheme}
          />
        ))}
      </div>
    </div>
  )
}
