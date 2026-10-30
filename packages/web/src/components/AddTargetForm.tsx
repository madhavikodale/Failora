import { useState } from 'react'

interface AddTargetFormProps {
  onSubmit: (data: { name: string; url: string; method: string }) => Promise<void>
}

function AddTargetForm({ onSubmit }: AddTargetFormProps) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [method, setMethod] = useState('GET')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !url.trim()) return
    setSubmitting(true)
    setError(null)
    setSuccess(false)
    try {
      await onSubmit({ name: name.trim(), url: url.trim(), method })
      setName('')
      setUrl('')
      setMethod('GET')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create target')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="form-row">
        <label htmlFor="target-name">Name</label>
        <input
          id="target-name"
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="My API"
          required
        />
      </div>
      <div className="form-row">
        <label htmlFor="target-url">URL</label>
        <input
          id="target-url"
          type="url"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="http://127.0.0.1:4100/respond"
          required
        />
      </div>
      <div className="form-row">
        <label htmlFor="target-method">Method</label>
        <select id="target-method" value={method} onChange={e => setMethod(e.target.value)}>
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
        </select>
      </div>
      {error && <div className="form-error">{error}</div>}
      {success && <div className="form-success">Target created!</div>}
      <button type="submit" disabled={submitting}>
        {submitting ? 'Adding…' : 'Add Target'}
      </button>
    </form>
  )
}

export default AddTargetForm
