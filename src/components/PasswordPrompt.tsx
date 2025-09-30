import { useState } from 'react'

interface PasswordPromptProps {
  open: boolean
  fileName: string
  message: string
  onSubmit: (password: string | null) => void
}

export function PasswordPrompt({ open, fileName, message, onSubmit }: PasswordPromptProps) {
  const [password, setPassword] = useState('')

  if (!open) return null

  return (
    <div className="modal">
      <div className="modal__backdrop" onClick={() => onSubmit(null)} />
      <div className="modal__content">
        <h3>Enter password</h3>
        <p>
          {message} <strong>{fileName}</strong>
        </p>
        <input
          type="password"
          placeholder="PDF password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <div className="modal__actions">
          <button type="button" className="secondary" onClick={() => onSubmit(null)}>
            Cancel
          </button>
          <button
            type="button"
            className="primary"
            onClick={() => {
              onSubmit(password)
              setPassword('')
            }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}
