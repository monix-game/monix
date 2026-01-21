import React, { useEffect } from 'react';
import './Leaderboard.css';
import { fetchLeaderboard, type LeaderboardEntry } from '../../helpers/leaderboard';
import { Spinner } from '../spinner/Spinner';
import { getOrdinalSuffix, getPodiumLevel } from '../../helpers/utils';
import { IconUser } from '@tabler/icons-react';

export const Leaderboard: React.FC = () => {
  const [hydrated, setHydrated] = React.useState<boolean>(false);
  const [podiumData, setPodiumData] = React.useState<LeaderboardEntry[]>([]);
  const [listData, setListData] = React.useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    async function loadLeaderboard() {
      const data = await fetchLeaderboard();
      if (data) {
        const podium = data.slice(0, 3);
        // Make the podium order be 2nd, 1st, 3rd
        setPodiumData([podium[1], podium[0], podium[2]]);

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
                {entry.avatar && (
                  <img src={entry.avatar} alt="User Avatar" className="podium-avatar" />
                )}
                {!entry.avatar && <IconUser size={64} className="podium-avatar-placeholder" />}
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
