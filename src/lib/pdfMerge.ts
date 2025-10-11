import { PDFDocument } from 'pdf-lib'

export type PdfBinary = Uint8Array | ArrayBuffer

/**
 * mergePdfFiles combines the provided PDF documents into a single document.
 * Everything happens in memory, so it is safe for “client-only” use.
 *
 * @param pdfs - Binary PDF contents (Uint8Array or ArrayBuffer) in the order selected by the user.
 * @returns A Uint8Array that represents the merged PDF document.
 * @throws If fewer than two files are provided, because merging needs at least two inputs.
 */
export async function mergePdfFiles(pdfs: PdfBinary[]): Promise<Uint8Array> {
  if (pdfs.length < 2) {
    throw new Error('Please provide at least two PDFs to merge.')
  }

  const mergedPdf = await PDFDocument.create()

  for (const pdfBytes of pdfs) {
    const loadedPdf = await PDFDocument.load(pdfBytes)
    const copiedPages = await mergedPdf.copyPages(loadedPdf, loadedPdf.getPageIndices())

    copiedPages.forEach((page) => {
      mergedPdf.addPage(page)
    })

    // Yield control so that large merges do not block the browser UI for too long.
    // A resolved promise lets the event loop breathe without changing functionality.
    // eslint-disable-next-line no-await-in-loop
    await Promise.resolve()
  }

  return mergedPdf.save()
}
