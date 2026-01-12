import './App.css'
import { useState } from 'react'
import Landing from './pages/landing/Landing'
import Login from './pages/auth/login/Login'
import Register from './pages/auth/register/Register'
import Game from './pages/game/Game'

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

  return (
    <div>
      {content}
    </div>
  );
}

export default App;
