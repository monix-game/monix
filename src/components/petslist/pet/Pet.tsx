import React from 'react';
import './Pet.css';
import { EmojiText } from '../../EmojiText';
import { petTypes } from '../../../../server/common/petTypes';
import {
  calculateEnergy,
  calculateHappiness,
  expRequiredForLevel,
} from '../../../../server/common/pet';
import type { IPet } from '../../../../server/common/models/pet';
import { smartFormatNumber } from '../../../helpers/numbers';

interface PetProps {
  pet: IPet;
  onClick?: () => void;
}

export const Pet: React.FC<PetProps> = ({ pet, onClick }) => {
  const happiness = calculateHappiness(pet.time_last_fed, pet.time_last_played);
  const energy = calculateEnergy(pet.time_last_played, pet.time_created);
  const type = petTypes.find(t => t.id === pet.type_id)!;

  return (
    <div className="pet" onClick={onClick}>
      <div className="pet-header">
        <div className="pet-icon">
          <span role="img" aria-label={type.name}>
            <EmojiText>{type.icon}</EmojiText>
          </span>
        </div>
        <div className="pet-info">
          <span className="pet-name">{pet.name || 'Unnamed Pet'}</span>
          <span className="pet-type">{type.name}</span>
        </div>
      </div>
      <div className="pet-exp">
        <div className="pet-exp-info">
          <span className="pet-level">Level: {pet.level}</span>
          <span className="pet-exp-amount">
            EXP: {smartFormatNumber(pet.exp, false)} / {smartFormatNumber(expRequiredForLevel(pet.level), false)}
          </span>
        </div>
        <div className="pet-exp-bar">
          <div
            className="pet-exp-fill"
            style={{ width: `${(pet.exp / expRequiredForLevel(pet.level)) * 100}%` }}
          ></div>
        </div>
      </div>
      <div className="pet-stats">
        <div className="pet-stat">
          <span className="pet-stat-label">Happiness:</span>
          <span className="pet-stat-value">{happiness}%</span>
        </div>
        <div className="pet-stat">
          <span className="pet-stat-label">Energy:</span>
          <span className="pet-stat-value">{energy}%</span>
        </div>
      </div>
    </div>
  );
};
