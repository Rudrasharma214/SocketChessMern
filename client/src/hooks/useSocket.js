import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const useSocket = (serverPath) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const socketIo = io(serverPath, {
      transports: ['websocket', 'polling']
    });

    setSocket(socketIo);

    return () => {
      socketIo.disconnect();
    };
  }, [serverPath]);

  return socket;
};

export default useSocket;
