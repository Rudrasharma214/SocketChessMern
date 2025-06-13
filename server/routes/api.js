import express from 'express';
import GameManager from '../utils/gameManager.js';
import { generateFriendlyGameId } from '../config/socket.js';

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Chess game server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// Create a new game
router.post('/games/create', (req, res) => {
  try {
    const { gameType = 'casual', timeControl = null, isPrivate = false } = req.body;
    const gameId = generateFriendlyGameId();

    const game = GameManager.createGame(gameId, {
      gameType,
      timeControl,
      isPrivate
    });

    res.json({
      success: true,
      gameId: game.gameId,
      message: 'Game created successfully'
    });
  } catch (error) {
    console.error('Error creating game:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create game'
    });
  }
});

// Get all games
router.get('/games', (req, res) => {
  try {
    const gameList = GameManager.getAllGames();
    res.json({
      success: true,
      games: gameList,
      totalGames: gameList.length
    });
  } catch (error) {
    console.error('Error fetching games:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch games'
    });
  }
});

// Get specific game details
router.get('/games/:gameId', (req, res) => {
  try {
    const { gameId } = req.params;
    const game = GameManager.getGame(gameId);

    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    const gameState = GameManager.getGameState(game);
    res.json({
      success: true,
      game: {
        ...gameState,
        gameId: game.gameId,
        createdAt: game.createdAt,
        lastActivity: game.lastActivity,
        spectatorsCount: game.spectators.length,
        availableColors: GameManager.getAvailableColors(gameId)
      }
    });
  } catch (error) {
    console.error('Error fetching game:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch game details'
    });
  }
});

// Get available colors for a game
router.get('/games/:gameId/colors', (req, res) => {
  try {
    const { gameId } = req.params;
    const game = GameManager.getGame(gameId);

    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    const availableColors = GameManager.getAvailableColors(gameId);
    res.json({
      success: true,
      gameId,
      availableColors,
      totalPlayers: game.players.length,
      maxPlayers: 2
    });
  } catch (error) {
    console.error('Error fetching available colors:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available colors'
    });
  }
});

// Get server statistics
router.get('/stats', (req, res) => {
  try {
    res.json({
      success: true,
      stats: {
        totalGames: GameManager.getGamesCount(),
        totalPlayers: GameManager.getPlayersCount(),
        serverUptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch server statistics'
    });
  }
});

// Cleanup inactive games (admin endpoint)
router.post('/cleanup', (req, res) => {
  try {
    const { maxInactiveMinutes = 60 } = req.body;
    const cleanedCount = GameManager.cleanupInactiveGames(maxInactiveMinutes);
    
    res.json({
      success: true,
      message: `Cleaned up ${cleanedCount} inactive games`,
      cleanedGames: cleanedCount
    });
  } catch (error) {
    console.error('Error cleaning up games:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup games'
    });
  }
});

// Error handling middleware for API routes
router.use((error, req, res, next) => {
  console.error('API Error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

export default router;
