import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const ThemeContext = createContext()

const STORAGE_KEY = 'wede_theme'

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'dark' || stored === 'light') return stored
    return null // null = not yet chosen
  })

  const setTheme = useCallback((t) => {
    setThemeState(t)
    localStorage.setItem(STORAGE_KEY, t)
    document.documentElement.setAttribute('data-theme', t)
  }, [])

  useEffect(() => {
    if (theme) {
      document.documentElement.setAttribute('data-theme', theme)
    }
  }, [theme])

  const toggle = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [theme, setTheme])

  const isDark = theme === 'dark' || theme === null

  // Terminal theme colors that match current CSS theme
  const terminalTheme = isDark ? {
    background: '#0a0f1a',
    foreground: '#f1f5f9',
    cursor: '#60a5fa',
    cursorAccent: '#0a0f1a',
    selectionBackground: 'rgba(96, 165, 250, 0.3)',
    black: '#334155',
    red: '#fb7185',
    green: '#34d399',
    yellow: '#fbbf24',
    blue: '#60a5fa',
    magenta: '#a78bfa',
    cyan: '#22d3ee',
    white: '#e2e8f0',
    brightBlack: '#475569',
    brightRed: '#fb7185',
    brightGreen: '#34d399',
    brightYellow: '#fbbf24',
    brightBlue: '#93c5fd',
    brightMagenta: '#a78bfa',
    brightCyan: '#22d3ee',
    brightWhite: '#f1f5f9',
  } : {
    background: '#f1f5f9',
    foreground: '#0f172a',
    cursor: '#3b82f6',
    cursorAccent: '#f1f5f9',
    selectionBackground: 'rgba(59, 130, 246, 0.2)',
    black: '#64748b',
    red: '#dc2626',
    green: '#16a34a',
    yellow: '#d97706',
    blue: '#3b82f6',
    magenta: '#7c3aed',
    cyan: '#0891b2',
    white: '#0f172a',
    brightBlack: '#94a3b8',
    brightRed: '#dc2626',
    brightGreen: '#16a34a',
    brightYellow: '#d97706',
    brightBlue: '#2563eb',
    brightMagenta: '#7c3aed',
    brightCyan: '#0891b2',
    brightWhite: '#0f172a',
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle, isDark, terminalTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
