import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Configure environment variables
dotenv.config();

// ES6 module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import configurations and controllers
import { configureSocket } from './config/socket.js';
import { configureCors } from './middleware/cors.js';
import SocketController from './controllers/socketController.js';
import apiRoutes from './routes/api.js';

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

// Root route for debugging
app.get('/server-status', (req, res) => {
  res.json({
    success: true,
    message: 'Chess game server is running',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../client/dist")));

  // Serve React app for all non-API routes
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../client", "dist", "index.html"));
  });
} else {
  // Development 404 handler for non-API routes
  app.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      message: 'Route not found - API server running in development mode'
    });
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});
// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Chess game server running on port ${PORT}`);
});

