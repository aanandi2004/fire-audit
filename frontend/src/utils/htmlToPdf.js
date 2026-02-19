import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export async function htmlToPdfBuffer(html) {
  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.left = '-10000px'
  container.style.top = '-10000px'
  container.style.width = '210mm'
  container.style.minHeight = '297mm'
  container.style.background = '#ffffff'
  container.innerHTML = html
  document.body.appendChild(container)

  const pages = container.querySelectorAll('.page, .page-container')
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  const mmWidth = 210
  const mmHeight = 297
  let first = true
  for (const page of pages.length ? pages : [container]) {
    const canvas = await html2canvas(page, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
    const imgData = canvas.toDataURL('image/jpeg', 1.0)
    const pxWidth = canvas.width
    const pxHeight = canvas.height
    const aspect = pxHeight / pxWidth
    const targetWidth = mmWidth
    const targetHeight = Math.min(mmHeight, targetWidth * aspect)
    if (!first) pdf.addPage('a4')
    pdf.addImage(imgData, 'JPEG', 0, 0, targetWidth, targetHeight)
    first = false
  }
  document.body.removeChild(container)
  return pdf.output('arraybuffer')
}
