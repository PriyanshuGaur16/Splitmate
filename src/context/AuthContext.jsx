import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import * as storage from '../data/storage.js'
import { isValidEmail } from '../utils/validation.js'

const AuthContext = createContext(null)

function isSameUser(a, b) {
  return a?.id === b?.id && a?.name === b?.name && a?.email === b?.email
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  // Turns a Supabase session into the app's user. Loads that user's data into
  // storage first, so nothing renders before the data it reads is available.
  const applySession = useCallback(async (session) => {
    const authUser = session?.user
    if (!authUser) {
      storage.clearData()
      setUser(null)
      return null
    }
    await storage.loadData(authUser.id)
    const email = authUser.email ?? ''
    const profile = storage.getUserById(authUser.id)
    const next = {
      id: authUser.id,
      name: profile?.name ?? authUser.user_metadata?.name?.trim() ?? email,
      email: profile?.email ?? email,
      createdAt: profile?.createdAt ?? authUser.created_at,
    }
    setUser((prev) => (isSameUser(prev, next) ? prev : next))
    return next
  }, [])

  // Restore the persisted session on load, then follow sign-in/out/refresh events.
  useEffect(() => {
    let active = true
    supabase.auth
      .getSession()
      .then(({ data }) => applySession(data.session))
      .catch((err) => console.error('Restoring the session failed:', err))
      .finally(() => {
        if (active) setReady(true)
      })
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      // Not awaited here: Supabase calls made inside this callback can deadlock.
      setTimeout(() => {
        if (active) applySession(session).catch((err) => console.error(err))
      }, 0)
    })
    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [applySession])

  // Each function resolves to { error } on failure and { user } on success.
  const login = useCallback(
    async (email, password) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (error) {
        // Wrong credentials come back as a 400; anything else is a real failure.
        if (error.status === 400) return { error: 'Invalid email or password.' }
        console.error('Sign-in failed:', error)
        return { error: error.message || 'Sign-in failed. Please try again.' }
      }
      try {
        return { user: await applySession(data.session) }
      } catch {
        return { error: 'Signed in, but loading your data failed. Please try again.' }
      }
    },
    [applySession],
  )

  const register = useCallback(
    async (name, email, password) => {
      if (!name.trim()) return { error: 'Please enter your name.' }
      if (!isValidEmail(email)) return { error: 'Please enter a valid email address.' }
      if (password.length < 6) return { error: 'Password must be at least 6 characters.' }
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { name: name.trim() } },
      })
      if (error) return { error: error.message }
      // With email confirmation on, signUp succeeds but returns no session.
      if (!data.session) {
        // An existing confirmed email comes back as a user with no identities.
        if (data.user?.identities?.length === 0) {
          return { error: 'An account with this email already exists.' }
        }
        return { error: 'Account created. Check your email to confirm it, then sign in.' }
      }
      try {
        return { user: await applySession(data.session) }
      } catch {
        return { error: 'Account created, but loading your data failed. Please sign in.' }
      }
    },
    [applySession],
  )

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    storage.clearData()
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, login, register, logout }), [user, login, register, logout])

  // Hold rendering until the stored session is known, so route guards don't
  // redirect a returning user to /login before it has been restored.
  if (!ready) return null

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}
