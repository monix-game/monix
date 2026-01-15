import React from 'react';
import './Footer.css';

interface FooterProps {
  fixed?: boolean;
}

export const Footer: React.FC<FooterProps> = ({ fixed }) => {
  return (
    <footer className={`app-footer ${fixed ? ' fixed' : ''}`}>
      <span>
        © 2026 Monix. All rights reserved. This site is{' '}
        <a href="https://github.com/monix-game/monix" target="_blank" rel="noopener noreferrer">
          open-source
        </a>
      </span>
    </footer>
  );
};
