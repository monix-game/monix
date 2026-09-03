import React from 'react';
import styles from './Pet.module.css';
import { EmojiText } from '../../EmojiText';
import { petTypes } from '../../../../server/common/petTypes';
import {
  calculateHappiness,
  calculateHunger,
  dailySleepPeriod,
  expRequiredForLevel,
  formatSleepRemainder,
  formatTimeUntilSleep,
  isPetAsleep,
  petPassiveRate,
} from '../../../../server/common/pet';
import type { IPet } from '../../../../server/common/models/pet';
import { smartFormatNumber } from '../../../../server/common/math';

interface PetProps {
  pet: IPet;
  onClick?: () => void;
}

export const Pet: React.FC<PetProps> = ({ pet, onClick }) => {
  const happiness = calculateHappiness(pet.time_last_fed, pet.time_last_played);
  const hunger = calculateHunger(pet.time_last_fed);
  const type = petTypes.find(t => t.id === pet.type_id)!;

  return (
    <div className={styles.pet} onClick={onClick}>
      <div className={styles['pet-header']}>
        <div className={styles['pet-icon']}>
          <span role="img" aria-label={type.name}>
            <EmojiText>{type.icon}</EmojiText>
          </span>
        </div>
        <div className={styles['pet-info']}>
          <span className={styles['pet-name']}>{pet.name || 'Unnamed Pet'}</span>
          <span className={styles['pet-type']}>{type.name}</span>
        </div>
      </div>
      <div className={styles['pet-progression']}>
        <span className={styles[`pet-rarity-${pet.rarity || 'common'}`]}>
          {pet.rarity || 'common'}
        </span>
        <span>Bond {pet.bond || 0}%</span>
        <span>+{smartFormatNumber(petPassiveRate(pet))}/min</span>
      </div>
      {!pet.is_dead && (
        <>
          <div className={styles['pet-exp']}>
            <div className={styles['pet-exp-info']}>
              <span className={styles['pet-level']}>Level: {pet.level}</span>
              <span className={styles['pet-exp-amount']}>
                EXP: {smartFormatNumber(pet.exp, false)} /{' '}
                {smartFormatNumber(expRequiredForLevel(pet.level), false)}
              </span>
            </div>
            <div className={styles['pet-exp-bar']}>
              <div
                className={styles['pet-exp-fill']}
                style={{ width: `${(pet.exp / expRequiredForLevel(pet.level)) * 100}%` }}
              ></div>
            </div>
          </div>
          <div className={styles['pet-stats']}>
            <span className={styles['pet-sleeping']}>
              {isPetAsleep(pet) &&
                `💤 Sleeping for ${formatSleepRemainder(dailySleepPeriod(new Date(), pet.uuid))}`}
              {!isPetAsleep(pet) && `😄 Sleeping in ${formatTimeUntilSleep(pet.uuid)}`}
            </span>
            <div className={styles['pet-stat']}>
              <span className={styles['pet-stat-label']}>Happiness:</span>
              <span className={styles['pet-stat-value']}>{happiness}%</span>
            </div>
            <div className={styles['pet-stat']}>
              <span className={styles['pet-stat-label']}>Hunger:</span>
              <span className={styles['pet-stat-value']}>{hunger}%</span>
            </div>
          </div>
        </>
      )}
      {pet.is_dead && (
        <div className={styles['pet-dead-message']}>
          <EmojiText>💀</EmojiText> This pet has passed away.
        </div>
      )}
    </div>
  );
};
