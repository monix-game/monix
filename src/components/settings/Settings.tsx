import React, { useEffect } from 'react';
import styles from './Settings.module.css';
import type { IUser } from '../../../server/common/models/user';
import { SettingsOption } from './settingsoption/SettingsOption';
import {
  IconBrush,
  IconBug,
  IconEyeClosed,
  IconFaceMask,
  IconFingerprint,
  IconGitCommit,
  IconInfoCircle,
  IconKey,
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
  deletePasskey,
  finish2FA,
  generateRecoveryCodes,
  listPasskeys,
  logOut,
  logoutEverywhere,
  passkeyRegisterOptions,
  passkeyVerifyRegister,
  recoveryCodeCount,
  remove2FA,
  removeAvatar,
  renamePasskey,
  setup2FA,
  uploadAvatar,
  type PasskeySummary,
} from '../../helpers/auth';
import {
  decodeCreationOptions,
  serializeRegistrationCredential,
  isWebAuthnSupported,
} from '../../helpers/webauthn';
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

  // Passkey state
  const [passkeys, setPasskeys] = React.useState<PasskeySummary[]>([]);
  const [isPasskeyAddModalOpen, setIsPasskeyAddModalOpen] = React.useState<boolean>(false);
  const [passkeyName, setPasskeyName] = React.useState<string>('');
  const [isPasskeyRenameModalOpen, setIsPasskeyRenameModalOpen] = React.useState<boolean>(false);
  const [renameTarget, setRenameTarget] = React.useState<PasskeySummary | null>(null);
  const [renameName, setRenameName] = React.useState<string>('');
  const [isPasskeyDeleteModalOpen, setIsPasskeyDeleteModalOpen] = React.useState<boolean>(false);
  const [deleteTarget, setDeleteTarget] = React.useState<PasskeySummary | null>(null);

  // Recovery code state
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = React.useState<boolean>(false);
  const [recoveryCodes, setRecoveryCodes] = React.useState<string[]>([]);
  const [recoveryCount, setRecoveryCount] = React.useState<{ total: number; unused: number }>({
    total: 0,
    unused: 0,
  });

  const [error, setError] = React.useState<string>('');
  const [loading, setLoading] = React.useState<boolean>(false);

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

  const refresh2FA = async () => {
    const pk = await listPasskeys();
    setPasskeys(pk);
    const count = await recoveryCodeCount();
    if (count) {
      setRecoveryCount(count);
    }
  };

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

  // Load passkeys and recovery-code status once on mount. Do NOT depend on
  // `user` here: the game pushes frequent `user:me` snapshots with a fresh
  // object reference, which would otherwise re-fire these network calls
  // repeatedly. Refreshing after mutations is handled by the explicit
  // refresh2FA() calls in the passkey/recovery handlers below.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh2FA();
  }, []);

  const handleAddPasskey = async () => {
    setLoading(true);
    setError('');
    try {
      if (!isWebAuthnSupported()) {
        setError('Passkeys are not supported in this browser');
        setLoading(false);
        return;
      }

      const options = await passkeyRegisterOptions();
      if (!options) {
        setError('Failed to start passkey registration');
        setLoading(false);
        return;
      }

      let credential: PublicKeyCredential;
      try {
        credential = (await navigator.credentials.create({
          publicKey: decodeCreationOptions(options),
        })) as PublicKeyCredential;
      } catch (err) {
        setError(`Passkey creation cancelled: ${(err as Error).message}`);
        setLoading(false);
        return;
      }

      const name = passkeyName.trim() || 'Passkey';
      const result = await passkeyVerifyRegister(
        serializeRegistrationCredential(credential),
        name
      );

      if (result.success) {
        setIsPasskeyAddModalOpen(false);
        setPasskeyName('');
        await refresh2FA();

        // First 2FA method -> recovery codes are generated and shown once.
        if (result.recoveryCodes && result.recoveryCodes.length > 0) {
          setRecoveryCodes(result.recoveryCodes);
          setIsRecoveryModalOpen(true);
        }
      } else {
        setError('Passkey registration failed');
      }
    } catch (err) {
      setError(`Passkey error: ${(err as Error).message}`);
    }
    setLoading(false);
  };

  const handleRenamePasskey = async () => {
    if (!renameTarget || !renameName.trim()) return;
    const ok = await renamePasskey(renameTarget.id, renameName.trim());
    if (ok) {
      setIsPasskeyRenameModalOpen(false);
      setRenameTarget(null);
      setRenameName('');
      await refresh2FA();
    }
  };

  const handleDeletePasskey = async () => {
    if (!deleteTarget) return;
    const ok = await deletePasskey(deleteTarget.id);
    if (ok) {
      setIsPasskeyDeleteModalOpen(false);
      setDeleteTarget(null);
      await refresh2FA();
    }
  };

  const handleGenerateRecovery = async () => {
    setLoading(true);
    setError('');
    const result = await generateRecoveryCodes();
    if (result.success && result.codes) {
      setRecoveryCodes(result.codes);
      setIsRecoveryModalOpen(true);
      await refresh2FA();
    } else {
      setError('Make sure 2FA is enabled before generating recovery codes');
    }
    setLoading(false);
  };

  const has2FA = !!user.setup_totp || passkeys.length > 0;

  return (
    <>
      <div className={styles['settings-container']}>
        <h1 className={styles['settings-title']}>Settings</h1>
        <h2 className={styles['settings-header']}>General</h2>
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

        <h2 className={styles['settings-header']}>Social</h2>
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

        <h2 className={styles['settings-header']}>Notifications</h2>
        <h2 className={styles['settings-header']}>Privacy</h2>
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

        <h2 className={styles['settings-header']}>Developer</h2>
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

        <h2 className={styles['settings-header']}>Account</h2>
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

        <h2 className={styles['settings-header']}>Two-Factor Authentication</h2>
        {!user.setup_totp && (
          <SettingsOption
            type="button"
            icon={<IconLock />}
            label="Authenticator App"
            description="Set up a TOTP authenticator app for 2FA"
            buttonLabel="Setup"
            buttonAction={async () => {
              const uri = await setup2FA();
              if (uri) {
                setTwoFASetupURI(uri);
                setIs2FAModalOpen(true);
              }
            }}
          />
        )}
        {user.setup_totp && (
          <SettingsOption
            type="button"
            icon={<IconLockOpen />}
            label="Authenticator App"
            description="Remove your TOTP authenticator app"
            danger
            buttonLabel="Remove"
            buttonAction={() => setIs2FARemoveModalOpen(true)}
          />
        )}

        <SettingsOption
          type="button"
          icon={<IconFingerprint />}
          label="Add Passkey"
          description="Register a passkey (Face ID, fingerprint, security key)"
          buttonLabel="Add Passkey"
          disabled={!isWebAuthnSupported()}
          buttonAction={() => setIsPasskeyAddModalOpen(true)}
        />
        {passkeys.map(pk => (
          <div key={pk.id} className={styles['settings-passkey-row']}>
            <div className={styles['settings-passkey-info']}>
              <IconFingerprint className={styles['settings-passkey-icon']} />
              <div>
                <div className={styles['settings-passkey-name']}>{pk.name}</div>
                <div className={styles['settings-passkey-date']}>
                  Added{' '}
                  {new Date(pk.created_at).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
              </div>
            </div>
            <div className={styles['settings-passkey-actions']}>
              <Button
                color="primary"
                onClick={() => {
                  setRenameTarget(pk);
                  setRenameName(pk.name);
                  setIsPasskeyRenameModalOpen(true);
                }}
              >
                Rename
              </Button>
              <Button
                color="red"
                onClick={() => {
                  setDeleteTarget(pk);
                  setIsPasskeyDeleteModalOpen(true);
                }}
              >
                Remove
              </Button>
            </div>
          </div>
        ))}

        <SettingsOption
          type="button"
          icon={has2FA ? <IconKey /> : <IconLock />}
          label="Recovery Codes"
          description={
            recoveryCount.unused > 0
              ? `${recoveryCount.unused} of ${recoveryCount.total} recovery codes remaining`
              : has2FA
                ? 'Generate new recovery codes'
                : 'Enable 2FA to generate recovery codes'
          }
          buttonLabel={has2FA ? 'View / Regenerate' : 'Generate'}
          disabled={!has2FA}
          buttonAction={() => {
            if (recoveryCount.unused > 0 && recoveryCodes.length === 0) {
              // Open a read-only view of the count if codes aren't currently shown.
              setIsRecoveryModalOpen(true);
            } else {
              setRecoveryCodes([]);
              setIsRecoveryModalOpen(true);
            }
          }}
        />

        <div className={styles['settings-danger-section']}>
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
        <h2 className={styles['settings-header']}>About</h2>
        <SettingsOption
          type="button"
          icon={<IconInfoCircle />}
          label="Credits"
          description="See acknowledgements and licenses"
          buttonLabel="View Credits"
          buttonAction={() => setIsCreditsModalOpen(true)}
        />
        <p className={styles['settings-version-info']}>
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
                className={`mono ${styles['settings-clickable']}`}
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
        <div className={styles['settings-confirm-modal']}>
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
        <div className={styles['settings-confirm-modal']}>
          <h2>Setup Authenticator</h2>
          <p>Scan the QR code below with your authenticator app.</p>
          <QRCodeSVG value={twoFASetupURI} className={styles['settings-qr-code']} />
          <Input label="Enter Code from App" value={twoFACode} onValueChange={setTwoFACode} />
          <Button
            onClickAsync={async () => {
              const result = await finish2FA(twoFACode);
              if (result.success) {
                setIs2FAModalOpen(false);
                setTwoFACode('');
                if (result.recoveryCodes && result.recoveryCodes.length > 0) {
                  setRecoveryCodes(result.recoveryCodes);
                  setIsRecoveryModalOpen(true);
                } else {
                  globalThis.location.reload();
                }
              }
            }}
            secondary
          >
            Verify Code
          </Button>
        </div>
      </Modal>

      <Modal isOpen={is2FARemoveModalOpen} onClose={() => setIs2FARemoveModalOpen(false)}>
        <div className={styles['settings-confirm-modal']}>
          <h2>Remove Authenticator</h2>
          <p>Enter the code from your authenticator app to remove 2FA.</p>
          <Input label="Enter Code from App" value={twoFACode} onValueChange={setTwoFACode} />
          <Button
            onClickAsync={async () => {
              const success = await remove2FA(twoFACode);
              if (success) {
                setIs2FARemoveModalOpen(false);
                setTwoFACode('');
                await refresh2FA();
                globalThis.location.reload();
              }
            }}
            secondary
          >
            Verify Code
          </Button>
        </div>
      </Modal>

      <Modal isOpen={isPasskeyAddModalOpen} onClose={() => setIsPasskeyAddModalOpen(false)}>
        <div className={styles['settings-confirm-modal']}>
          <h2>Add a Passkey</h2>
          <p>Give your passkey a name so you can recognize it later.</p>
          <Input
            label="Passkey Name"
            placeholder="My MacBook, iPhone, YubiKey..."
            value={passkeyName}
            onValueChange={setPasskeyName}
            disabled={loading}
          />
          {error && <p className={styles['settings-modal-error']}>{error}</p>}
          <Button
            onClickAsync={async () => {
              await handleAddPasskey();
            }}
            isLoading={loading}
            secondary
          >
            Continue
          </Button>
        </div>
      </Modal>

      <Modal isOpen={isPasskeyRenameModalOpen} onClose={() => setIsPasskeyRenameModalOpen(false)}>
        <div className={styles['settings-confirm-modal']}>
          <h2>Rename Passkey</h2>
          <Input
            label="Passkey Name"
            value={renameName}
            onValueChange={setRenameName}
          />
          <Button
            onClickAsync={async () => {
              await handleRenamePasskey();
            }}
            secondary
          >
            Save
          </Button>
        </div>
      </Modal>

      <Modal isOpen={isPasskeyDeleteModalOpen} onClose={() => setIsPasskeyDeleteModalOpen(false)}>
        <div className={styles['settings-confirm-modal']}>
          <h2>Remove Passkey</h2>
          <p>
            Are you sure you want to remove "{deleteTarget?.name}"? This cannot be undone.
          </p>
          <Button onClick={() => setIsPasskeyDeleteModalOpen(false)}>Cancel</Button>
          <Button
            onClickAsync={async () => {
              await handleDeletePasskey();
            }}
            secondary
          >
            Confirm
          </Button>
        </div>
      </Modal>

      <Modal isOpen={isRecoveryModalOpen} onClose={() => setIsRecoveryModalOpen(false)}>
        <div className={styles['settings-confirm-modal']}>
          <h2>Recovery Codes</h2>

          {recoveryCodes.length > 0 ? (
            <>
              <p>
                Store these recovery codes somewhere safe. Each one can be used once to
                bypass two-factor authentication. They will not be shown again.
              </p>
              <div className={styles['settings-recovery-codes']}>
                {recoveryCodes.map((code, i) => (
                  <div key={code} className={styles['settings-recovery-code']}>
                    <span className={styles['settings-recovery-code-index']}>{i + 1}</span>
                    <code>{code}</code>
                  </div>
                ))}
              </div>
              {recoveryCount.unused > 0 && (
                <p>You have {recoveryCount.unused} unused recovery codes remaining.</p>
              )}
              <Button
                onClickAsync={async () => {
                  await handleGenerateRecovery();
                }}
                color="red"
                isLoading={loading}
              >
                Regenerate Codes
              </Button>
              <Button onClick={() => setIsRecoveryModalOpen(false)} secondary>
                Done
              </Button>
            </>
          ) : (
            <>
              <p>
                {recoveryCount.unused > 0
                  ? `You currently have ${recoveryCount.unused} unused recovery codes.`
                  : 'Generate a fresh set of recovery codes.'}
              </p>
              <p>
                Recovery codes let you sign in without your authenticator or passkey. Each code
                can only be used once.
              </p>
              <Button
                onClickAsync={async () => {
                  await handleGenerateRecovery();
                }}
                secondary
                isLoading={loading}
              >
                Generate Recovery Codes
              </Button>
            </>
          )}
          {error && <p className={styles['settings-modal-error']}>{error}</p>}
        </div>
      </Modal>

      <Modal isOpen={isAvatarModalOpen} onClose={() => setIsAvatarModalOpen(false)}>
        <div className={styles['settings-confirm-modal']}>
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
            <p className={styles['settings-modal-error']}>
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
        <div className={styles['settings-confirm-modal']}>
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
        <div className={styles['settings-confirm-modal']}>
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
        <div className={styles['settings-credits-modal']}>
          <h2>Credits</h2>
          <p className={styles['settings-credits-subtitle']}>Built with care by the creators below.</p>
          <div className={styles['settings-credits-grid']}>
            <div className={styles['settings-credits-card']}>
              <div className={styles['settings-credits-name']}>proplayer919</div>
              <div className={styles['settings-credits-role']}>Development & Creator</div>
            </div>
            <div className={styles['settings-credits-card']}>
              <div className={styles['settings-credits-name']}>Ferretosan</div>
              <div className={styles['settings-credits-role']}>Music</div>
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
