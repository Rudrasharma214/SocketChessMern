const GameManager = require('../utils/gameManager');

class SocketController {
  constructor(io) {
    this.io = io;
  }

  handleConnection(socket) {
    console.log('User connected:', socket.id);

    // Create a new game
    socket.on('createGame', (playerName, options = {}) => {
      this.handleCreateGame(socket, playerName, options);
    });

    // Join an existing game
    socket.on('joinGame', (gameId, playerName) => {
      this.handleJoinGame(socket, gameId, playerName);
    });

    // Get available colors for a game
    socket.on('getAvailableColors', (gameId) => {
      this.handleGetAvailableColors(socket, gameId);
    });

    // Handle chess moves
    socket.on('makeMove', (gameId, move) => {
      this.handleMakeMove(socket, gameId, move);
    });

    // Handle undo move
    socket.on('undoMove', (gameId) => {
      this.handleUndoMove(socket, gameId);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      this.handleDisconnect(socket);
    });
  }

  handleCreateGame(socket, playerName, options = {}) {
    try {
      const { generateFriendlyGameId } = require('../config/socket');
      const gameId = generateFriendlyGameId();

      // Create new game with options
      const game = GameManager.createGame(gameId, {
        ...options,
        createdBy: socket.id
      });

      socket.join(gameId);

      // Add player to tracking
      GameManager.addPlayer(socket.id, gameId, playerName);

      // Add player to game with their preferred color (if any)
      const { color, isPlayer, wasPreferenceGranted } = GameManager.addPlayerToGame(
        game,
        socket.id,
        playerName,
        options.preferredColor
      );

      // Notify player of game creation and their assignment
      socket.emit('gameCreated', {
        gameId,
        color,
        playerName,
        wasPreferenceGranted,
        isCreator: true
      });

      // Send current game state
      const gameState = GameManager.getGameState(game);
      socket.emit('gameState', gameState);

      console.log(`Player ${playerName} created game ${gameId} as ${color}`);
    } catch (error) {
      console.error('Error in createGame:', error);
      socket.emit('error', { message: 'Failed to create game' });
    }
  }

