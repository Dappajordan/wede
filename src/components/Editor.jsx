import { useEffect, useRef } from 'react'
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightActiveLine, drawSelection, highlightSpecialChars } from '@codemirror/view'
import { EditorState, Compartment } from '@codemirror/state'
import { defaultKeymap, indentWithTab, history, historyKeymap } from '@codemirror/commands'
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, foldGutter, indentOnInput } from '@codemirror/language'
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import { oneDark } from '@codemirror/theme-one-dark'
import { useTheme } from '../hooks/useTheme'
import { Code } from 'lucide-react'

import { javascript } from '@codemirror/lang-javascript'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { json } from '@codemirror/lang-json'
import { python } from '@codemirror/lang-python'
import { go } from '@codemirror/lang-go'
import { markdown } from '@codemirror/lang-markdown'
import { xml } from '@codemirror/lang-xml'
import { sql } from '@codemirror/lang-sql'
import { rust } from '@codemirror/lang-rust'
import { cpp } from '@codemirror/lang-cpp'
import { java } from '@codemirror/lang-java'
import { php } from '@codemirror/lang-php'

const langMap = {
  js: () => javascript(), jsx: () => javascript({ jsx: true }),
  ts: () => javascript({ typescript: true }), tsx: () => javascript({ jsx: true, typescript: true }),
  html: () => html(), htm: () => html(), css: () => css(), json: () => json(),
  py: () => python(), go: () => go(), md: () => markdown(),
  xml: () => xml(), svg: () => xml(), sql: () => sql(),
  rs: () => rust(), c: () => cpp(), cpp: () => cpp(), h: () => cpp(),
  java: () => java(), php: () => php(),
}

function getLang(filename) {
  const ext = filename.split('.').pop().toLowerCase()
  return langMap[ext]?.() || []
}

const lightTheme = EditorView.theme({
  '&': { backgroundColor: 'var(--c-bg-primary)', color: 'var(--c-text-primary)' },
  '.cm-gutters': { backgroundColor: 'var(--c-bg-secondary)', color: 'var(--c-text-muted)', borderRight: '1px solid var(--c-border)' },
  '.cm-activeLineGutter': { backgroundColor: 'var(--c-bg-hover)', color: 'var(--c-text-primary)' },
  '.cm-activeLine': { backgroundColor: 'var(--c-accent-glow)' },
  '.cm-cursor': { borderLeftColor: 'var(--c-accent)' },
}, { dark: false })

export default function Editor({ file, content, onChange, onSave, onCursorChange }) {
  const containerRef = useRef(null)
  const viewRef = useRef(null)
  const onChangeRef = useRef(onChange)
  const onSaveRef = useRef(onSave)
  const onCursorRef = useRef(onCursorChange)
  const themeCompRef = useRef(new Compartment())
  const { isDark } = useTheme()

  onChangeRef.current = onChange
  onSaveRef.current = onSave
  onCursorRef.current = onCursorChange

  useEffect(() => {
    if (!containerRef.current) return

    const themeComp = themeCompRef.current

    const state = EditorState.create({
      doc: content || '',
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        highlightSpecialChars(),
        drawSelection(),
        bracketMatching(),
        closeBrackets(),
        indentOnInput(),
        foldGutter(),
        highlightSelectionMatches(),
        history(),
        themeComp.of(isDark ? oneDark : lightTheme),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        getLang(file?.name || ''),
        keymap.of([
          ...closeBracketsKeymap, ...defaultKeymap,
          ...searchKeymap, ...historyKeymap, indentWithTab,
        ]),
        keymap.of([{ key: 'Mod-s', run: () => { onSaveRef.current?.(); return true } }]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) onChangeRef.current?.(update.state.doc.toString())
          if (update.selectionSet || update.docChanged) {
            const pos = update.state.selection.main.head
            const line = update.state.doc.lineAt(pos)
            onCursorRef.current?.({ line: line.number, col: pos - line.from + 1 })
          }
        }),
        EditorView.theme({
          '&': { height: '100%' },
          '.cm-scroller': { overflow: 'auto' },
        }),
      ],
    })

    const view = new EditorView({ state, parent: containerRef.current })
    viewRef.current = view
    return () => view.destroy()
  }, [file?.path])

  // Toggle dark/light theme
  useEffect(() => {
    if (!viewRef.current) return
    viewRef.current.dispatch({
      effects: themeCompRef.current.reconfigure(isDark ? oneDark : lightTheme),
    })
  }, [isDark])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (content !== undefined && content !== current) {
      view.dispatch({ changes: { from: 0, to: current.length, insert: content || '' } })
    }
  }, [content])

  if (!file) {
    return (
      <div className="h-full flex items-center justify-center bg-bg-primary">
        <div className="text-center text-text-muted animate-fade-in">
          <Code className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No file open</p>
          <p className="text-xs mt-1">Select a file from the explorer</p>
        </div>
      </div>
    )
  }

  return <div ref={containerRef} className="h-full overflow-hidden" />
}
