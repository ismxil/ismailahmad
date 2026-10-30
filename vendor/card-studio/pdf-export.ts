import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from 'pdf-lib'
import { CARD, tiers, cardGuides, exportCard, type CardState } from './cards'

const mm = (value: number) => value * 72 / 25.4
const pageWidth = mm(297), pageHeight = mm(210)
const ink = rgb(.12, .13, .15), muted = rgb(.43, .45, .48), blue = rgb(.05, .48, .85)
const top = (y: number) => pageHeight - mm(y)

export async function exportTemplatePDF(state: CardState, surface: HTMLCanvasElement): Promise<Blob> {
  // Freeze once before awaiting assets so front and back share the same shader frame.
  const frozen = document.createElement('canvas')
  frozen.width = surface.width; frozen.height = surface.height
  frozen.getContext('2d')!.drawImage(surface, 0, 0)
  const front = { ...state, back: false }, back = { ...state, back: true }
  const [frontBlob, backBlob] = await Promise.all([exportCard(front, frozen), exportCard(back, frozen)])
  const pdf = await PDFDocument.create()
  const tier = tiers[state.tier]
  pdf.setTitle(`Sterling ${tier.category} - ${tier.name} card templates`)
  pdf.setAuthor('Sterling Card Studio')
  pdf.setSubject('Front and back card templates with physical layout guides')
  pdf.setCreator('Sterling Card Studio')
  const [font, bold, frontImage, backImage] = await Promise.all([
    pdf.embedFont(StandardFonts.Helvetica), pdf.embedFont(StandardFonts.HelveticaBold),
    frontBlob.arrayBuffer().then(bytes => pdf.embedPng(bytes)),
    backBlob.arrayBuffer().then(bytes => pdf.embedPng(bytes)),
  ])
  const text = (page: PDFPage, value: string, x: number, y: number, size = 9, face: PDFFont = font, color = ink) =>
    page.drawText(value, { x: mm(x), y: top(y), size, font: face, color })
  function header(page: PDFPage, title: string, subtitle: string, index: number) {
    text(page, 'Sterling / Card Studio', 18, 16, 9, bold, muted)
    text(page, title, 18, 30, 23, bold)
    text(page, subtitle, 18, 38, 9, font, muted)
    page.drawLine({ start: { x: mm(18), y: top(46) }, end: { x: mm(279), y: top(46) }, thickness: .5, color: rgb(.86, .87, .88) })
    text(page, `${tier.category} / ${tier.name} / ${state.network} / ${state.currency} / ${state.type}`, 18, 196, 8, font, muted)
    const number = `${index} / 2`
    page.drawText(number, { x: mm(279) - font.widthOfTextAtSize(number, 8), y: top(196), size: 8, font, color: muted })
  }
  const clean = pdf.addPage([pageWidth, pageHeight])
  header(clean, `${tier.name} card templates`, 'Front and back at actual size. Print this page at 100% with scaling disabled.', 1)
  const xPositions = [53.9, 157.5], cardTop = 72
  for (const [i, image] of [frontImage, backImage].entries()) {
    text(clean, i === 0 ? 'Front' : 'Back', xPositions[i], cardTop - 6, 11, bold)
    clean.drawImage(image, { x: mm(xPositions[i]), y: top(cardTop + CARD.height), width: mm(CARD.width), height: mm(CARD.height) })
    text(clean, '85.60 x 53.98 mm', xPositions[i], cardTop + CARD.height + 7, 8, font, muted)
  }
  text(clean, 'Card format', 53.9, 156, 10, bold)
  text(clean, 'CR80 / 85.60 x 53.98 mm / 3.18 mm corner radius', 53.9, 163, 9, font, muted)
  text(clean, `${state.finish} finish / ${tier.category==='Kids'?(state.kidsShapes.length?'Flat shapes':'Solid color'):state.pattern+' surface'}`, 53.9, 170, 9, font, muted)

  const guidePage = pdf.addPage([pageWidth, pageHeight])
  header(guidePage, 'Layout guide', 'Enlarged front and back with the blue placement guides. This page is not actual size.', 2)
  const width = 122, height = width / CARD.width * CARD.height, y = 66
  const guideScale = width / CARD.width
  for (const [i, view] of [front, back].entries()) {
    const x = i === 0 ? 18 : 157
    text(guidePage, i === 0 ? 'Front / placement' : 'Back / alignment', x, y - 6, 11, bold)
    guidePage.drawImage(i === 0 ? frontImage : backImage, { x: mm(x), y: top(y + height), width: mm(width), height: mm(height) })
    // Vector lines and labels remain sharp independently of the embedded card artwork.
    for (const guide of cardGuides(view)) {
      const gx = mm(x + guide.x * guideScale), gy = top(y + (guide.y + guide.height) * guideScale)
      const gw = mm(guide.width * guideScale), gh = mm(guide.height * guideScale)
      guidePage.drawRectangle({ x: gx, y: gy, width: gw, height: gh, borderWidth: .5, borderColor: blue, borderDashArray: [2, 1.6] })
      const label = guide.label.replaceAll('·', '/')
      // Keep annotation labels above their boxes so artwork and account details stay readable.
      const labelSize = guide.kind === 'exclusion' ? 4.5 : 5.5
      const labelWidth = font.widthOfTextAtSize(label, labelSize) + 4
      let labelX = gx + 2, labelY = gy + gh + 2
      if (guide.id === 'safe-inset') labelY = top(y) + mm(1.5)
      if (guide.kind === 'clearance') { labelX = gx + gw - labelWidth; labelY = gy + gh + 2 }
      if (guide.kind === 'exclusion') labelY = gy - labelSize - 3
      guidePage.drawRectangle({ x: labelX - 1, y: labelY - 1, width: labelWidth, height: labelSize + 3, color: rgb(.025, .14, .24), opacity: .96 })
      guidePage.drawText(label, { x: labelX + 1, y: labelY, size: labelSize, font, color: rgb(.67, .86, 1) })
    }
  }
  const legendY = 159
  text(guidePage, 'Guide key', 18, legendY, 10, bold)
  text(guidePage, 'Blue dashed outlines show the current element positions and clearance zones.', 18, legendY + 7, 9, font, muted)
  text(guidePage, 'Inset reference: 3 mm. Back contactless: 4.5 mm high with 2 mm clear space.', 18, legendY + 14, 9, font, muted)
  text(guidePage, 'Back: keep security artwork outside the mirrored chip exclusion area.', 18, legendY + 21, 9, font, muted)
  const bytes = await pdf.save()
  return new Blob([new Uint8Array(bytes)], { type: 'application/pdf' })
}
