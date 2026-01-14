import './App.css';
import Landing from './pages/landing/Landing';
import Login from './pages/auth/login/Login';
import Register from './pages/auth/register/Register';
import Game from './pages/game/Game';
import { applyTheme, initThemeListener } from './helpers/theme';
import { loadSettings } from './helpers/settings';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';

function App() {
  initThemeListener();
  applyTheme(loadSettings().theme);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/register" element={<Register />} />
        <Route path="/game" element={<Game />} />
      </Routes>
    </Router>
  );
}

export default App;
