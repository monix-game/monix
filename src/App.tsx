import { useState } from 'react'
import './App.css'
import monixLogo from './assets/logo.svg'
import { Button } from './components'
import { IconUser } from '@tabler/icons-react'

function App() {
  const [money, setMoney] = useState(0)
  const [tab, setTab] = useState<'money' | 'transactions' | 'settings'>('money')

  return (
    <div className="app-container">
      <header className="app-header">
        <img src={monixLogo} alt="Monix Logo" className="app-logo" />
        <h1>Monix</h1>
        <div className="nav-tabs">
          <span className={tab === 'money' ? 'active' : ''} onClick={() => setTab('money')}>Money</span>
          <span className={tab === 'transactions' ? 'active' : ''} onClick={() => setTab('transactions')}>Transactions</span>
          <span className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}>Settings</span>
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
              <h1>${money}</h1>
              <div className="money-buttons">
                <Button onClick={() => setMoney(money + 100)}>Add $100</Button>
                <Button onClick={() => setMoney(money - 100)}>Subtract $100</Button>
              </div>
            </div>
          </div>
        )}
        {tab === 'transactions' && (
          <div>
            <h2>Transactions</h2>
            <p>No transactions to display.</p>
          </div>
        )}
        {tab === 'settings' && (
          <div>
            <h2>Settings</h2>
            <p>Settings options will go here.</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
