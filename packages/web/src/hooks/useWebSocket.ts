import { useEffect, useRef, useCallback, useState } from 'react'

export interface WebSocketMessage {
  event: string
  data: any
  timestamp: string
}

interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void
  onConnect?: () => void
  onDisconnect?: () => void
  autoReconnect?: boolean
  reconnectInterval?: number
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const optionsRef = useRef(options)
  optionsRef.current = options

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const apiUrl = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:4200'
    const wsUrl = apiUrl.replace(/^http/, 'ws') + '/ws'

    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        setConnected(true)
        optionsRef.current.onConnect?.()
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage
          optionsRef.current.onMessage?.(message)
        } catch {
          // ignore malformed messages
        }
      }

      ws.onclose = () => {
        setConnected(false)
        optionsRef.current.onDisconnect?.()
        wsRef.current = null

        if (optionsRef.current.autoReconnect !== false) {
          reconnectTimerRef.current = setTimeout(() => {
            connect()
          }, optionsRef.current.reconnectInterval ?? 3000)
        }
      }

      ws.onerror = () => {
        ws.close()
      }
    } catch {
      setConnected(false)
    }
  }, [])

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    optionsRef.current.autoReconnect = false
    wsRef.current?.close()
    wsRef.current = null
    setConnected(false)
  }, [])

  useEffect(() => {
    connect()
    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  return { connected, disconnect, reconnect: connect }
}
