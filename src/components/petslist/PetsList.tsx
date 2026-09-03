import React, { useEffect, useState } from 'react';
import styles from './PetsList.module.css';
import { Pet } from './pet/Pet';
import type { IPet } from '../../../server/common/models/pet';
import { PetModal } from './petmodal/PetModal';
import { adoptPet, collectPetEarnings, getAllPets } from '../../helpers/pets';
import { Button } from '../button/Button';
import { Spinner } from '../spinner/Spinner';
import { PetShopModal } from './petshopmodal/PetShopModal';
import { PaymentModal } from '../paymentmodal/PaymentModal';
import { useSocket } from '../../providers/socket';

interface PetsListProps {
  money: number;
  petSlots?: number;
  userUuid: string;
  refreshUser: () => Promise<void>;
}

export const PetsList: React.FC<PetsListProps> = ({ money, petSlots, userUuid, refreshUser }) => {
  const [hydrated, setHydrated] = useState<boolean>(false);
  const [pets, setPets] = useState<IPet[]>([]);
  const [petModalsOpen, setPetModalsOpen] = useState<{ [key: string]: boolean }>({});
  const [petShopModalOpen, setPetShopModalOpen] = useState<boolean>(false);
  const maxSlots = Math.min(Math.max(petSlots ?? 3, 3), 17);

  const [isBuyingPet, setIsBuyingPet] = useState<boolean>(false);
  const [isPetPurchaseLoading, setIsPetPurchaseLoading] = useState<boolean>(false);

  const { subscribe } = useSocket();

  const fetchPets = async () => {
    const fetchedPets = await getAllPets();
    setPets(fetchedPets);
  };

  useEffect(() => {
    const unsubscribe = subscribe(`pets:${userUuid}`, data => {
      setPets(data as IPet[]);
      setHydrated(true);
    });
    return unsubscribe;
  }, [userUuid, subscribe]);

  return (
    <>
      <div className={styles['pets-list-buttons']}>
        <Button
          onClick={async () => {
            await collectPetEarnings();
            await refreshUser();
            await fetchPets();
          }}
          disabled={!hydrated || pets.length === 0}
        >
          Collect Pet Earnings
        </Button>
        <Button
          onClick={() => setIsBuyingPet(true)}
          disabled={!hydrated || pets.length >= maxSlots}
        >
          Adopt a Pet
        </Button>
        <Button
          onClick={() => setPetShopModalOpen(true)}
          disabled={!hydrated || pets.length >= maxSlots}
        >
          Open Pet Shop
        </Button>
      </div>
      <div className={styles['info-text']}>
        Pet slots: {pets.length} / {maxSlots}
      </div>
      {pets.length >= maxSlots && (
        <div className={styles['info-text']}>
          You have reached the maximum number of pets ({maxSlots}).
        </div>
      )}
      <div className={`${styles['pets-list']} ${pets.length === 0 ? styles['no-pets'] : ''}`}>
        {pets.map(pet => (
          <Pet
            key={pet.uuid}
            pet={pet}
            onClick={() => {
              setPetModalsOpen(prev => ({ ...prev, [pet.uuid]: true }));
            }}
          />
        ))}
        {pets.length === 0 && hydrated && (
          <div className={styles['no-pets']}>No pets available. Try adopting one!</div>
        )}
        {!hydrated && (
          <div className={styles['no-pets']}>
            <Spinner size={30} />
          </div>
        )}
      </div>
      {pets.map(pet => (
        <PetModal
          isOpen={petModalsOpen[pet.uuid]}
          onClose={() => {
            setPetModalsOpen(prev => ({ ...prev, [pet.uuid]: false }));
          }}
          updateList={() => {
            void fetchPets();
          }}
          key={pet.uuid}
          pet={pet}
          money={money}
        />
      ))}

      <PetShopModal
        isOpen={petShopModalOpen}
        onClose={() => setPetShopModalOpen(false)}
        money={money}
        updateList={() => {
          void fetchPets();
        }}
      />

      <PaymentModal
        isOpen={isBuyingPet}
        isLoading={isPetPurchaseLoading}
        onClose={() => setIsBuyingPet(false)}
        type="money"
        amount={10000}
        balance={money}
        productName="Random Pet"
        onPurchase={async () => {
          setIsPetPurchaseLoading(true);

          // Artificial delay
          await new Promise(resolve => setTimeout(resolve, 750));

          const pet = await adoptPet();
          setIsPetPurchaseLoading(false);
          if (!pet) {
            return;
          }
          await fetchPets();
          setIsBuyingPet(false);

          // Set the newly adopted pet's modal to open
          setPetModalsOpen(prev => {
            const newPet = pets.find(p => p.uuid === pet.uuid);
            return { ...prev, [newPet ? newPet.uuid : pet.uuid]: true };
          });
        }}
      />
    </>
  );
};
