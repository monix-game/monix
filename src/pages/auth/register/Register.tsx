import '../Auth.css'
import monixLogo from '../../../assets/logo.svg'
import { AnimatedBackground, Button, Footer, Input } from '../../../components'
import { useState } from 'react'
import { register } from '../../../helpers/auth'

export default function Register() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleUsernameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(event.target.value)
  }

  const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value)
  }

  const handlePassword2Change = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPassword2(event.target.value)
  }

  const submitForm = async () => {
    if (!username || !password || !password2) {
      setError('Please fill all fields')
      return
    }
    if (password !== password2) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    const success = await register(username, password)
    setLoading(false)

    if (success) {
      window.location.href = '/auth/login'
    } else {
      setPassword('')
      setPassword2('')
      setError('Failed to register')
    }
  }

  return (
    <div className="auth-container">
      <AnimatedBackground />
      <div className="auth-island">
        <div className="island-header">
          <div className="logo-container">
            <img className="auth-logo" src={monixLogo} />
          </div>
          <h1 className="auth-title">Register for Monix</h1>
        </div>
        <div className="island-main">
          <div className="island-form">
            <Input label="Username" placeholder="U$3RN4M3" onChange={handleUsernameChange} value={username}></Input>
            <Input label="Password" isPassword placeholder="P4$$W0RD" onChange={handlePasswordChange} value={password}></Input>
            <Input label="Repeat Password" isPassword error={error} onChange={handlePassword2Change} placeholder="R3P34T P4$$W0RD" value={password2}></Input>
            <Button onClick={submitForm} isLoading={loading}>Register!</Button>
          </div>

          <span className="auth-note">Already have an account? <a href="/auth/login">Login here</a></span>
        </div>
      </div>

      <Footer />
    </div>
  )
}
