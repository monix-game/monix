import React, { useEffect } from 'react';
import './Settings.css';
import type { IUser } from '../../../server/common/models/user';
import { SettingsOption } from './settingsoption/SettingsOption';
import {
  IconBrush,
  IconEyeClosed,
  IconFaceMask,
  IconLock,
  IconLockOpen,
  IconLogout,
  IconLogout2,
  IconTrash,
  IconUserCircle,
} from '@tabler/icons-react';
import { applyTheme } from '../../helpers/theme';
import { loadSettings, updateServerSetting, updateSetting } from '../../helpers/settings';
import {
  changePassword,
  deleteAccount,
  finish2FA,
  logOut,
  logoutEverywhere,
  remove2FA,
  removeAvatar,
  setup2FA,
  uploadAvatar,
} from '../../helpers/auth';
import { Modal } from '../modal/Modal';
import { Button } from '../button/Button';
import { QRCodeSVG } from 'qrcode.react';
import { Input } from '../input/Input';
import packageJson from '../../../package.json';

interface SettingsProps {
  user: IUser;
}

type ThemeOption = 'light' | 'dark' | 'system';

export const Settings: React.FC<SettingsProps> = ({ user }) => {
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = React.useState<boolean>(false);
  const [is2FAModalOpen, setIs2FAModalOpen] = React.useState<boolean>(false);
  const [is2FARemoveModalOpen, setIs2FARemoveModalOpen] = React.useState<boolean>(false);
  const [twoFASetupURI, setTwoFASetupURI] = React.useState<string>('');
  const [twoFACode, setTwoFACode] = React.useState<string>('');
  const [isAvatarModalOpen, setIsAvatarModalOpen] = React.useState<boolean>(false);
  const [isDeleteAvatarModalOpen, setIsDeleteAvatarModalOpen] = React.useState<boolean>(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = React.useState<boolean>(false);

  const [oldPassword, setOldPassword] = React.useState<string>('');
  const [password, setPassword] = React.useState<string>('');

  // State for various settings
  const [theme, setTheme] = React.useState<ThemeOption>('light');
  const [motionReduction, setMotionReduction] = React.useState<boolean>(false);

  // Server settings
  const [privacyMode, setPrivacyMode] = React.useState<boolean>(false);
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null);

  useEffect(() => {
    const loadStates = () => {
      const settings = loadSettings();

      setTheme(settings.theme);
      setMotionReduction(settings.motionReduction);

      setPrivacyMode(user.settings.privacy_mode);
    };

    loadStates();
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
            applyTheme(newValue as ThemeOption);
            setTheme(newValue as ThemeOption);
            updateSetting('theme', newValue as ThemeOption);
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
        <SettingsOption
          type="button"
          icon={<IconUserCircle />}
          label="User Avatar"
          description="Upload or change your user avatar"
          buttonLabel="Change Avatar"
          buttonAction={() => setIsAvatarModalOpen(true)}
        />
        {user.avatar_data_uri && (
          <SettingsOption
            type="button"
            icon={<IconTrash />}
            label="Remove Avatar"
            description="Remove your current avatar"
            danger
            buttonLabel="Remove Avatar"
            buttonAction={() => setIsDeleteAvatarModalOpen(true)}
          />
        )}

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
          icon={<IconLock />}
          label="Change Password"
          description="Change your account password"
          buttonLabel="Change Password"
          buttonAction={() => setIsChangePasswordModalOpen(true)}
        />
        {!user.setup_totp && (
          <SettingsOption
            type="button"
            icon={<IconLock />}
            label="Setup 2FA"
            description="Set up two-factor authentication for your account"
            buttonLabel="Setup 2FA"
            disabled={user.setup_totp}
            buttonAction={async () => {
              const uri = await setup2FA();
              if (uri) {
                setTwoFASetupURI(uri);
                setIs2FAModalOpen(true);
              }
            }}
          />
        )}
        <div className="settings-danger-section">
          {user.setup_totp && (
            <SettingsOption
              type="button"
              icon={<IconLockOpen />}
              label="Remove 2FA"
              description="Remove two-factor authentication for your account"
              buttonLabel="Remove 2FA"
              disabled={!user.setup_totp}
              danger
              buttonAction={() => setIs2FARemoveModalOpen(true)}
            />
          )}
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
        <p className="settings-version-info">
          You are playing Monix on branch <span className="mono">BETA</span> on version{' '}
          <span className="mono">{packageJson.version}</span>
        </p>
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
            Confirm
          </Button>
        </div>
      </Modal>
      <Modal isOpen={is2FAModalOpen} onClose={() => setIs2FAModalOpen(false)}>
        <div className="settings-confirm-modal">
          <h2>Setup 2FA</h2>
          <p>Scan the QR code below with your authenticator app.</p>
          <QRCodeSVG value={twoFASetupURI} className="settings-qr-code" />
          <Input label="Enter Code from App" value={twoFACode} onValueChange={setTwoFACode} />
          <Button
            onClickAsync={async () => {
              const success = await finish2FA(twoFACode);
              if (success) {
                setIs2FAModalOpen(false);
                globalThis.location.reload();
              }
            }}
            secondary
          >
            Verify Code
          </Button>
        </div>
      </Modal>
      <Modal isOpen={is2FARemoveModalOpen} onClose={() => setIs2FARemoveModalOpen(false)}>
        <div className="settings-confirm-modal">
          <h2>Remove 2FA</h2>
          <p>Enter the code from your authenticator app to remove 2FA.</p>
          <Input label="Enter Code from App" value={twoFACode} onValueChange={setTwoFACode} />
          <Button
            onClickAsync={async () => {
              const success = await remove2FA(twoFACode);
              if (success) {
                setIs2FARemoveModalOpen(false);
                globalThis.location.reload();
              }
            }}
            secondary
          >
            Verify Code
          </Button>
        </div>
      </Modal>
      <Modal isOpen={isAvatarModalOpen} onClose={() => setIsAvatarModalOpen(false)}>
        <div className="settings-confirm-modal">
          <h2>Upload Avatar</h2>
          <p>Upload a new avatar image for your profile.</p>
          <Input
            type="file"
            onChange={e => {
              if (e.target.files && e.target.files.length > 0) {
                setAvatarFile(e.target.files[0]);
                console.log('Selected file:', e.target.files[0]);
              } else {
                setAvatarFile(null);
                alert('No file selected.');
              }
            }}
          />
          <Button
            onClickAsync={async () => {
              if (avatarFile) {
                const success = await uploadAvatar(avatarFile);
                if (success) {
                  setIsAvatarModalOpen(false);
                  globalThis.location.reload();
                }
              } else {
                alert('Please select a file to upload.');
              }
            }}
            secondary
          >
            Upload Avatar
          </Button>
        </div>
      </Modal>
      <Modal isOpen={isDeleteAvatarModalOpen} onClose={() => setIsDeleteAvatarModalOpen(false)}>
        <div className="settings-confirm-modal">
          <h2>Confirm Remove Avatar</h2>
          <p>Are you sure you want to remove your avatar? This action cannot be undone.</p>
          <Button onClick={() => setIsDeleteAvatarModalOpen(false)}>Cancel</Button>
          <Button
            onClickAsync={async () => {
              const success = await removeAvatar();
              if (success) {
                setIsDeleteAvatarModalOpen(false);
              }
            }}
            secondary
          >
            Confirm
          </Button>
        </div>
      </Modal>
      <Modal isOpen={isChangePasswordModalOpen} onClose={() => setIsChangePasswordModalOpen(false)}>
        <div className="settings-confirm-modal">
          <h2>Change Password</h2>
          <p>Enter your current and new password.</p>
          <Input
            label="Old Password"
            isPassword
            placeholder="0LD P4$$W0RD"
            onValueChange={value => setOldPassword(value)}
            value={oldPassword}
          ></Input>
          <Input
            label="New Password"
            isPassword
            placeholder="N3W P4$$W0RD"
            onValueChange={value => setPassword(value)}
            value={password}
            predicates={[
              {
                isValid: text => {
                  return text !== oldPassword;
                },
                message: 'New password must be different from old password',
              },
              {
                isValid: text => {
                  return text.length >= 6;
                },
                message: 'Password must be at least 6 characters long',
              },
            ]}
          ></Input>
          <Button
            onClickAsync={async () => {
              const success = await changePassword(oldPassword, password);
              if (success) {
                setIsChangePasswordModalOpen(false);
                logOut();
                location.href = '/auth/login';
              }
            }}
          >
            Change Password
          </Button>
        </div>
      </Modal>
    </>
  );
};
