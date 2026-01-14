import './Game.css';
import { useEffect, useState } from 'react';
import monixLogoLight from '../../assets/logo.svg';
import monixLogoDark from '../../assets/logo-dark.svg';
import {
  EmojiText,
  ResourceGraph,
  ResourceList,
  Checkbox,
  AnimatedBackground,
  Footer,
} from '../../components';
import { IconUser } from '@tabler/icons-react';
import { getResourceById } from '../../../server/common/resources';
import type { IUser } from '../../../server/common/models/user';
import { fetchUser } from '../../helpers/auth';
import { currentTheme } from '../../helpers/theme';
import { getTotalResourceValue } from '../../helpers/resource';

export default function Game() {
  const [money] = useState<number>(0);
  const [resourcesTotal, setResourcesTotal] = useState<number>(0);
  const [aquariumTotal] = useState<number>(0);
  const [petsTotal] = useState<number>(0);
  const [tab, rawSetTab] = useState<
    'money' | 'resources' | 'market' | 'fishing' | 'pets' | 'leaderboard' | 'settings'
  >('money');
  const [user, setUser] = useState<IUser | null>(null);
  const [userRole, setUserRole] = useState<string>('guest');
  const [userRoleFormatted, setUserRoleFormatted] = useState<string>('Guest');
  const [resourceFilterStatic, setResourceFilterStatic] = useState<boolean>(false);

  useEffect(() => {
    document.getElementsByTagName('body')[0].className = `tab-${tab}`;
  }, [tab]);

  const setTab = (newTab: typeof tab) => {
    document.getElementsByTagName('body')[0].className = `tab-${newTab}`;
    rawSetTab(newTab);
  };

  const updateTotalResourcesValue = async () => {
    const totalValue = await getTotalResourceValue();
    setResourcesTotal(totalValue);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void updateTotalResourcesValue();

    const interval = setInterval(async () => {
      await updateTotalResourcesValue();
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const updateFormattedUserRole = (role: string) => {
      let formatted = role.replace('_', ' ').trim();

      // Title case the formatted role
      formatted = formatted
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      setUserRoleFormatted(formatted);
    };

    void fetchUser().then(userData => {
      setUser(userData);

      const role = userData
        ? userData.is_admin
          ? 'admin'
          : userData.is_game_mod
            ? 'game-mod'
            : userData.is_social_mod
              ? 'social-mod'
              : userData.is_helper
                ? 'helper'
                : 'user'
        : 'guest';

      setUserRole(role);

      updateFormattedUserRole(role);
    });
  }, []);

  return (
    <div className="app-container">
      <header className="app-header">
        <img
          src={currentTheme() === 'dark' ? monixLogoDark : monixLogoLight}
          alt="Monix Logo"
          className="app-logo"
        />
        <h1 className="app-title">Monix</h1>
        <div className="nav-tabs">
          <span className={tab === 'money' ? 'active tab' : 'tab'} onClick={() => setTab('money')}>
            <EmojiText>💰 Money</EmojiText>
          </span>
          <span
            className={tab === 'resources' ? 'active tab' : 'tab'}
            onClick={() => setTab('resources')}
          >
            <EmojiText>🪙 Resources</EmojiText>
          </span>
          <span
            className={tab === 'market' ? 'active tab' : 'tab'}
            onClick={() => setTab('market')}
          >
            <EmojiText>🏪 Market</EmojiText>
          </span>
          <span
            className={tab === 'fishing' ? 'active tab' : 'tab'}
            onClick={() => setTab('fishing')}
          >
            <EmojiText>🎣 Fishing</EmojiText>
          </span>
          <span className={tab === 'pets' ? 'active tab' : 'tab'} onClick={() => setTab('pets')}>
            <EmojiText>🐶 Pets</EmojiText>
          </span>
          <span
            className={tab === 'leaderboard' ? 'active tab' : 'tab'}
            onClick={() => setTab('leaderboard')}
          >
            <EmojiText>🏆 Leaderboard</EmojiText>
          </span>
          <span
            className={tab === 'settings' ? 'active tab' : 'tab'}
            onClick={() => setTab('settings')}
          >
            <EmojiText>⚙️ Settings</EmojiText>
          </span>
        </div>
        <div className="spacer" />
        <div className="user-info">
          <IconUser size={24} />
          <span className="username">{user ? user.username : 'Guest'}</span>
          {userRole !== 'guest' && <span className={`badge ${userRole}`}>{userRoleFormatted}</span>}
        </div>
      </header>

      <main className="app-main">
        {tab === 'money' && (
          <div>
            <AnimatedBackground />
            <div className="money-tab-content">
              <h1 className="mono">
                <span>${money}</span>
              </h1>
              <div className="money-info">
                <span className="money-info-line">
                  <EmojiText>📈 Resources:</EmojiText>{' '}
                  <span className="mono">${resourcesTotal}</span>
                </span>
                <span className="money-info-line">
                  <EmojiText>🎣 Aquarium:</EmojiText> <span className="mono">${aquariumTotal}</span>
                </span>
                <span className="money-info-line">
                  <EmojiText>🐶 Pets:</EmojiText> <span className="mono">${petsTotal}</span>
                </span>
              </div>
            </div>
          </div>
        )}
        {tab === 'resources' && (
          <div className="tab-content">
            <h2>Resources</h2>
            <Checkbox
              label="Auto-sort"
              checked={!resourceFilterStatic}
              onClick={() => setResourceFilterStatic(!resourceFilterStatic)}
            />
            <ResourceList isStatic={resourceFilterStatic} />
          </div>
        )}
        {tab === 'market' && (
          <div className="tab-content">
            <h2>Market Tab</h2>
            <ResourceGraph resource={getResourceById('gold')!} />
          </div>
        )}
        {tab === 'fishing' && (
          <div className="tab-content">
            <h2>Fishing Tab</h2>
            <p>Content for Fishing will go here.</p>
          </div>
        )}
        {tab === 'pets' && (
          <div className="tab-content">
            <h2>Pets Tab</h2>
            <p>Content for Pets will go here.</p>
          </div>
        )}
        {tab === 'leaderboard' && (
          <div className="tab-content">
            <h2>Leaderboard Tab</h2>
            <p>Content for Leaderboard will go here.</p>
          </div>
        )}
        {tab === 'settings' && (
          <div className="tab-content">
            <h2>Settings Tab</h2>
            <p>Content for Settings will go here.</p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
