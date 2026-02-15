import React, { useEffect, useState } from 'react';
import './PetsList.css';
import { Pet } from './pet/Pet';
import type { IPet } from '../../../server/common/models/pet';
import { PetModal } from './petmodal/PetModal';
import { adoptPet, buyPetSlot, getAllPets } from '../../helpers/pets';
import { Button } from '../button/Button';
import { Spinner } from '../spinner/Spinner';
import { PetShopModal } from './petshopmodal/PetShopModal';
import { PaymentModal } from '../paymentmodal/PaymentModal';

interface PetsListProps {
  money: number;
  gems: number;
  petSlots?: number;
  refreshUser: () => Promise<void>;
}

export const PetsList: React.FC<PetsListProps> = ({ money, gems, petSlots, refreshUser }) => {
  const [hydrated, setHydrated] = useState<boolean>(false);
  const [pets, setPets] = useState<IPet[]>([]);
  const [petModalsOpen, setPetModalsOpen] = useState<{ [key: string]: boolean }>({});
  const [petShopModalOpen, setPetShopModalOpen] = useState<boolean>(false);
  const maxSlots = Math.min(Math.max(petSlots ?? 3, 3), 10);

  const [isBuyingPet, setIsBuyingPet] = useState<boolean>(false);
  const [isPetPurchaseLoading, setIsPetPurchaseLoading] = useState<boolean>(false);

  const [isBuyingSlot, setIsBuyingSlot] = useState<boolean>(false);
  const [isSlotPurchaseLoading, setIsSlotPurchaseLoading] = useState<boolean>(false);

  const fetchPets = async () => {
    const fetchedPets = await getAllPets();
    setPets(fetchedPets);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchPets();
    setHydrated(true);

    const interval = setInterval(() => {
      void fetchPets();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <div className="pets-list-buttons">
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
        <Button onClick={() => setIsBuyingSlot(true)} disabled={!hydrated || maxSlots >= 10}>
          Buy Pet Slot
        </Button>
      </div>
      <div className="info-text">
        Pet slots: {pets.length} / {maxSlots}
      </div>
      {pets.length >= maxSlots && (
        <div className="info-text">You have reached the maximum number of pets ({maxSlots}).</div>
      )}
      <div className={`pets-list ${pets.length === 0 ? 'no-pets' : ''}`}>
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
          <div className="no-pets">No pets available. Try adopting one!</div>
        )}
        {!hydrated && (
          <div className="no-pets">
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

      <PaymentModal
        isOpen={isBuyingSlot}
        isLoading={isSlotPurchaseLoading}
        onClose={() => setIsBuyingSlot(false)}
        type="gems"
        amount={50}
        balance={gems}
        productName="Pet Slot Upgrade"
        onPurchase={async () => {
          setIsSlotPurchaseLoading(true);

          // Artificial delay
          await new Promise(resolve => setTimeout(resolve, 750));

          await buyPetSlot();
          await fetchPets();
          await refreshUser();

          setIsSlotPurchaseLoading(false);
          setIsBuyingSlot(false);
        }}
      />
    </>
  );
};
