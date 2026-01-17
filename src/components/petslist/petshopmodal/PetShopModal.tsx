import React from 'react';
import './PetShopModal.css';
import { Button, EmojiText, Modal } from '../..';
import { petTypes } from '../../../../server/common/petTypes';
import { buyPet } from '../../../helpers/pets';

interface PetShopModalProps {
  isOpen: boolean;
  money: number;
  onClose: () => void;
  updateList: () => void;
}

export const PetShopModal: React.FC<PetShopModalProps> = ({
  isOpen,
  money,
  onClose,
  updateList,
}) => {
  const buyPetClick = async (typeId: string) => {
    await buyPet(typeId);
    updateList();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="pet-shop-modal">
        <div className="pet-shop-modal-header">
          <h2>
            <EmojiText>🐶 </EmojiText>
            Pet Shop
          </h2>
        </div>
        <div className="pet-shop-modal-content">
          <div className="pet-shop-modal-list">
            {petTypes.map(type => (
              <div key={type.id} className="pet-shop-modal-item">
                <div className="pet-shop-modal-item-info">
                  <h3>
                    <EmojiText>{type.icon}</EmojiText>
                    {' '}{type.name}
                  </h3>
                </div>
                <Button
                  cost={type.cost}
                  onClickAsync={() => buyPetClick(type.id)}
                  disabled={money < type.cost}
                >
                  Buy
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};
