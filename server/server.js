const express = require('express');
const http = require('http');
require('dotenv').config();

// Import configurations and controllers
const { configureSocket } = require('./config/socket');
const { configureCors } = require('./middleware/cors');
const SocketController = require('./controllers/socketController');
const apiRoutes = require('./routes/api');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Configure middleware
app.use(configureCors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure Socket.IO
const io = configureSocket(server);
const socketController = new SocketController(io);

// Socket.IO connection handling
io.on('connection', (socket) => {
  socketController.handleConnection(socket);
});



// API Routes
app.use('/api', apiRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});


if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../client/dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../client", "dist", "index.html"));
  });
}
// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Chess game server running on port ${PORT}`);
  // console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  // console.log(`🌐 Client URL: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
});

