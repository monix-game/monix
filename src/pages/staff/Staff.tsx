import './Staff.css';
import { useCallback, useEffect, useState } from 'react';
import monixLogoLight from '../../assets/logo.svg';
import monixLogoDark from '../../assets/logo-dark.svg';
import { EmojiText } from '../../components';
import { IconUser } from '@tabler/icons-react';
import type { IUser } from '../../../server/common/models/user';
import { fetchUser } from '../../helpers/auth';
import { titleCase } from '../../helpers/utils';

export default function Staff() {
  // App states
  const [tab, rawSetTab] = useState<'dashboard'>('dashboard');

  // User states
  const [user, setUser] = useState<IUser | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    document.getElementsByTagName('body')[0].className = `tab-${tab}`;
  }, [tab]);

  const setTab = (newTab: typeof tab) => {
    document.getElementsByTagName('body')[0].className = `tab-${newTab}`;
    rawSetTab(newTab);
  };

  const updateEverything = useCallback(async () => {
    const userData = await fetchUser();

    if (!userData || userData.role === 'user') window.location.href = '/auth/login';

    setUser(userData);
    setUserRole(userData ? userData.role : 'user');
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void updateEverything();

    const interval = setInterval(async () => {
      await updateEverything();
    }, 1000);
    return () => clearInterval(interval);
  }, [updateEverything]);

  return (
    <div className="app-container">
      <header className="app-header">
        <img src={monixLogoLight} alt="Monix Logo" className="app-logo app-logo-light" />
        <img src={monixLogoDark} alt="Monix Logo" className="app-logo app-logo-dark" />
        <h1 className="app-title">Monix Staff</h1>
        <div className="nav-tabs">
          {(() => {
            const tabs = [{ key: 'dashboard', label: '📊 Dashboard' }] as const;

            const half = Math.ceil(tabs.length / 2);
            const row1 = tabs.slice(0, half);
            const row2 = tabs.slice(half);

            const renderTab = (t: { key: typeof tab; label: string }) => (
              <span
                key={t.key}
                className={tab === t.key ? 'active tab' : 'tab'}
                onClick={() => setTab(t.key)}
              >
                <EmojiText>{t.label}</EmojiText>
              </span>
            );

            return (
              <>
                <div className="nav-row">{row1.map(renderTab)}</div>
                <div className="nav-row">{row2.map(renderTab)}</div>
              </>
            );
          })()}
        </div>
        <div className="spacer" />
        <div className="user-info">
          <div className="username-info">
            {user?.avatar_data_uri && (
              <img src={user.avatar_data_uri} alt="User Avatar" className="user-avatar" />
            )}
            {!user?.avatar_data_uri && <IconUser size={24} />}
            <span
              className="username clickable"
              onClick={() => {
                window.location.href = '/game';
              }}
            >
              {user ? user.username : 'User'}
            </span>
            {userRole !== null && userRole !== 'user' && (
              <span className={`badge ${userRole}`}>{titleCase(userRole)}</span>
            )}
          </div>
        </div>
      </header>

      <main className="app-main">
        {tab === 'dashboard' && (
          <div className="dashboard-tab">
            <h2>Welcome to the Staff Dashboard</h2>
            <p>Use the tools below to manage reports and moderate the community.</p>
            {/* Additional staff dashboard components can be added here */}
          </div>
        )}
      </main>
    </div>
  );
}
