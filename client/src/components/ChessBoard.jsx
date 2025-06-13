import React, { useState, useCallback, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';

// Board themes configuration
const BOARD_THEMES = {
  classic: {
    name: 'Classic',
    lightSquare: '#f0d9b5',
    darkSquare: '#b58863'
  },
  dark: {
    name: 'Dark',
    lightSquare: '#718096',
    darkSquare: '#4a5568'
  },
  blue: {
    name: 'Ocean Blue',
    lightSquare: '#e6f3ff',
    darkSquare: '#4a90e2'
  },
  green: {
    name: 'Forest Green',
    lightSquare: '#f0f8e8',
    darkSquare: '#769656'
  },
  purple: {
    name: 'Royal Purple',
    lightSquare: '#f3e8ff',
    darkSquare: '#8b5cf6'
  }
};

const ChessBoard = ({ position, onPieceDrop, boardOrientation, allowAllMoves, playerColor, gameState, boardTheme = 'dark' }) => {
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [boardWidth, setBoardWidth] = useState(500);
  const [isLoading, setIsLoading] = useState(true);

  // Create a chess instance to calculate legal moves
  const chess = new Chess(position);

  // Calculate responsive board width
  useEffect(() => {
    const calculateBoardWidth = () => {
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;

      if (screenWidth <= 320) {
        return Math.min(screenWidth - 20, 280);
      } else if (screenWidth <= 480) {
        return Math.min(screenWidth - 30, 350);
      } else if (screenWidth <= 767) {
        return Math.min(screenWidth - 40, 400);
      } else if (screenWidth <= 1199) {
        return Math.min(450, screenHeight * 0.6);
      } else {
        return 500;
      }
    };

    const updateBoardWidth = () => {
      setBoardWidth(calculateBoardWidth());
      setIsLoading(false);
    };

    updateBoardWidth();
    window.addEventListener('resize', updateBoardWidth);
    window.addEventListener('orientationchange', updateBoardWidth);

    return () => {
      window.removeEventListener('resize', updateBoardWidth);
      window.removeEventListener('orientationchange', updateBoardWidth);
    };
  }, []);

  const handlePieceDrop = (sourceSquare, targetSquare, piece) => {
    const moveResult = onPieceDrop(sourceSquare, targetSquare, piece);
    // Clear selection after move attempt
    setSelectedSquare(null);
    setLegalMoves([]);
    return moveResult;
  };

  const handlePieceClick = useCallback((piece, square) => {
    // Don't allow piece selection if it's not the player's turn or if they're a spectator
    if (playerColor === 'spectator') return;

    const currentTurn = chess.turn() === 'w' ? 'white' : 'black';
    if (playerColor !== currentTurn) return;

    // Check if the clicked piece belongs to the current player
    const pieceColor = piece[0] === 'w' ? 'white' : 'black';
    if (pieceColor !== playerColor) return;

    // If clicking the same square, deselect
    if (selectedSquare === square) {
      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }

    // Select the piece and calculate legal moves
    setSelectedSquare(square);
    const moves = chess.moves({ square, verbose: true });
    setLegalMoves(moves.map(move => move.to));
  }, [chess, playerColor, selectedSquare]);

  const handleSquareClick = useCallback((square, piece) => {
    // If no piece is selected, try to select the piece on this square
    if (!selectedSquare) {
      if (piece) {
        handlePieceClick(piece, square);
      }
      return;
    }

    // If clicking on a legal move square, make the move
    if (legalMoves.includes(square)) {
      onPieceDrop(selectedSquare, square, chess.get(selectedSquare));
      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }

    // If clicking on another piece of the same color, select it
    if (piece) {
      const pieceColor = piece[0] === 'w' ? 'white' : 'black';
      if (pieceColor === playerColor) {
        handlePieceClick(piece, square);
        return;
      }
    }

    // Otherwise, clear selection
    setSelectedSquare(null);
    setLegalMoves([]);
  }, [selectedSquare, legalMoves, onPieceDrop, chess, playerColor, handlePieceClick]);

  // Create custom square styles for highlighting
  const customSquareStyles = {};

  // Highlight king in check
  if (chess.inCheck()) {
    const kingColor = chess.turn(); // Current turn is the player in check
    const kingSquare = chess.board().flat().find(piece =>
      piece && piece.type === 'k' && piece.color === kingColor
    );

    if (kingSquare) {
      // Find the square where the king is located
      for (let rank = 0; rank < 8; rank++) {
        for (let file = 0; file < 8; file++) {
          const square = String.fromCharCode(97 + file) + (8 - rank);
          const piece = chess.get(square);
          if (piece && piece.type === 'k' && piece.color === kingColor) {
            customSquareStyles[square] = {
              backgroundColor: 'rgba(255, 0, 0, 0.6)',
              border: '3px solid #ff0000',
              boxShadow: '0 0 10px rgba(255, 0, 0, 0.8)'
            };
            break;
          }
        }
      }
    }
  }

  // Highlight selected square
  if (selectedSquare) {
    customSquareStyles[selectedSquare] = {
      ...customSquareStyles[selectedSquare], // Preserve any existing styles (like check indicator)
      backgroundColor: customSquareStyles[selectedSquare]?.backgroundColor || 'rgba(255, 215, 0, 0.5)',
      border: '3px solid #ffd700',
      boxShadow: '0 0 12px rgba(255, 215, 0, 0.6)'
    };
  }

  // Highlight legal move squares
  legalMoves.forEach(square => {
    customSquareStyles[square] = {
      ...customSquareStyles[square], // Preserve any existing styles
      backgroundColor: customSquareStyles[square]?.backgroundColor || 'rgba(104, 211, 145, 0.4)',
      border: '2px solid #68d391',
      borderRadius: '50%',
      cursor: 'pointer',
      boxShadow: '0 0 8px rgba(104, 211, 145, 0.5)'
    };
  });

  // Get current theme colors
  const currentTheme = BOARD_THEMES[boardTheme] || BOARD_THEMES.dark;

  if (isLoading) {
    return (
      <div className="chessboard-wrapper">
        <div className="chessboard-loading" style={{ width: boardWidth, height: boardWidth }}>
          <div className="loading-spinner"></div>
          <p>Loading board...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chessboard-wrapper">
      <Chessboard
        position={position}
        onPieceDrop={handlePieceDrop}
        onPieceClick={handlePieceClick}
        onSquareClick={handleSquareClick}
        boardOrientation={boardOrientation}
        arePiecesDraggable={true}
        boardWidth={boardWidth}
        customBoardStyle={{
          borderRadius: '4px',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)'
        }}
        customDarkSquareStyle={{ backgroundColor: currentTheme.darkSquare }}
        customLightSquareStyle={{ backgroundColor: currentTheme.lightSquare }}
        customDropSquareStyle={{
          boxShadow: 'inset 0 0 1px 6px rgba(255,255,0,0.75)'
        }}
        customSquareStyles={customSquareStyles}
      />
    </div>
  );
};

export default ChessBoard;
export { BOARD_THEMES };
