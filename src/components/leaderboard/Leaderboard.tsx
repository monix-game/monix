import React, { useEffect } from 'react';
import styles from './Leaderboard.module.css';
import {
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
import { useSocket } from '../../providers/socket';

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

  const { subscribe } = useSocket();

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
    const markHydrated = () => setHydrated(true);

    const unsubMoney = subscribe('leaderboard:money', data => {
      setRawMoneyData(data as { normal: LeaderboardEntry[]; noStaff: LeaderboardEntry[] });
      markHydrated();
    });
    const unsubFish = subscribe('leaderboard:fish', data => {
      setRawFishData(data as { normal: FishLeaderboardEntry[]; noStaff: FishLeaderboardEntry[] });
      markHydrated();
    });

    return () => {
      unsubMoney();
      unsubFish();
    };
  }, [subscribe]);

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
            Most Money
          </button>
          <button
            type="button"
            className={`${styles['leaderboard-tab']} ${!isMoneyTab ? styles.active : ''}`}
            onClick={() => setActiveTab('fish')}
          >
            Fish Caught
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
              <div key={entry.rank} className={`${styles['podium-position']} ${styles[getPodiumLevel(entry.rank)]}`}>
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
                <span className={styles['podium-money']}>
                  {isMoneyTab
                    ? `$${(entry as LeaderboardEntry).money.toLocaleString()}`
                    : `${(entry as FishLeaderboardEntry).fishCaught.toLocaleString()} fish`}
                </span>
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
                <span className={styles['leaderboard-money']}>
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
        <div className={styles['leaderboard-no-data']}>
          No leaderboard data available. Try removing filters or refreshing the page.
        </div>
      )}
    </div>
  );
};
