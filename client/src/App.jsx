import React, { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import ChessBoard from './components/ChessBoard';
import GameInfo from './components/GameInfo';
import BoardThemeSelector from './components/BoardThemeSelector';
import useSocket from './hooks/useSocket';
import './App.css';

function App() {
  const [game, setGame] = useState(new Chess());
  const [gameId, setGameId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [playerColor, setPlayerColor] = useState(null);
  const [gameState, setGameState] = useState({
    fen: game.fen(),
    turn: game.turn(),
    gameOver: false,
    players: [],
    history: [],
    canUndo: false
  });
  const [isConnected, setIsConnected] = useState(false);
  const [gameJoined, setGameJoined] = useState(false);
  const [notification, setNotification] = useState('');
  const [boardTheme, setBoardTheme] = useState('dark');
  const [gameMode, setGameMode] = useState('join'); // 'create' or 'join'
  const [preferredColor, setPreferredColor] = useState(''); // 'white', 'black', or ''

  const socket = useSocket('http://localhost:3001');
  // const socket = useSocket('/api');

  // Load saved theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('chessboardTheme');
    if (savedTheme) {
      setBoardTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to server');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from server');
    });

    socket.on('gameCreated', ({ gameId: createdGameId, color, playerName: assignedName, wasPreferenceGranted, isCreator }) => {
      setGameId(createdGameId);
      setPlayerColor(color);
      setGameJoined(true);
      console.log(`Created game ${createdGameId} as ${color} player: ${assignedName}`);

      if (!wasPreferenceGranted && preferredColor) {
        setNotification(`Your preferred color (${preferredColor}) was not available. You are playing as ${color}.`);
        setTimeout(() => setNotification(''), 4000);
      }
    });

    socket.on('playerAssigned', ({ color, playerName: assignedName }) => {
      setPlayerColor(color);
      console.log(`Assigned as ${color} player: ${assignedName}`);
    });

    socket.on('gameState', (state) => {
      const newGame = new Chess(state.fen);
      setGame(newGame);
      setGameState(state);
    });

    socket.on('moveMade', (moveData) => {
      const newGame = new Chess(moveData.fen);
      setGame(newGame);
      setGameState(prev => ({
        ...prev,
        fen: moveData.fen,
        turn: moveData.turn,
        gameOver: moveData.gameOver,
        history: moveData.history,
        canUndo: moveData.canUndo || false
      }));
    });

    socket.on('moveUndone', (undoData) => {
      const newGame = new Chess(undoData.fen);
      setGame(newGame);
      setGameState(prev => ({
        ...prev,
        fen: undoData.fen,
        turn: undoData.turn,
        gameOver: undoData.gameOver,
        history: undoData.history,
        canUndo: undoData.canUndo || false
      }));

      // Show notification about who undid the move
      if (undoData.undoneBy) {
        if (undoData.undoneBy === playerColor) {
          setNotification('You undid your move');
        } else {
          setNotification(`${undoData.undoneBy} player undid their move`);
        }
        // Clear notification after 3 seconds
        setTimeout(() => setNotification(''), 3000);
      }
    });

    socket.on('gameOver', ({ result }) => {
      alert(`Game Over! Result: ${result}`);
    });

    socket.on('invalidMove', ({ error }) => {
      alert(`Invalid move: ${error}`);
    });

    socket.on('playersUpdated', ({ players, playersCount }) => {
      setGameState(prev => ({
        ...prev,
        players: players
      }));
      console.log(`Players updated. Total players: ${playersCount}`);
    });

    socket.on('playerLeft', ({ playerName: leftPlayer, playersCount }) => {
      console.log(`${leftPlayer} left the game. Players: ${playersCount}`);
    });

    socket.on('undoError', ({ error }) => {
      alert(`Undo error: ${error}`);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('gameCreated');
      socket.off('playerAssigned');
      socket.off('gameState');
      socket.off('moveMade');
      socket.off('moveUndone');
      socket.off('gameOver');
      socket.off('invalidMove');
      socket.off('playersUpdated');
      socket.off('playerLeft');
      socket.off('undoError');
    };
  }, [socket]);

  const handleCreateGame = (e) => {
    e.preventDefault();
    if (socket && playerName) {
      socket.emit('createGame', playerName, {
        preferredColor: preferredColor || null,
        gameType: 'casual'
      });
    }
  };

  const handleJoinGame = (e) => {
    e.preventDefault();
    if (socket && gameId && playerName) {
      socket.emit('joinGame', gameId, playerName);
      setGameJoined(true);
    }
  };

  const handleMove = (sourceSquare, targetSquare) => {
    if (!socket || !gameJoined || playerColor === 'spectator') return false;

    const currentTurn = game.turn() === 'w' ? 'white' : 'black';
    if (playerColor !== currentTurn) return false;

    try {
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q' // Always promote to queen for simplicity
      });

      if (move) {
        socket.emit('makeMove', gameId, {
          from: sourceSquare,
          to: targetSquare,
          promotion: 'q'
        });
        return true;
      }
    } catch (error) {
      console.log('Invalid move:', error);
    }
    return false;
  };

  const handleUndo = () => {
    if (!socket || !gameJoined || playerColor === 'spectator' || !gameState.canUndo) return;
    socket.emit('undoMove', gameId);
  };

  const handleThemeChange = (newTheme) => {
    setBoardTheme(newTheme);
    // Save theme preference to localStorage
    localStorage.setItem('chessboardTheme', newTheme);
  };

  const resetGame = () => {
    setGame(new Chess());
    setGameId('');
    setPlayerName('');
    setPlayerColor(null);
    setGameJoined(false);
    setGameState({
      fen: new Chess().fen(),
      turn: 'w',
      gameOver: false,
      players: [],
      history: [],
      canUndo: false
    });
  };

  if (!gameJoined) {
    return (
      <div className="app">
        <div className="join-game-container">
          <h1>Chess Game</h1>
          <div className="connection-status">
            Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </div>

          <div className="game-mode-selector">
            <button
              className={`mode-button ${gameMode === 'create' ? 'active' : ''}`}
              onClick={() => setGameMode('create')}
            >
              Create Game
            </button>
            <button
              className={`mode-button ${gameMode === 'join' ? 'active' : ''}`}
              onClick={() => setGameMode('join')}
            >
              Join Game
            </button>
          </div>

          {gameMode === 'create' ? (
            <form onSubmit={handleCreateGame} className="join-form">
              <div className="form-group">
                <label htmlFor="playerName">Your Name:</label>
                <input
                  type="text"
                  id="playerName"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your name"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="preferredColor">Preferred Color:</label>
                <select
                  id="preferredColor"
                  value={preferredColor}
                  onChange={(e) => setPreferredColor(e.target.value)}
                >
                  <option value="">No preference</option>
                  <option value="white">White</option>
                  <option value="black">Black</option>
                </select>
              </div>
              <button type="submit" disabled={!isConnected}>
                Create Game
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoinGame} className="join-form">
              <div className="form-group">
                <label htmlFor="playerName">Your Name:</label>
                <input
                  type="text"
                  id="playerName"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your name"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="gameId">Game ID:</label>
                <input
                  type="text"
                  id="gameId"
                  value={gameId}
                  onChange={(e) => setGameId(e.target.value)}
                  placeholder="Enter game ID (e.g., QuickKnight123)"
                  required
                />
              </div>
              <button type="submit" disabled={!isConnected}>
                Join Game
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="game-container">
        <div className="game-header">
          <h1>SocketChess</h1>
          <div className="player-info">
            <span>Playing as: <strong>{playerColor}</strong></span>
            <span>Player: <strong>{playerName}</strong></span>
            <button onClick={resetGame} className="leave-button">
              Leave Game
            </button>
          </div>
        </div>

        {notification && (
          <div className="notification">
            {notification}
          </div>
        )}
        
        <div className="game-content">
          <div className="chess-board-container">
            <ChessBoard
              position={gameState.fen}
              onPieceDrop={handleMove}
              boardOrientation={playerColor === 'black' ? 'black' : 'white'}
              allowAllMoves={false}
              playerColor={playerColor}
              gameState={gameState}
              boardTheme={boardTheme}
            />
          </div>
          
          <div className="game-sidebar">
            <GameInfo
              gameState={gameState}
              playerColor={playerColor}
              gameId={gameId}
              onUndo={handleUndo}
            />
            <BoardThemeSelector
              currentTheme={boardTheme}
              onThemeChange={handleThemeChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
