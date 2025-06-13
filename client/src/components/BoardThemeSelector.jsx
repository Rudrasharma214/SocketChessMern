import React from 'react';
import { BOARD_THEMES } from './ChessBoard';

const BoardThemeSelector = ({ currentTheme, onThemeChange }) => {
  const handleThemeClick = (themeKey) => {
    onThemeChange(themeKey);

    // Add a subtle animation feedback
    const element = document.querySelector(`[data-theme="${themeKey}"]`);
    if (element) {
      element.style.transform = 'scale(0.95)';
      setTimeout(() => {
        element.style.transform = '';
      }, 150);
    }
  };

  return (
    <div className="board-theme-selector">
      <h4>🎨 Board Theme</h4>
      <div className="theme-options">
        {Object.entries(BOARD_THEMES).map(([themeKey, theme]) => (
          <div
            key={themeKey}
            data-theme={themeKey}
            className={`theme-option ${currentTheme === themeKey ? 'active' : ''}`}
            onClick={() => handleThemeClick(themeKey)}
            title={`Switch to ${theme.name} theme`}
          >
            <div className="theme-preview">
              <div 
                className="theme-square light" 
                style={{ backgroundColor: theme.lightSquare }}
              ></div>
              <div 
                className="theme-square dark" 
                style={{ backgroundColor: theme.darkSquare }}
              ></div>
              <div 
                className="theme-square dark" 
                style={{ backgroundColor: theme.darkSquare }}
              ></div>
              <div 
                className="theme-square light" 
                style={{ backgroundColor: theme.lightSquare }}
              ></div>
            </div>
            <span className="theme-name">{theme.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BoardThemeSelector;
