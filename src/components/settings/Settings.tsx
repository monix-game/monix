import React, { useEffect } from 'react';
import './Settings.css';
import type { IUser } from '../../../server/common/models/user';
import { SettingsOption } from './settingsoption/SettingsOption';
import {
  IconBrush,
  IconEyeClosed,
  IconFaceMask,
  IconLogout,
  IconLogout2,
  IconTrash,
} from '@tabler/icons-react';
import { applyTheme } from '../../helpers/theme';
import { loadSettings, updateServerSetting, updateSetting } from '../../helpers/settings';
import { deleteAccount, logOut, logoutEverywhere } from '../../helpers/auth';
import { Modal } from '../modal/Modal';
import { Button } from '../button/Button';

interface SettingsProps {
  user: IUser;
}

export const Settings: React.FC<SettingsProps> = ({ user }) => {
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = React.useState<boolean>(false);

  // State for various settings
  const [theme, setTheme] = React.useState<'light' | 'dark' | 'system'>('light');
  const [motionReduction, setMotionReduction] = React.useState<boolean>(false);

  // Server settings
  const [privacyMode, setPrivacyMode] = React.useState<boolean>(false);

  useEffect(() => {
    const loadSettingsStates = () => {
      const settings = loadSettings();

      setTheme(settings.theme);
      setMotionReduction(settings.motionReduction);

      setPrivacyMode(user.settings.privacy_mode);
    };

    loadSettingsStates();
  }, [user]);

  return (
    <>
      <div className="settings-container">
        <h1 className="settings-title">Settings</h1>
        <h2 className="settings-header">General</h2>
        <SettingsOption
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
          onChange={(newValue: string | boolean) => {
            console.log('Theme changed to:', newValue);
            applyTheme(newValue as 'light' | 'dark' | 'system');
            setTheme(newValue as 'light' | 'dark' | 'system');
            updateSetting('theme', newValue as 'light' | 'dark' | 'system');
          }}
        />
        <SettingsOption
          type="checkbox"
          icon={<IconFaceMask />}
          label="Motion Reduction"
          description="Reduce motion effects to minimize motion sickness"
          value={motionReduction}
          onChange={(newValue: string | boolean) => {
            console.log('Motion Reduction changed to:', newValue);
            setMotionReduction(newValue as boolean);
            updateSetting('motionReduction', newValue as boolean);
          }}
        />

        <h2 className="settings-header">Social</h2>
        <h2 className="settings-header">Notifications</h2>
        <h2 className="settings-header">Privacy</h2>
        <SettingsOption
          type="checkbox"
          icon={<IconEyeClosed />}
          label="Privacy Mode"
          description="Enable privacy mode to hide your activity from others"
          value={privacyMode}
          onChange={(newValue: string | boolean) => {
            console.log('Privacy Mode changed to:', newValue);
            setPrivacyMode(newValue as boolean);
            void updateServerSetting('privacy_mode', newValue as boolean);
          }}
        />

        <h2 className="settings-header">Account</h2>
        <SettingsOption
          type="button"
          icon={<IconLogout />}
          label="Log Out"
          description="Log out of your account"
          buttonLabel="Log Out"
          buttonAction={() => {
            logOut();
            location.href = '/auth/login';
          }}
        />
        <SettingsOption
          type="button"
          icon={<IconLogout2 />}
          label="Log Out Everywhere"
          description="Log out of your account across all devices"
          buttonLabel="Log Out Everywhere"
          buttonAction={async () => {
            await logoutEverywhere();
            location.href = '/auth/login';
          }}
        />
        <SettingsOption
          type="button"
          icon={<IconTrash />}
          label="Delete Account"
          description="Permanently delete your account"
          danger
          buttonLabel="Delete Account"
          buttonAction={() => {
            setIsDeleteAccountModalOpen(true);
          }}
        />
      </div>
      <Modal isOpen={isDeleteAccountModalOpen} onClose={() => setIsDeleteAccountModalOpen(false)}>
        <div className="settings-confirm-modal">
          <h2>Confirm Delete Account</h2>
          <p>Are you sure you want to delete your account? This action cannot be undone.</p>
          <Button onClick={() => setIsDeleteAccountModalOpen(false)}>Cancel</Button>
          <Button
            onClickAsync={async () => {
              const success = await deleteAccount();
              if (success) {
                setIsDeleteAccountModalOpen(false);
                location.href = '/';
              }
            }}
            secondary
          >
            Confirm Delete
          </Button>
        </div>
      </Modal>
    </>
  );
};
