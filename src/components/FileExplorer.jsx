import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ChevronRight, ChevronDown, File, Folder, FolderOpen,
  FilePlus, FolderPlus, RefreshCw, Copy, Clipboard, Trash2, Pencil
} from 'lucide-react'

/* ── File type icon colors (VS Code style) ── */
const EXT_ICON = {
  js: { color: '#f7df1e', label: 'JS' }, jsx: { color: '#61dafb', label: 'JSX' },
  ts: { color: '#3178c6', label: 'TS' }, tsx: { color: '#3178c6', label: 'TSX' },
  go: { color: '#00add8', label: 'GO' }, py: { color: '#3776ab', label: 'PY' },
  rs: { color: '#dea584', label: 'RS' }, rb: { color: '#cc342d', label: 'RB' },
  java: { color: '#ed8b00', label: 'JA' }, php: { color: '#777bb4', label: 'PHP' },
  c: { color: '#a8b9cc', label: 'C' }, cpp: { color: '#00599c', label: 'C++' },
  h: { color: '#a8b9cc', label: 'H' },
  html: { color: '#e34f26', label: '<>' }, htm: { color: '#e34f26', label: '<>' },
  css: { color: '#1572b6', label: '#' }, scss: { color: '#cf649a', label: 'SC' },
  json: { color: '#f7df1e', label: '{}' }, xml: { color: '#e37933', label: 'XML' },
  md: { color: '#519aba', label: 'MD' }, txt: { color: '#94a3b8', label: 'TXT' },
  svg: { color: '#f7a41d', label: 'SVG' },
  yml: { color: '#cb171e', label: 'YML' }, yaml: { color: '#cb171e', label: 'YML' },
  toml: { color: '#9c4121', label: 'TM' },
  sql: { color: '#e38c00', label: 'SQL' },
  sh: { color: '#4eaa25', label: 'SH' }, bash: { color: '#4eaa25', label: 'SH' },
  mod: { color: '#00add8', label: 'MOD' }, sum: { color: '#00add8', label: 'SUM' },
  lock: { color: '#94a3b8', label: 'LK' },
  env: { color: '#ecd53f', label: 'ENV' },
  gitignore: { color: '#f05032', label: 'GI' },
}

function FileIcon({ name }) {
  const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : name.toLowerCase()
  const info = EXT_ICON[ext]
  if (info) {
    return (
      <span className="w-4 h-4 flex items-center justify-center rounded-sm text-[7px] font-bold shrink-0 leading-none"
        style={{ backgroundColor: info.color + '20', color: info.color }}>
        {info.label}
      </span>
    )
  }
  return <File className="w-4 h-4 shrink-0 text-text-muted" />
}

/* ── Git status color for file names ── */
const GIT_NAME_COLOR = {
  modified: 'text-yellow',
  added: 'text-green',
  deleted: 'text-red',
  untracked: 'text-green',
  renamed: 'text-accent',
}

const GIT_INDICATOR = {
  modified: { label: 'M', color: 'text-yellow' },
  added: { label: 'A', color: 'text-green' },
  deleted: { label: 'D', color: 'text-red' },
  untracked: { label: 'U', color: 'text-green' },
  renamed: { label: 'R', color: 'text-accent' },
}

