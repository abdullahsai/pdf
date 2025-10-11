import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { mergePdfFiles } from './pdfMerge'

async function createPdfWithWidths(...widths: number[]): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()

  widths.forEach((width, index) => {
    const page = pdfDoc.addPage([width, 500])
    page.drawText(`Page ${index + 1}`, {
      x: 50,
      y: 450,
      size: 24,
    })
  })

  return pdfDoc.save()
}

// Each "unit test" below checks a single behaviour of the merge function.
describe('mergePdfFiles', () => {
  it('merges PDFs and returns bytes with a larger page count', async () => {
    const pdfOne = await createPdfWithWidths(400)
    const pdfTwo = await createPdfWithWidths(380, 360)

    const merged = await mergePdfFiles([pdfOne, pdfTwo])
    const mergedDoc = await PDFDocument.load(merged)

    expect(merged.length).toBeGreaterThan(0)
    expect(mergedDoc.getPageCount()).toBe(3)
  })

  it('throws an error when fewer than two PDFs are provided', async () => {
    const singlePdf = await createPdfWithWidths(400)

    await expect(mergePdfFiles([singlePdf])).rejects.toThrow(
      'Please provide at least two PDFs to merge.',
    )
  })

  it('preserves the original order of PDF pages', async () => {
    const pdfA = await createPdfWithWidths(320)
    const pdfB = await createPdfWithWidths(450)

    const merged = await mergePdfFiles([pdfA, pdfB])
    const mergedDoc = await PDFDocument.load(merged)

    expect(mergedDoc.getPage(0).getWidth()).toBeCloseTo(320)
    expect(mergedDoc.getPage(1).getWidth()).toBeCloseTo(450)
  })
})
