import React from 'react';
import styles from './Footer.module.css';

interface FooterProps {
  fixed?: boolean;
}

export const Footer: React.FC<FooterProps> = ({ fixed }) => {
  return (
    <footer className={`${styles['app-footer']}${fixed ? ` ${styles.fixed}` : ''}`}>
      <span>
        © 2026 Monix. All rights reserved. This site is{' '}
        <a href="https://github.com/monix-game/monix" target="_blank" rel="noopener noreferrer">
          open-source
        </a>
      </span>
    </footer>
  );
};
