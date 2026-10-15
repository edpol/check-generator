const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(process.env.CHECKS_DB || path.join(__dirname, 'checks.db'));
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS checks (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  check_number  INTEGER NOT NULL UNIQUE,
  date          TEXT    NOT NULL,
  amount_cents  INTEGER NOT NULL,
  payer_name    TEXT    NOT NULL,
  payer_address1 TEXT   NOT NULL,
  payer_address2 TEXT   NOT NULL DEFAULT '',
  bank_name     TEXT    NOT NULL,
  routing       TEXT    NOT NULL,
  account       TEXT    NOT NULL,
  reference     TEXT    NOT NULL DEFAULT '',
  memo          TEXT    NOT NULL DEFAULT '',
  created_at    TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);

const toCheck = (r) => r && ({
  id: r.id, checkNumber: r.check_number, date: r.date, amountCents: r.amount_cents,
  payerName: r.payer_name, payerAddress1: r.payer_address1, payerAddress2: r.payer_address2,
  bankName: r.bank_name, routing: r.routing, account: r.account,
  reference: r.reference, memo: r.memo, createdAt: r.created_at,
});

module.exports = {
  nextNumber(start) {
    const row = db.prepare('SELECT MAX(check_number) AS m FROM checks').get();
    return row.m == null ? start : row.m + 1;
  },
  exists(n) {
    return !!db.prepare('SELECT 1 FROM checks WHERE check_number = ?').get(n);
  },
  insert(c) {
    const info = db.prepare(`INSERT INTO checks
      (check_number, date, amount_cents, payer_name, payer_address1, payer_address2,
       bank_name, routing, account, reference, memo)
      VALUES (@checkNumber, @date, @amountCents, @payerName, @payerAddress1, @payerAddress2,
       @bankName, @routing, @account, @reference, @memo)`).run(c);
    return Number(info.lastInsertRowid);
  },
  get(id) {
    return toCheck(db.prepare('SELECT * FROM checks WHERE id = ?').get(id));
  },
  list() {
    return db.prepare('SELECT * FROM checks ORDER BY check_number DESC LIMIT 500').all().map(toCheck);
  },
};
