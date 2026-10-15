const express = require('express');
const path = require('path');
const db = require('./db');
const shared = require('./public/shared/check');
const pdf = require('./pdf');

const START_NUMBER = Number(process.env.START_CHECK_NUMBER || 1001);
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const s = (v) => (typeof v === 'string' ? v.trim() : '');

function validate(body) {
  const errors = {};
  const c = {
    checkNumber: Number(body.checkNumber),
    date: s(body.date),
    amountCents: shared.parseAmountCents(s(body.amount)),
    payerName: s(body.payerName),
    payerAddress1: s(body.payerAddress1),
    payerAddress2: s(body.payerAddress2),
    bankName: s(body.bankName),
    routing: s(body.routing),
    account: s(body.account),
    reference: s(body.reference),
    memo: s(body.memo),
  };
  if (!Number.isInteger(c.checkNumber) || c.checkNumber < 1 || c.checkNumber > 99999999) errors.checkNumber = 'Enter a whole check number.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(c.date) || Number.isNaN(Date.parse(c.date))) errors.date = 'Enter a valid date.';
  if (c.amountCents == null || c.amountCents <= 0) errors.amount = 'Enter an amount greater than 0.';
  else if (c.amountCents > 99999999999) errors.amount = 'Amount is too large.';
  if (!c.payerName) errors.payerName = 'Required.';
  if (!c.payerAddress1) errors.payerAddress1 = 'Required.';
  if (!c.bankName) errors.bankName = 'Required.';
  if (!/^\d{9}$/.test(c.routing)) errors.routing = 'Routing number must be 9 digits.';
  if (!/^\d{4,17}$/.test(c.account)) errors.account = 'Account number must be 4–17 digits.';
  if (c.reference.length > 20) errors.reference = 'Max 20 characters.';
  if (c.memo.length > 40) errors.memo = 'Max 40 characters.';
  return { c, errors };
}

app.get('/api/next-number', (req, res) => res.json({ next: db.nextNumber(START_NUMBER) }));

app.get('/api/checks', (req, res) => res.json(db.list()));

app.post('/api/checks', (req, res) => {
  const { c, errors } = validate(req.body || {});
  if (!errors.checkNumber && db.exists(c.checkNumber)) {
    errors.checkNumber = `Check number ${c.checkNumber} has already been issued.`;
  }
  if (Object.keys(errors).length) return res.status(400).json({ errors });
  try {
    res.status(201).json({ id: db.insert(c), checkNumber: c.checkNumber, next: db.nextNumber(START_NUMBER) });
  } catch (e) {
    if (String(e.code).startsWith('SQLITE_CONSTRAINT')) {
      return res.status(400).json({ errors: { checkNumber: `Check number ${c.checkNumber} has already been issued.` } });
    }
    throw e;
  }
});

app.get('/api/checks/:id/pdf', (req, res) => {
  const check = db.get(Number(req.params.id));
  if (!check) return res.status(404).send('Not found');
  res.setHeader('Content-Type', 'application/pdf');
  const disp = req.query.download ? 'attachment' : 'inline';
  res.setHeader('Content-Disposition', `${disp}; filename="check-${check.checkNumber}.pdf"`);
  pdf.render(check).pipe(res);
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

const port = Number(process.env.PORT || 3000);
    app.listen(port, '0.0.0.0', () => console.log(`Check generator running at http://localhost:${port}`));
