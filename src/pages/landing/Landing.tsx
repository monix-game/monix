import './Landing.css'
import monixLogo from '../../assets/logo.svg'
import { Button, Footer } from '../../components'
import { IconCoin, IconDeviceGamepad, IconMoneybagPlus } from '@tabler/icons-react'

export default function Landing() {
  return (
    <div className="landing-container">
      <header className="landing-header">
        <img src={monixLogo} alt="Monix Logo" className="landing-logo" />
        <h1 className="landing-title">Monix</h1>
        <div className="spacer"></div>
        <Button onClick={() => { location.href = '/auth/register' }}>Register</Button>
        <Button onClick={() => { location.href = '/auth/login' }} secondary>Login</Button>
      </header>

      <main className="landing-main">
        <div className="title">
          <img src={monixLogo} alt="Monix Logo" />
          <h1>Monix</h1>
        </div>

        <div className="section hero">
          <span className="hero-subtitle">Explore fishing events today!</span>
          <h1 className="hero-title">
            <span className="hero-title-word">
              <IconCoin />
              Sell.
            </span>

            <span className="hero-title-word">
              <IconDeviceGamepad />
              Play.
            </span>

            <span className="hero-title-word">
              <IconMoneybagPlus />
              Profit.
            </span>
          </h1>
        </div>

        <div className="section testamonials">
          <h1 className="section-title">What our users say</h1>
          <div className="testamonials-container">
            <div className="testamonial">
              <div className="testamonial-header">
                <img src={monixLogo} alt="Testamonial Avatar" className="testamonial-img" />
                <span className="testamonial-username">person</span>
              </div>
              <div className="testamonial-body">
                lorem ipsum dolor sit amet.
              </div>
            </div>
            <div className="testamonial">
              <div className="testamonial-header">
                <img src={monixLogo} alt="Testamonial Avatar" className="testamonial-img" />
                <span className="testamonial-username">person</span>
              </div>
              <div className="testamonial-body">
                lorem ipsum dolor sit amet.
              </div>
            </div>
            <div className="testamonial">
              <div className="testamonial-header">
                <img src={monixLogo} alt="Testamonial Avatar" className="testamonial-img" />
                <span className="testamonial-username">person</span>
              </div>
              <div className="testamonial-body">
                lorem ipsum dolor sit amet.
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
