import { Moon, Sun, FolderOpen, Info, Monitor } from 'lucide-react'
import { useTheme } from '../hooks/useTheme'
import Logo from './Logo'

export default function Settings({ visible, onOpenFolder, workspace }) {
  const { theme, setTheme, isDark } = useTheme()

  if (!visible) return null

  return (
    <div className="h-full flex flex-col bg-bg-secondary overflow-y-auto">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold text-text-primary">Settings</h2>
      </div>

      <div className="p-4 space-y-6">
        {/* Theme */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">Appearance</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setTheme('dark')}
              className={`rounded-xl border-2 p-3 transition-all ${
                isDark
                  ? 'border-accent bg-accent/5'
                  : 'border-border hover:border-border-active'
              }`}
            >
              <div className="rounded-lg bg-[#111827] border border-[#1e293b] p-2.5 mb-2">
                <div className="flex gap-1 mb-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#fb7185]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-[#fbbf24]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-[#34d399]" />
                </div>
                <div className="space-y-1">
                  <div className="h-1 w-3/4 rounded bg-[#60a5fa]/30" />
                  <div className="h-1 w-1/2 rounded bg-[#a78bfa]/30" />
                  <div className="h-1 w-5/6 rounded bg-[#34d399]/20" />
                </div>
              </div>
              <div className="flex items-center justify-center gap-1.5 text-xs">
                <Moon className="w-3.5 h-3.5" />
                <span className="font-medium">Midnight</span>
              </div>
            </button>

            <button
              onClick={() => setTheme('light')}
              className={`rounded-xl border-2 p-3 transition-all ${
                !isDark
                  ? 'border-accent bg-accent/5'
                  : 'border-border hover:border-border-active'
              }`}
            >
              <div className="rounded-lg bg-white border border-[#e2e8f0] p-2.5 mb-2">
                <div className="flex gap-1 mb-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#dc2626]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-[#d97706]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-[#16a34a]" />
                </div>
                <div className="space-y-1">
                  <div className="h-1 w-3/4 rounded bg-[#3b82f6]/30" />
                  <div className="h-1 w-1/2 rounded bg-[#7c3aed]/30" />
                  <div className="h-1 w-5/6 rounded bg-[#16a34a]/20" />
                </div>
              </div>
              <div className="flex items-center justify-center gap-1.5 text-xs text-[#475569]">
                <Sun className="w-3.5 h-3.5" />
                <span className="font-medium">Daylight</span>
              </div>
            </button>
          </div>
        </div>

        {/* Workspace */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">Workspace</h3>
          <div className="bg-bg-primary border border-border rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <FolderOpen className="w-4 h-4 text-yellow" />
              <span className="text-xs text-text-secondary font-mono truncate flex-1">
                {workspace || 'No folder open'}
              </span>
            </div>
            <button
              onClick={onOpenFolder}
              className="w-full text-xs py-2 rounded-lg border border-border text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
            >
              Change Folder
            </button>
          </div>
        </div>

        {/* About */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">About</h3>
          <div className="bg-bg-primary border border-border rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-bg-hover flex items-center justify-center overflow-hidden">
                <Logo size={24} />
              </div>
              <div>
                <div className="text-sm font-semibold text-text-primary">wede</div>
                <div className="text-[11px] text-text-muted">Web Development Environment</div>
              </div>
            </div>
            <div className="text-[11px] text-text-muted space-y-0.5 mt-2">
              <p>A lightweight, self-hosted web IDE.</p>
              <p>Single binary. No cloud required.</p>
            </div>
          </div>
        </div>

        {/* Keyboard shortcuts */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">Shortcuts</h3>
          <div className="space-y-1.5 text-xs">
            {[
              ['Save file', 'Ctrl/Cmd + S'],
              ['Search in file', 'Ctrl/Cmd + F'],
              ['Command palette', 'Ctrl/Cmd + Shift + P'],
            ].map(([action, keys]) => (
              <div key={action} className="flex items-center justify-between py-1.5 px-3 bg-bg-primary rounded-lg border border-border">
                <span className="text-text-secondary">{action}</span>
                <kbd className="text-[10px] font-mono text-text-muted bg-bg-hover px-1.5 py-0.5 rounded border border-border">
                  {keys}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
