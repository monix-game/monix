import React, { useEffect } from 'react';
import './Leaderboard.css';
import { fetchLeaderboard, type LeaderboardEntry } from '../../helpers/leaderboard';
import { Spinner } from '../spinner/Spinner';
import { getOrdinalSuffix, getPodiumLevel } from '../../helpers/utils';

export const Leaderboard: React.FC = () => {
  const [hydrated, setHydrated] = React.useState<boolean>(false);
  const [podiumData, setPodiumData] = React.useState<LeaderboardEntry[]>([]);
  const [listData, setListData] = React.useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    async function loadLeaderboard() {
      const data = await fetchLeaderboard();
      if (data) {
        setPodiumData(data.slice(0, 3));
        setListData(data.slice(3, 10));

        setHydrated(true);
      }
    }

    void loadLeaderboard();

    const interval = setInterval(() => {
      void loadLeaderboard();
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="leaderboard-container">
      {!hydrated && <Spinner className="leaderboard-spinner" size={48} />}
      {hydrated && (
        <>
          <div className="podium">
            {podiumData.map(entry => (
              <div key={entry.rank} className={`podium-position ${getPodiumLevel(entry.rank)}`}>
                <span className="podium-rank">
                  {entry.rank}
                  {getOrdinalSuffix(entry.rank)}
                </span>
                <img src="https://picsum.photos/100" alt="User Avatar" className="podium-avatar" />
                <span className="podium-user">{entry.username}</span>
                <span className="podium-money">${entry.money.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="leaderboard-list">
            {listData.map(entry => (
              <div key={entry.rank} className="leaderboard-entry">
                <span className="leaderboard-user-info">
                  {entry.rank}
                  {getOrdinalSuffix(entry.rank)}: {entry.username}
                </span>
                <span className="leaderboard-money">${entry.money.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
