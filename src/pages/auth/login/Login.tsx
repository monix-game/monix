import '../Auth.css';
import monixLogoLight from '../../../assets/logo.svg';
import monixLogoDark from '../../../assets/logo-dark.svg';
import { AnimatedBackground, Button, Footer, Input } from '../../../components';
import { useEffect, useState } from 'react';
import { fetchUser, isSignedIn, login } from '../../../helpers/auth';
import { currentTheme } from '../../../helpers/theme';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUsernameChange = (value: string) => {
    setUsername(value);
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
  };

  const submitForm = async () => {
    if (!username || !password) {
      setError('Please fill all fields');
      return;
    }

    setLoading(true);
    const success = await login(username, password);
    let message = 'Failed to login';

    if (success) {
      const user = await fetchUser();
      if (user) {
        setLoading(false);
        window.location.href = '/game';
      }
    } else {
      message = 'Username/password incorrect';
    }

    // Unsuccessful
    setLoading(false);
    setPassword('');
    setError(message);
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
          <h1 className="auth-title">Login to Monix</h1>
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
              Already have an account? <a href="/auth/login">Login here</a>
            </span>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
