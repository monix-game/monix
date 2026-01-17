import React from 'react';
import './PetModal.css';
import { Button, EmojiText, Input, Modal } from '../..';
import type { IPet } from '../../../../server/common/models/pet';
import {
  calculateEnergy,
  calculateHappiness,
  canFeedPet,
  canLevelUpPet,
  canPlayWithPet,
  expRequiredForLevel,
} from '../../../../server/common/pet';
import { petTypes } from '../../../../server/common/petTypes';
import { playWithPet, releasePet, feedPet, namePet, levelUpPet } from '../../../helpers/pets';
import { smartFormatNumber } from '../../../helpers/numbers';

interface PetModalProps {
  isOpen: boolean;
  money: number;
  onClose: () => void;
  updateList: () => void;
  pet: IPet;
}

export const PetModal: React.FC<PetModalProps> = ({ isOpen, money, onClose, updateList, pet }) => {
  const type = petTypes.find(t => t.id === pet.type_id)!;
  const happiness = calculateHappiness(pet.time_last_fed, pet.time_last_played);
  const energy = calculateEnergy(pet.time_last_played, pet.time_created);

  const [confirmingRelease, setConfirmingRelease] = React.useState<boolean>(false);
  const [namingPet, setNamingPet] = React.useState<boolean>(false);
  const [petNameInput, setPetNameInput] = React.useState<string>(pet.name || '');

  const playWithPetClick = async () => {
    await playWithPet(pet.uuid);
    updateList();
  };

  const feedPetClick = async () => {
    await feedPet(pet.uuid);
    updateList();
  };

  const confirmReleasePetClick = async () => {
    await releasePet(pet.uuid);
    updateList();
    onClose();
  };

  const confirmNameClick = async () => {
    if (petNameInput.trim() === '') {
      return;
    }
    setNamingPet(false);

    await namePet(pet.uuid, petNameInput); // Simple prompt for demo purposes
    void updateList();
  };

  const levelUpPetClick = async () => {
    await levelUpPet(pet.uuid);
    void updateList();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setConfirmingRelease(false);
        onClose();
      }}
    >
      <div className="pet-modal">
        <div className="pet-modal-header">
          <div className="pet-modal-icon">
            <span role="img" aria-label={type.name}>
              <EmojiText>{type.icon}</EmojiText>
            </span>
          </div>
          <div className="pet-modal-info">
            <span className="pet-modal-name">{pet.name || 'Unnamed Pet'}</span>
            <span className="pet-modal-type">{type.name}</span>
          </div>
        </div>
        <div className="pet-modal-exp">
          <div className="pet-modal-exp-info">
            <span className="pet-modal-level">Level: {pet.level}</span>
            <span className="pet-modal-exp-amount">
              EXP: {smartFormatNumber(pet.exp, false)} /{' '}
              {smartFormatNumber(expRequiredForLevel(pet.level), false)}
            </span>
          </div>
          <div className="pet-modal-exp-bar">
            <div
              className="pet-modal-exp-fill"
              style={{ width: `${(pet.exp / expRequiredForLevel(pet.level)) * 100}%` }}
            ></div>
          </div>
        </div>
        <div className="pet-modal-stats">
          <div className="pet-modal-stat">
            <span className="pet-modal-stat-label">Happiness:</span>
            <span className="pet-modal-stat-value">{happiness}%</span>
          </div>
          <div className="pet-modal-stat">
            <span className="pet-modal-stat-label">Energy:</span>
            <span className="pet-modal-stat-value">{energy}%</span>
          </div>
        </div>
        {namingPet && (
          <div className="pet-modal-input">
            <Input value={petNameInput} onValueChange={value => setPetNameInput(value)} placeholder='A great name awaits...' />
          </div>
        )}
        <div className="pet-modal-actions">
          {pet.name === '' && !confirmingRelease && !namingPet && (
            <>
              <Button onClick={() => setNamingPet(true)}>Give a Name</Button>
              <Button secondary onClick={() => setConfirmingRelease(true)}>
                Release
              </Button>
            </>
          )}
          {namingPet && (
            <>
              <Button onClickAsync={confirmNameClick}>Confirm Name</Button>
              <Button secondary onClick={() => setNamingPet(false)}>
                Cancel
              </Button>
            </>
          )}
          {confirmingRelease && pet.name === '' && (
            <>
              <Button secondary onClick={() => setConfirmingRelease(false)}>
                Cancel Release
              </Button>
              <Button onClickAsync={confirmReleasePetClick}>Confirm Release</Button>
            </>
          )}
          {canLevelUpPet(pet) && <Button onClickAsync={levelUpPetClick}>Level Up</Button>}
          {confirmingRelease && pet.name !== '' && (
            <>
              <Button onClickAsync={confirmReleasePetClick}>Confirm Release</Button>
              <Button secondary onClick={() => setConfirmingRelease(false)}>
                Cancel Release
              </Button>
            </>
          )}
          {pet.name !== '' && !canLevelUpPet(pet) && !confirmingRelease && !namingPet && (
            <>
              <Button
                secondary
                cost={50}
                disabled={money < 50 || !canFeedPet(pet)}
                onClickAsync={feedPetClick}
              >
                Feed
              </Button>
              <Button onClickAsync={playWithPetClick} disabled={!canPlayWithPet(pet)}>
                Play
              </Button>
              <Button onClick={() => setConfirmingRelease(true)}>Release</Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};
