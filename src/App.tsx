import './App.css';
import { applyTheme, initThemeListener } from './helpers/theme';
import { loadSettings } from './helpers/settings';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Landing from './pages/landing/Landing';
import Login from './pages/auth/login/Login';
import Register from './pages/auth/register/Register';
import Game from './pages/game/Game';
import Success from './pages/payment/success/Success';
import Cancel from './pages/payment/cancel/Cancel';
import Staff from './pages/staff/Staff';
import { MusicProvider } from './providers/MusicProvider';

function App() {
  initThemeListener();
  applyTheme(loadSettings().theme);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/register" element={<Register />} />
        <Route
          path="/game"
          element={
            <MusicProvider>
              <Game />
            </MusicProvider>
          }
        />
        <Route path="/payment/success" element={<Success />} />
        <Route path="/payment/cancel" element={<Cancel />} />
        <Route path="/staff" element={<Staff />} />
        <Route path="*" element={<Landing />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
