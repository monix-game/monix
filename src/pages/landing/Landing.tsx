import './Landing.css';
import monixLogoLight from '../../assets/logo.svg';
import monixLogoDark from '../../assets/logo-dark.svg';
import { Button, Footer } from '../../components';
import { IconCoin, IconDeviceGamepad, IconMoneybagPlus } from '@tabler/icons-react';
import { currentTheme } from '../../helpers/theme';
import { isSignedIn } from '../../helpers/auth';
import { useEffect, useState } from 'react';

export default function Landing() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSignedIn(isSignedIn());
  }, []);

  return (
    <div className="landing-container">
      <header className="landing-header">
        <img src={monixLogoLight} alt="Monix Logo" className="landing-logo landing-logo-light" />
        <img src={monixLogoDark} alt="Monix Logo" className="landing-logo landing-logo-dark" />
        <h1 className="landing-title">Monix</h1>
        <div className="spacer"></div>

        {!signedIn && (
          <>
            <Button
              onClick={() => {
                location.href = '/auth/register';
              }}
            >
              Register
            </Button>
            <Button
              onClick={() => {
                location.href = '/auth/login';
              }}
              secondary
            >
              Login
            </Button>
          </>
        )}
        {signedIn && (
          <Button
            onClick={() => {
              location.href = '/game';
            }}
          >
            Go to Game
          </Button>
        )}
      </header>

      <main className="landing-main">
        <div className="landing-title">
          <img src={currentTheme() === 'dark' ? monixLogoDark : monixLogoLight} alt="Monix Logo" />
          <h1>Monix</h1>
        </div>

        <div className="landing-section hero">
          <span className="hero-subtitle mono">Explore hours of content!</span>
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
          <div className="hero-cta">
            {!signedIn && (
              <Button
                onClick={() => {
                  location.href = '/auth/register';
                }}
              >
                Get Started
              </Button>
            )}
            {signedIn && (
              <Button
                onClick={() => {
                  location.href = '/game';
                }}
              >
                Go to Game
              </Button>
            )}
          </div>
        </div>

        <div className="landing-section testimonials">
          <h1 className="section-title">What our users say</h1>
          <div className="testimonials-container">
            <div className="testimonial">
              <div className="testimonial-header">
                <img src={monixLogoLight} alt="testimonial Avatar" className="testimonial-img" />
                <span className="testimonial-username">person</span>
              </div>
              <div className="testimonial-body">lorem ipsum dolor sit amet.</div>
            </div>
            <div className="testimonial">
              <div className="testimonial-header">
                <img src={monixLogoLight} alt="testimonial Avatar" className="testimonial-img" />
                <span className="testimonial-username">person</span>
              </div>
              <div className="testimonial-body">lorem ipsum dolor sit amet.</div>
            </div>
            <div className="testimonial">
              <div className="testimonial-header">
                <img src={monixLogoLight} alt="testimonial Avatar" className="testimonial-img" />
                <span className="testimonial-username">person</span>
              </div>
              <div className="testimonial-body">lorem ipsum dolor sit amet.</div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