/* ── Context Menu ── */
function ContextMenu({ x, y, items, onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (!ref.current?.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div ref={ref} className="fixed z-50 bg-bg-primary border border-border rounded-lg shadow-xl shadow-shadow py-1 min-w-[160px] animate-fade-in"
      style={{ left: x, top: y }}>
      {items.map((item, i) => item.separator ? (
        <div key={i} className="border-t border-border my-1" />
      ) : (
        <button key={i} onClick={() => { item.action(); onClose() }}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors text-left">
          {item.icon && <item.icon className="w-3.5 h-3.5 text-text-muted" />}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  )
}

/* ── Tree Node ── */
function TreeNode({ entry, depth, onSelect, onToggle, expanded, authFetch, onRefresh, selectedPath, gitMap, clipboard, setClipboard, onPaste, onDelete, onRename }) {
  const [children, setChildren] = useState(null)
  const [ctx, setCtx] = useState(null)
  const isOpen = expanded.has(entry.path)
  const isSelected = selectedPath === entry.path
  const gitStatus = gitMap?.[entry.path]
  const nameColor = gitStatus ? GIT_NAME_COLOR[gitStatus] : 'text-text-primary'
  const indicator = gitStatus ? GIT_INDICATOR[gitStatus] : null

  const loadChildren = useCallback(async () => {
    if (!entry.isDir) return
    try {
      const res = await authFetch(`/api/files?path=${encodeURIComponent(entry.path)}`)
      const data = await res.json()
      setChildren(data)
    } catch { setChildren([]) }
  }, [entry.path, entry.isDir, authFetch])

  useEffect(() => {
    if (isOpen && children === null) loadChildren()
  }, [isOpen, children, loadChildren])

  const handleClick = () => {
    if (entry.isDir) { onToggle(entry.path); if (!isOpen) loadChildren() }
    else onSelect(entry)
  }

  const handleContext = (e) => {
    e.preventDefault()
    setCtx({ x: e.clientX, y: e.clientY })
  }

  const contextItems = [
    ...(entry.isDir ? [] : [{ label: 'Open', icon: File, action: () => onSelect(entry) }]),
    { label: 'Copy', icon: Copy, action: () => setClipboard({ path: entry.path, op: 'copy' }) },
    ...(entry.isDir ? [{ label: 'Paste', icon: Clipboard, action: () => onPaste(entry.path) }] : []),
    { separator: true },
    { label: 'Rename', icon: Pencil, action: () => onRename(entry.path) },
    { label: 'Delete', icon: Trash2, action: () => onDelete(entry.path) },
  ]

  return (
    <div>
      <div
        onClick={handleClick}
        onContextMenu={handleContext}
        className={`flex items-center h-[26px] cursor-pointer text-[13px] hover:bg-bg-hover/70 transition-colors group ${
          isSelected ? 'bg-accent/10' : ''
        }`}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        {/* Indent guides */}
        {depth > 0 && Array.from({ length: depth }).map((_, i) => (
          <span key={i} className="absolute border-l border-border/40"
            style={{ left: `${i * 12 + 10}px`, top: 0, bottom: 0 }} />
        ))}

        {entry.isDir ? (
          <>
            <span className="w-4 h-4 flex items-center justify-center shrink-0">
              {isOpen ? <ChevronDown className="w-3 h-3 text-text-muted" /> : <ChevronRight className="w-3 h-3 text-text-muted" />}
            </span>
            {isOpen
              ? <FolderOpen className="w-4 h-4 mr-1.5 shrink-0 text-yellow" />
              : <Folder className="w-4 h-4 mr-1.5 shrink-0 text-yellow/80" />
            }
          </>
        ) : (
          <>
            <span className="w-4 shrink-0" />
            <span className="mr-1.5"><FileIcon name={entry.name} /></span>
          </>
        )}
        <span className={`truncate flex-1 ${nameColor}`}>{entry.name}</span>
        {indicator && (
          <span className={`text-[10px] font-bold mr-2 shrink-0 ${indicator.color}`}>
            {indicator.label}
          </span>
        )}
      </div>

      {ctx && <ContextMenu x={ctx.x} y={ctx.y} items={contextItems} onClose={() => setCtx(null)} />}

      {entry.isDir && isOpen && children && (
        <div className="relative">
          {children.map((child) => (
            <TreeNode
              key={child.path} entry={child} depth={depth + 1}
              onSelect={onSelect} onToggle={onToggle} expanded={expanded}
              authFetch={authFetch} onRefresh={onRefresh} selectedPath={selectedPath}
              gitMap={gitMap} clipboard={clipboard} setClipboard={setClipboard}
              onPaste={onPaste} onDelete={onDelete} onRename={onRename}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Main Explorer ── */
export default function FileExplorer({ authFetch, onFileSelect, selectedPath, workspace }) {
  const [files, setFiles] = useState([])
  const [expanded, setExpanded] = useState(new Set())
  const [showNew, setShowNew] = useState(null)
  const [newName, setNewName] = useState('')
  const [clipboard, setClipboard] = useState(null)
  const [gitMap, setGitMap] = useState({})
  const [renaming, setRenaming] = useState(null)
  const [renameName, setRenameName] = useState('')

  const loadRoot = useCallback(async () => {
    try {
      const res = await authFetch('/api/files?path=')
      setFiles(await res.json())
    } catch {}
  }, [authFetch])

  const loadGitStatus = useCallback(async () => {
    try {
      const res = await authFetch('/api/git/status')
      const data = await res.json()
      const map = {}
      for (const f of (data.files || [])) { map[f.path] = f.status }
      setGitMap(map)
    } catch {}
  }, [authFetch])

  useEffect(() => {
    setFiles([])
    setExpanded(new Set())
    loadRoot()
    loadGitStatus()
    const interval = setInterval(loadGitStatus, 8000)
    return () => clearInterval(interval)
  }, [loadRoot, loadGitStatus, workspace])

  const toggleExpand = (path) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(path) ? next.delete(path) : next.add(path)
      return next
    })
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    await authFetch('/api/files/create', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: newName, isDir: showNew === 'folder' }),
    })
    setShowNew(null); setNewName(''); loadRoot()
  }

  const handlePaste = async (targetDir) => {
    if (!clipboard) return
    const name = clipboard.path.split('/').pop()
    const dest = targetDir ? `${targetDir}/${name}` : name
    // Copy via read + write
    try {
      const res = await authFetch(`/api/files/read?path=${encodeURIComponent(clipboard.path)}`)
      const data = await res.json()
      await authFetch('/api/files/write', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: dest, content: data.content }),
      })
      loadRoot()
    } catch {}
  }

  const handleDelete = async (path) => {
    await authFetch(`/api/files/delete?path=${encodeURIComponent(path)}`, { method: 'DELETE' })
    loadRoot()
  }

  const handleRename = (path) => {
    setRenaming(path)
    setRenameName(path.split('/').pop())
  }

  const submitRename = async (e) => {
    e.preventDefault()
    if (!renameName.trim() || !renaming) return
    const dir = renaming.includes('/') ? renaming.slice(0, renaming.lastIndexOf('/')) : ''
    const newPath = dir ? `${dir}/${renameName}` : renameName
    await authFetch('/api/files/rename', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPath: renaming, newPath }),
    })
    setRenaming(null); setRenameName(''); loadRoot()
  }

  // Keyboard paste
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'v' && clipboard) {
        handlePaste('')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [clipboard])

  return (
    <div className="h-full flex flex-col bg-bg-secondary overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border shrink-0">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted truncate">
          {workspace ? workspace.split('/').pop() : 'Explorer'}
        </span>
        <div className="flex gap-0.5">
          <button onClick={() => setShowNew('file')} className="p-1 hover:bg-bg-hover rounded text-text-muted hover:text-text-primary" title="New File">
            <FilePlus className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setShowNew('folder')} className="p-1 hover:bg-bg-hover rounded text-text-muted hover:text-text-primary" title="New Folder">
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => { loadRoot(); loadGitStatus() }} className="p-1 hover:bg-bg-hover rounded text-text-muted hover:text-text-primary" title="Refresh">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* New file/folder input */}
      {showNew && (
        <form onSubmit={handleCreate} className="px-2 py-1 border-b border-border">
          <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
            placeholder={showNew === 'file' ? 'filename.ext' : 'folder-name'}
            className="w-full bg-bg-input border border-accent rounded px-2 py-1 text-xs text-text-primary focus:outline-none"
            autoFocus onBlur={() => { setShowNew(null); setNewName('') }} />
        </form>
      )}

      {/* Rename input */}
      {renaming && (
        <form onSubmit={submitRename} className="px-2 py-1 border-b border-border">
          <input type="text" value={renameName} onChange={(e) => setRenameName(e.target.value)}
            className="w-full bg-bg-input border border-accent rounded px-2 py-1 text-xs text-text-primary focus:outline-none"
            autoFocus onBlur={() => setRenaming(null)} />
        </form>
      )}

      {/* File tree */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-0.5 select-none">
        {files.map((entry) => (
          <TreeNode
            key={entry.path} entry={entry} depth={0}
            onSelect={onFileSelect} onToggle={toggleExpand} expanded={expanded}
            authFetch={authFetch} onRefresh={loadRoot} selectedPath={selectedPath}
            gitMap={gitMap} clipboard={clipboard} setClipboard={setClipboard}
            onPaste={handlePaste} onDelete={handleDelete} onRename={handleRename}
          />
        ))}
      </div>
    </div>
  )
}
