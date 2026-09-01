import styles from '../Auth.module.css';
import monixLogoLight from '../../../assets/logo.svg';
import monixLogoDark from '../../../assets/logo-dark.svg';
import { AnimatedBackground, Button, Footer, Input } from '../../../components';
import { useState } from 'react';
import {
  fetchUser,
  isSignedIn,
  login,
  passkeyAuthOptions,
  userNeeds2FA,
  type TwoFactorStatus,
} from '../../../helpers/auth';
import {
  decodeRequestOptions,
  serializeAuthenticationCredential,
  isWebAuthnSupported,
} from '../../../helpers/webauthn';
import { currentTheme } from '../../../helpers/theme';

type TwoFactorMode = 'totp' | 'passkey' | 'recovery';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [twoFACode, setTwoFACode] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [twoFAStatus, setTwoFAStatus] = useState<TwoFactorStatus | null>(null);
  const [doingTwoFA, setDoingTwoFA] = useState(false);
  const [mode, setMode] = useState<TwoFactorMode>('totp');

  const signedIn = useState(isSignedIn)[0];

  const handleUsernameChange = (value: string) => {
    setUsername(value);
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
  };

  const completeLogin = async () => {
    const user = await fetchUser();
    if (user) {
      setLoading(false);
       
      globalThis.location.href = '/game';
    } else {
      setLoading(false);
      setError('Failed to verify login');
    }
  };

  const doPasskeyAuth = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await passkeyAuthOptions(username, password);
      if (!result) {
        setLoading(false);
        setError('Failed to start passkey authentication');
        return;
      }

      const { options, tempToken } = result;
      let assertion: PublicKeyCredential;
      try {
        assertion = (await navigator.credentials.get({
          publicKey: decodeRequestOptions(options),
        })) as PublicKeyCredential;
      } catch (err) {
        setLoading(false);
        setError(`Passkey authentication cancelled: ${(err as Error).message}`);
        return;
      }

      const success = await login(username, password, {
        tempToken,
        passkeyCredential: serializeAuthenticationCredential(assertion),
      });
      if (success) {
        await completeLogin();
      } else {
        setLoading(false);
        setError('Passkey authentication failed');
      }
    } catch (err) {
      setLoading(false);
      setError(`Passkey error: ${(err as Error).message}`);
    }
  };

  const submitForm = async () => {
    if (!doingTwoFA && (!username || !password)) {
      setError('Please fill all fields');
      return;
    }

    setLoading(true);

    // 2FA flow (username/password already entered).
    if (doingTwoFA) {
      if (mode === 'passkey' && isWebAuthnSupported()) {
        setLoading(false);
        await doPasskeyAuth();
        return;
      }

      if (mode === 'recovery' && !recoveryCode) {
        setLoading(false);
        setError('Enter your recovery code');
        return;
      }
      if (mode === 'totp' && !twoFACode) {
        setLoading(false);
        setError('Enter your 2FA code');
        return;
      }

      const secondFactor =
        mode === 'recovery'
          ? { recoveryCode }
          : { twoFACode };

      const success = await login(username, password, secondFactor);
      if (success) {
        await completeLogin();
      } else {
        setLoading(false);
        setError(mode === 'recovery' ? 'Invalid recovery code' : 'Failed to verify 2FA code');
        setTwoFACode('');
      }
      return;
    }

    // Normal login flow
    const needs2FA = await userNeeds2FA(username, password);

    if (!needs2FA?.needs_2fa) {
      const success = await login(username, password);
      if (success) {
        setLoading(false);
         
        globalThis.location.href = '/game';
        return;
      }

      setLoading(false);
      setPassword('');
      setError('Username/password incorrect');
    } else {
      // Needs 2FA
      setTwoFAStatus(needs2FA);
      if (needs2FA.has_totp) setMode('totp');
      else if (needs2FA.has_passkeys && isWebAuthnSupported()) setMode('passkey');
      else if (needs2FA.has_recovery_codes) setMode('recovery');

      setLoading(false);
      setError('');
      setDoingTwoFA(true);
    }
  };

  const methodButtons: { id: TwoFactorMode; label: string; enabled: boolean }[] = [
    { id: 'totp', label: 'Authenticator Code', enabled: !!twoFAStatus?.has_totp },
    {
      id: 'passkey',
      label: 'Passkey',
      enabled: !!twoFAStatus?.has_passkeys && isWebAuthnSupported(),
    },
    { id: 'recovery', label: 'Recovery Code', enabled: !!twoFAStatus?.has_recovery_codes },
  ];

  return (
    <div className={styles['auth-container']}>
      <AnimatedBackground />
      <div className={styles['auth-island']}>
        <div className={styles['island-header']}>
          <div className={styles['logo-container']}>
            <img
              className={styles['auth-logo']}
              alt="Monix Logo"
              src={currentTheme() === 'dark' ? monixLogoDark : monixLogoLight}
            />
          </div>
          <h1 className={styles['auth-title']}>Login to Monix</h1>
        </div>

        {signedIn && (
          <div className={`${styles['island-main']} ${styles['signed-in']}`}>
            <h2 className={styles['auth-subtitle']}>You are already signed in!</h2>
            <Button onClick={() => (globalThis.location.href = '/game')}>Go to Game</Button>
          </div>
        )}

        {doingTwoFA && (
          <div className={styles['island-main']}>
            <div className={styles['island-form']}>
              <div className={styles['twofa-method-tabs']}>
                {methodButtons.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    className={`${styles['twofa-method-tab']} ${
                      mode === m.id ? styles['twofa-method-tab-active'] : ''
                    }`}
                    disabled={!m.enabled}
                    onClick={() => setMode(m.id)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {mode === 'totp' && (
                <Input
                  label="2FA Code"
                  placeholder="Enter your 2FA code"
                  value={twoFACode}
                  onValueChange={setTwoFACode}
                />
              )}

              {mode === 'recovery' && (
                <Input
                  label="Recovery Code"
                  placeholder="XXXX-XXXX-XXXX"
                  value={recoveryCode}
                  onValueChange={setRecoveryCode}
                />
              )}

              {mode === 'passkey' && isWebAuthnSupported() && (
                <p className={styles['auth-note']}>Sign in with your passkey when prompted.</p>
              )}

              {/* eslint-disable-next-line @typescript-eslint/no-misused-promises */}
              <Button onClick={submitForm} isLoading={loading}>
                {mode === 'passkey' ? 'Use Passkey' : 'Login!'}
              </Button>
            </div>
          </div>
        )}

        {!signedIn && !doingTwoFA && (
          <div className={styles['island-main']}>
            <div className={styles['island-form']}>
              <Input
                label="Username"
                placeholder="U$3RN4M3"
                value={username}
                error={error}
                onValueChange={handleUsernameChange}
              />
              <Input
                label="Password"
                error={error}
                isPassword
                placeholder="P4$$W0RD"
                value={password}
                onValueChange={handlePasswordChange}
              />
              {/* eslint-disable-next-line @typescript-eslint/no-misused-promises */}
              <Button onClick={submitForm} isLoading={loading}>
                Login!
              </Button>
            </div>

            <span className={styles['auth-note']}>
              Don't have an account? <a href="/auth/register">Register here</a>
            </span>
          </div>
        )}
      </div>

      <Footer fixed />
    </div>
  );
}
