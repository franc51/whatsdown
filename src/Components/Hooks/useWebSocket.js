// hooks/useWebSocket.js
import { useEffect, useRef, useState, useCallback } from "react";
import { jwtDecode } from "jwt-decode";

export function useWebSocket({
  onMessage,
  onStatusUpdate,
  onTyping,
  onError,
  onReconnectAttempt,
}) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const reconnectTimeoutRef = useRef(null);
  const pingIntervalRef = useRef(null);
  const reconnectDelayRef = useRef(3000); // Exponential backoff

  const stableCallbacks = {
    onMessageRef: useRef(onMessage),
    onTypingRef: useRef(onTyping),
    onStatusRef: useRef(onStatusUpdate),
    onErrorRef: useRef(onError),
    onReconnectRef: useRef(onReconnectAttempt),
  };

  // Update refs when callbacks change
  useEffect(() => {
    stableCallbacks.onMessageRef.current = onMessage;
    stableCallbacks.onTypingRef.current = onTyping;
    stableCallbacks.onStatusRef.current = onStatusUpdate;
    stableCallbacks.onErrorRef.current = onError;
    stableCallbacks.onReconnectRef.current = onReconnectAttempt;
  }, [onMessage, onTyping, onStatusUpdate, onError, onReconnectAttempt]);

  const connect = useCallback(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const decoded = jwtDecode(token);
      if (decoded.exp * 1000 < Date.now()) {
        console.warn("❌ Token expired, skipping WebSocket connect.");
        return;
      }
    } catch {
      console.warn("❌ Invalid token, skipping WebSocket connect.");
      return;
    }

    const ws = new WebSocket("wss://websocket-service-30vz.onrender.com");
    socketRef.current = ws;

    ws.onopen = () => {
      console.log("✅ WebSocket connected");
      setConnected(true);
      reconnectDelayRef.current = 3000; // Reset delay on success
      ws.send(JSON.stringify({ type: "register", token }));

      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, 25000);
    };

    ws.onmessage = (event) => {
      const handleParsed = (parsed) => {
        if (!parsed) return;
        switch (parsed.type) {
          case "typing":
            stableCallbacks.onTypingRef.current?.(parsed);
            break;
          case "message":
            stableCallbacks.onMessageRef.current?.(parsed);
            break;
          case "status":
          case "onlineUsers":
            stableCallbacks.onStatusRef.current?.(parsed);
            break;
        }
      };

      try {
        if (event.data instanceof Blob) {
          const reader = new FileReader();
          reader.onload = () => handleParsed(JSON.parse(reader.result));
          reader.readAsText(event.data);
        } else {
          handleParsed(JSON.parse(event.data));
        }
      } catch (err) {
        console.error("⚠️ Error parsing WebSocket message:", err);
      }
    };

    ws.onerror = (event) => {
      console.error("❌ WebSocket error:", event);
      stableCallbacks.onErrorRef.current?.(event);
    };

    ws.onclose = (event) => {
      console.log("🔌 WebSocket closed:", event.code, event.reason);
      setConnected(false);
      clearInterval(pingIntervalRef.current);

      if (event.code === 4000) {
        console.warn("⛔ Duplicate connection detected. Not reconnecting.");
        return;
      }

      // Visibility-based reconnect optional
      if (document.visibilityState === "hidden") {
        console.log("🕶️ Tab hidden, skipping reconnect.");
        return;
      }

      stableCallbacks.onReconnectRef.current?.();

      // Exponential backoff reconnect
      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectDelayRef.current = Math.min(
          reconnectDelayRef.current * 2,
          30000
        ); // Max 30s
        connect();
      }, reconnectDelayRef.current);
    };
  }, []);

  useEffect(() => {
    connect();

    return () => {
      clearInterval(pingIntervalRef.current);
      clearTimeout(reconnectTimeoutRef.current);
      socketRef.current?.close(1000, "Component unmounted");
    };
  }, [connect]);

  const sendMessage = useCallback((msg) => {
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(msg));
    } else {
      console.warn("⚠️ Socket not open. Message not sent.");
    }
  }, []);

  return {
    socket: socketRef.current,
    sendMessage,
    connected,
  };
}
