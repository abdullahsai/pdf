import { useState, type ChangeEventHandler } from 'react'
import { mergePdfFiles } from './lib/pdfMerge'

// “Client-only” means the browser does all the work locally with no server involved.

type MergeStatus = 'idle' | 'merging' | 'success' | 'error'

function App() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [status, setStatus] = useState<MergeStatus>('idle')
  const [message, setMessage] = useState<string>('')

  const hasEnoughFiles = selectedFiles.length >= 2
  const isMerging = status === 'merging'

  const handleFileSelection: ChangeEventHandler<HTMLInputElement> = (
    event,
  ) => {
    const incomingFiles = event.target.files ? Array.from(event.target.files) : []
    setSelectedFiles(incomingFiles)
    setStatus('idle')
    setMessage('')
  }

  const handleMerge = async () => {
    if (!hasEnoughFiles || isMerging) {
      return
    }

    setStatus('merging')
    setMessage(
      'Merging… please wait. Large files may take a moment because this client-only tool keeps everything inside your browser tab.',
    )

    try {
      const pdfBuffers = await Promise.all(
        selectedFiles.map(async (file) => new Uint8Array(await file.arrayBuffer())),
      )

      const mergedBytes = await mergePdfFiles(pdfBuffers)
      // Copy into a fresh buffer so browsers only receive the exact PDF bytes.
      const mergedBuffer = mergedBytes.slice().buffer
      const mergedBlob = new Blob([mergedBuffer], { type: 'application/pdf' })
      const downloadUrl = URL.createObjectURL(mergedBlob)

      const anchor = document.createElement('a')
      anchor.href = downloadUrl
      anchor.download = 'merged.pdf'
      anchor.click()
      URL.revokeObjectURL(downloadUrl)

      setStatus('success')
      setMessage('Success! Your merged.pdf download should begin shortly.')
    } catch (error) {
      console.error(error)
      setStatus('error')
      setMessage(
        error instanceof Error
          ? error.message
          : 'Something went wrong while merging the PDFs.',
      )
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <main className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-lg">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-brand">PDF Tools (Local-Only)</h1>
          <p className="mt-2 text-sm text-slate-600">
            “Client-only” means every step happens in your own browser. Your PDFs never
            leave your computer.
          </p>
        </header>

        <section aria-labelledby="merge-title">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 id="merge-title" className="text-2xl font-semibold text-slate-800">
                Merge PDFs (Stage 1)
              </h2>
              <p className="text-sm text-slate-600">
                Pick two or more PDF files in the order you want. We will join them into a
                single document.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="pdf-input"
                className="block text-sm font-medium text-slate-700"
              >
                Select PDF files
              </label>
              <input
                id="pdf-input"
                name="pdf-input"
                type="file"
                accept="application/pdf"
                multiple
                onChange={handleFileSelection}
                className="mt-2 w-full cursor-pointer rounded border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-700 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
              />
              <p className="mt-2 text-xs text-slate-500">
                Tip: hold Ctrl (or Cmd on Mac) to pick multiple files at once.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-700">Selected order</h3>
              {selectedFiles.length === 0 ? (
                <p className="mt-2 rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  No files selected yet. Choose at least two PDFs to enable merging.
                </p>
              ) : (
                <ol className="mt-2 space-y-2" aria-live="polite">
                  {selectedFiles.map((file, index) => (
                    <li
                      key={`${file.name}-${index}`}
                      className="flex items-start justify-between rounded border border-slate-200 bg-white p-3 text-sm"
                    >
                      <span className="font-medium text-slate-700">
                        {index + 1}. {file.name}
                      </span>
                      <span className="text-xs text-slate-500">
                        {(file.size / 1024).toFixed(1)} KB
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={handleMerge}
                disabled={!hasEnoughFiles || isMerging}
                className="inline-flex items-center justify-center rounded-md bg-brand px-5 py-2 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:bg-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
              >
                {isMerging ? 'Merging…' : 'Merge'}
              </button>
              <p className="text-xs text-slate-600">
                The button stays disabled until at least two PDFs are ready.
              </p>
            </div>

            <p
              role="status"
              aria-live="polite"
              className={`min-h-[1.5rem] text-sm ${
                status === 'error' ? 'text-red-600' : 'text-slate-600'
              }`}
            >
              {message}
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
