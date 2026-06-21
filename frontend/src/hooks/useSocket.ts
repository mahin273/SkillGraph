import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { api } from "../services/api";

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [socketState, setSocketState] = useState<Socket | null>(null);

  useEffect(() => {
    const connectSocket = async () => {
      if (socketRef.current) return;

      try {
        
        const response = await api.get("/auth/socket-token");
        const socketToken = response.data.data.token;

        const socket = io(import.meta.env.VITE_SOCKET_URL ?? "http://localhost:3002", {
          auth: {
            token: socketToken
          },
          autoConnect: true
        });

        socket.on("connect", () => {
          console.log("Socket.IO connected");
        });

        socket.on("connect_error", (error) => {
          console.error("Socket.IO connection error:", error.message);
        });

        socket.on("disconnect", () => {
          console.log("Socket.IO disconnected");
        });

        socketRef.current = socket;
        setSocketState(socket);
      } catch (error) {
        console.error("Failed to connect socket:", error);
      }
    };

    void connectSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocketState(null);
      }
    };
  }, []);

  return socketState;
}
