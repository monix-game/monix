import React, { useEffect } from 'react';
import './Leaderboard.css';
import {
  fetchFishLeaderboard,
  fetchLeaderboard,
  type FishLeaderboardEntry,
  type LeaderboardEntry,
} from '../../helpers/leaderboard';
import { Spinner } from '../spinner/Spinner';
import { getOrdinalSuffix, getPodiumLevel, titleCase } from '../../../server/common/math';
import { Avatar } from '../avatar/Avatar';
import { Checkbox } from '../checkbox/Checkbox';
import { cosmetics } from '../../../server/common/cosmetics/cosmetics';
import { EmojiText } from '../EmojiText';
import { Nameplate } from '../nameplate/Nameplate';

export const Leaderboard: React.FC = () => {
  const [hydrated, setHydrated] = React.useState<boolean>(false);
  const [activeTab, setActiveTab] = React.useState<'money' | 'fish'>('money');
  const [rawMoneyData, setRawMoneyData] = React.useState<{
    normal: LeaderboardEntry[];
    noStaff: LeaderboardEntry[];
  }>({ normal: [], noStaff: [] });
  const [rawFishData, setRawFishData] = React.useState<{
    normal: FishLeaderboardEntry[];
    noStaff: FishLeaderboardEntry[];
  }>({ normal: [], noStaff: [] });
  const [hideStaff, setHideStaff] = React.useState<boolean>(false);

  const getLeaderboardData = () => {
    const isMoney = activeTab === 'money';
    if (hideStaff) {
      return isMoney ? rawMoneyData.noStaff : rawFishData.noStaff;
    }
    return isMoney ? rawMoneyData.normal : rawFishData.normal;
  };

  const currentData = getLeaderboardData();
  const podiumData = currentData.slice(0, 3);
  const listData = currentData.slice(3);

  useEffect(() => {
    async function loadLeaderboard() {
      const [moneyData, fishData] = await Promise.all([fetchLeaderboard(), fetchFishLeaderboard()]);
      if (moneyData) {
        setRawMoneyData(moneyData);
      }
      if (fishData) {
        setRawFishData(fishData);
      }
      setHydrated(Boolean(moneyData || fishData));
    }

    void loadLeaderboard();

    const interval = setInterval(() => {
      void loadLeaderboard();
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, [hideStaff]);

  const isMoneyTab = activeTab === 'money';

  return (
    <div className="leaderboard-container">
      <div className="leaderboard-filters">
        <div className="leaderboard-tabs">
          <button
            type="button"
            className={`leaderboard-tab ${isMoneyTab ? 'active' : ''}`}
            onClick={() => setActiveTab('money')}
          >
            Most Money
          </button>
          <button
            type="button"
            className={`leaderboard-tab ${!isMoneyTab ? 'active' : ''}`}
            onClick={() => setActiveTab('fish')}
          >
            Fish Caught
          </button>
        </div>
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
                <Avatar
                  src={entry.avatar || undefined}
                  alt="User Avatar"
                  className="podium-avatar"
                  size={50}
                  styleKey={
                    entry.cosmetics.frame
                      ? cosmetics.find(c => c.id === entry.cosmetics.frame)?.frameStyle
                      : undefined
                  }
                />
                <span className="podium-user">
                  <Nameplate
                    text={entry.username}
                    styleKey={
                      entry.cosmetics.nameplate
                        ? cosmetics.find(c => c.id === entry.cosmetics.nameplate)?.nameplateStyle
                        : undefined
                    }
                  />
                  {entry.cosmetics.user_tag && (
                    <span
                      className={`user-tag tag-colour-${cosmetics.find(c => c.id === entry.cosmetics.user_tag)?.tagColour}`}
                    >
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
                <span className="podium-money">
                  {isMoneyTab
                    ? `$${(entry as LeaderboardEntry).money.toLocaleString()}`
                    : `${(entry as FishLeaderboardEntry).fishCaught.toLocaleString()} fish`}
                </span>
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
                  <Nameplate
                    text={entry.username}
                    styleKey={
                      entry.cosmetics.nameplate
                        ? cosmetics.find(c => c.id === entry.cosmetics.nameplate)?.nameplateStyle
                        : undefined
                    }
                  />
                  {entry.cosmetics.user_tag && (
                    <span
                      className={`user-tag tag-colour-${cosmetics.find(c => c.id === entry.cosmetics.user_tag)?.tagColour}`}
                    >
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
                <span className="leaderboard-money">
                  {isMoneyTab
                    ? `$${(entry as LeaderboardEntry).money.toLocaleString()}`
                    : `${(entry as FishLeaderboardEntry).fishCaught.toLocaleString()} fish`}
                </span>
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
