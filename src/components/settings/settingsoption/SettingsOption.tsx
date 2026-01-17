import React from 'react';
import './SettingsOption.css';
import { Button } from '../../button/Button';
import { Select } from '../../select/Select';
import { Checkbox } from '../../checkbox/Checkbox';
import { updateSetting, type ISettings } from '../../../helpers/settings';

interface SettingsOptionProps {
  id: string;
  type: 'button' | 'select' | 'checkbox';
  icon: React.ReactNode;
  label: string;
  description?: string;
  selectOptions?: Array<{ label: string; value: string }>;
  buttonLabel?: string;
  buttonAction?: () => void;
  value: string | boolean;
  setValue: (value: string | boolean) => void;
}

export const SettingsOption: React.FC<SettingsOptionProps> = ({
  id,
  type,
  icon,
  label,
  description,
  selectOptions,
  buttonLabel,
  buttonAction,
  value,
  setValue,
}) => {
  const onSelectChange = (newValue: string) => {
    setValue(newValue);
    updateSetting(id as keyof ISettings, newValue as ISettings[keyof ISettings]);
  };

  const onCheckboxChange = (newValue: boolean) => {
    setValue(newValue);
    updateSetting(id as keyof ISettings, newValue as ISettings[keyof ISettings]);
  };

  return (
    <div className="settings-option">
      <div className="settings-option-left">
        <div className="settings-icon-container">{icon}</div>
        <div className="settings-info-container">
          <div className="settings-label">{label}</div>
          {description && <div className="settings-description">{description}</div>}
        </div>
      </div>
      <div className="settings-control-container">
        {type === 'button' && <Button onClick={buttonAction}>{buttonLabel}</Button>}
        {type === 'select' && selectOptions && (
          <Select options={selectOptions} value={value as string} onChange={onSelectChange} />
        )}
        {type === 'checkbox' && <Checkbox checked={value as boolean} onClick={onCheckboxChange} />}
      </div>
    </div>
  );
};
