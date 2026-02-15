import React, { useEffect } from 'react';
import './PetShopModal.css';
import { Button, EmojiText, Modal, PaymentModal } from '../..';
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
  const [isPetShopModalOpen, setIsPetShopModalOpen] = React.useState<boolean>(true);
  const [isBuyingPet, setIsBuyingPet] = React.useState<boolean>(false);
  const [petTypeToBuy, setPetTypeToBuy] = React.useState<string | null>(null);
  const [isPetPurchaseLoading, setIsPetPurchaseLoading] = React.useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsPetShopModalOpen(true);
      setIsBuyingPet(false);
      setPetTypeToBuy(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isPetShopModalOpen && !isBuyingPet && isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsPetShopModalOpen(true);
    }
  }, [isPetShopModalOpen, isBuyingPet, isOpen]);

  return (
    <>
      <Modal isOpen={isOpen && isPetShopModalOpen} onClose={onClose}>
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
                      <EmojiText>{type.icon}</EmojiText> {type.name}
                    </h3>
                  </div>
                  <Button
                    onClick={() => {
                      setPetTypeToBuy(type.id);
                      setIsBuyingPet(true);
                      setIsPetShopModalOpen(false);
                    }}
                  >
                    Buy
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      <PaymentModal
        isOpen={isBuyingPet && isOpen}
        isLoading={isPetPurchaseLoading}
        onClose={() => {
          setIsBuyingPet(false);
          onClose();
        }}
        type="money"
        amount={petTypeToBuy ? petTypes.find(p => p.id === petTypeToBuy)?.cost || 10000 : 10000}
        balance={money}
        productName={
          petTypeToBuy
            ? petTypes.find(p => p.id === petTypeToBuy)?.name || 'Unknown Pet'
            : 'Unknown Pet'
        }
        onPurchase={async () => {
          if (!petTypeToBuy) {
            return;
          }

          setIsPetPurchaseLoading(true);

          // Artificial delay
          await new Promise(resolve => setTimeout(resolve, 750));

          const pet = await buyPet(petTypeToBuy);
          setIsPetPurchaseLoading(false);
          if (!pet) {
            return;
          }
          updateList();
          setIsBuyingPet(false);
        }}
      />
    </>
  );
};
