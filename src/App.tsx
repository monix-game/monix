import { useState } from 'react'
import './App.css'
import monixLogo from './assets/logo.svg'
import { Button, Card, Input, Modal, Select } from './components'

function App() {
  const [checkingMoney, setCheckingMoney] = useState(0)
  const [savingsMoney, setSavingsMoney] = useState(0)

  const [transferModalOpen, setTransferModalOpen] = useState(false)
  const [fromAccount, setFromAccount] = useState<'checking' | 'savings'>('checking')
  const [toAccount, setToAccount] = useState<'checking' | 'savings'>('savings')
  const [transferAmount, setTransferAmount] = useState<number>(0)

  return (
    <div className="app-container">
      <header className="app-header">
        <img src={monixLogo} alt="Monix Logo" width={100} />
        <h1>Monix</h1>
      </header>

      <main className="app-main">
        <h1>Accounts</h1>

        <Button variant="primary" onClick={() => setTransferModalOpen(true)}>
          Transfer Money
        </Button>

        {/* Bank accounts */}
        <Card title="Checking" className="bank-account">
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '16px 0' }}>
            ${checkingMoney}
          </p>
          <Button
            variant="primary"
            onClick={() => setCheckingMoney((prev) => prev + 1)}
          >
            Earn $1
          </Button>
        </Card>

        <Card title="Savings" className="bank-account">
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '16px 0' }}>
            ${savingsMoney}
          </p>
          <p>Accrues 0.5% interest per IRL week</p>
        </Card>

        {/* Modals */}
        <Modal title="Transfer Money" isOpen={transferModalOpen} onClose={() => setTransferModalOpen(false)}>
          
          <Select label='From Account' onChange={(e) => setFromAccount(e.target.value as 'checking' | 'savings')} options={[
            { label: 'Checking', value: 'checking' },
            { label: 'Savings', value: 'savings' }
          ]}></Select>

          <Select label='To Account' onChange={(e) => setToAccount(e.target.value as 'checking' | 'savings')} options={[
            { label: 'Checking', value: 'checking' },
            { label: 'Savings', value: 'savings' }
          ]}></Select>

          <Input type='number' label='Amount' placeholder='Enter amount to transfer' onChange={(e) => setTransferAmount(Number(e.target.value))} />

          <Button variant="primary" style={{ marginTop: '10px' }} onClick={() => {
            setTransferModalOpen(false)
            
            // See if the from account has enough money
            let canTransfer = false
            if (fromAccount === 'checking' && checkingMoney >= transferAmount) {
              canTransfer = true
            }
            if (fromAccount === 'savings' && savingsMoney >= transferAmount) {
              canTransfer = true
            }

            if (canTransfer) {
              // Perform the transfer
              if (fromAccount === 'checking') {
                setCheckingMoney((prev) => prev - transferAmount)
              } else {
                setSavingsMoney((prev) => prev - transferAmount)
              }

              if (toAccount === 'checking') {
                setCheckingMoney((prev) => prev + transferAmount)
              } else {
                setSavingsMoney((prev) => prev + transferAmount)
              }
            }
          }}>
            Transfer
          </Button>

          <Button variant="secondary" onClick={() => setTransferModalOpen(false)} style={{ marginTop: '10px' }}>
            Close
          </Button>
        </Modal>
      </main>
    </div>
  )
}

export default App
