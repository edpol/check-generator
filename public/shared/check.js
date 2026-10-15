// Shared by the browser preview and the server-side PDF so both stay identical.
// All coordinates are PDF points (1/72 in) measured from the top-left of the page.
(function (root) {
  // Coordinates were measured from the sample photo (IMG_1323.jpeg, 2000px wide = 8.5in).
  const PX = 72 / 235.3;
  const ORIGIN_X = 20; // paper left edge in the photo
  const ORIGIN_Y = 35; // paper top edge in the photo
  const X = (px) => +((px - ORIGIN_X) * PX).toFixed(2);
  const Y = (px) => +((px - ORIGIN_Y) * PX).toFixed(2);

  const PAYEE = { name: 'MDR FITNESS CORP', line1: '14101 NW 4TH STREET', line2: 'SUNRISE, FL 33325' };
  const STAR_END_X = X(1640); // keep clear of the "Dollars" label

  // font: serif | serifBold | serifItalic | serifBoldItalic | sans | sansBold | micr
  // field: key of the check data; text: literal. Static items are labels printed by us because
  // the blank stock only carries the green background.
  const items = [
    { field: 'payerName', font: 'serifBold', size: 12, x: X(452), y: Y(140), align: 'center', upper: true },
    { field: 'payerAddress1', font: 'serif', size: 10, x: X(452), y: Y(176), align: 'center', upper: true },
    { field: 'payerAddress2', font: 'serif', size: 10, x: X(452), y: Y(205), align: 'center', upper: true },
    { field: 'bankName', font: 'serifBold', size: 9, x: X(1054), y: Y(124), align: 'center', upper: true },
    { field: 'checkNumber', font: 'serif', size: 15, x: X(1870), y: Y(138), align: 'right', spacing: 2 },
    { type: 'line', x1: X(1328), x2: X(1458), y1: Y(203), y2: Y(203), width: 0.8 },

    { type: 'bar', x: X(913), y: Y(255), w: 250 * PX, h: 36 * PX, text: 'REFERENCE' },
    { type: 'bar', x: X(1168), y: Y(255), w: 169 * PX, h: 36 * PX, text: 'DATE' },
    { type: 'bar', x: X(1342), y: Y(255), w: 222 * PX, h: 36 * PX, text: 'CHECK NO.' },
    { type: 'bar', x: X(1570), y: Y(255), w: 336 * PX, h: 36 * PX, text: 'AMOUNT' },
    { field: 'reference', font: 'serif', size: 12, x: X(1043), y: Y(333), align: 'center' },
    { field: 'dateText', font: 'serif', size: 12, x: X(1258), y: Y(333), align: 'center' },
    { field: 'checkNumber', font: 'serif', size: 12, x: X(1453), y: Y(333), align: 'center' },
    { field: 'amountBox', font: 'serif', size: 12, x: X(1740), y: Y(331), align: 'center' },

    { text: 'PAY', font: 'sansBold', size: 11, x: X(88), y: Y(416), align: 'left' },
    { field: 'amountWords', font: 'serifBoldItalic', size: 12, x: X(200), y: Y(424), align: 'left', fill: true },
    { text: 'Dollars', font: 'sans', size: 11, x: X(1750), y: Y(408), align: 'left' },

    { text: 'TO THE', font: 'sansBold', size: 11, x: X(85), y: Y(488), align: 'left' },
    { text: 'ORDER', font: 'sansBold', size: 11, x: X(85), y: Y(525), align: 'left' },
    { text: 'OF', font: 'sansBold', size: 11, x: X(85), y: Y(562), align: 'left' },
    { text: PAYEE.name, font: 'serif', size: 13, x: X(258), y: Y(510), align: 'left' },
    { text: PAYEE.line1, font: 'serif', size: 13, x: X(258), y: Y(557), align: 'left' },
    { text: PAYEE.line2, font: 'serif', size: 13, x: X(258), y: Y(600), align: 'left' },

    { text: 'MEMO', font: 'sans', size: 9, x: X(97), y: Y(684), align: 'left' },
    { field: 'memo', font: 'serifItalic', size: 10, x: X(250), y: Y(694), align: 'left' },
    { type: 'line', x1: X(248), x2: X(985), y1: Y(702), y2: Y(702), width: 0.8 },

    { text: 'SIGNATURE NOT REQUIRED', font: 'sans', size: 8, x: X(1268), y: Y(600), align: 'left' },
    { text: 'Your depositor has authorized this payment to payee.', font: 'sans', size: 7, x: X(1268), y: Y(626), align: 'left' },
    { text: 'Payee to hold you harmless for payment of this document.', font: 'sans', size: 7, x: X(1268), y: Y(649), align: 'left' },
    { text: 'This document shall be deposited only to the credit of payee.', font: 'sans', size: 7, x: X(1268), y: Y(673), align: 'left' },
    { type: 'line', x1: X(1190), x2: X(1882), y1: Y(691), y2: Y(691), width: 0.8 },

    { field: 'micr', font: 'micr', size: 12, x: X(678), y: Y(772), align: 'left' },
  ];

  const ONES = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN',
    'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
  const TENS = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];

  function below1000(n) {
    const out = [];
    if (n >= 100) { out.push(ONES[Math.floor(n / 100)], 'HUNDRED'); n %= 100; }
    if (n >= 20) { out.push(TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '')); }
    else if (n > 0) out.push(ONES[n]);
    return out.join(' ');
  }

  // amountCents: integer. Returns e.g. "THIRTY-SIX AND 90/100".
  function amountToWords(amountCents) {
    const dollars = Math.floor(amountCents / 100);
    const cents = amountCents % 100;
    let words;
    if (dollars === 0) words = 'ZERO';
    else {
      const parts = [];
      for (const [size, name] of [[1e9, 'BILLION'], [1e6, 'MILLION'], [1e3, 'THOUSAND']]) {
        if (dollars >= size) parts.push(below1000(Math.floor(dollars / size) % 1000) + ' ' + name);
      }
      if (dollars % 1000) parts.push(below1000(dollars % 1000));
      words = parts.join(' ');
    }
    return words + ' AND ' + String(cents).padStart(2, '0') + '/100';
  }

  // "36.90" / "$1,234.5" -> 3690 cents, or null if invalid.
  function parseAmountCents(s) {
    const m = /^\$?\s*(\d{1,9}(?:,\d{3})*|\d+)?(?:\.(\d{1,2}))?$/.exec(String(s).trim());
    if (!m || (m[1] === undefined && m[2] === undefined)) return null;
    const dollars = Number((m[1] || '0').replace(/,/g, ''));
    const cents = Number((m[2] || '0').padEnd(2, '0'));
    return dollars * 100 + cents;
  }

  function formatCents(c) {
    return Math.floor(c / 100).toLocaleString('en-US') + '.' + String(c % 100).padStart(2, '0');
  }

  // GnuMICR: A = transit, B = amount, C = on-us, D = dash. Layout follows the sample check:
  // transit routing transit, account on-us, check number.
  function micrLine(routing, account, checkNumber) {
    return 'A' + routing + 'A' + account + 'C' + checkNumber;
  }

  // "2026-07-23" -> "7/23/2026"
  function dateText(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    return m ? `${+m[2]}/${+m[3]}/${m[1]}` : '';
  }

  // Turn a stored/entered check into the strings that get printed.
  function toPrintable(c) {
    const cents = c.amountCents;
    return {
      payerName: c.payerName, payerAddress1: c.payerAddress1, payerAddress2: c.payerAddress2 || '',
      bankName: c.bankName, checkNumber: String(c.checkNumber), reference: c.reference || '',
      dateText: dateText(c.date), amountBox: '**' + formatCents(cents),
      amountWords: amountToWords(cents), memo: c.memo || '',
      micr: micrLine(c.routing, c.account, c.checkNumber),
    };
  }

  // Shrink the amount-in-words font (down to 7pt) when long amounts would run into "Dollars".
  function fitWords(words, item, measure) {
    let size = item.size;
    while (size > 7 && measure(words, Object.assign({}, item, { size })) > STAR_END_X - item.x) size -= 0.5;
    return Object.assign({}, item, { size });
  }

  // Asterisk run that fills from the end of the words to the "Dollars" label.
  // measure(text, item) -> width in points.
  function fillStars(words, item, measure) {
    const used = measure(words, item);
    const unit = measure('* ', item);
    const n = Math.max(0, Math.floor((STAR_END_X - item.x - used) / unit));
    return '* '.repeat(n).trimEnd();
  }

  const api = { items, PAYEE, amountToWords, parseAmountCents, formatCents, micrLine, dateText, toPrintable, fillStars, fitWords };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CheckShared = api;
})(typeof window !== 'undefined' ? window : globalThis);
