import './App.css'
import { useState } from 'react'
import Landing from './pages/landing/Landing'
import Login from './pages/auth/login/Login'
import Register from './pages/auth/register/Register'
import Game from './pages/game/Game'
import { applyTheme, initThemeListener } from './helpers/theme'
import { loadSettings } from './helpers/settings'

function App() {
  const [currentPage, setCurrentPage] = useState(location.pathname);

  let content;
  switch (currentPage) {
    case '/':
      content = <Landing />
      break;
    case '/auth/login':
      content = <Login />
      break;
    case '/auth/register':
      content = <Register />
      break;
    case '/game':
      content = <Game />
      break;
    default:
      content = <Landing />
  }

  initThemeListener();
  applyTheme(loadSettings().theme);

  return (
    <div>
      {content}
    </div>
  );
}

export default App;
