// Chứng từ thu/chi: giữ nguyên luồng cũ, nay là một module độc lập.
(function (global) {
  'use strict';
  var K = global.Ketoan;
  if (!K) return;
  var H = K.helpers;

  function defaults() {
    var DB = global.KetoanDB;
    return { rev: 0, vouchers: [], accounts: DB && DB.defaultAccounts ? DB.defaultAccounts() : [] };
  }

  function options(list) {
    return (list || []).map(function (a) {
      return '<option value="' + H.esc(a.code) + '">' + H.esc(a.code) + ' — ' + H.esc(a.name) + '</option>';
    }).join('');
  }

  function mount(ctx) {
    return '<div class="stats">' +
        '<div class="stat"><label>Số chứng từ</label><b data-stat="count">0</b></div>' +
        '<div class="stat"><label>Tổng thu</label><b data-stat="in">0 đ</b></div>' +
        '<div class="stat"><label>Tổng chi</label><b data-stat="out">0 đ</b></div>' +
      '</div>' +
      '<div class="card module-card">' +
        '<h3>Chứng từ</h3>' +
        '<form class="voucher-form">' +
          '<input type="date" name="date" required>' +
          '<input name="note" placeholder="Diễn giải" required maxlength="120">' +
          '<select name="account">' + options(H.accounts(ctx.key)) + '</select>' +
          '<select name="kind"><option value="in">Thu</option><option value="out">Chi</option></select>' +
          '<input name="amount" type="number" min="0" step="1000" placeholder="Số tiền" required>' +
          '<button class="btn primary" type="submit">Thêm</button>' +
        '</form>' +
        '<table class="vtable"><thead><tr><th>Ngày</th><th>Diễn giải</th><th>Tài khoản</th><th>Số tiền</th></tr></thead>' +
          '<tbody></tbody></table>' +
      '</div>';
  }

  function makeRow(v) {
    var tr = document.createElement('tr');
    tr.dataset.vid = v.id;
    [v.date, v.note, v.account, H.money(v.amount)].forEach(function (text) {
      var td = document.createElement('td');
      td.textContent = text;
      tr.appendChild(td);
    });
    return tr;
  }

  function patchAccounts(ctx, section, initial) {
    var value = H.accounts(ctx.key);
    var s = H.sig(value);
    if (ctx.pane.sigs['chungtu.accounts'] === s) return;
    ctx.pane.sigs['chungtu.accounts'] = s;
    var form = section.querySelector('.voucher-form');
    var select = form && form.elements && form.elements['account'];
    if (select) select.innerHTML = options(value);
    if (!initial) ctx.bumpPatch();
  }

  function patchStats(ctx, section, data, initial) {
    var vouchers = data.vouchers || [];
    var s = H.sig(vouchers);
    if (ctx.pane.sigs['chungtu.stats'] === s) return;
    ctx.pane.sigs['chungtu.stats'] = s;
    var income = 0, expense = 0;
    vouchers.forEach(function (v) {
      if (v.kind === 'in') income += Number(v.amount) || 0;
      else expense += Number(v.amount) || 0;
    });
    section.querySelector('[data-stat="count"]').textContent = String(vouchers.length);
    section.querySelector('[data-stat="in"]').textContent = H.money(income);
    section.querySelector('[data-stat="out"]').textContent = H.money(expense);
    if (!initial) ctx.bumpPatch();
  }

  function patchVouchers(ctx, section, data, initial) {
    var vouchers = data.vouchers || [];
    var s = H.sig(vouchers);
    if (ctx.pane.sigs['chungtu.vouchers'] === s) return;
    ctx.pane.sigs['chungtu.vouchers'] = s;
    var tbody = section.querySelector('.vtable tbody');
    var rows = Array.prototype.slice.call(tbody.children);
    if (vouchers.length < rows.length || vouchers.length - rows.length > 1) tbody.innerHTML = '';
    for (var i = tbody.children.length; i < vouchers.length; i++) tbody.appendChild(makeRow(vouchers[i]));
    for (var j = 0; j < vouchers.length; j++) {
      var row = tbody.children[j];
      if (row && row.dataset.vid !== vouchers[j].id) tbody.replaceChild(makeRow(vouchers[j]), row);
    }
    if (!initial) ctx.bumpPatch();
  }

  function bind(ctx, section) {
    var form = section.querySelector('.voucher-form');
    form.elements['date'].value = H.today();
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.currentTarget.elements;
      var voucher = {
        id: H.uid('v'),
        date: f['date'].value,
        note: String(f['note'].value || '').trim(),
        account: f['account'].value,
        kind: f['kind'].value,
        amount: Number(f['amount'].value)
      };
      if (!voucher.note || !voucher.date || !(voucher.amount > 0)) return;
      var current = H.data(ctx.key, mod);
      current.rev = (current.rev || 0) + 1;
      current.vouchers.push(voucher);
      var saved = H.save(ctx.key, mod, current);
      if (!saved) { ctx.foot('Dữ liệu đang ở chế độ chỉ đọc, chưa lưu được chứng từ.'); return; }
      e.currentTarget.reset();
      form.elements['date'].value = H.today();
      patchStats(ctx, section, current, false);
      patchVouchers(ctx, section, current, false);
    });
  }

  function patch(ctx, section, data, initial) {
    patchAccounts(ctx, section, initial);
    patchStats(ctx, section, data, initial);
    patchVouchers(ctx, section, data, initial);
  }

  var mod = {
    label: 'Chứng từ',
    order: 10,
    branch: 'chungtu',
    defaults: defaults,
    mount: mount,
    bind: bind,
    patch: patch
  };
  K.register('chungtu', mod);
})(typeof window !== 'undefined' ? window : this);
