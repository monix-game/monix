import React, { useEffect } from 'react';
import './Settings.css';
import type { IUser } from '../../../server/common/models/user';
import { SettingsOption } from './settingsoption/SettingsOption';
import { IconBrush, IconFaceMask } from '@tabler/icons-react';
import { applyTheme } from '../../helpers/theme';
import { loadSettings } from '../../helpers/settings';

interface SettingsProps {
  user: IUser;
}

export const Settings: React.FC<SettingsProps> = () => {
  const [theme, setTheme] = React.useState<'light' | 'dark' | 'system'>('light');
  const [motionReduction, setMotionReduction] = React.useState<boolean>(false);

  useEffect(() => {
    const settings = loadSettings();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(settings.theme);
    setMotionReduction(settings.motionReduction);
  }, []);

  return (
    <div className="settings-container">
      <h1 className="settings-title">Settings</h1>
      <h2 className="settings-header">General</h2>
      <SettingsOption
        id="theme"
        type="select"
        icon={<IconBrush />}
        label="Theme"
        description="Select your preferred theme"
        selectOptions={[
          { label: 'Light', value: 'light' },
          { label: 'Dark', value: 'dark' },
          { label: 'System Default', value: 'system' },
        ]}
        value={theme}
        setValue={(newValue: string | boolean) => {
          console.log('Theme changed to:', newValue);
          applyTheme(newValue as 'light' | 'dark' | 'system');
          setTheme(newValue as 'light' | 'dark' | 'system');
        }}
      />
      <SettingsOption
        id="motionReduction"
        type="checkbox"
        icon={<IconFaceMask />}
        label="Motion Reduction"
        description="Reduce motion effects to minimize motion sickness"
        value={motionReduction}
        setValue={(newValue: string | boolean) => {
          console.log('Motion Reduction changed to:', newValue);
          setMotionReduction(newValue as boolean);
        }}
      />

      <h2 className="settings-header">Social</h2>
      <h2 className="settings-header">Notifications</h2>
      <h2 className="settings-header">Privacy</h2>
      <h2 className="settings-header">Account</h2>
    </div>
  );
};
