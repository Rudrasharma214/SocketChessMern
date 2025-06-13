import { Chess } from 'chess.js';

// Game state storage (in production, use Redis or database)
const games = new Map();
const players = new Map();

class GameManager {
  static createGame(gameId, options = {}) {
    if (!games.has(gameId)) {
      games.set(gameId, {
        chess: new Chess(),
        players: [],
        spectators: [],
        gameId: gameId,
        moveHistory: [],
        currentMoveIndex: -1,
        createdAt: new Date(),
        lastActivity: new Date(),
        gameType: options.gameType || 'casual',
        timeControl: options.timeControl || null,
        isPrivate: options.isPrivate || false,
        createdBy: options.createdBy || null
      });
    }
    return games.get(gameId);
  }

  static getAvailableColors(gameId) {
    const game = this.getGame(gameId);
    if (!game) return [];

    const takenColors = game.players.map(p => p.color);
    const allColors = ['white', 'black'];
    return allColors.filter(color => !takenColors.includes(color));
  }

  static isColorAvailable(gameId, color) {
    const availableColors = this.getAvailableColors(gameId);
    return availableColors.includes(color);
  }

  static getGame(gameId) {
    return games.get(gameId);
  }

  static deleteGame(gameId) {
    return games.delete(gameId);
  }

  static addPlayer(socketId, gameId, playerName) {
    players.set(socketId, { gameId, playerName, socketId });
  }

  static getPlayer(socketId) {
    return players.get(socketId);
  }

  static removePlayer(socketId) {
    return players.delete(socketId);
  }

  static addPlayerToGame(game, socketId, playerName, preferredColor = null) {
    if (game.players.length < 2) {
      let assignedColor;

      if (game.players.length === 0) {
        // First player - assign their preferred color or default to white
        assignedColor = preferredColor || 'white';
      } else {
        // Second player - assign the opposite color of the first player
        const firstPlayerColor = game.players[0].color;
        assignedColor = firstPlayerColor === 'white' ? 'black' : 'white';
      }

      game.players.push({
        socketId: socketId,
        name: playerName,
        color: assignedColor,
        joinedAt: new Date()
      });

      const wasPreferenceGranted = !preferredColor || assignedColor === preferredColor;
      return { color: assignedColor, isPlayer: true, wasPreferenceGranted };
    } else {
      game.spectators.push({
        socketId: socketId,
        name: playerName,
        joinedAt: new Date()
      });
      return { color: 'spectator', isPlayer: false, wasPreferenceGranted: false };
    }
  }

  static removePlayerFromGame(game, socketId) {
    game.players = game.players.filter(p => p.socketId !== socketId);
    game.spectators = game.spectators.filter(s => s.socketId !== socketId);
    
    // Clean up empty games
    if (game.players.length === 0 && game.spectators.length === 0) {
      this.deleteGame(game.gameId);
      return true; // Game was deleted
    }
    return false; // Game still exists
  }

  static makeMove(game, move, playerId) {
    try {
      const result = game.chess.move(move);
      if (result) {
        // Store the move history for undo functionality
        game.moveHistory.push({
          move: result,
          fen: game.chess.fen(),
          timestamp: Date.now(),
          playerId: playerId
        });
        
        game.currentMoveIndex = game.moveHistory.length - 1;
        game.lastActivity = new Date();
        
        return result;
      }
      return null;
    } catch (error) {
      throw error;
    }
  }

  static undoMove(game, playerId) {
    if (!game.moveHistory || game.moveHistory.length === 0) {
      throw new Error('No moves to undo');
    }

    const lastMove = game.moveHistory[game.moveHistory.length - 1];
    if (lastMove.playerId !== playerId) {
      throw new Error('You can only undo your own moves');
    }

    try {
      game.chess.undo();
      game.moveHistory.pop();
      game.currentMoveIndex = game.moveHistory.length - 1;
      game.lastActivity = new Date();
      return true;
    } catch (error) {
      throw error;
    }
  }

  static getGameState(game) {
    return {
      fen: game.chess.fen(),
      turn: game.chess.turn(),
      gameOver: game.chess.isGameOver(),
      players: game.players,
      history: game.chess.history(),
      canUndo: game.moveHistory ? game.moveHistory.length > 0 : false,
      canRedo: false
    };
  }

  static canPlayerUndo(game, playerId) {
    if (!game.moveHistory || game.moveHistory.length === 0) {
      return false;
    }
    const lastMove = game.moveHistory[game.moveHistory.length - 1];
    return lastMove.playerId === playerId;
  }

  static getPlayerColor(game, socketId) {
    const player = game.players.find(p => p.socketId === socketId);
    return player ? player.color : 'spectator';
  }

  static isPlayerTurn(game, socketId) {
    const playerColor = this.getPlayerColor(game, socketId);
    if (playerColor === 'spectator') return false;
    
    const currentTurn = game.chess.turn() === 'w' ? 'white' : 'black';
    return playerColor === currentTurn;
  }

  static getAllGames() {
    return Array.from(games.entries()).map(([gameId, game]) => ({
      gameId,
      playersCount: game.players.length,
      spectatorsCount: game.spectators.length,
      gameOver: game.chess.isGameOver(),
      createdAt: game.createdAt,
      lastActivity: game.lastActivity
    }));
  }

  static getGamesCount() {
    return games.size;
  }

  static getPlayersCount() {
    return players.size;
  }

  // Cleanup inactive games (can be called periodically)
  static cleanupInactiveGames(maxInactiveMinutes = 60) {
    const now = new Date();
    const inactiveGames = [];
    
    for (const [gameId, game] of games.entries()) {
      const inactiveTime = (now - game.lastActivity) / (1000 * 60); // minutes
      if (inactiveTime > maxInactiveMinutes && game.players.length === 0) {
        inactiveGames.push(gameId);
      }
    }
    
    inactiveGames.forEach(gameId => {
      this.deleteGame(gameId);
    });
    
    return inactiveGames.length;
  }
}

export default GameManager;
