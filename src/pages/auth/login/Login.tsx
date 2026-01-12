import '../Auth.css'
import monixLogo from '../../../assets/logo.svg'
import { AnimatedBackground, Button, Footer, Input } from '../../../components'
import { useState } from 'react'
import { fetchUser, login } from '../../../helpers/auth'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleUsernameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(event.target.value)
  }

  const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value)
  }

  const submitForm = async () => {
    if (!username || !password) {
      setError('Please fill all fields')
      return
    }

    setLoading(true)
    const success = await login(username, password)
    let message = 'Failed to login'

    if (success) {
      const user = await fetchUser()
      if (user) {
        setLoading(false)
        window.location.href = '/game'
      }
    } else {
      message = 'Username/password incorrect'
    }

    // Unsuccessful
    setLoading(false)
    setPassword('')
    setError(message)
  }

  return (
    <div className="auth-container">
      <AnimatedBackground />
      <div className="auth-island">
        <div className="island-header">
          <div className="logo-container">
            <img className="auth-logo" src={monixLogo} />
          </div>
          <h1 className="auth-title">Login to Monix</h1>
        </div>
        <div className="island-main">
          <div className="island-form">
            <Input label="Username" placeholder="U$3RN4M3" value={username} onChange={handleUsernameChange}></Input>
            <Input label="Password" error={error} isPassword placeholder="P4$$W0RD" value={password} onChange={handlePasswordChange}></Input>
            <Button onClick={submitForm} isLoading={loading}>Login!</Button>
          </div>

          <span className="auth-note">Already have an account? <a href="/auth/login">Login here</a></span>
        </div>
      </div>

      <Footer />
    </div>
  )
}
