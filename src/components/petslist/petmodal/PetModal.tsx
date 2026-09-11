import React from 'react';
import styles from './PetModal.module.css';
import { Button, EmojiText, Input, Modal, PaymentModal } from '../..';
import type { IPet } from '../../../../server/common/models/pet';
import {
  calculateHappiness,
  calculateHunger,
  canFeedPet,
  canLevelUpPet,
  canPlayWithPet,
  dailySleepPeriod,
  expRequiredForLevel,
  formatCharmRemaining,
  formatSleepRemainder,
  formatTimeUntilSleep,
  isPetAsleep,
  isPetCharmed,
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
import { hasGems, smartFormatNumber } from '../../../../server/common/math';
import { CHARM_COST_GEMS } from '../../../../server/common/pet';

interface PetModalProps {
  isOpen: boolean;
  money: number;
  gems: number;
  onClose: () => void;
  updateList: () => void;
  pet: IPet;
  onCharm?: () => void;
}

type PaymentKindName = 'feed-standard' | 'feed-premium' | 'revive' | 'bury';

const PAYMENT_CONFIGS: { [K in PaymentKindName]: { amount: number; productName: string } } = {
  'feed-standard': { amount: 20, productName: 'Standard Meal' },
  'feed-premium': { amount: 50, productName: 'Premium Meal' },
  revive: { amount: 100000, productName: 'Revive' },
  bury: { amount: 500, productName: 'Bury Pet' },
};

export const PetModal: React.FC<PetModalProps> = ({
  isOpen,
  money,
  gems,
  onClose,
  updateList,
  pet,
  onCharm,
}) => {
  const type = petTypes.find(t => t.id === pet.type_id)!;
  const charmed = isPetCharmed(pet);
  const happiness = calculateHappiness(pet.time_last_fed, pet.time_last_played, charmed);
  const hunger = calculateHunger(pet.time_last_fed, charmed);
  const charmRemaining = charmed ? formatCharmRemaining(pet) : '';

  const [confirmingRelease, setConfirmingRelease] = React.useState<boolean>(false);
  const [namingPet, setNamingPet] = React.useState<boolean>(false);
  const [petNameInput, setPetNameInput] = React.useState<string>(pet.name || '');
  const [feedingPet, setFeedingPet] = React.useState<boolean>(false);
  const [paymentKind, setPaymentKind] = React.useState<PaymentKindName | null>(null);
  const [isPaymentLoading, setIsPaymentLoading] = React.useState<boolean>(false);

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

  const purchaseAction = async (kind: PaymentKindName): Promise<void> => {
    switch (kind) {
      case 'feed-standard':
        await feedPetStandardClick();
        break;
      case 'feed-premium':
        await feedPetPremiumClick();
        break;
      case 'revive':
        await revivePetClick();
        break;
      case 'bury':
        await confirmReleasePetClick();
        break;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setConfirmingRelease(false);
        setNamingPet(false);
        setFeedingPet(false);
        setPaymentKind(null);
        onClose();
      }}
    >
      <div className={styles['pet-modal']}>
        <div className={styles['pet-modal-header']}>
          <div className={styles['pet-modal-icon']}>
            <span role="img" aria-label={type.name}>
              <EmojiText>{type.icon}</EmojiText>
            </span>
          </div>
          <div className={styles['pet-modal-info']}>
            <span className={styles['pet-modal-name']}>{pet.name || 'Unnamed Pet'}</span>
            <span className={styles['pet-modal-type']}>{type.name}</span>
          </div>
        </div>
        {!pet.is_dead && (
          <>
            <div className={styles['pet-modal-exp']}>
              <div className={styles['pet-modal-exp-info']}>
                <span className={styles['pet-modal-level']}>Level: {pet.level}</span>
                <span className={styles['pet-modal-exp-amount']}>
                  EXP: {smartFormatNumber(pet.exp, false)} /{' '}
                  {smartFormatNumber(expRequiredForLevel(pet.level), false)}
                </span>
              </div>
              <div className={styles['pet-modal-exp-bar']}>
                <div
                  className={styles['pet-modal-exp-fill']}
                  style={{ width: `${(pet.exp / expRequiredForLevel(pet.level)) * 100}%` }}
                ></div>
              </div>
            </div>
            <div className={styles['pet-modal-stats']}>
              <span className={styles['pet-modal-sleeping']}>
                {isPetAsleep(pet) ? (
                  <>
                    <EmojiText>💤</EmojiText> Sleeping for{' '}
                    {formatSleepRemainder(dailySleepPeriod(new Date(), pet.uuid))}
                  </>
                ) : (
                  <>
                    <EmojiText>😄</EmojiText> Sleeping in {formatTimeUntilSleep(pet.uuid)}
                  </>
                )}
              </span>
              {charmed && (
                <span className={styles['pet-modal-sleeping']}>
                  <EmojiText>✨</EmojiText> Charmed — {charmRemaining} remaining
                </span>
              )}
              <div className={styles['pet-modal-stat']}>
                <span className={styles['pet-modal-stat-label']}>Happiness:</span>
                <span className={styles['pet-modal-stat-value']}>{happiness}%</span>
              </div>
              <div className={styles['pet-modal-stat']}>
                <span className={styles['pet-modal-stat-label']}>Hunger:</span>
                <span className={styles['pet-modal-stat-value']}>{hunger}%</span>
              </div>
            </div>
          </>
        )}
        {namingPet && (
          <div className={styles['pet-modal-input']}>
            <Input
              value={petNameInput}
              onValueChange={value => setPetNameInput(value)}
              placeholder="A great name awaits..."
              predicates={[
                {
                  isValid: text => /^[a-zA-Z0-9 _-]{0,15}$/.test(text),
                  message:
                    'Names can only contain letters, numbers, spaces, underscores, and hyphens, and must be between 1 and 15 characters long.',
                },
              ]}
            />
          </div>
        )}
        <div className={styles['pet-modal-actions']}>
          {!pet.is_dead && !charmed && (
            <Button
              color="purple"
              disabled={!onCharm || !hasGems(gems, CHARM_COST_GEMS)}
              onClick={onCharm}
            >
              Charm
            </Button>
          )}
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
              <Button onClickAsync={confirmReleasePetClick}>Confirm Release</Button>
              <Button secondary onClick={() => setConfirmingRelease(false)}>
                Cancel Release
              </Button>
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
                <Button secondary onClick={() => setFeedingPet(true)} disabled={isPetAsleep(pet)}>
                  Feed
                </Button>
                <Button
                  onClickAsync={playWithPetClick}
                  disabled={!canPlayWithPet(pet) || isPetAsleep(pet)}
                >
                  Play
                </Button>
                <Button onClick={() => setConfirmingRelease(true)}>Release</Button>
              </>
            )}
          {feedingPet && (
            <>
              <Button
                disabled={!canFeedPet(pet) || isPetAsleep(pet)}
                onClick={() => setPaymentKind('feed-standard')}
              >
                Standard
              </Button>
              <Button
                disabled={!canFeedPet(pet) || isPetAsleep(pet)}
                onClick={() => setPaymentKind('feed-premium')}
              >
                Premium
              </Button>
              <Button secondary onClick={() => setFeedingPet(false)}>
                Cancel
              </Button>
            </>
          )}
          {pet.is_dead && !confirmingRelease && (
            <>
              <Button onClick={() => setPaymentKind('revive')}>Revive</Button>
              <Button secondary onClick={() => setPaymentKind('bury')}>
                Bury
              </Button>
            </>
          )}
        </div>
      </div>

      {paymentKind && (
        <PaymentModal
          isOpen={true}
          isLoading={isPaymentLoading}
          onClose={() => setPaymentKind(null)}
          type="money"
          amount={PAYMENT_CONFIGS[paymentKind].amount}
          balance={money}
          productName={PAYMENT_CONFIGS[paymentKind].productName}
          onPurchase={async () => {
            setIsPaymentLoading(true);

            // Artificial delay, since the purchase is usually instant
            await new Promise(resolve => setTimeout(resolve, 750));

            await purchaseAction(paymentKind);
            setIsPaymentLoading(false);
            setPaymentKind(null);
          }}
        />
      )}
    </Modal>
  );
};
