import React, { useEffect, useState } from 'react';
import './PetsList.css';
import { Pet } from './pet/Pet';
import type { IPet } from '../../../server/common/models/pet';
import { PetModal } from './petmodal/PetModal';
import { adoptPet, buyPetSlot, getAllPets } from '../../helpers/pets';
import { Button } from '../button/Button';
import { Spinner } from '../spinner/Spinner';
import { PetShopModal } from './petshopmodal/PetShopModal';
import { Modal } from '../modal/Modal';

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
  const [petSlotConfirmOpen, setPetSlotConfirmOpen] = useState<boolean>(false);
  const maxSlots = Math.min(Math.max(petSlots ?? 3, 3), 10);

  const fetchPets = async () => {
    const fetchedPets = await getAllPets();
    setPets(fetchedPets);
  };

  const adoptAPet = async () => {
    const pet = await adoptPet();

    if (!pet) {
      return;
    }

    await fetchPets();

    // Set the newly adopted pet's modal to open
    setPetModalsOpen(prev => {
      const newPet = pets.find(p => p.uuid === pet.uuid);
      return { ...prev, [newPet ? newPet.uuid : pet.uuid]: true };
    });
  };

  const buySlot = async () => {
    const ok = await buyPetSlot();
    if (!ok) return;
    await refreshUser();
  };

  const confirmBuySlot = async () => {
    await buySlot();
    setPetSlotConfirmOpen(false);
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
          cost={2000}
          onClickAsync={adoptAPet}
          disabled={money < 2000 || !hydrated || pets.length >= maxSlots}
        >
          Adopt a Pet
        </Button>
        <Button
          onClick={() => setPetShopModalOpen(true)}
          disabled={!hydrated || pets.length >= maxSlots}
        >
          Open Pet Shop
        </Button>
        <Button
          cost={50}
          costType="gems"
          onClickAsync={async () => setPetSlotConfirmOpen(true)}
          disabled={!hydrated || maxSlots >= 10 || (gems !== -1 && gems < 50)}
        >
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
      <Modal
        isOpen={petSlotConfirmOpen}
        onClose={() => setPetSlotConfirmOpen(false)}
        ariaLabel="Confirm buy pet slot"
      >
        <div className="pet-slot-confirm">
          <h3>Buy a pet slot?</h3>
          <p>This costs 50 gems and increases your pet slots to {maxSlots + 1}.</p>
          <div className="pet-slot-confirm-buttons">
            <Button secondary onClick={() => setPetSlotConfirmOpen(false)}>
              Cancel
            </Button>
            <Button cost={50} costType="gems" onClickAsync={confirmBuySlot}>
              Confirm
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
