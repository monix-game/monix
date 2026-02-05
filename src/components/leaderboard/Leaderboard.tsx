import React, { useEffect } from 'react';
import './Leaderboard.css';
import { fetchLeaderboard, type LeaderboardEntry } from '../../helpers/leaderboard';
import { Spinner } from '../spinner/Spinner';
import { getOrdinalSuffix, getPodiumLevel, titleCase } from '../../helpers/utils';
import { IconUser } from '@tabler/icons-react';
import { Checkbox } from '../checkbox/Checkbox';
import { cosmetics } from '../../../server/common/cosmetics/cosmetics';
import { EmojiText } from '../EmojiText';

export const Leaderboard: React.FC = () => {
  const [hydrated, setHydrated] = React.useState<boolean>(false);

  const [rawData, setRawData] = React.useState<{
    normal: LeaderboardEntry[];
    noStaff: LeaderboardEntry[];
  }>({ normal: [], noStaff: [] });
  const [hideStaff, setHideStaff] = React.useState<boolean>(false);

  const currentData = hideStaff ? rawData.noStaff : rawData.normal;
  const podiumData = currentData.slice(0, 3);
  const listData = currentData.slice(3);

  useEffect(() => {
    async function loadLeaderboard() {
      const data = await fetchLeaderboard();
      if (data) {
        setRawData(data);
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
                  {entry.cosmetics.user_tag && (
                    <span className="user-tag">
                      <EmojiText>
                        {cosmetics.find(c => c.id === entry.cosmetics.user_tag)?.tagIcon}
                      </EmojiText>{' '}
                      {cosmetics.find(c => c.id === entry.cosmetics.user_tag)?.tagName}
                    </span>
                  )}
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
