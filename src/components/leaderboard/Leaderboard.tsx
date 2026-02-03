import React, { useEffect } from 'react';
import './Leaderboard.css';
import { fetchLeaderboard, type LeaderboardEntry } from '../../helpers/leaderboard';
import { Spinner } from '../spinner/Spinner';
import { getOrdinalSuffix, getPodiumLevel, titleCase } from '../../helpers/utils';
import { IconUser } from '@tabler/icons-react';
import { Checkbox } from '../checkbox/Checkbox';
import { hasRole } from '../../../server/common/roles';

export const Leaderboard: React.FC = () => {
  const [hydrated, setHydrated] = React.useState<boolean>(false);
  const [podiumData, setPodiumData] = React.useState<LeaderboardEntry[]>([]);
  const [listData, setListData] = React.useState<LeaderboardEntry[]>([]);
  const [hideStaff, setHideStaff] = React.useState<boolean>(false);

  useEffect(() => {
    async function loadLeaderboard() {
      const data = await fetchLeaderboard();
      if (data) {
        let filteredData = data;
        if (hideStaff) {
          filteredData = data.filter(entry => {
            return !hasRole(entry.role, 'mod');
          });

          // Re-rank the filtered data
          filteredData = filteredData.map((entry, index) => ({
            ...entry,
            rank: index + 1,
          }));
        }

        const podium = filteredData.slice(0, 3);
        // Make the podium order be 2nd, 1st, 3rd
        setPodiumData([podium[1], podium[0], podium[2]].filter(entry => entry !== undefined));

        setListData(filteredData.slice(3, 10));

        setHydrated(true);
      }
    }

    void loadLeaderboard();

    const interval = setInterval(() => {
      void loadLeaderboard();
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, [hideStaff]);

  return (
    <div className="leaderboard-container">
      <div className="leaderboard-filters">
        <span className="leaderboard-filters-label">Filters:</span>
        <Checkbox label="Hide Staff" checked={hideStaff} onClick={value => setHideStaff(value)} />
      </div>
      {!hydrated && <Spinner className="leaderboard-spinner" size={48} />}
      {hydrated && podiumData.length > 0 && (
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
                <span className="podium-user">
                  {entry.username}
                  {entry.role !== 'user' && (
                    <span className={`user-badge ${entry.role}`}>{titleCase(entry.role)}</span>
                  )}
                </span>
                <span className="podium-money">${entry.money.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="leaderboard-list">
            {listData.map(entry => (
              <div key={entry.rank} className="leaderboard-entry">
                <span className="leaderboard-user-info">
                  <b>
                    {entry.rank}
                    {getOrdinalSuffix(entry.rank)}:
                  </b>{' '}
                  {entry.username}
                  {entry.role !== 'user' && (
                    <span className={`user-badge ${entry.role}`}>{titleCase(entry.role)}</span>
                  )}
                </span>
                <span className="leaderboard-money">${entry.money.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </>
      )}
      {hydrated && podiumData.length === 0 && (
        <div className="leaderboard-no-data">
          No leaderboard data available. Try removing filters or refreshing the page.
        </div>
      )}
    </div>
  );
};
