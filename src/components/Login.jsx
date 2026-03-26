import { useState } from 'react'
import { Lock, AlertTriangle, Eye, EyeOff } from 'lucide-react'
import Logo from './Logo'

export default function Login({ onLogin, error, locked, remaining }) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (locked || !password) return
    setLoading(true)
    await onLogin(password)
    setLoading(false)
    setPassword('')
  }

  return (
    <div className="min-h-screen bg-bg-tertiary flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-bg-primary border border-border mb-4 shadow-lg shadow-shadow overflow-hidden">
            <Logo size={40} />
          </div>
          <h1 className="text-2xl font-brand font-semibold text-text-primary tracking-tight">wede</h1>
          <p className="text-text-muted mt-1 text-sm">Web Development Environment</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-bg-primary border border-border rounded-xl p-6 shadow-xl shadow-shadow">
          {locked ? (
            <div className="flex flex-col items-center py-4 text-center">
              <AlertTriangle className="w-12 h-12 text-red mb-3" />
              <h2 className="text-lg font-medium text-red">Locked Out</h2>
              <p className="text-text-muted text-sm mt-2">
                Too many failed attempts.<br />Restart the server to unlock.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <label className="block text-text-secondary text-sm mb-2 font-medium">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-bg-input border border-border rounded-lg pl-10 pr-10 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
                    placeholder="Enter password"
                    autoFocus
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red/10 border border-red/20 rounded-lg text-red text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !password}
                className="w-full bg-accent hover:bg-accent-hover text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>

              <div className="mt-3 text-center">
                <span className="text-text-muted text-xs">{remaining} attempt{remaining !== 1 ? 's' : ''} remaining</span>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  )
}
