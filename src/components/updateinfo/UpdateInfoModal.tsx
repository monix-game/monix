import React from 'react';
import styles from './UpdateInfoModal.module.css';
import { Modal } from '../modal/Modal';
import { EmojiText } from '../EmojiText';

interface UpdateInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Feature {
  icon: string;
  title: string;
  description: string;
}

interface FeatureSection {
  heading: string;
  features: Feature[];
}

const sections: FeatureSection[] = [
  {
    heading: "What's new",
    features: [
      {
        icon: '🎃',
        title: 'Trick or Trout',
        description:
          'A limited-time Halloween fishing event with spooky catches. Every fish caught during the event is Haunted, a guaranteed 5× value modifier, and Spooky Bait gives you a better shot at the creepiest fish in the sea.',
      },
      {
        icon: '🎣',
        title: 'Fishing Frenzy',
        description:
          'Activate a server-wide frenzy that boosts fishing for everyone. It now shows a live countdown for both the frenzy and its cooldown.',
      },
      {
        icon: '⚔️',
        title: 'VS Mode',
        description:
          'Pit your latest catch against one of your pets and see which one earns more over an hour.',
      },
      {
        icon: '🐾',
        title: 'Stray pets & the Satchel',
        description:
          'Casts can now pull up stray pets. They wait in your Satchel (20 slots) until you pay to adopt them, and you can buy extra kennel slots when your collection outgrows it.',
      },
      {
        icon: '💛',
        title: 'Pet care upgrades',
        description:
          'New happiness and hunger meters make it easy to see how your pets are doing, alongside pet charms and the revamped pet shop.',
      },
      {
        icon: '🏆',
        title: 'Leaderboard overhaul',
        description:
          'Expanded net-worth rows show a full breakdown of cash, resources, rods, bait, and fish. Nameplates, role badges, and staff filtering now work consistently across every board.',
      },
      {
        icon: '💬',
        title: 'Direct messages',
        description:
          'Message any player directly from the Social tab. New conversations now appear instantly, with chat notifications, image sharing, message editing, deletion, and reporting.',
      },
      {
        icon: '🎨',
        title: 'Themes & customisation',
        description:
          'Choose from six colour palettes, switch on the limited-time seasonal look, and show off your avatar, nameplate, and cosmetic tags.',
      },
      {
        icon: '🎵',
        title: 'Monix Radio',
        description:
          'Seven new tracks join the rotation: Older Times, Vast Expanse, Funchat, Bread, CARROT, blip, and again.',
      },
      {
        icon: '🪎',
        title: 'Daily Rewards',
        description:
          'Claim a reward every day, build a streak, and keep track of what is coming next.',
      },
      {
        icon: '🔔',
        title: 'Notifications',
        description:
          'Chat and event notifications now arrive as in-game toasts, and your auto-sell and other preferences persist between sessions.',
      },
      {
        icon: '💸',
        title: 'Give money to other users',
        description:
          'Send money straight from the Money screen. Open “Give Money”, enter a username and a whole-dollar amount, and it is transferred instantly.',
      },
      {
        icon: '🧹',
        title: 'Staff tools',
        description:
          'Staff can now run targeted progression resets from the admin panel, with per-category confirmations and an audit log.',
      },
    ],
  },
];

export const UpdateInfoModal: React.FC<UpdateInfoModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} ariaLabel="Update information" width={720}>
      <div className={styles['update-info']}>
        <header className={styles['update-info-header']}>
          <span className={styles['update-info-kicker']}>Spooknix update 2026</span>
          <h2>Update information</h2>
          <p>
            Everything that has landed in Monix recently, plus an explanation of what happened to
            prestige and the old economy.
          </p>
        </header>

        {sections.map(section => (
          <section key={section.heading} className={styles['update-info-section']}>
            <h3>{section.heading}</h3>
            <ul className={styles['feature-list']}>
              {section.features.map(feature => (
                <li key={feature.title} className={styles['feature-item']}>
                  <span className={styles['feature-icon']} aria-hidden="true">
                    <EmojiText>{feature.icon}</EmojiText>
                  </span>
                  <div className={styles['feature-copy']}>
                    <span className={styles['feature-title']}>{feature.title}</span>
                    <span className={styles['feature-description']}>{feature.description}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section className={`${styles['update-info-section']} ${styles['update-info-warning']}`}>
          <h3>
            <EmojiText>🧭</EmojiText> Where did everything go?
          </h3>
          <p>
            Prestige was being abused to generate far more money than the game was designed for, so
            it has been removed completely. Prestige levels, shards, and permanent upgrades no
            longer exist, and any leftover data is ignored.
          </p>
          <p>
            Because that exploit had already distorted the economy, the economy was reset as well.
            Everyone is starting again from a clean balance, and old progress tied to the removed
            system does not carry over. This is why your money and progression may look different
            than you remember.
          </p>
          <p className={styles['update-info-footer']}>
            The game is now balanced around fishing, pets, resources, and daily rewards. Thanks for
            sticking with Monix — and happy fishing.

            - Ferretosan (and AI-I mean, who said that cough cough)
          </p>
        </section>
      </div>
    </Modal>
  );
};

export default UpdateInfoModal;
