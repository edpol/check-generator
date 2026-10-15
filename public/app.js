(function () {
  const S = window.CheckShared;
  const form = document.getElementById('form');
  const svg = document.getElementById('preview');
  const statusEl = document.getElementById('status');
  const numHint = document.getElementById('numHint');
  const NS = 'http://www.w3.org/2000/svg';
  const FONT = {
    serif: ['"Times New Roman", Times, serif', 'normal', 'normal'],
    serifBold: ['"Times New Roman", Times, serif', 'bold', 'normal'],
    serifItalic: ['"Times New Roman", Times, serif', 'normal', 'italic'],
    serifBoldItalic: ['"Times New Roman", Times, serif', 'bold', 'italic'],
    sans: ['Helvetica, Arial, sans-serif', 'normal', 'normal'],
    sansBold: ['Helvetica, Arial, sans-serif', 'bold', 'normal'],
    micr: ['GnuMICR, monospace', 'normal', 'normal'],
  };
  const LS_KEY = 'checkgen.payer';
  let nextNumber = null;

  const val = (n) => form.elements[n].value.trim();
  const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  function el(name, attrs, text) {
    const e = document.createElementNS(NS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function currentCheck() {
    const cents = S.parseAmountCents(val('amount'));
    return {
      checkNumber: val('checkNumber') || '', date: val('date'), amountCents: cents || 0,
      payerName: val('payerName'), payerAddress1: val('payerAddress1'), payerAddress2: val('payerAddress2'),
      bankName: val('bankName'), routing: val('routing'), account: val('account'),
      reference: val('reference'), memo: val('memo'),
    };
  }

  function textNode(it, text, measureOnly) {
    const [family, weight, style] = FONT[it.font];
    const anchor = it.align === 'center' ? 'middle' : it.align === 'right' ? 'end' : 'start';
    const t = el('text', {
      x: it.x, y: it.y, 'font-family': family, 'font-weight': weight, 'font-style': style,
      'font-size': it.size, 'text-anchor': anchor, 'letter-spacing': it.spacing || 0, fill: '#111',
    }, text);
    return t;
  }

  function render() {
    const c = currentCheck();
    const p = S.toPrintable(c);
    if (!c.amountCents) { p.amountBox = ''; p.amountWords = ''; }
    if (!c.routing && !c.account && !c.checkNumber) p.micr = '';
    svg.replaceChildren();
    svg.appendChild(el('rect', { x: 0, y: 0, width: 612, height: 264, fill: '#cfdccd' }));
    svg.appendChild(el('rect', { x: 0, y: 4, width: 612, height: 9, fill: '#5b8a6b' }));

    const measure = (txt, it) => {
      const t = textNode(it, txt);
      svg.appendChild(t);
      const w = t.getComputedTextLength();
      svg.removeChild(t);
      return w;
    };

    for (const it of S.items) {
      if (it.type === 'line') {
        svg.appendChild(el('line', { x1: it.x1, x2: it.x2, y1: it.y1, y2: it.y2, stroke: '#222', 'stroke-width': it.width }));
        continue;
      }
      if (it.type === 'bar') {
        svg.appendChild(el('rect', { x: it.x, y: it.y, width: it.w, height: it.h, fill: '#8c8c8c' }));
        svg.appendChild(el('text', {
          x: it.x + it.w / 2, y: it.y + it.h / 2 + 4, 'text-anchor': 'middle', 'font-size': 11,
          'font-weight': 'bold', 'font-family': 'Helvetica, Arial, sans-serif', fill: '#fff',
        }, it.text));
        continue;
      }
      let text = it.text !== undefined ? it.text : p[it.field];
      if (!text) continue;
      if (it.upper) text = text.toUpperCase();
      let node = it;
      if (it.fill) { node = S.fitWords(text, it, measure); text += S.fillStars(text, node, measure); }
      svg.appendChild(textNode(node, text));
    }
  }

  function updateHint() {
    if (nextNumber == null) return;
    const n = Number(val('checkNumber'));
    numHint.textContent = n === nextNumber
      ? `Next available check number is ${nextNumber}. You can override it.`
      : `Next available is ${nextNumber}; you've set ${val('checkNumber') || 'a different number'}.`;
  }

  function clearErrors() {
    form.querySelectorAll('.err').forEach((e) => (e.textContent = ''));
    form.querySelectorAll('.bad').forEach((e) => e.classList.remove('bad'));
  }
  function showErrors(errors) {
    for (const [k, msg] of Object.entries(errors)) {
      const e = form.querySelector(`.err[data-for="${k}"]`);
      if (e) e.textContent = msg;
      if (form.elements[k]) form.elements[k].classList.add('bad');
    }
    const first = Object.keys(errors)[0];
    if (first && form.elements[first]) form.elements[first].focus();
  }
  function setStatus(msg, bad) { statusEl.textContent = msg; statusEl.classList.toggle('bad', !!bad); }

  async function loadNext() {
    const r = await fetch('/api/next-number');
    nextNumber = (await r.json()).next;
  }

  async function save(mode) {
    clearErrors();
    setStatus('');
    // Open the tab synchronously so the popup blocker allows it.
    const win = mode === 'print' ? window.open('', '_blank') : null;
    const body = Object.fromEntries(new FormData(form).entries());
    try {
      const r = await fetch('/api/checks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const raw = await r.text();
      let data = null;
      try { data = JSON.parse(raw); } catch (_) {}
      if (!data) {
        if (win) win.close();
        const snippet = raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
        setStatus(`Server returned an unexpected response (HTTP ${r.status}): ${snippet || 'empty body'}`, true);
        return;
      }
      if (!r.ok) {
        if (win) win.close();
        if (data.errors) {
          showErrors(data.errors);
          const list = Object.entries(data.errors).map(([k, m]) => `${k}: ${m}`).join(' | ');
          setStatus('Please fix: ' + list, true);
        } else {
          setStatus(`Save failed (HTTP ${r.status}): ${data.error || 'unknown error'}`, true);
        }
        return;
      }
      const url = `/api/checks/${data.id}/pdf` + (mode === 'download' ? '?download=1' : '');
      if (mode === 'print') win.location = url; else window.location = url;
      try { localStorage.setItem(LS_KEY, JSON.stringify({
        payerName: val('payerName'), payerAddress1: val('payerAddress1'), payerAddress2: val('payerAddress2'),
        bankName: val('bankName'), routing: val('routing'), account: val('account') })); } catch (_) {}
      setStatus(`Check ${data.checkNumber} saved.`);
      nextNumber = data.next;
      form.elements.checkNumber.value = nextNumber;
      for (const n of ['amount', 'reference', 'memo']) form.elements[n].value = '';
      form.elements.date.value = todayISO();
      updateHint(); render(); loadHistory();
    } catch (e) {
      if (win) win.close();
      setStatus('Could not save: ' + e.message, true);
    }
  }

  async function loadHistory() {
    const rows = await (await fetch('/api/checks')).json();
    const body = document.getElementById('historyBody');
    body.replaceChildren();
    for (const c of rows) {
      const tr = document.createElement('tr');
      const cell = (t, cls) => { const td = document.createElement('td'); td.textContent = t; if (cls) td.className = cls; tr.appendChild(td); return td; };
      cell(String(c.checkNumber)); cell(S.dateText(c.date)); cell(c.payerName); cell('$' + S.formatCents(c.amountCents), 'num');
      const act = cell('');
      const a = document.createElement('a'); a.href = `/api/checks/${c.id}/pdf`; a.target = '_blank'; a.textContent = 'Reprint PDF';
      const b = document.createElement('button'); b.type = 'button'; b.textContent = 'Use payer';
      b.addEventListener('click', () => {
        for (const n of ['payerName', 'payerAddress1', 'payerAddress2', 'bankName', 'routing', 'account']) form.elements[n].value = c[n];
        render(); window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      act.append(a, b);
      body.appendChild(tr);
    }
  }

  document.getElementById('printBtn').addEventListener('click', () => save('print'));
  document.getElementById('downloadBtn').addEventListener('click', () => save('download'));
  document.getElementById('clearBtn').addEventListener('click', () => {
    form.reset(); clearErrors(); setStatus('');
    form.elements.date.value = todayISO();
    if (nextNumber != null) form.elements.checkNumber.value = nextNumber;
    updateHint(); render();
  });
  form.addEventListener('input', () => { render(); updateHint(); });
  form.addEventListener('submit', (e) => e.preventDefault());

  (async function init() {
    form.elements.date.value = todayISO();
    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
      if (saved) for (const k in saved) if (form.elements[k]) form.elements[k].value = saved[k];
    } catch (_) {}
    await loadNext();
    form.elements.checkNumber.value = nextNumber;
    updateHint();
    document.fonts.load('12px GnuMICR').finally(render);
    loadHistory();
  })();
})();
