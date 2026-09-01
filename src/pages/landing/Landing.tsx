import styles from './Landing.module.css';
import monixLogoLight from '../../assets/logo.svg';
import monixLogoDark from '../../assets/logo-dark.svg';
import { Button, EmojiText, Footer } from '../../components';
import {
  IconCoin,
  IconDeviceGamepad,
  IconMoneybagPlus,
  IconUsers,
  IconTrophy,
  IconChartLine,
  IconSparkles,
  IconFish,
} from '@tabler/icons-react';
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
    <div className={styles['landing-container']}>
      <header className={styles['landing-header']}>
        <img src={monixLogoLight} alt="Monix Logo" className={`${styles['landing-logo']} ${styles['landing-logo-light']}`} />
        <img src={monixLogoDark} alt="Monix Logo" className={`${styles['landing-logo']} ${styles['landing-logo-dark']}`} />
        <h1 className={styles['landing-title']}>Monix</h1>
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

      <main className={styles['landing-main']}>
        <div className={styles['landing-title']}>
          <img src={currentTheme() === 'dark' ? monixLogoDark : monixLogoLight} alt="Monix Logo" />
          <h1>Monix</h1>
        </div>

        <div className={`${styles['landing-section']} ${styles.hero}`}>
          <span className={`${styles['hero-subtitle']} mono`}>The Ultimate Virtual Economy Experience</span>
          <h1 className={styles['hero-title']}>
            <span className={styles['hero-title-word']}>
              <IconCoin />
              Sell.
            </span>

            <span className={styles['hero-title-word']}>
              <IconDeviceGamepad />
              Play.
            </span>

            <span className={styles['hero-title-word']}>
              <IconMoneybagPlus />
              Profit.
            </span>
          </h1>
          <p className={styles['hero-description']}>
            Build your virtual empire, trade resources, compete in games, and rise to the top of the
            leaderboard. Join thousands of players in the most engaging economy simulator on the
            web.
          </p>
          <div className={styles['hero-cta']}>
            {!signedIn && (
              <Button
                onClick={() => {
                  location.href = '/auth/register';
                }}
              >
                Get Started Free
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

        <div className={`${styles['landing-section']} ${styles.features}`}>
          <h1 className={styles['section-title']}>Why Choose Monix?</h1>
          <div className={styles['features-grid']}>
            <div className={styles['feature-card']}>
              <div className={styles['feature-icon']}>
                <IconFish size={48} />
              </div>
              <h3>Fishing & Resources</h3>
              <p>
                Cast your line and catch rare fish. Gather resources, build your inventory, and
                trade with others.
              </p>
            </div>

            <div className={styles['feature-card']}>
              <div className={styles['feature-icon']}>
                <IconUsers size={48} />
              </div>
              <h3>Social Hub</h3>
              <p>
                Connect with friends, join communities, and chat in real-time. Build relationships
                that matter.
              </p>
            </div>

            <div className={styles['feature-card']}>
              <div className={styles['feature-icon']}>
                <IconChartLine size={48} />
              </div>
              <h3>Market Economy</h3>
              <p>Buy low, sell high. Master the dynamic marketplace and become a trading mogul.</p>
            </div>

            <div className={styles['feature-card']}>
              <div className={styles['feature-icon']}>
                <IconTrophy size={48} />
              </div>
              <h3>Leaderboards</h3>
              <p>
                Compete for the top spot. Track your progress and see how you stack up against the
                best.
              </p>
            </div>
          </div>
        </div>

        <div className={`${styles['landing-section']} ${styles.stats}`}>
          <h1 className={styles['section-title']}>Join the Community</h1>
          <div className={styles['stats-grid']}>
            <div className={styles['stat-card']}>
              <div className={styles['stat-number']}>10K+</div>
              <div className={styles['stat-label']}>Active Players</div>
            </div>
            <div className={styles['stat-card']}>
              <div className={styles['stat-number']}>1M+</div>
              <div className={styles['stat-label']}>Trades Made</div>
            </div>
            <div className={styles['stat-card']}>
              <div className={styles['stat-number']}>50K+</div>
              <div className={styles['stat-label']}>Fish Caught</div>
            </div>
            <div className={styles['stat-card']}>
              <div className={styles['stat-number']}>24/7</div>
              <div className={styles['stat-label']}>Support</div>
            </div>
          </div>
        </div>

        <div className={`${styles['landing-section']} ${styles.testimonials}`}>
          <h1 className={styles['section-title']}>What Players Are Saying</h1>
          <div className={styles['testimonials-container']}>
            <div className={styles.testimonial}>
              <div className={styles['testimonial-stars']}>
                <EmojiText>⭐⭐⭐⭐⭐</EmojiText>
              </div>
              <div className={styles['testimonial-body']}>
                "Monix is incredibly addictive! The fishing mechanics are so well done, and the
                market system keeps me coming back every day. Best virtual economy game I've
                played!"
              </div>
              <div className={styles['testimonial-header']}>
                <div className={styles['testimonial-avatar']}>
                  <IconSparkles size={20} />
                </div>
                <span className={styles['testimonial-username']}>TradeMaster92</span>
              </div>
            </div>
            <div className={styles.testimonial}>
              <div className={styles['testimonial-stars']}>
                <EmojiText>⭐⭐⭐⭐⭐</EmojiText>
              </div>
              <div className={styles['testimonial-body']}>
                "The community here is amazing. I've made so many friends and the social features
                make trading and playing mini-games even more fun. Highly recommend!"
              </div>
              <div className={styles['testimonial-header']}>
                <div className={styles['testimonial-avatar']}>
                  <IconUsers size={20} />
                </div>
                <span className={styles['testimonial-username']}>SocialButterfly</span>
              </div>
            </div>
            <div className={styles.testimonial}>
              <div className={styles['testimonial-stars']}>
                <EmojiText>⭐⭐⭐⭐⭐</EmojiText>
              </div>
              <div className={styles['testimonial-body']}>
                "I love the competitive aspect! Climbing the leaderboard keeps me motivated, and
                there's always something new to discover. The devs really care about this game."
              </div>
              <div className={styles['testimonial-header']}>
                <div className={styles['testimonial-avatar']}>
                  <IconTrophy size={20} />
                </div>
                <span className={styles['testimonial-username']}>ChampionPlayer</span>
              </div>
            </div>
          </div>
        </div>

        <div className={`${styles['landing-section']} ${styles['cta-final']}`}>
          <h1 className={styles['cta-title']}>Ready to Start Your Journey?</h1>
          <p className={styles['cta-description']}>
            Join the Monix community today and experience the thrill of building your own virtual
            empire.
          </p>
          <div className={styles['cta-buttons']}>
            {!signedIn && (
              <>
                <Button
                  color="blue"
                  onClick={() => {
                    location.href = '/auth/register';
                  }}
                >
                  Create Free Account
                </Button>
                <Button
                  color="blue"
                  onClick={() => {
                    location.href = '/auth/login';
                  }}
                  secondary
                >
                  Sign In
                </Button>
              </>
            )}
            {signedIn && (
              <Button
                color="blue"
                onClick={() => {
                  location.href = '/game';
                }}
              >
                Go to Game
              </Button>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
