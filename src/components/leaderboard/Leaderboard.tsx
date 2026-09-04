import React, { useEffect } from 'react';
import styles from './Leaderboard.module.css';
import {
  type FishLeaderboardEntry,
  type LeaderboardEntry,
  type PlaytimeLeaderboardEntry,
} from '../../helpers/leaderboard';
import { Spinner } from '../spinner/Spinner';
import { getOrdinalSuffix, getPodiumLevel, titleCase } from '../../../server/common/math';
import { Avatar } from '../avatar/Avatar';
import { Checkbox } from '../checkbox/Checkbox';
import { cosmetics } from '../../../server/common/cosmetics/cosmetics';
import { EmojiText } from '../EmojiText';
import { Nameplate } from '../nameplate/Nameplate';
import { useSocket } from '../../providers/socket';

type LeaderboardTab = 'money' | 'fish' | 'playtime';

function formatPlaytime(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export const Leaderboard: React.FC = () => {
  const [hydratedTab, setHydratedTab] = React.useState<LeaderboardTab | null>(null);
  const [activeTab, setActiveTab] = React.useState<LeaderboardTab>('money');
  const [rawMoneyData, setRawMoneyData] = React.useState<LeaderboardEntry[]>([]);
  const [rawFishData, setRawFishData] = React.useState<FishLeaderboardEntry[]>([]);
  const [rawPlaytimeData, setRawPlaytimeData] = React.useState<PlaytimeLeaderboardEntry[]>([]);
  const [hideStaff, setHideStaff] = React.useState<boolean>(false);

  const { subscribe } = useSocket();

  const getLeaderboardData = () => {
    let data;
    if (activeTab === 'money') {
      data = rawMoneyData;
    } else if (activeTab === 'fish') {
      data = rawFishData;
    } else {
      data = rawPlaytimeData;
    }
    if (!hideStaff) return data.slice(0, 15);

    const filtered = data
      .filter(entry => entry.role === 'user')
      .sort((first, second) => first.rank - second.rank)
      .slice(0, 15)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
    const podium = filtered.slice(0, 3);
    return [
      ...(podium[1] ? [podium[1]] : []),
      ...(podium[0] ? [podium[0]] : []),
      ...(podium[2] ? [podium[2]] : []),
      ...filtered.slice(3),
    ];
  };

  const currentData = getLeaderboardData();
  const podiumData = currentData.slice(0, 3);
  const listData = currentData.slice(3);

  useEffect(() => {
    const unsubMoney = subscribe('leaderboard:money', data => {
      setRawMoneyData(data as LeaderboardEntry[]);
    });
    const unsubFish = subscribe('leaderboard:fish', data => {
      setRawFishData(data as FishLeaderboardEntry[]);
    });
    const unsubPlaytime = subscribe('leaderboard:playtime', data => {
      setRawPlaytimeData(data as PlaytimeLeaderboardEntry[]);
    });

    return () => {
      unsubMoney();
      unsubFish();
      unsubPlaytime();
    };
  }, [subscribe]);

  useEffect(() => {
    // Only consider the tab hydrated once its own channel has delivered data.
    // This prevents the "No data" flash where one leaderboard channel (e.g.
    // money) arrived before another (e.g. fish) on a fresh subscription.
    if (activeTab === 'money' && rawMoneyData.length > 0) {
      setHydratedTab('money');
    } else if (activeTab === 'fish' && rawFishData.length > 0) {
      setHydratedTab('fish');
    } else if (activeTab === 'playtime' && rawPlaytimeData.length > 0) {
      setHydratedTab('playtime');
    }
  }, [activeTab, rawMoneyData, rawFishData, rawPlaytimeData]);

  const hydrated = hydratedTab === activeTab;

  // Resolve the value shown in the trailing column for the active tab.
  const valueFor = (
    entry: LeaderboardEntry | FishLeaderboardEntry | PlaytimeLeaderboardEntry
  ): string => {
    if (activeTab === 'money') {
      const net = (entry as LeaderboardEntry).netWorth;
      return `$${(net ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    }
    if (activeTab === 'fish') {
      return `${(entry as FishLeaderboardEntry).fishCaught.toLocaleString()} fish`;
    }
    return formatPlaytime((entry as PlaytimeLeaderboardEntry).playtimeMs);
  };

  const isMoneyTab = activeTab === 'money';

  return (
    <div className={styles['leaderboard-container']}>
      <div className={styles['leaderboard-filters']}>
        <div className={styles['leaderboard-tabs']}>
          <button
            type="button"
            className={`${styles['leaderboard-tab']} ${isMoneyTab ? styles.active : ''}`}
            onClick={() => setActiveTab('money')}
          >
            Net Worth
          </button>
          <button
            type="button"
            className={`${styles['leaderboard-tab']} ${activeTab === 'fish' ? styles.active : ''}`}
            onClick={() => setActiveTab('fish')}
          >
            Fish Caught
          </button>
          <button
            type="button"
            className={`${styles['leaderboard-tab']} ${activeTab === 'playtime' ? styles.active : ''}`}
            onClick={() => setActiveTab('playtime')}
          >
            Most Playtime
          </button>
        </div>
        <span className={styles['leaderboard-filters-label']}>Filters:</span>
        <Checkbox label="Hide Staff" checked={hideStaff} onClick={value => setHideStaff(value)} />
      </div>
      {!hydrated && <Spinner className={styles['leaderboard-spinner']} size={48} />}
      {hydrated && podiumData.length > 0 && (
        <>
          <div className={styles.podium}>
            {podiumData.map(entry => (
              <div
                key={entry.rank}
                className={`${styles['podium-position']} ${styles[getPodiumLevel(entry.rank)]}`}
              >
                <span className={styles['podium-rank']}>
                  {entry.rank}
                  {getOrdinalSuffix(entry.rank)}
                </span>
                <Avatar
                  src={entry.avatar || undefined}
                  alt="User Avatar"
                  className="podium-avatar"
                  size={50}
                />
                <span className={styles['podium-user']}>
                  <Nameplate
                    text={entry.username}
                    styleKey={(() => {
                      if (entry.magic_jellybean_active) return 'rainbow';
                      if (entry.cosmetics.nameplate) {
                        return cosmetics.find(c => c.id === entry.cosmetics.nameplate)
                          ?.nameplateStyle;
                      }
                      return undefined;
                    })()}
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
                <span className={styles['podium-money']}>{valueFor(entry)}</span>
              </div>
            ))}
          </div>
          <div className={styles['leaderboard-list']}>
            {listData.map(entry => (
              <div key={entry.rank} className={styles['leaderboard-entry']}>
                <span className={styles['leaderboard-user-info']}>
                  <b>
                    {entry.rank}
                    {getOrdinalSuffix(entry.rank)}:
                  </b>{' '}
                  <Nameplate
                    text={entry.username}
                    styleKey={(() => {
                      if (entry.magic_jellybean_active) return 'rainbow';
                      if (entry.cosmetics.nameplate) {
                        return cosmetics.find(c => c.id === entry.cosmetics.nameplate)
                          ?.nameplateStyle;
                      }
                      return undefined;
                    })()}
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
                <span className={styles['leaderboard-money']}>{valueFor(entry)}</span>
              </div>
            ))}
          </div>
        </>
      )}
      {hydrated && podiumData.length === 0 && (
        <div className={styles['leaderboard-no-data']}>
          No leaderboard data available. Try removing filters or refreshing the page.
        </div>
      )}
    </div>
  );
};
