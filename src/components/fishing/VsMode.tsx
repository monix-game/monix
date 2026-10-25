import React, { useMemo, useState } from 'react';
import styles from './VsMode.module.css';
import { EmojiText } from '../EmojiText';
import { petTypes } from '../../../server/common/petTypes';
import { fishTypes } from '../../../server/common/fishing/fishTypes';
import { getFishValue } from '../../../server/common/fishing/fishing';
import { petPassiveRate } from '../../../server/common/pet';
import { smartFormatNumber } from '../../../server/common/math';
import type { IPet } from '../../../server/common/models/pet';
import type { IFish } from '../../../server/common/models/fish';

interface VsModeProps {
  fish: IFish | null;
  pets: IPet[];
  passiveIncomeBonus?: number;
}

/**
 * Side-by-side comparison of the current catch against one of the player's
 * pets. Purely informational — it never awards anything — so it is safe to
 * render from client state alone.
 */
export const VsMode: React.FC<VsModeProps> = ({ fish, pets, passiveIncomeBonus = 0 }) => {
  const [selectedPetUuid, setSelectedPetUuid] = useState<string | null>(null);

  const pet = useMemo(() => {
    if (pets.length === 0) return null;
    return pets.find(p => p.uuid === selectedPetUuid) || pets[0];
  }, [pets, selectedPetUuid]);

  if (pets.length === 0) {
    return (
      <div className={styles['vs-empty']}>
        <EmojiText>🐾</EmojiText> Adopt a pet to start a matchup.
      </div>
    );
  }

  const fishType = fish ? fishTypes.find(f => f.id === fish.type) : null;
  const fishValue = fish ? getFishValue(fish) : 0;
  const petType = pet ? petTypes.find(t => t.id === pet?.type_id) : null;

  // Comparable "power" figures: the fish is worth money, the pet earns per
  // minute. Normalised against an hour of the pet's income so the two bars
  // are on roughly the same scale.
  const fishScore = fishValue;
  const petScore = pet ? petPassiveRate(pet, passiveIncomeBonus) * 60 : 0;
  const total = fishScore + petScore;
  const fishShare = total > 0 ? (fishScore / total) * 100 : 50;

  return (
    <div className={styles['vs-panel']}>
      <div className={styles['vs-header']}>
        <h3>
          <EmojiText>⚔️</EmojiText> VS Mode
        </h3>
        {pets.length > 1 && (
          <select
            className={styles['vs-select']}
            value={pet?.uuid || ''}
            onChange={e => setSelectedPetUuid(e.target.value)}
            aria-label="Choose opponent pet"
          >
            {pets.map(p => (
              <option key={p.uuid} value={p.uuid}>
                {p.name || petTypes.find(t => t.id === p.type_id)?.name || p.type_id}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className={styles['vs-arena']}>
        <div className={styles['vs-side']}>
          <span className={styles['vs-icon']}>
            <EmojiText>{fishType?.icon || '🎣'}</EmojiText>
          </span>
          <span className={styles['vs-name']}>{fishType?.name || 'No catch yet'}</span>
          <span className={styles['vs-value']}>{fish ? smartFormatNumber(fishValue) : '—'}</span>
        </div>

        <span className={styles['vs-divider']}>
          <EmojiText>VS</EmojiText>
        </span>

        <div className={styles['vs-side']}>
          <span className={styles['vs-icon']}>
            <EmojiText>{petType?.icon || '🐾'}</EmojiText>
          </span>
          <span className={styles['vs-name']}>{pet?.name || petType?.name || 'Pet'}</span>
          <span className={styles['vs-value']}>{smartFormatNumber(petScore)}/hr</span>
        </div>
      </div>

      <div className={styles['vs-bar']}>
        <div
          className={`${styles['vs-bar-fill']} ${styles['vs-bar-fish']}`}
          style={{ width: `${fishShare}%` }}
        />
        <div
          className={`${styles['vs-bar-fill']} ${styles['vs-bar-pet']}`}
          style={{ width: `${100 - fishShare}%` }}
        />
      </div>

      <p className={styles['vs-verdict']}>
        {!fish ? (
          'Cast a line to start a matchup.'
        ) : fishScore > petScore ? (
          <>
            <EmojiText>🎣</EmojiText> Your catch out-earns this pet over an hour.
          </>
        ) : fishScore < petScore ? (
          <>
            <EmojiText>🐾</EmojiText> This pet out-earns your catch over an hour.
          </>
        ) : (
          <>
            <EmojiText>🤝</EmojiText> Dead heat.
          </>
        )}
      </p>
    </div>
  );
};

export default VsMode;
