import { PDFDocument } from 'pdf-lib'

export async function mergeThreePDFs(buffers) {
  if (!buffers || buffers.length !== 3) throw new Error('Expected three PDF buffers')
  const mergedPdf = await PDFDocument.create()
  for (const buf of buffers) {
    const srcPdf = await PDFDocument.load(buf)
    const copiedPages = await mergedPdf.copyPages(srcPdf, srcPdf.getPageIndices())
    copiedPages.forEach(p => mergedPdf.addPage(p))
  }
  const bytes = await mergedPdf.save()
  return bytes
}

export async function mergeAndDownload(buffers, filename = 'Merged_Fire_Safety_Report.pdf') {
  const bytes = await mergeThreePDFs(buffers)
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  URL.revokeObjectURL(url)
  a.remove()
  return blob
}
