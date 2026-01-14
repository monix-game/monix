import React from 'react';
import './Footer.css';

export const Footer: React.FC = () => {
  return (
    <footer className="app-footer">
      <span>
        © 2026 Monix. All rights reserved. This site is{' '}
        <a href="https://github.com/monix-game/monix" target="_blank" rel="noopener noreferrer">
          open-source
        </a>
      </span>
    </footer>
  );
};
