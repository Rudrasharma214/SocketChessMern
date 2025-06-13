import GameManager from '../utils/gameManager.js';

class GameController {
  // Create a new game
  static createGame(gameId, options = {}) {
    try {
      const game = GameManager.createGame(gameId);
      
      // Apply any custom options
      if (options.timeControl) {
        game.timeControl = options.timeControl;
      }
      
      if (options.variant) {
        game.variant = options.variant;
      }
      
      return {
        success: true,
        game: GameManager.getGameState(game),
        gameId: game.gameId
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get game state
  static getGameState(gameId) {
    try {
      const game = GameManager.getGame(gameId);
      
      if (!game) {
        return {
          success: false,
          error: 'Game not found'
        };
      }
      
      return {
        success: true,
        game: GameManager.getGameState(game)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Validate move
  static validateMove(gameId, move, playerId) {
    try {
      const game = GameManager.getGame(gameId);
      
      if (!game) {
        return {
          valid: false,
          error: 'Game not found'
        };
      }
      
      // Check if it's the player's turn
      if (!GameManager.isPlayerTurn(game, playerId)) {
        return {
          valid: false,
          error: 'Not your turn'
        };
      }
      
      // Create a temporary chess instance to validate the move
      const tempChess = new (require('chess.js').Chess)(game.chess.fen());
      
      try {
        const result = tempChess.move(move);
        return {
          valid: true,
          move: result
        };
      } catch (moveError) {
        return {
          valid: false,
          error: 'Invalid move'
        };
      }
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  // Get legal moves for a piece
  static getLegalMoves(gameId, square) {
    try {
      const game = GameManager.getGame(gameId);
      
      if (!game) {
        return {
          success: false,
          error: 'Game not found'
        };
      }
      
      const moves = game.chess.moves({ square, verbose: true });
      
      return {
        success: true,
        moves: moves.map(move => ({
          from: move.from,
          to: move.to,
          piece: move.piece,
          captured: move.captured,
          promotion: move.promotion,
          flags: move.flags
        }))
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Check if position is in check
  static isInCheck(gameId) {
    try {
      const game = GameManager.getGame(gameId);
      
      if (!game) {
        return {
          success: false,
          error: 'Game not found'
        };
      }
      
      return {
        success: true,
        inCheck: game.chess.inCheck(),
        turn: game.chess.turn()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get game history
  static getGameHistory(gameId) {
    try {
      const game = GameManager.getGame(gameId);
      
      if (!game) {
        return {
          success: false,
          error: 'Game not found'
        };
      }
      
      return {
        success: true,
        history: game.chess.history({ verbose: true }),
        pgn: game.chess.pgn()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Export game as PGN
  static exportGamePGN(gameId) {
    try {
      const game = GameManager.getGame(gameId);
      
      if (!game) {
        return {
          success: false,
          error: 'Game not found'
        };
      }
      
      const pgn = game.chess.pgn();
      
      return {
        success: true,
        pgn: pgn,
        gameId: game.gameId,
        exportedAt: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get game analysis
  static analyzePosition(gameId) {
    try {
      const game = GameManager.getGame(gameId);
      
      if (!game) {
        return {
          success: false,
          error: 'Game not found'
        };
      }
      
      const chess = game.chess;
      
      return {
        success: true,
        analysis: {
          fen: chess.fen(),
          turn: chess.turn(),
          inCheck: chess.inCheck(),
          inCheckmate: chess.isCheckmate(),
          inStalemate: chess.isStalemate(),
          inDraw: chess.isDraw(),
          isGameOver: chess.isGameOver(),
          threefoldRepetition: chess.isThreefoldRepetition(),
          insufficientMaterial: chess.isInsufficientMaterial(),
          moveCount: chess.history().length,
          legalMoves: chess.moves().length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default GameController;
