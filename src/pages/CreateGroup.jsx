import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import * as storage from '../data/storage.js'
import FormField from '../components/FormField.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import { isValidEmail } from '../utils/validation.js'

export default function CreateGroup() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [emailInput, setEmailInput] = useState('')
  // Each entry: { email, name, pending }
  const [members, setMembers] = useState([])
  const [error, setError] = useState('')

  function addMember() {
    const email = storage.normalizeEmail(emailInput)
    if (!email) return
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.')
      return
    }
    if (email === user.email) {
      setError("You're already in the group.")
      return
    }
    if (members.some((m) => m.email === email)) {
      setError('That person is already on the list.')
      return
    }
    const existing = storage.getUserByEmail(email)
    setMembers([...members, { email, name: existing?.name ?? null, pending: !existing }])
    setEmailInput('')
    setError('')
  }

  function removeMember(email) {
    setMembers(members.filter((m) => m.email !== email))
  }

  function handleEmailKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addMember()
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Please give the group a name.')
      return
    }
    const group = storage.createGroup({
      name,
      creatorId: user.id,
      memberEmails: members.map((m) => m.email),
    })
    navigate(`/group/${group.id}`, { replace: true })
  }

  return (
    <div className="mx-auto max-w-lg">
      <Link to="/dashboard" className="text-sm text-slate-500 hover:text-slate-800">
        ← Back to dashboard
      </Link>
      <h1 className="mt-3 text-2xl font-bold text-slate-900">Create a group</h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-6 rounded-2xl border border-slate-200 bg-white p-6">
        <ErrorMessage>{error}</ErrorMessage>

        <FormField
          label="Group name"
          id="group-name"
          placeholder="e.g. Goa trip, Flat 4B"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div>
          <label htmlFor="member-email" className="block text-sm font-medium text-slate-700">
            Add members by email
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id="member-email"
              type="email"
              placeholder="friend@example.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              onKeyDown={handleEmailKeyDown}
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
            />
            <button
              type="button"
              onClick={addMember}
              className="shrink-0 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Add
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            People without an account are added as pending and join automatically when they register.
          </p>
        </div>

        <div>
          <p className="text-sm font-medium text-slate-700">Members ({members.length + 1})</p>
          <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
            <li className="flex items-center justify-between px-3 py-2 text-sm">
              <span>
                <span className="font-medium text-slate-900">{user.name}</span>{' '}
                <span className="text-slate-500">(you)</span>
              </span>
            </li>
            {members.map((m) => (
              <li key={m.email} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                <span className="min-w-0 truncate">
                  {m.name ? (
                    <>
                      <span className="font-medium text-slate-900">{m.name}</span>{' '}
                      <span className="text-slate-500">{m.email}</span>
                    </>
                  ) : (
                    <span className="text-slate-700">{m.email}</span>
                  )}
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  {m.pending && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      pending
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeMember(m.email)}
                    className="text-slate-400 hover:text-red-600"
                    aria-label={`Remove ${m.email}`}
                  >
                    ✕
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-emerald-600 py-2.5 font-semibold text-white hover:bg-emerald-700"
        >
          Create group
        </button>
      </form>
    </div>
  )
}
