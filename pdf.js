const PDFDocument = require('pdfkit');
const path = require('path');
const shared = require('./public/shared/check');

const MICR_FONT = path.join(__dirname, 'public', 'fonts', 'GnuMICR.ttf');
const FONTS = {
  serif: 'Times-Roman', serifBold: 'Times-Bold', serifItalic: 'Times-Italic',
  serifBoldItalic: 'Times-BoldItalic', sans: 'Helvetica', sansBold: 'Helvetica-Bold', micr: MICR_FONT,
};
// Global calibration (points) for the printer; positive moves the print right / down.
const OFFSET_X = Number(process.env.CHECK_OFFSET_X || 0);
const OFFSET_Y = Number(process.env.CHECK_OFFSET_Y || 0);

function render(check) {
  const doc = new PDFDocument({ size: 'LETTER', margin: 0, info: { Title: `Check ${check.checkNumber}` } });
  const p = shared.toPrintable(check);
  const setFont = (it) => doc.font(FONTS[it.font]).fontSize(it.size);
  const measure = (t, it) => { setFont(it); return doc.widthOfString(t, { characterSpacing: it.spacing || 0 }); };

  for (let it of shared.items) {
    const dx = OFFSET_X, dy = OFFSET_Y;
    if (it.type === 'line') {
      doc.save().lineWidth(it.width).strokeColor('#222')
        .moveTo(it.x1 + dx, it.y1 + dy).lineTo(it.x2 + dx, it.y2 + dy).stroke().restore();
      continue;
    }
    if (it.type === 'bar') {
      doc.save().rect(it.x + dx, it.y + dy, it.w, it.h).fill('#8c8c8c').restore();
      doc.font(FONTS.sansBold).fontSize(11).fillColor('#fff')
        .text(it.text, it.x + dx, it.y + dy + (it.h - 11) / 2 + 1, { width: it.w, align: 'center', lineBreak: false })
        .fillColor('#000');
      continue;
    }
    let text = it.text !== undefined ? it.text : p[it.field];
    if (!text) continue;
    if (it.upper) text = text.toUpperCase();
    if (it.fill) { it = shared.fitWords(text, it, measure); text += shared.fillStars(text, it, measure); }
    setFont(it);
    const w = measure(text, it);
    let x = it.x;
    if (it.align === 'center') x -= w / 2;
    else if (it.align === 'right') x -= w;
    // PDFKit positions text by its top; subtract ascender to place the baseline at it.y.
    const top = it.y - doc._font.ascender / 1000 * it.size;
    doc.fillColor('#000').text(text, x + dx, top + dy, { lineBreak: false, characterSpacing: it.spacing || 0 });
  }
  doc.end();
  return doc;
}

module.exports = { render };
