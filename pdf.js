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
// The check stock already has the endorsement area printed on the back, so skip the back page.
// Set CHECK_BACK_IS_PREPRINTED=false to print it ourselves.
const BACK_IS_PREPRINTED = process.env.CHECK_BACK_IS_PREPRINTED !== 'false';

// Back side (Check 21 / ANSI X9.100-111 endorsement area). The back page uses the same origin as
// the front, so the check zone is the top of the page. The endorsement block is laid out in its
// own frame (u along the lines, v down from the top of the block) and rotated 90deg counter-clockwise
// into the left strip of the check zone: it reads bottom-to-top, its bottom is the left strip's
// right edge at 1.5in, and everything to the right of that rule stays blank.
const BACK_LEFT = 40;
const ZONE_H = 253; // check zone height: the front's first perforation
const BLOCK_LEN = 240; // length of the endorsement lines
const ENDORSE_ZONE = 1.5 * 72; // 108pt
const ENDORSE_LINES_Y = [34, 60, 86];
const BACK_LEGEND = 'DO NOT WRITE, STAMP OR SIGN BELOW THIS LINE';

function renderBack(doc) {
  doc.addPage({ size: 'LETTER', margin: 0 });
  doc.save();
  // Local (u, v) maps to the page at (BACK_LEFT + v, ZONE_H - u).
  doc.translate(BACK_LEFT + OFFSET_X, ZONE_H + OFFSET_Y).rotate(-90);
  doc.font(FONTS.sans).fontSize(7).fillColor('#000').text('ENDORSE HERE', 0, 14, { lineBreak: false });
  doc.lineWidth(0.8).strokeColor('#222');
  for (const v of ENDORSE_LINES_Y) doc.moveTo(0, v).lineTo(BLOCK_LEN, v).stroke();
  doc.lineWidth(0.5).moveTo(0, ENDORSE_ZONE).lineTo(BLOCK_LEN, ENDORSE_ZONE).stroke();
  // Legend sits just inside the rule so nothing is printed beyond the 1.5in mark.
  doc.font(FONTS.sans).fontSize(8).fillColor('#000').text(BACK_LEGEND, 0, ENDORSE_ZONE - 11, { lineBreak: false });
  doc.restore();
}

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
  if (!BACK_IS_PREPRINTED) renderBack(doc);
  doc.end();
  return doc;
}

module.exports = { render };
