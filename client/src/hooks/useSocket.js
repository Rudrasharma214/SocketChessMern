import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const useSocket = (serverPath) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const socketIo = io(serverPath, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      maxReconnectionAttempts: 5
    });

    // Add connection event listeners for debugging
    socketIo.on('connect', () => {
      console.log('Socket connected to:', serverPath);
    });

    socketIo.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    socketIo.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    setSocket(socketIo);

    return () => {
      socketIo.disconnect();
    };
  }, [serverPath]);

  return socket;
};

export default useSocket;
