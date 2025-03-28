import { useEffect, useRef, useState } from "react";

type WebsocketMessage = {
  type: string;
  data: any;
  category: string;
};

export function useWebSocket() {
  const [transactions, setTransactions] = useState<WebsocketMessage[]>([]);
  const ws = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);

  useEffect(() => {
    let isMounted = true;
    const maxReconnectAttempts = 5;

    const connect = () => {
      if (reconnectAttempts.current >= maxReconnectAttempts) {
        console.error("Max reconnection attempts reached");
        return;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No authentication token found");
        return;
      }

      try {
        const encodedToken = encodeURIComponent(token);
        ws.current = new WebSocket(
          `ws://localhost:3002/?token=${encodedToken}`
        );

        ws.current.onopen = () => {
          console.log("WebSocket connected");
          reconnectAttempts.current = 0;
        };

        ws.current.onerror = (error) => {
          console.error("WebSocket error:", error);
        };

        ws.current.onmessage = (event: any) => {
          try {
            const parsed = JSON.parse(event.data);
            setTransactions((prev) => [parsed, ...prev.slice(0, 49)]);
          } catch (error) {
            console.error("Parse error:", error, "Data:", event.data);
          }
        };

        ws.current.onclose = (event) => {
          console.log(
            `WebSocket closed: Code ${event.code}, Reason: ${event.reason}`
          );
          if (isMounted) {
            reconnectAttempts.current++;
            setTimeout(
              connect,
              Math.min(1000 * reconnectAttempts.current, 10000)
            );
          }
        };
      } catch (error) {
        console.error("WebSocket connection failed:", error);
      }
    };

    connect();
    return () => {
      isMounted = false;
      setTimeout(() => {
        if (ws.current?.readyState === WebSocket.OPEN) {
          ws.current?.close();
        }
      }, 1000);
    };
  }, []);

  return { transactions };
}
