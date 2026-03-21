import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Signup() {
  const { register } = useAuth()
  
  // Clear old tokens on signup page load
  useEffect(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('token');
    sessionStorage.clear();
  }, []);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'USER'
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [passwordStrength, setPasswordStrength] = useState(0)
  const navigate = useNavigate()

  const getPasswordStrength = (password) => {
    let strength = 0
    if (password.length >= 8) strength++
    if (password.length >= 12) strength++
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++
    if (/\d/.test(password)) strength++
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++
    return strength
  }

  const handlePasswordChange = (password) => {
    setFormData(prev => ({ ...prev, password }))
    setPasswordStrength(getPasswordStrength(password))
  }

  const getPasswordStrengthText = () => {
    if (passwordStrength <= 2) return { text: 'Weak', color: 'text-red-400' }
    if (passwordStrength <= 3) return { text: 'Medium', color: 'text-yellow-400' }
    return { text: 'Strong', color: 'text-green-400' }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await register(formData.name, formData.email, formData.password, formData.role);
      navigate('/community');
    } catch (err) {
      setError(
        err.response?.data?.message || 
        'Registration failed. Try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  const strength = getPasswordStrengthText()

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-4 py-8">
      {/* Background gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="gradient-orb top-20 left-20"></div>
        <div className="gradient-orb bottom-20 right-20"></div>
        <div className="gradient-orb top-1/2 left-1/2"></div>
      </div>

      {/* Signup Card */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[var(--accent-blue)] to-purple-500 rounded-2xl mb-4">
            <span className="text-white font-bold text-2xl">DM</span>
          </div>
          <h1 className="font-heading font-extrabold text-3xl text-white mb-2">Join DevMentor</h1>
          <p className="text-[var(--text-secondary)]">Start your learning journey today</p>
        </div>

        {/* Signup Form */}
        <div className="card border border-[var(--border)] p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Display */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Full Name Input */}
            <div>
              <label className="block text-[var(--text-primary)] text-sm font-medium mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-xl p-4 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-blue)] focus:ring-2 focus:ring-[rgba(59,130,246,0.1)] transition-all duration-200"
                placeholder="Enter your full name"
                required
                disabled={loading}
              />
            </div>

            {/* Email Input */}
            <div>
              <label className="block text-[var(--text-primary)] text-sm font-medium mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-xl p-4 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-blue)] focus:ring-2 focus:ring-[rgba(59,130,246,0.1)] transition-all duration-200"
                placeholder="Enter your email"
                required
                disabled={loading}
              />
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-[var(--text-primary)] text-sm font-medium mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  className="w-full bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-xl p-4 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-blue)] focus:ring-2 focus:ring-[rgba(59,130,246,0.1)] transition-all duration-200 pr-12"
                  placeholder="Create a strong password"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  disabled={loading}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8"></path>
                      <path d="M1 1l22 22"></path>
                    </svg>
                  )}
                </button>
              </div>
              
              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[var(--text-muted)]">Password strength</span>
                    <span className={`text-xs ${strength.color}`}>{strength.text}</span>
                  </div>
                  <div className="w-full bg-[var(--bg-secondary)] rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        passwordStrength <= 2 ? 'bg-red-500' : 
                        passwordStrength <= 3 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${(passwordStrength / 5) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password Input */}
            <div>
              <label className="block text-[var(--text-primary)] text-sm font-medium mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-xl p-4 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-blue)] focus:ring-2 focus:ring-[rgba(59,130,246,0.1)] transition-all duration-200 pr-12"
                  placeholder="Confirm your password"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  disabled={loading}
                >
                  {showConfirmPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8"></path>
                      <path d="M1 1l22 22"></path>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-[var(--text-primary)] text-sm font-medium mb-3">
                I am a...
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, role: 'USER' }))}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                    formData.role === 'USER'
                      ? 'border-[var(--accent-blue)] bg-[rgba(59,130,246,0.1)]'
                      : 'border-[var(--border-light)] hover:border-[var(--border)]'
                  }`}
                  disabled={loading}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-1">🎓</div>
                    <div className="text-[var(--text-primary)] font-medium">Learner</div>
                    <div className="text-xs text-[var(--text-muted)]">I want to learn</div>
                  </div>
                </button>
                
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, role: 'MENTOR' }))}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                    formData.role === 'MENTOR'
                      ? 'border-[var(--accent-blue)] bg-[rgba(59,130,246,0.1)]'
                      : 'border-[var(--border-light)] hover:border-[var(--border)]'
                  }`}
                  disabled={loading}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-1">👨‍🏫</div>
                    <div className="text-[var(--text-primary)] font-medium">Mentor</div>
                    <div className="text-xs text-[var(--text-muted)]">I want to teach</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Terms Checkbox */}
            <div className="flex items-start">
              <input
                type="checkbox"
                id="terms"
                className="w-4 h-4 text-[var(--accent-blue)] bg-[var(--bg-secondary)] border-[var(--border-light)] rounded focus:ring-[var(--accent-blue)] focus:ring-2 mt-1"
                required
                disabled={loading}
              />
              <label htmlFor="terms" className="ml-2 text-sm text-[var(--text-secondary)]">
                I agree to the{' '}
                <a href="#" className="text-[var(--accent-blue)] hover:underline">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" className="text-[var(--accent-blue)] hover:underline">
                  Privacy Policy
                </a>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full btn-gradient py-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              disabled={
                loading || 
                !formData.name.trim() || 
                !formData.email.trim() || 
                !formData.password || 
                !formData.confirmPassword ||
                formData.password !== formData.confirmPassword
              }
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--border-light)]"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-[var(--bg-card)] text-[var(--text-muted)]">or continue with</span>
            </div>
          </div>

          {/* Google OAuth Button */}
          <button
            className="w-full flex items-center justify-center gap-3 py-3 border border-[var(--border-light)] rounded-xl text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-all duration-200"
            disabled={loading}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
        </div>

        {/* Sign In Link */}
        <div className="text-center mt-6">
          <p className="text-[var(--text-secondary)]">
            Already have an account?{' '}
            <Link to="/login" className="text-[var(--accent-blue)] hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
