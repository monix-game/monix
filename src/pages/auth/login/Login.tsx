import '../Auth.css';
import monixLogoLight from '../../../assets/logo.svg';
import monixLogoDark from '../../../assets/logo-dark.svg';
import { AnimatedBackground, Button, Footer, Input } from '../../../components';
import { useEffect, useState } from 'react';
import { fetchUser, isSignedIn, login, userNeeds2FA } from '../../../helpers/auth';
import { currentTheme } from '../../../helpers/theme';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [twoFACode, setTwoFACode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUsernameChange = (value: string) => {
    setUsername(value);
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
  };

  const submitForm = async () => {
    if (twoFACode) {
      setLoading(true);
      const success = await login(username, password, twoFACode);
      if (success) {
        const user = await fetchUser();
        if (user) {
          setLoading(false);
          // eslint-disable-next-line react-hooks/immutability
          window.location.href = '/game';
          return;
        }
      }
      setLoading(false);
      setError('Failed to verify 2FA code');
      setTwoFACode('');
      return;
    }

    // Normal login flow
    if (!username || !password) {
      setError('Please fill all fields');
      return;
    }

    setLoading(true);

    const needs2FA = await userNeeds2FA(username, password);

    if (!needs2FA) {
      const success = await login(username, password);
      let message = 'Failed to login';

      if (success) {
        const user = await fetchUser();
        if (user) {
          setLoading(false);
          // eslint-disable-next-line react-hooks/immutability
          window.location.href = '/game';
        }
      } else {
        message = 'Username/password incorrect';
      }

      // Unsuccessful
      setLoading(false);
      setPassword('');
      setError(message);
    } else {
      // Needs 2FA
      setLoading(false);
      setError('');
      setDoingTwoFA(true);
    }
  };

  const [signedIn, setSignedIn] = useState(false);
  const [doingTwoFA, setDoingTwoFA] = useState(false);

  useEffect(() => {
    setSignedIn(isSignedIn());
  }, []);

  return (
    <div className="auth-container">
      <AnimatedBackground />
      <div className="auth-island">
        <div className="island-header">
          <div className="logo-container">
            <img
              className="auth-logo"
              src={currentTheme() === 'dark' ? monixLogoDark : monixLogoLight}
            />
          </div>
          <h1 className="auth-title">Login to Monix</h1>
        </div>

        {signedIn && (
          <div className="island-main signed-in">
            <h2 className="auth-subtitle">You are already signed in!</h2>
            <Button onClick={() => (window.location.href = '/game')}>Go to Game</Button>
          </div>
        )}

        {doingTwoFA && (
          <div className="island-main">
            <div className="island-form">
              <Input
                label="2FA Code"
                placeholder="Enter your 2FA code"
                value={twoFACode}
                onValueChange={setTwoFACode}
              ></Input>
              {/* eslint-disable-next-line @typescript-eslint/no-misused-promises */}
              <Button onClick={submitForm} isLoading={loading}>
                Login!
              </Button>
            </div>

            <span className="auth-note">
              Already have an account? <a href="/auth/login">Login here</a>
            </span>
          </div>
        )}

        {!signedIn && !doingTwoFA && (
          <div className="island-main">
            <div className="island-form">
              <Input
                label="Username"
                placeholder="U$3RN4M3"
                value={username}
                onValueChange={handleUsernameChange}
              ></Input>
              <Input
                label="Password"
                error={error}
                isPassword
                placeholder="P4$$W0RD"
                value={password}
                onValueChange={handlePasswordChange}
              ></Input>
              {/* eslint-disable-next-line @typescript-eslint/no-misused-promises */}
              <Button onClick={submitForm} isLoading={loading}>
                Login!
              </Button>
            </div>

            <span className="auth-note">
              Don't have an account? <a href="/auth/register">Register here</a>
            </span>
          </div>
        )}
      </div>

      <Footer fixed />
    </div>
  );
}
