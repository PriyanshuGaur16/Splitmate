import useDocumentTitle from '../hooks/useDocumentTitle.js'
import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import * as storage from '../data/storage.js'
import FormField from '../components/FormField.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'

export default function GroupSettings() {
  useDocumentTitle('Group Settings')
  const { id } = useParams()
  const { user } = useAuth()
  const [version, setVersion] = useState(0)
  const [name, setName] = useState(() => storage.getGroup(id)?.name ?? '')
  const [renameError, setRenameError] = useState('')
  const [renamed, setRenamed] = useState(false)
  const [memberError, setMemberError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [confirmingId, setConfirmingId] = useState(null)

  // version forces a re-read of storage after writes
  void version
  const group = storage.getGroup(id)
  if (!group || !storage.isGroupAdmin(id, user.id)) {
    return <Navigate to={`/group/${id}`} replace />
  }

  function handleRename(e) {
    e.preventDefault()
    setRenamed(false)
    try {
      storage.renameGroup(id, name)
      setName(name.trim())
      setRenameError('')
      setRenamed(true)
      setVersion((v) => v + 1)
    } catch (err) {
      setRenameError(err.message)
    }
  }

  async function handleRemove(member) {
    setMemberError('')
    setBusyId(member.id)
    const result = await storage.removeGroupMember(id, member.id, user.id)
    setBusyId(null)
    if (result.error) setMemberError(result.error)
    setVersion((v) => v + 1)
  }

  return (
    <div className="mx-auto max-w-lg">
      <Link to={`/group/${id}`} className="text-sm text-slate-500 hover:text-slate-800">
        ← Back to group
      </Link>
      <h1 className="mt-3 text-2xl font-bold text-slate-900">Group settings</h1>

      <form onSubmit={handleRename} className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">Rename group</h2>
        <ErrorMessage>{renameError}</ErrorMessage>
        <FormField
          label="Group name"
          id="group-name"
          required
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setRenamed(false)
          }}
        />
        <button
          type="submit"
          className="w-full rounded-lg bg-emerald-600 py-2.5 font-semibold text-white hover:bg-emerald-700"
        >
          Save name
        </button>
        {renamed && (
          <p role="status" className="text-sm text-emerald-700">
            Group renamed.
          </p>
        )}
      </form>

      <section className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">Members</h2>
        <ErrorMessage>{memberError}</ErrorMessage>
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {group.members.map((m) => {
            const isSelf = m.userId === user.id
            return (
              <li key={m.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                <span className="min-w-0 truncate">
                  <span className="font-medium text-slate-900">{m.name}</span>
                  {isSelf && <span className="text-slate-500"> (you)</span>}
                  {m.status === 'pending' && (
                    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      pending
                    </span>
                  )}
                </span>
                {!isSelf && confirmingId === m.id ? (
                  <span className="flex shrink-0 items-center gap-1 text-sm">
                    <button
                      type="button"
                      disabled={busyId === m.id}
                      onClick={() => {
                        setConfirmingId(null)
                        handleRemove(m)
                      }}
                      aria-label={`Confirm remove ${m.name}`}
                      className="rounded-md bg-red-600 px-2 py-1 font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      Remove
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingId(null)}
                      className="rounded-md px-2 py-1 text-slate-600 hover:bg-slate-100"
                    >
                      Keep
                    </button>
                  </span>
                ) : (
                  !isSelf && (
                    <button
                      type="button"
                      disabled={busyId === m.id}
                      onClick={() => setConfirmingId(m.id)}
                      aria-label={`Remove ${m.name}`}
                      className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  )
                )}
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
