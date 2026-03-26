import { useEffect, useRef } from 'react'
import { Terminal as XTerminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'

export default function Terminal({ token, visible, terminalTheme, fontSize = 13 }) {
  const containerRef = useRef(null)
  const termRef = useRef(null)
  const wsRef = useRef(null)
  const fitRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current || !token || termRef.current) return

    const term = new XTerminal({
      cursorBlink: true,
      fontSize,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'SF Mono', monospace",
      theme: terminalTheme,
      allowTransparency: true,
      scrollback: 5000,
    })

    const fitAddon = new FitAddon()
    const webLinksAddon = new WebLinksAddon()
    term.loadAddon(fitAddon)
    term.loadAddon(webLinksAddon)
    term.open(containerRef.current)

    fitRef.current = fitAddon
    termRef.current = term

    setTimeout(() => fitAddon.fit(), 50)

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${window.location.host}/api/terminal?token=${token}`)
    ws.binaryType = 'arraybuffer'
    wsRef.current = ws

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }))
    }

    ws.onmessage = (event) => {
      const data = event.data instanceof ArrayBuffer
        ? new TextDecoder().decode(event.data)
        : event.data
      term.write(data)
    }

    ws.onerror = () => term.write('\r\n\x1b[31mConnection error\x1b[0m\r\n')
    ws.onclose = () => term.write('\r\n\x1b[33mDisconnected\x1b[0m\r\n')

    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(data)
    })

    term.onResize(({ cols, rows }) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'resize', cols, rows }))
      }
    })

    const ro = new ResizeObserver(() => {
      try { fitAddon.fit() } catch {}
    })
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      ws.close()
      term.dispose()
      termRef.current = null
      wsRef.current = null
      fitRef.current = null
    }
  }, [token])

  // Update theme dynamically
  useEffect(() => {
    if (termRef.current && terminalTheme) {
      termRef.current.options.theme = terminalTheme
    }
  }, [terminalTheme])

  useEffect(() => {
    if (visible && fitRef.current) {
      setTimeout(() => { try { fitRef.current.fit() } catch {} }, 50)
    }
  }, [visible])

  return <div ref={containerRef} className="h-full w-full" style={{ display: visible ? 'block' : 'none' }} />
}
