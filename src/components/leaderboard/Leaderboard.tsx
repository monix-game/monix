import React from 'react';
import './Leaderboard.css';

export const Leaderboard: React.FC = () => {
  return (
    <div className="leaderboard-container">
      <div className="podium">
        <div className="podium-position second">
          <span className="podium-rank">2nd</span>
          <img src="https://picsum.photos/100" alt="User Avatar" className="podium-avatar" />
          <span className="podium-user">User2</span>
          <span className="podium-money">$2M</span>
        </div>
        <div className="podium-position first">
          <span className="podium-rank">1st</span>
          <img src="https://picsum.photos/100" alt="User Avatar" className="podium-avatar" />
          <span className="podium-user">User1</span>
          <span className="podium-money">$3M</span>
        </div>
        <div className="podium-position third">
          <span className="podium-rank">3rd</span>
          <img src="https://picsum.photos/100" alt="User Avatar" className="podium-avatar" />
          <span className="podium-user">User3</span>
          <span className="podium-money">$1.5M</span>
        </div>
      </div>
      <div className="leaderboard-list">
        <div className="leaderboard-entry">
          <span className="leaderboard-user-info">4th: User4</span>
          <span className="leaderboard-money">$1M</span>
        </div>
        <div className="leaderboard-entry">
          <span className="leaderboard-user-info">5th: User5</span>
          <span className="leaderboard-money">$700K</span>
        </div>
        <div className="leaderboard-entry">
          <span className="leaderboard-user-info">6th: User5</span>
          <span className="leaderboard-money">$700K</span>
        </div>
        <div className="leaderboard-entry">
          <span className="leaderboard-user-info">7th: User5</span>
          <span className="leaderboard-money">$700K</span>
        </div>
        <div className="leaderboard-entry">
          <span className="leaderboard-user-info">8th: User5</span>
          <span className="leaderboard-money">$700K</span>
        </div>
        <div className="leaderboard-entry">
          <span className="leaderboard-user-info">9th: User5</span>
          <span className="leaderboard-money">$700K</span>
        </div>
        <div className="leaderboard-entry">
          <span className="leaderboard-user-info">10th: User5</span>
          <span className="leaderboard-money">$700K</span>
        </div>
      </div>
    </div>
  );
};
