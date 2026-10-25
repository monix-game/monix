import React, { useCallback, useEffect, useState } from 'react';
import styles from './Satchel.module.css';
import { Button } from '../../button/Button';
import { Spinner } from '../../spinner/Spinner';
import { EmojiText } from '../../EmojiText';
import { petTypes } from '../../../../server/common/petTypes';
import { SATCHEL_CAPACITY, STRAY_ADOPTION_COST } from '../../../../server/common/pet';
import { smartFormatNumber } from '../../../../server/common/math';
import type { IStrayPet } from '../../../../server/common/models/user';
import {
  adoptStrayPet,
  getSatchel,
  releaseStrayPet,
  type PetSlotInfo,
} from '../../../helpers/pets';

interface SatchelPanelProps {
  pets: number;
  slotInfo: PetSlotInfo | null;
  money: number;
  onAdopted: () => void | Promise<void>;
  onSlotBought: () => void | Promise<void>;
  onClose: () => void;
}

export const SatchelPanel: React.FC<SatchelPanelProps> = ({
  pets,
  slotInfo,
  money,
  onAdopted,
  onSlotBought,
  onClose,
}) => {
  const [strays, setStrays] = useState<IStrayPet[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [busyUuid, setBusyUuid] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const info = await getSatchel();
    setStrays(info?.satchel || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Fetch-on-mount: the satchel is server-owned data.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const atCapacity = strays.length >= SATCHEL_CAPACITY;
  const kennelFull = slotInfo ? pets >= slotInfo.slotLimit : false;

  return (
    <div className={styles['satchel-panel']}>
      <div className={styles['satchel-header']}>
        <h3>
          <EmojiText>🎒</EmojiText> Satchel
        </h3>
        <span className={styles['satchel-count']}>
          {strays.length} / {SATCHEL_CAPACITY}
        </span>
      </div>

      <p className={styles['satchel-hint']}>
        Stray pets surface while you fish, on top of the catch itself. Adopt one to give it a home
        in your kennel, or release it to free up satchel space.
      </p>

      {kennelFull && (
        <div className={styles['satchel-warning']}>
          <EmojiText>⚠️</EmojiText> Your kennel is full ({pets} / {slotInfo?.slotLimit}). Buy a slot
          or release a pet before adopting.
        </div>
      )}
      {atCapacity && (
        <div className={styles['satchel-warning']}>
          <EmojiText>⚠️</EmojiText> Your satchel is full — release a stray to catch more.
        </div>
      )}

      <div className={styles['satchel-list']}>
        {loading && <Spinner size={24} />}
        {!loading && strays.length === 0 && (
          <div className={styles['satchel-empty']}>
            No strays yet. Cast a line and keep your fingers crossed.
          </div>
        )}
        {strays.map(stray => {
          const type = petTypes.find(t => t.id === stray.type_id);
          const busy = busyUuid === stray.uuid;
          return (
            <div key={stray.uuid} className={styles['satchel-entry']}>
              <span className={styles['satchel-icon']}>
                <EmojiText>{type?.icon || '🐾'}</EmojiText>
              </span>
              <div className={styles['satchel-details']}>
                <span className={styles['satchel-name']}>
                  {stray.name || type?.name || 'Stray'}
                </span>
                <span className={styles[`satchel-rarity-${stray.rarity}`]}>{stray.rarity}</span>
              </div>
              <div className={styles['satchel-actions']}>
                <Button
                  secondary
                  disabled={busy}
                  onClickAsync={async () => {
                    setBusyUuid(stray.uuid);
                    await releaseStrayPet(stray.uuid);
                    await refresh();
                    setBusyUuid(null);
                  }}
                >
                  Release
                </Button>
                <Button
                  disabled={busy || kennelFull || money < STRAY_ADOPTION_COST}
                  onClickAsync={async () => {
                    setBusyUuid(stray.uuid);
                    const res = await adoptStrayPet(stray.uuid);
                    setBusyUuid(null);
                    if (!res) return;
                    await refresh();
                    await onAdopted();
                  }}
                >
                  Adopt {smartFormatNumber(STRAY_ADOPTION_COST)}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {slotInfo && slotInfo.nextSlotCost !== null && (
        <div className={styles['satchel-slot']}>
          <span>
            <EmojiText>🏠</EmojiText> Kennel slots: {pets} / {slotInfo.slotLimit}
          </span>
          <Button
            secondary
            disabled={!slotInfo.canBuy}
            onClickAsync={async () => {
              await onSlotBought();
            }}
          >
            Buy slot for {smartFormatNumber(slotInfo.nextSlotCost)}
          </Button>
        </div>
      )}

      <div className={styles['satchel-footer']}>
        <Button secondary onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
};

export default SatchelPanel;
