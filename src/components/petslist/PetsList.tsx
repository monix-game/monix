import React, { useEffect, useState } from 'react';
import './PetsList.css';
import { Pet } from './pet/Pet';
import type { IPet } from '../../../server/common/models/pet';
import { PetModal } from './petmodal/PetModal';
import { adoptPet, getAllPets } from '../../helpers/pets';
import { Button } from '../button/Button';
import { Spinner } from '../spinner/Spinner';

interface PetsListProps {
  money: number;
}

export const PetsList: React.FC<PetsListProps> = ({ money }) => {
  const [hydrated, setHydrated] = useState<boolean>(false);
  const [pets, setPets] = useState<IPet[]>([]);
  const [petModalsOpen, setPetModalsOpen] = useState<{ [key: string]: boolean }>({});

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
      <Button
        cost={2000}
        onClickAsync={adoptAPet}
        disabled={money < 2000 || !hydrated || pets.length >= 3}
      >
        Adopt a Pet
      </Button>
      {pets.length >= 3 && (
        <div className="info-text">You have reached the maximum number of pets (3).</div>
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
    </>
  );
};
