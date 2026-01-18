import React from 'react';
import './SettingsOption.css';
import { Button } from '../../button/Button';
import { Select } from '../../select/Select';
import { Checkbox } from '../../checkbox/Checkbox';

interface SettingsOptionProps {
  type: 'button' | 'select' | 'checkbox';
  icon: React.ReactNode;
  label: string;
  description?: string;
  danger?: boolean;
  selectOptions?: Array<{ label: string; value: string }>;
  buttonLabel?: string;
  buttonAction?: () => void | Promise<void>;
  value?: string | boolean;
  onChange?: (value: string | boolean) => void;
}

export const SettingsOption: React.FC<SettingsOptionProps> = ({
  type,
  icon,
  label,
  description,
  danger,
  selectOptions,
  buttonLabel,
  buttonAction,
  value,
  onChange,
}) => {
  const onInputChange = (newValue: string | boolean) => {
    if (onChange) onChange(newValue);
  };

  return (
    <div className={`settings-option ${danger ? 'danger' : ''}`}>
      <div className="settings-option-left">
        <div className="settings-icon-container">{icon}</div>
        <div className="settings-info-container">
          <div className="settings-label">{label}</div>
          {description && <div className="settings-description">{description}</div>}
        </div>
      </div>
      <div className="settings-control-container">
        {type === 'button' && (
          <Button
            color={danger ? 'red' : 'primary'}
            onClick={() => {
              if (buttonAction) {
                void buttonAction();
              }
            }}
          >
            {buttonLabel}
          </Button>
        )}
        {type === 'select' && selectOptions && (
          <Select options={selectOptions} value={value as string} onChange={onInputChange} />
        )}
        {type === 'checkbox' && <Checkbox checked={value as boolean} onClick={onInputChange} />}
      </div>
    </div>
  );
};
