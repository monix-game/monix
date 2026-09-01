import styles from '../Payment.module.css';
import monixLogoLight from '../../../assets/logo.svg';
import monixLogoDark from '../../../assets/logo-dark.svg';
import { AnimatedBackground, Button, Footer } from '../../../components';
import { currentTheme } from '../../../helpers/theme';

export default function Success() {
  return (
    <div className={styles['payment-container']}>
      <AnimatedBackground />
      <div className={styles['payment-island']}>
        <div className={styles['payment-island-header']}>
          <div className={styles['payment-logo-container']}>
            <img
              className={styles['payment-logo']}
              alt="Monix Logo"
              src={currentTheme() === 'dark' ? monixLogoDark : monixLogoLight}
            />
          </div>
          <h1 className={styles['payment-title']}>Payment Success</h1>
        </div>

        <div className={styles['payment-island-main']}>
          <h2 className={styles['payment-subtitle']}>Thanks for your payment!</h2>
          <Button onClick={() => (globalThis.location.href = '/game')}>Go to Game</Button>
        </div>
      </div>

      <Footer fixed />
    </div>
  );
}
