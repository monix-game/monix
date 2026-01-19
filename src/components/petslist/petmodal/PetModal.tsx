import React from 'react';
import './PetModal.css';
import { Button, EmojiText, Input, Modal } from '../..';
import type { IPet } from '../../../../server/common/models/pet';
import {
  calculateHappiness,
  calculateHunger,
  canFeedPet,
  canLevelUpPet,
  canPlayWithPet,
  expRequiredForLevel,
} from '../../../../server/common/pet';
import { petTypes } from '../../../../server/common/petTypes';
import {
  playWithPet,
  releasePet,
  feedPet,
  namePet,
  levelUpPet,
  revivePet,
} from '../../../helpers/pets';
import { smartFormatNumber } from '../../../helpers/utils';

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
  const hunger = calculateHunger(pet.time_last_fed);

  const [confirmingRelease, setConfirmingRelease] = React.useState<boolean>(false);
  const [namingPet, setNamingPet] = React.useState<boolean>(false);
  const [petNameInput, setPetNameInput] = React.useState<string>(pet.name || '');
  const [feedingPet, setFeedingPet] = React.useState<boolean>(false);
  const [confirmingRevive, setConfirmingRevive] = React.useState<boolean>(false);

  const playWithPetClick = async () => {
    await playWithPet(pet.uuid);
    updateList();
  };

  const feedPetStandardClick = async () => {
    await feedPet(pet.uuid, 'standard');
    updateList();
    setFeedingPet(false);
  };

  const feedPetPremiumClick = async () => {
    await feedPet(pet.uuid, 'premium');
    updateList();
    setFeedingPet(false);
  };

  const confirmReleasePetClick = async () => {
    await releasePet(pet.uuid);
    updateList();
    onClose();
  };

  const revivePetClick = async () => {
    await revivePet(pet.uuid);
    setConfirmingRevive(false);
    void updateList();
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
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setConfirmingRelease(false);
        setNamingPet(false);
        setFeedingPet(false);
        setConfirmingRevive(false);
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
        {!pet.is_dead && (
          <>
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
                <span className="pet-modal-stat-label">Hunger:</span>
                <span className="pet-modal-stat-value">{hunger}%</span>
              </div>
            </div>
          </>
        )}
        {namingPet && (
          <div className="pet-modal-input">
            <Input
              value={petNameInput}
              onValueChange={value => setPetNameInput(value)}
              placeholder="A great name awaits..."
              predicate={text => {
                const nameRegex = /^[a-zA-Z0-9 _-]{0,15}$/;
                return nameRegex.test(text);
              }}
              predicateText="Names can only contain letters, numbers, spaces, underscores, and hyphens, and must be between 1 and 15 characters long."
            />
          </div>
        )}
        <div className="pet-modal-actions">
          {pet.name === '' && !confirmingRelease && !namingPet && !pet.is_dead && (
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
          {canLevelUpPet(pet) && !pet.is_dead && (
            <Button onClickAsync={levelUpPetClick}>Level Up</Button>
          )}
          {confirmingRelease && pet.name !== '' && (
            <>
              <Button onClickAsync={confirmReleasePetClick}>Confirm</Button>
              <Button secondary onClick={() => setConfirmingRelease(false)}>
                Cancel
              </Button>
            </>
          )}
          {pet.name !== '' &&
            !canLevelUpPet(pet) &&
            !confirmingRelease &&
            !namingPet &&
            !feedingPet &&
            !pet.is_dead && (
              <>
                <Button secondary onClick={() => setFeedingPet(true)}>
                  Feed
                </Button>
                <Button onClickAsync={playWithPetClick} disabled={!canPlayWithPet(pet)}>
                  Play
                </Button>
                <Button onClick={() => setConfirmingRelease(true)}>Release</Button>
              </>
            )}
          {feedingPet && (
            <>
              <Button
                cost={20}
                disabled={money < 20 || !canFeedPet(pet)}
                onClickAsync={feedPetStandardClick}
              >
                Standard
              </Button>
              <Button
                cost={50}
                disabled={money < 50 || !canFeedPet(pet)}
                onClickAsync={feedPetPremiumClick}
              >
                Premium
              </Button>
              <Button secondary onClick={() => setFeedingPet(false)}>
                Cancel
              </Button>
            </>
          )}
          {pet.is_dead && !confirmingRelease && !confirmingRevive && (
            <>
              <Button cost={100000} onClick={() => setConfirmingRevive(true)}>
                Revive
              </Button>
              <Button cost={500} secondary onClick={() => setConfirmingRelease(true)}>
                Bury
              </Button>
            </>
          )}
          {confirmingRevive && pet.is_dead && (
            <>
              <Button onClickAsync={revivePetClick} disabled={money < 100000}>
                Confirm
              </Button>
              <Button secondary onClick={() => setConfirmingRevive(false)}>
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};
