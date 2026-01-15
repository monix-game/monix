import './Landing.css';
import monixLogoLight from '../../assets/logo.svg';
import monixLogoDark from '../../assets/logo-dark.svg';
import { Button, Footer } from '../../components';
import { IconCoin, IconDeviceGamepad, IconMoneybagPlus } from '@tabler/icons-react';
import { currentTheme } from '../../helpers/theme';

export default function Landing() {
  return (
    <div className="landing-container">
      <header className="landing-header">
        <img
          src={currentTheme() === 'dark' ? monixLogoDark : monixLogoLight}
          alt="Monix Logo"
          className="landing-logo"
        />
        <h1 className="landing-title">Monix</h1>
        <div className="spacer"></div>
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
      </header>

      <main className="landing-main">
        <div className="title">
          <img src={currentTheme() === 'dark' ? monixLogoDark : monixLogoLight} alt="Monix Logo" />
          <h1>Monix</h1>
        </div>

        <div className="section hero">
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
            <Button
              onClick={() => {
                location.href = '/auth/register';
              }}
            >
              Get Started
            </Button>
          </div>
        </div>

        <div className="section testimonials">
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
