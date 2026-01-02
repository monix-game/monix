import { useEffect, useState } from 'react'
import './App.css'
import monixLogo from './assets/logo.svg'
import { Button, EmojiText, ResourceGraph, ResourceList } from './components'
import { IconUser } from '@tabler/icons-react'
import { getResourceById } from '../server/common/resources'
import type { IUser } from '../server/common/models/user'
import { Checkbox } from './components/checkbox/Checkbox'

function App() {
  const [money, setMoney] = useState(0)
  const [tab, rawSetTab] = useState<'money' | 'resources' | 'market' | 'fishing' | 'pets' | 'leaderboard' | 'settings'>('money')
  const [user, setUser] = useState<IUser | null>(null)
  const [resourceFilterStatic, setResourceFilterStatic] = useState<boolean>(false);

  useEffect(() => {
    document.getElementsByTagName('body')[0].className = `tab-${tab}`
  }, [tab]);

  const setTab = (newTab: typeof tab) => {
    document.getElementsByTagName('body')[0].className = `tab-${newTab}`
    rawSetTab(newTab)
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <img src={monixLogo} alt="Monix Logo" className="app-logo" />
        <h1 className="app-title">Monix</h1>
        <div className="nav-tabs">
          <span className={tab === 'money' ? 'active tab' : 'tab'} onClick={() => setTab('money')}><EmojiText>💰 Money</EmojiText></span>
          <span className={tab === 'resources' ? 'active tab' : 'tab'} onClick={() => setTab('resources')}><EmojiText>🪙 Resources</EmojiText></span>
          <span className={tab === 'market' ? 'active tab' : 'tab'} onClick={() => setTab('market')}><EmojiText>🏪 Market</EmojiText></span>
          <span className={tab === 'fishing' ? 'active tab' : 'tab'} onClick={() => setTab('fishing')}><EmojiText>🎣 Fishing</EmojiText></span>
          <span className={tab === 'pets' ? 'active tab' : 'tab'} onClick={() => setTab('pets')}><EmojiText>🐶 Pets</EmojiText></span>
          <span className={tab === 'leaderboard' ? 'active tab' : 'tab'} onClick={() => setTab('leaderboard')}><EmojiText>🏆 Leaderboard</EmojiText></span>
          <span className={tab === 'settings' ? 'active tab' : 'tab'} onClick={() => setTab('settings')}><EmojiText>⚙️ Settings</EmojiText></span>
        </div>
        <div className="spacer" />
        <div className="user-info">
          <IconUser size={24} />
          <span>{user ? user.username : "Guest"}</span>
        </div>
      </header>

      <main className="app-main">
        {tab === 'money' && (
          <div>
            <div className="money-bg" />
            <div className="money-tab-content">
              <h1>
                <span>${money}</span>
              </h1>
              <div className="money-buttons">
                <Button onClick={() => setMoney(money + 100)}>Add $100</Button>
                <Button onClick={() => setMoney(money - 100)}>Subtract $100</Button>
              </div>
            </div>
          </div>
        )}
        {tab === 'resources' && (
          <div className="tab-content">
            <h2>Resources</h2>
            <Checkbox label="Auto-sort" checked={!resourceFilterStatic} onClick={() => setResourceFilterStatic(!resourceFilterStatic)} />
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

      <footer className="app-footer">
        <span>© 2026 Monix. All rights reserved. This site is <a href="https://github.com/monix-game/monix" target="_blank" rel="noopener noreferrer">open-source</a></span>
      </footer>
    </div>
  )
}

export default App
