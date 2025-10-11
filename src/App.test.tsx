import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import App from './App'

describe('App merge button state', () => {
  it('keeps the Merge button disabled until two PDFs are selected', () => {
    render(<App />)

    const mergeButton = screen.getByRole('button', { name: /merge/i })
    expect(mergeButton).toBeDisabled()

    const fileInput = screen.getByLabelText(/select pdf files/i) as HTMLInputElement

    const singleFile = new File(['dummy content'], 'first.pdf', { type: 'application/pdf' })
    const mockedFileList = {
      0: singleFile,
      length: 1,
      item: (index: number) => (index === 0 ? singleFile : null),
    } as unknown as FileList

    fireEvent.change(fileInput, {
      target: { files: mockedFileList },
    })

    expect(mergeButton).toBeDisabled()
  })
})
