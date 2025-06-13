import React from 'react';
import { Chess } from 'chess.js';

const GameInfo = ({ gameState, playerColor, gameId, onUndo }) => {
  const { turn, gameOver, players, fen, canUndo } = gameState;

  const currentTurn = turn === 'w' ? 'White' : 'Black';
  const isMyTurn = (turn === 'w' && playerColor === 'white') ||
                   (turn === 'b' && playerColor === 'black');

  // Check if current player is in check
  const chess = new Chess(fen);
  const inCheck = chess.inCheck();
  const inCheckmate = chess.isCheckmate();
  const inStalemate = chess.isStalemate();

  return (
    <div className="game-info">
      <div className="game-details">
        <h3>Game Information</h3>
        <div className="info-item">
          <strong>Game ID:</strong> {gameId}
        </div>
        <div className="info-item">
          <strong>Current Turn:</strong>
          <span className={`turn-indicator ${isMyTurn ? 'my-turn' : ''} ${inCheck ? 'in-check' : ''}`}>
            {currentTurn} {isMyTurn && '(Your turn)'} {inCheck && '⚠️ CHECK'}
          </span>
        </div>
        <div className="info-item">
          <strong>Game Status:</strong>
          <span className={
            inCheckmate || inStalemate ? 'game-over' :
            inCheck ? 'check-status' :
            gameOver ? 'game-over' : 'active'
          }>
            {inCheckmate ? 'Checkmate!' :
             inStalemate ? 'Stalemate!' :
             gameOver ? 'Game Over' :
             inCheck ? 'Check!' : 'Active'}
          </span>
        </div>
      </div>

      <div className="players-section">
        <h4>Players</h4>
        <div className="players-list">
          {players.map((player, index) => (
            <div key={index} className={`player ${player.color}`}>
              <span className="player-color">{player.color}</span>
              <span className="player-name">{player.name}</span>
              {player.color === playerColor && <span className="you-indicator">(You)</span>}
            </div>
          ))}
          {players.length === 0 && (
            <div className="waiting-player">
              Waiting for players to join...
            </div>
          )}
          {players.length === 1 && playerColor !== 'spectator' && (
            <div className="waiting-player">
              Waiting for opponent...
            </div>
          )}
          {players.length === 1 && playerColor === 'spectator' && (
            <div className="waiting-player">
              Watching game - 1 player connected, waiting for opponent
            </div>
          )}
          {players.length === 2 && playerColor === 'spectator' && (
            <div className="waiting-player">
              Watching game - Both players connected
            </div>
          )}
        </div>
      </div>



      <div className="game-controls">
        <div className="undo-controls">
          <button
            className={`control-button undo-button ${!canUndo ? 'disabled' : ''}`}
            onClick={onUndo}
            disabled={!canUndo || playerColor === 'spectator'}
            title={canUndo ? "Undo your last move" : "You can only undo your own moves"}
          >
            Undo My Move
          </button>
        </div>
        {/* <button
          className="control-button refresh-button"
          onClick={() => window.location.reload()}
        >
          Refresh Game
        </button> */}
      </div>
    </div>
  );
};

export default GameInfo;
