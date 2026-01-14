import '../Auth.css';
import monixLogoLight from '../../../assets/logo.svg';
import monixLogoDark from '../../../assets/logo-dark.svg';
import { AnimatedBackground, Button, Footer, Input } from '../../../components';
import { useEffect, useState } from 'react';
import { isSignedIn, register } from '../../../helpers/auth';
import { currentTheme } from '../../../helpers/theme';

export default function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUsernameChange = (value: string) => {
    setUsername(value);
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
  };

  const handlePassword2Change = (value: string) => {
    setPassword2(value);
  };

  const submitForm = async () => {
    if (!username || !password || !password2) {
      setError('Please fill all fields');
      return;
    }
    if (password !== password2) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    const success = await register(username, password);
    setLoading(false);

    if (success) {
      window.location.href = '/auth/login';
    } else {
      setPassword('');
      setPassword2('');
      setError('Failed to register');
    }
  };

  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
          <h1 className="auth-title">Register for Monix</h1>
        </div>

        {signedIn && (
          <div className="island-main signed-in">
            <h2 className="auth-subtitle">You are already signed in!</h2>
            <Button onClick={() => (window.location.href = '/game')}>Go to Game</Button>
          </div>
        )}

        {!signedIn && (
          <div className="island-main">
            <div className="island-form">
              <Input
                label="Username"
                placeholder="U$3RN4M3"
                onValueChange={handleUsernameChange}
                value={username}
              ></Input>
              <Input
                label="Password"
                isPassword
                placeholder="P4$$W0RD"
                onValueChange={handlePasswordChange}
                value={password}
              ></Input>
              <Input
                label="Repeat Password"
                isPassword
                error={error}
                onValueChange={handlePassword2Change}
                placeholder="R3P34T P4$$W0RD"
                value={password2}
              ></Input>
              {/* eslint-disable-next-line @typescript-eslint/no-misused-promises */}
              <Button onClick={submitForm} isLoading={loading}>
                Register!
              </Button>
            </div>

            <span className="auth-note">
              Already have an account? <a href="/auth/login">Login here</a>
            </span>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
