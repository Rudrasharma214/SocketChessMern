import { Server } from 'socket.io';
import crypto from 'crypto';

// Generate a unique game ID
const generateGameId = () => {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
};

// Generate a more user-friendly game ID
const generateFriendlyGameId = () => {
  const adjectives = ['Quick', 'Smart', 'Bold', 'Swift', 'Clever', 'Bright', 'Sharp', 'Fast'];
  const nouns = ['Knight', 'Bishop', 'Rook', 'Queen', 'King', 'Pawn', 'Castle', 'Crown'];

  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(Math.random() * 1000);

  return `${adjective}${noun}${number}`;
};

const configureSocket = (server) => {
  // Configure CORS origins based on environment
  const allowedOrigins = process.env.NODE_ENV === 'production'
    ? [
        process.env.CLIENT_URL,
        process.env.PRODUCTION_URL,
        // Allow same-origin requests in production
        true
      ].filter(Boolean)
    : [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000"
      ];

  const io = new Server(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production' ? true : allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"]
    },
    transports: ['websocket', 'polling'],
    // Production optimizations
    pingTimeout: 60000,
    pingInterval: 25000,
    upgradeTimeout: 30000,
    maxHttpBufferSize: 1e6, // 1MB
    // Allow HTTP long-polling fallback
    allowEIO3: true
  });

  // Add connection logging for debugging
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} from ${socket.handshake.address}`);

    socket.on('disconnect', (reason) => {
      console.log(`Socket disconnected: ${socket.id}, reason: ${reason}`);
    });
  });

  return io;
};

export {
  configureSocket,
  generateGameId,
  generateFriendlyGameId
};
