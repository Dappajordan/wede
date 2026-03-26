import { X, Circle, Globe } from 'lucide-react'

export default function EditorTabs({ tabs, activeTab, onSelect, onClose }) {
  if (tabs.length === 0) return null

  return (
    <div className="flex bg-bg-secondary border-b border-border overflow-x-auto compact-touch">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.path
        const isBrowser = tab.type === 'browser'
        return (
          <div
            key={tab.path}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs cursor-pointer border-r border-border min-w-0 shrink-0 transition-colors relative ${
              isActive
                ? 'bg-bg-primary text-text-primary'
                : 'text-text-muted hover:text-text-secondary hover:bg-bg-hover'
            }`}
            onClick={() => onSelect(tab.path)}
          >
            {isActive && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />}
            {isBrowser && <Globe className="w-3 h-3 text-cyan shrink-0" />}
            {!isBrowser && tab.modified && <Circle className="w-2 h-2 fill-accent text-accent shrink-0" />}
            <span className="truncate max-w-40 font-medium">{tab.name}</span>
            <button
              onClick={(e) => { e.stopPropagation(); onClose(tab.path) }}
              className="ml-1 p-0.5 rounded hover:bg-bg-hover text-text-muted hover:text-text-primary shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