  handleJoinGame(socket, gameId, playerName) {
    try {
      // Check if game exists
      const game = GameManager.getGame(gameId);
      if (!game) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }

      socket.join(gameId);

      // Add player to tracking
      GameManager.addPlayer(socket.id, gameId, playerName);

      // Add player to game without color preference (takes available color)
      const { color, isPlayer } = GameManager.addPlayerToGame(
        game,
        socket.id,
        playerName
      );

      // Notify player of their assignment
      socket.emit('playerAssigned', {
        color,
        playerName,
        isCreator: false
      });

      // Send current game state to the joining player
      const gameState = GameManager.getGameState(game);
      socket.emit('gameState', gameState);

      // Broadcast updated player list to all players in the room
      this.io.to(gameId).emit('playersUpdated', {
        players: game.players,
        playersCount: game.players.length
      });

      console.log(`Player ${playerName} joined game ${gameId} as ${color}`);
    } catch (error) {
      console.error('Error in joinGame:', error);
      socket.emit('error', { message: 'Failed to join game' });
    }
  }

  handleGetAvailableColors(socket, gameId) {
    try {
      const availableColors = GameManager.getAvailableColors(gameId);
      socket.emit('availableColors', { gameId, availableColors });
    } catch (error) {
      console.error('Error in getAvailableColors:', error);
      socket.emit('error', { message: 'Failed to get available colors' });
    }
  }

  handleMakeMove(socket, gameId, move) {
    try {
      const game = GameManager.getGame(gameId);
      const player = GameManager.getPlayer(socket.id);
      
      if (!game || !player) {
        socket.emit('invalidMove', { error: 'Game or player not found' });
        return;
      }
      
      // Check if it's the player's turn
      if (!GameManager.isPlayerTurn(game, socket.id)) {
        socket.emit('invalidMove', { error: 'Not your turn' });
        return;
      }
      
      // Make the move
      const result = GameManager.makeMove(game, move, socket.id);
      
      if (result) {
        // Broadcast the move to all players with personalized undo permissions
        this.broadcastMoveToPlayers(game, result);
        
        // Check for game over conditions
        if (game.chess.isGameOver()) {
          this.handleGameOver(game);
        }
      }
    } catch (error) {
      console.error('Error in makeMove:', error);
      socket.emit('invalidMove', { error: error.message });
    }
  }

  handleUndoMove(socket, gameId) {
    try {
      const game = GameManager.getGame(gameId);
      const player = GameManager.getPlayer(socket.id);
      
      if (!game || !player) {
        socket.emit('undoError', { error: 'Game or player not found' });
        return;
      }
      
      const playerColor = GameManager.getPlayerColor(game, socket.id);
      if (playerColor === 'spectator') {
        socket.emit('undoError', { error: 'Spectators cannot undo moves' });
        return;
      }
      
      // Attempt to undo the move
      GameManager.undoMove(game, socket.id);
      
      // Broadcast the undo to all players with personalized undo permissions
      this.broadcastUndoToPlayers(game, playerColor);
      
      console.log(`Player ${socket.id} undid move in game ${gameId}`);
    } catch (error) {
      console.error('Error in undoMove:', error);
      socket.emit('undoError', { error: error.message });
    }
  }

  handleDisconnect(socket) {
    console.log('User disconnected:', socket.id);
    
    const player = GameManager.getPlayer(socket.id);
    if (player) {
      const game = GameManager.getGame(player.gameId);
      if (game) {
        // Remove player from game
        const gameDeleted = GameManager.removePlayerFromGame(game, socket.id);
        
        if (!gameDeleted) {
          // Broadcast updated player list to remaining players
          this.io.to(player.gameId).emit('playersUpdated', {
            players: game.players,
            playersCount: game.players.length
          });
          
          // Also send the playerLeft event for logging/notification purposes
          socket.to(player.gameId).emit('playerLeft', {
            playerName: player.playerName,
            playersCount: game.players.length
          });
        }
      }
      
      // Remove player from tracking
      GameManager.removePlayer(socket.id);
    }
  }

  broadcastMoveToPlayers(game, moveResult) {
    const moveData = {
      move: moveResult,
      fen: game.chess.fen(),
      turn: game.chess.turn(),
      gameOver: game.chess.isGameOver(),
      history: game.chess.history(),
      canRedo: false
    };

    // Send to players with personalized undo permissions
    game.players.forEach(gamePlayer => {
      const canPlayerUndo = GameManager.canPlayerUndo(game, gamePlayer.socketId);
      
      this.io.to(gamePlayer.socketId).emit('moveMade', {
        ...moveData,
        canUndo: canPlayerUndo
      });
    });

    // Send to spectators (they can't undo)
    game.spectators.forEach(spectator => {
      this.io.to(spectator.socketId).emit('moveMade', {
        ...moveData,
        canUndo: false
      });
    });
  }

  broadcastUndoToPlayers(game, undoneByColor) {
    const undoData = {
      fen: game.chess.fen(),
      turn: game.chess.turn(),
      gameOver: game.chess.isGameOver(),
      history: game.chess.history(),
      canRedo: false,
      undoneBy: undoneByColor
    };

    // Send to players with personalized undo permissions
    game.players.forEach(gamePlayer => {
      const canPlayerUndo = GameManager.canPlayerUndo(game, gamePlayer.socketId);
      
      this.io.to(gamePlayer.socketId).emit('moveUndone', {
        ...undoData,
        canUndo: canPlayerUndo
      });
    });

    // Send to spectators (they can't undo)
    game.spectators.forEach(spectator => {
      this.io.to(spectator.socketId).emit('moveUndone', {
        ...undoData,
        canUndo: false
      });
    });
  }

  handleGameOver(game) {
    let result = 'draw';
    if (game.chess.isCheckmate()) {
      result = game.chess.turn() === 'w' ? 'black wins' : 'white wins';
    } else if (game.chess.isStalemate()) {
      result = 'stalemate';
    } else if (game.chess.isThreefoldRepetition()) {
      result = 'draw by repetition';
    } else if (game.chess.isInsufficientMaterial()) {
      result = 'draw by insufficient material';
    }
    
    this.io.to(game.gameId).emit('gameOver', { result });
    console.log(`Game ${game.gameId} ended: ${result}`);
  }
}

module.exports = SocketController;
