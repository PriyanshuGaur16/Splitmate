import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import * as storage from '../data/storage.js'
import { isValidEmail } from '../utils/validation.js'

const AuthContext = createContext(null)

function loadSessionUser() {
  const userId = storage.getSessionUserId()
  return userId ? storage.getUserById(userId) : null
}

// Never expose the password to the rest of the app.
function toPublicUser(user) {
  if (!user) return null
  const { password: _password, ...rest } = user
  return rest
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => toPublicUser(loadSessionUser()))

  // Each function returns { error } on failure and { user } on success.
  const login = useCallback((email, password) => {
    const found = storage.getUserByEmail(email)
    if (!found || found.password !== password) {
      return { error: 'Invalid email or password.' }
    }
    storage.setSessionUserId(found.id)
    const publicUser = toPublicUser(found)
    setUser(publicUser)
    return { user: publicUser }
  }, [])

  const register = useCallback((name, email, password) => {
    if (!name.trim()) return { error: 'Please enter your name.' }
    if (!isValidEmail(email)) return { error: 'Please enter a valid email address.' }
    if (password.length < 6) return { error: 'Password must be at least 6 characters.' }
    if (storage.getUserByEmail(email)) {
      return { error: 'An account with this email already exists.' }
    }
    const created = storage.createUser({ name, email, password })
    storage.setSessionUserId(created.id)
    const publicUser = toPublicUser(created)
    setUser(publicUser)
    return { user: publicUser }
  }, [])

  const logout = useCallback(() => {
    storage.clearSession()
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, login, register, logout }), [user, login, register, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}
