import React from 'react';
import './SettingsOption.css';
import { Button } from '../../button/Button';
import { Select } from '../../select/Select';
import { Checkbox } from '../../checkbox/Checkbox';
import { Slider } from '../../slider/Slider';

interface SettingsOptionProps {
  type: 'button' | 'select' | 'checkbox' | 'slider';
  icon: React.ReactNode;
  label: string;
  description?: string;
  danger?: boolean;
  selectOptions?: Array<{ label: string; value: string }>;
  buttonLabel?: string;
  buttonAction?: () => void | Promise<void>;
  sliderMin?: number;
  sliderMax?: number;
  sliderStep?: number;
  disabled?: boolean;
  value?: string | boolean | number;
  onChange?: (value: string | boolean | number) => void;
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
  sliderMin,
  sliderMax,
  sliderStep,
  disabled,
  value,
  onChange,
}) => {
  const onInputChange = (newValue: string | boolean | number) => {
    if (onChange) onChange(newValue);
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
        {type === 'button' && (
          <Button
            color={danger ? 'red' : 'primary'}
            onClickAsync={async () => {
              if (buttonAction) {
                await buttonAction();
              }
            }}
            disabled={disabled}
          >
            {buttonLabel}
          </Button>
        )}
        {type === 'select' && selectOptions && (
          <Select
            options={selectOptions}
            value={value as string}
            onChange={onInputChange}
            disabled={disabled}
          />
        )}
        {type === 'checkbox' && (
          <Checkbox checked={value as boolean} onClick={onInputChange} disabled={disabled} />
        )}
        {type === 'slider' && (
          <Slider
            min={sliderMin || 0}
            max={sliderMax || 100}
            step={sliderStep || 1}
            value={value as number}
            onValueChange={onInputChange}
            disabled={disabled}
          />
        )}
      </div>
    </div>
  );
};
