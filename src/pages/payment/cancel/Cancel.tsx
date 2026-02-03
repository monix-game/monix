import '../Payment.css';
import monixLogoLight from '../../../assets/logo.svg';
import monixLogoDark from '../../../assets/logo-dark.svg';
import { AnimatedBackground, Button, Footer } from '../../../components';
import { currentTheme } from '../../../helpers/theme';

export default function Cancel() {
  return (
    <div className="payment-container">
      <AnimatedBackground />
      <div className="payment-island">
        <div className="payment-island-header">
          <div className="payment-logo-container">
            <img
              className="payment-logo"
              alt="Monix Logo"
              src={currentTheme() === 'dark' ? monixLogoDark : monixLogoLight}
            />
          </div>
          <h1 className="payment-title">Payment Cancelled</h1>
        </div>

        <div className="payment-island-main">
          <h2 className="payment-subtitle">Your payment was cancelled.</h2>
          <Button onClick={() => (globalThis.location.href = '/game')}>Go to Game</Button>
        </div>
      </div>

      <Footer fixed />
    </div>
  );
}
