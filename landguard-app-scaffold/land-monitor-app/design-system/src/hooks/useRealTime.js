import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

/**
 * useRealTime — connects to the EarthGlobal WebSocket server, authenticates with
 * the user's JWT, and subscribes to real-time events. Returns the connection
 * status and a way to register event handlers.
 *
 * @param {Object} options
 * @param {string} options.url       — WebSocket server URL (defaults to VITE_API_URL or localhost:4000)
 * @param {string} options.token     — JWT auth token
 * @returns {{
 *   connected: boolean,
 *   socket: import('socket.io-client').Socket | null,
 *   on: (event: string, handler: (payload: any) => void) => () => void,
 * }}
 */
export default function useRealTime({ url, token } = {}) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const handlersRef = useRef(new Map());

  const serverUrl = url || import.meta.env.VITE_API_URL || 'http://localhost:4000';

  // Connect once when a token is available
  useEffect(() => {
    if (!token) return;

    const socket = io(serverUrl, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    socketRef.current = socket;

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // Bridge all registered handlers to the socket
    const eventTypes = ['alert:new', 'visit:status', 'notification:new', 'building_change:detected'];
    const socketListeners = eventTypes.map((event) => {
      const listener = (payload) => {
        const handlers = handlersRef.current.get(event);
        if (handlers) handlers.forEach((h) => h(payload));
      };
      socket.on(event, listener);
      return { event, listener };
    });

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socketListeners.forEach(({ event, listener }) => socket.off(event, listener));
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [serverUrl, token]);

  // Register an event handler. Returns an unsubscribe function.
  const on = useCallback((event, handler) => {
    if (!handlersRef.current.has(event)) {
      handlersRef.current.set(event, new Set());
    }
    handlersRef.current.get(event).add(handler);
    return () => {
      handlersRef.current.get(event)?.delete(handler);
    };
  }, []);

  return { connected, socket: socketRef.current, on };
}
