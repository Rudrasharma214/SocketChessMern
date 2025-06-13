const socketIo = require('socket.io');
const crypto = require('crypto');

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
  const io = socketIo(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  return io;
};

module.exports = {
  configureSocket,
  generateGameId,
  generateFriendlyGameId
};
