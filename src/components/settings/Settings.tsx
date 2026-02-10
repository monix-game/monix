import React, { useEffect } from 'react';
import './Settings.css';
import type { IUser } from '../../../server/common/models/user';
import { SettingsOption } from './settingsoption/SettingsOption';
import {
  IconBrush,
  IconBug,
  IconEyeClosed,
  IconFaceMask,
  IconGitCommit,
  IconInfoCircle,
  IconLock,
  IconLockOpen,
  IconLogout,
  IconLogout2,
  IconTrash,
  IconUserCircle,
  IconVolume,
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
import { COMMIT, COMMIT_NUMBER_THIS_MONTH, BUILD_TIMESTAMP } from '../../version';
import { useMusic } from '../../providers/music';

interface SettingsProps {
  user: IUser;
  onRestartTutorial?: () => void | Promise<void>;
}

type ThemeOption = 'light' | 'dark' | 'system';
type DebugOverlayPosition = 'topleft' | 'topright' | 'bottomleft' | 'bottomright';

export const Settings: React.FC<SettingsProps> = ({ user, onRestartTutorial }) => {
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = React.useState<boolean>(false);
  const [is2FAModalOpen, setIs2FAModalOpen] = React.useState<boolean>(false);
  const [is2FARemoveModalOpen, setIs2FARemoveModalOpen] = React.useState<boolean>(false);
  const [twoFASetupURI, setTwoFASetupURI] = React.useState<string>('');
  const [twoFACode, setTwoFACode] = React.useState<string>('');
  const [isAvatarModalOpen, setIsAvatarModalOpen] = React.useState<boolean>(false);
  const [isDeleteAvatarModalOpen, setIsDeleteAvatarModalOpen] = React.useState<boolean>(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = React.useState<boolean>(false);
  const [isCreditsModalOpen, setIsCreditsModalOpen] = React.useState<boolean>(false);

  const [oldPassword, setOldPassword] = React.useState<string>('');
  const [password, setPassword] = React.useState<string>('');

  // State for various settings
  const [theme, setTheme] = React.useState<ThemeOption>('light');
  const [musicVolume, setMusicVolume] = React.useState<number>(70);
  const [motionReduction, setMotionReduction] = React.useState<boolean>(false);
  const [debugOverlay, setDebugOverlay] = React.useState<boolean>(false);
  const [debugOverlayPosition, setDebugOverlayPosition] =
    React.useState<DebugOverlayPosition>('topleft');

  // Server settings
  const [privacyMode, setPrivacyMode] = React.useState<boolean>(false);
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null);

  const { setVolume } = useMusic();

  useEffect(() => {
    const loadStates = () => {
      const settings = loadSettings();

      setTheme(settings.theme);
      setMusicVolume(settings.musicVolume);
      setMotionReduction(settings.motionReduction);
      setDebugOverlay(settings.debugOverlay);
      setDebugOverlayPosition(settings.debugOverlayPosition);

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
          onChange={(newValue: string | boolean | number) => {
            console.log('Theme changed to:', newValue);
            applyTheme(newValue as ThemeOption);
            setTheme(newValue as ThemeOption);
            updateSetting('theme', newValue as ThemeOption);
          }}
        />
        <SettingsOption
          type="slider"
          icon={<IconVolume />}
          label="Music Volume"
          description="Adjust the radio music volume"
          value={musicVolume}
          onChange={(newValue: string | boolean | number) => {
            console.log('Music Volume changed to:', newValue);
            setMusicVolume(newValue as number);
            setVolume((newValue as number) / 100);
            updateSetting('musicVolume', newValue as number);
          }}
        />
        <SettingsOption
          type="checkbox"
          icon={<IconFaceMask />}
          label="Motion Reduction"
          description="Reduce motion effects to minimize motion sickness"
          value={motionReduction}
          onChange={(newValue: string | boolean | number) => {
            console.log('Motion Reduction changed to:', newValue);
            setMotionReduction(newValue as boolean);
            updateSetting('motionReduction', newValue as boolean);
          }}
        />
        <SettingsOption
          type="button"
          icon={<IconGitCommit />}
          label="Restart Tutorial"
          description="Replay the guided walkthrough of Monix"
          buttonLabel="Restart"
          buttonAction={async () => {
            if (onRestartTutorial) {
              await onRestartTutorial();
            }
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
          onChange={(newValue: string | boolean | number) => {
            console.log('Privacy Mode changed to:', newValue);
            setPrivacyMode(newValue as boolean);
            void updateServerSetting('privacy_mode', newValue as boolean);
          }}
        />

        <h2 className="settings-header">Developer</h2>
        <SettingsOption
          type="checkbox"
          icon={<IconBug />}
          label="Debug Overlay"
          description="Show performance and network stats"
          value={debugOverlay}
          onChange={(newValue: string | boolean | number) => {
            setDebugOverlay(newValue as boolean);
            updateSetting('debugOverlay', newValue as boolean);
          }}
        />
        <SettingsOption
          type="select"
          icon={<IconBug />}
          label="Debug Overlay Position"
          description="Choose where the overlay appears"
          selectOptions={[
            { label: 'Top Left', value: 'topleft' },
            { label: 'Top Right', value: 'topright' },
            { label: 'Bottom Left', value: 'bottomleft' },
            { label: 'Bottom Right', value: 'bottomright' },
          ]}
          value={debugOverlayPosition}
          disabled={!debugOverlay}
          onChange={(newValue: string | boolean | number) => {
            setDebugOverlayPosition(newValue as DebugOverlayPosition);
            updateSetting('debugOverlayPosition', newValue as DebugOverlayPosition);
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
        <h2 className="settings-header">About</h2>
        <SettingsOption
          type="button"
          icon={<IconInfoCircle />}
          label="Credits"
          description="See acknowledgements and licenses"
          buttonLabel="View Credits"
          buttonAction={() => setIsCreditsModalOpen(true)}
        />
        <p className="settings-version-info">
          You are playing Monix on version{' '}
          <span className="mono">
            {
              // Generate a version string from the commit hash
              // It will be YEAR.MONTH.COMMITNUMBER
              (() => {
                if (BUILD_TIMESTAMP === '$TIMESTAMP') {
                  return `dev-build`;
                }

                const date = new Date(BUILD_TIMESTAMP);
                const year = date.getUTCFullYear();
                const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
                return `${year}.${month}.${COMMIT_NUMBER_THIS_MONTH}`;
              })()
            }
          </span>
          {COMMIT !== '$COMMIT_HASH' && (
            <>
              , <IconGitCommit size={14} style={{ verticalAlign: 'middle' }} /> commit{' '}
              <span
                className="mono settings-clickable"
                onClick={() => {
                  window.open(`https://github.com/monix-game/monix/commit/${COMMIT}`, '_blank');
                }}
              >
                {COMMIT.substring(0, 7)}
              </span>
            </>
          )}
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
          {avatarFile && avatarFile.type.split('/')[0] !== 'image' && (
            <p className="settings-modal-error">
              Selected file is not an image. Please select a valid image file.
            </p>
          )}
          <Button
            onClickAsync={async () => {
              if (avatarFile) {
                const success = await uploadAvatar(avatarFile);
                if (success) {
                  setIsAvatarModalOpen(false);
                }
              } else {
                alert('Please select a file to upload.');
              }
            }}
            disabled={
              !avatarFile || avatarFile.size === 0 || avatarFile.type.split('/')[0] !== 'image'
            }
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
              await removeAvatar();
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
      <Modal isOpen={isCreditsModalOpen} onClose={() => setIsCreditsModalOpen(false)}>
        <div className="settings-credits-modal">
          <h2>Credits</h2>
          <p className="settings-credits-subtitle">Built with care by the creators below.</p>
          <div className="settings-credits-grid">
            <div className="settings-credits-card">
              <div className="settings-credits-name">proplayer919</div>
              <div className="settings-credits-role">Development & Creator</div>
            </div>
            <div className="settings-credits-card">
              <div className="settings-credits-name">Ferretosan</div>
              <div className="settings-credits-role">Music</div>
            </div>
          </div>
          <Button onClick={() => setIsCreditsModalOpen(false)} secondary>
            Close
          </Button>
        </div>
      </Modal>
    </>
  );
};
