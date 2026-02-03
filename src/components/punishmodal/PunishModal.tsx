import React from 'react';
import './PunishModal.css';
import { Button, Input, Modal, Select } from '..';
import type { IUser } from '../../../server/common/models/user';
import { punishUser } from '../../helpers/staff';
import { punishXCategories } from '../../../server/common/punishx/categories';

interface PunishModalProps {
  userToPunish: IUser;
  isOpen: boolean;
  onClose: () => void;
}

export const PunishModal: React.FC<PunishModalProps> = ({ userToPunish, isOpen, onClose }) => {
  const [category, setCategory] = React.useState<string>('game/exploiting/general');
  const [reason, setReason] = React.useState<string>('');

  const onPunishButtonClick = async () => {
    if (!category || !reason) return;
    const success = await punishUser(userToPunish.uuid, category, reason);
    if (success) {
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="punish-modal">
        <div className="punish-modal-header">
          <span>
            Punishing <b>{userToPunish.username}</b>
          </span>
        </div>
        <div className="punish-content">
          <div className="punish-category">
            <p>Category</p>
            <Select
              value={category}
              onChange={value => setCategory(value)}
              options={punishXCategories.map(category => ({
                value: category.id,
                label: category.name,
              }))}
            />
          </div>
          <div className="punish-reason">
            <p>Reason</p>
            <Input
              value={reason}
              onValueChange={value => setReason(value)}
              placeholder="Enter reason for punishment"
            />
          </div>
          <Button onClickAsync={onPunishButtonClick} disabled={!category || !reason}>
            Punish
          </Button>
          <Button secondary onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
};
