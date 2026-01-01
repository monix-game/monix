import { useState } from 'react'
import './App.css'
import monixLogo from './assets/logo.svg'
import { gold, silver, oil } from './assets/resources'
import { Button, EmojiText } from './components'
import { IconUser } from '@tabler/icons-react'
import { Resource } from './components/resource/Resource'

function App() {
  const [money, setMoney] = useState(0)
  const [tab, setTab] = useState<'money' | 'resources' | 'market' | 'fishing' | 'pets' | 'leaderboard' | 'settings'>('money')

  return (
    <div className="app-container">
      <header className="app-header">
        <img src={monixLogo} alt="Monix Logo" className="app-logo" />
        <h1>Monix</h1>
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
          <span>User</span>
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
          <div className="placeholder-tab">
            <h2>Resources</h2>
            <div className="resource-list">
              <Resource icon={gold} name="Gold" quantity={0} unit="kg" value={0} />
              <Resource icon={silver} name="Silver" quantity={0} unit="kg" value={0} />
              <Resource icon={oil} name="Crude Oil" quantity={0} unit="L" value={0} />
            </div>
          </div>
        )}
        {tab === 'market' && (
          <div className="placeholder-tab">
            <h2>Market Tab</h2>
            <p>Content for Market will go here.</p>
          </div>
        )}
        {tab === 'fishing' && (
          <div className="placeholder-tab">
            <h2>Fishing Tab</h2>
            <p>Content for Fishing will go here.</p>
          </div>
        )}
        {tab === 'pets' && (
          <div className="placeholder-tab">
            <h2>Pets Tab</h2>
            <p>Content for Pets will go here.</p>
          </div>
        )}
        {tab === 'leaderboard' && (
          <div className="placeholder-tab">
            <h2>Leaderboard Tab</h2>
            <p>Content for Leaderboard will go here.</p>
          </div>
        )}
        {tab === 'settings' && (
          <div className="placeholder-tab">
            <h2>Settings Tab</h2>
            <p>Content for Settings will go here.</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
