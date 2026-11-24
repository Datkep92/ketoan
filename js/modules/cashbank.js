// Quỹ và ngân hàng: phiếu thu/chi, bảng lương, số dư theo tài khoản và chứng từ tương ứng.
(function (global) {
  'use strict';
  var K = global.Ketoan;
  if (!K) return;
  var H = K.helpers;

  function defaults() {
    return { entries: [], payrolls: [], updatedAt: '' };
  }

  function accountOptions(list) {
    return (list || []).map(function (a) {
      return '<option value="' + H.esc(a.code || a.name) + '">' +
        H.esc(a.code ? a.code + ' — ' + a.name : a.name) + '</option>';
    }).join('');
  }

  function mount(ctx) {
    return '<div class="stats">' +
        '<div class="stat"><label>Số phiếu</label><b data-cb="count">0</b></div>' +
        '<div class="stat"><label>Tiền thu</label><b data-cb="in">0 đ</b></div>' +
        '<div class="stat"><label>Tiền chi</label><b data-cb="out">0 đ</b></div>' +
        '<div class="stat"><label>Số dư quỹ</label><b data-cb="balance">0 đ</b></div>' +
        '<div class="stat"><label>Bảng lương</label><b data-cb="payrolls">0</b></div>' +
        '<div class="stat"><label>Tổng lương</label><b data-cb="gross">0 đ</b></div>' +
      '</div>' +
      '<div class="card module-card">' +
        '<h3>Quỹ / ngân hàng</h3>' +
        '<form class="cb-form">' +
          '<input name="date" type="date" required>' +
          '<select name="type"><option value="in">Thu tiền</option><option value="out">Chi tiền</option></select>' +
          '<select name="account"></select>' +
          '<input name="amount" type="number" min="0" step="1000" placeholder="Số tiền">' +
          '<input name="note" placeholder="Diễn giải" maxlength="120">' +
          '<button class="btn primary" type="submit">Lưu phiếu</button>' +
        '</form>' +
        '<div class="cn-summary" data-cb="balances"></div>' +
        '<table class="cb-table"><thead><tr><th>Mã</th><th>Ngày</th><th>Loại</th><th>Tài khoản</th><th>Số tiền</th><th>Diễn giải</th></tr></thead>' +
          '<tbody></tbody></table>' +
        '<p class="muted">Mỗi phiếu đồng thời ghi một chứng từ cùng số tiền. Số dư ở đây tính riêng cho các phiếu quỹ / ngân hàng.</p>' +
      '</div>' +
      '<div class="card module-card">' +
        '<h3>Bảng lương và trích theo lương</h3>' +
        '<form class="cb-payroll-form">' +
          '<input name="ky" type="month" required>' +
          '<input name="date" type="date" required>' +
          '<input name="gross" type="number" min="0" step="1000" placeholder="Tổng lương">' +
          '<input name="rate" type="number" min="0" max="100" step="1" placeholder="Trích giữ lại %">' +
          '<input name="employer" type="number" min="0" step="1000" placeholder="Trích thêm từ đơn vị">' +
          '<select name="paid"><option value="0">Chưa chi</option><option value="1">Đã chi</option></select>' +
          '<button class="btn primary" type="submit">Lưu bảng lương</button>' +
        '</form>' +
        '<table class="cb-payroll-table"><thead><tr><th>Kỳ</th><th>Tổng lương</th>' +
          '<th>Khấu trừ</th><th>Đơn vị trích</th><th>Thực lãnh</th></tr></thead><tbody></tbody></table>' +
        '<p class="muted">Khấu trừ gồm BHXH, BHYT, BHTN giữ lại từ lương; đơn vị trích thêm được ghi vào chi phí. Chọn «Đã chi» để ghi chứng từ và phiếu quỹ.</p>' +
      '</div>';
  }

  function rowHtml(entry) {
    return '<tr data-cbid="' + H.esc(entry.id) + '">' +
      '<td>' + H.esc(entry.ma || entry.id) + '</td>' +
      '<td>' + H.esc(entry.date || '') + '</td>' +
      '<td>' + (entry.type === 'out' ? 'Chi' : 'Thu') + '</td>' +
      '<td>' + H.esc(entry.account || '') + '</td>' +
      '<td>' + H.money(entry.amount) + '</td>' +
      '<td>' + H.esc(entry.note || '') + '</td>' +
    '</tr>';
  }

  function payrollRow(p) {
    return '<tr data-cbpid="' + H.esc(p.id) + '">' +
      '<td>' + H.esc(p.ky || '') + '</td>' +
      '<td>' + H.money(p.gross) + '</td>' +
      '<td>' + H.money(p.hold) + '</td>' +
      '<td>' + H.money(p.employer) + '</td>' +
      '<td><b>' + H.money(p.net) + '</b></td>' +
    '</tr>';
  }

  function patch(ctx, section, data, initial) {
    var entries = data.entries || [];
    var payrolls = data.payrolls || [];
    var accounts = H.accounts(ctx.key).map(function (a) { return { code: a.code, name: a.name }; });
    var s = H.sig({ e: entries, a: accounts, p: payrolls });
    if (ctx.pane.sigs['cashbank.data'] === s) return;
    ctx.pane.sigs['cashbank.data'] = s;

    var income = 0, expense = 0;
    var balances = {};
    entries.forEach(function (entry) {
      var amount = Number(entry.amount) || 0;
      var code = entry.account || '111';
      if (entry.type === 'out') {
        expense += amount;
        balances[code] = (Number(balances[code]) || 0) - amount;
      } else {
        income += amount;
        balances[code] = (Number(balances[code]) || 0) + amount;
      }
    });
    section.querySelector('[data-cb="count"]').textContent = String(entries.length);
    section.querySelector('[data-cb="in"]').textContent = H.money(income);
    section.querySelector('[data-cb="out"]').textContent = H.money(expense);
    section.querySelector('[data-cb="balance"]').textContent = H.money(income - expense);
    section.querySelector('[data-cb="payrolls"]').textContent = String(payrolls.length);
    section.querySelector('[data-cb="gross"]').textContent = H.money(payrolls.reduce(function (sum, p) {
      return H.roundMoney(sum + (Number(p.gross) || 0));
    }, 0));
    section.querySelector('.cb-table tbody').innerHTML = entries.length
      ? entries.map(rowHtml).join('')
      : '<tr><td colspan="6" class="muted">Chưa có phiếu quỹ / ngân hàng</td></tr>';
    section.querySelector('.cb-payroll-table tbody').innerHTML = payrolls.length
      ? payrolls.map(payrollRow).join('')
      : '<tr><td colspan="5" class="muted">Chưa có bảng lương</td></tr>';
    var labels = Object.keys(balances);
    section.querySelector('[data-cb="balances"]').innerHTML = labels.length
      ? labels.map(function (code) {
          return '<div><label>Số dư ' + H.esc(code) + '</label><b>' + H.money(balances[code]) + '</b></div>';
        }).join('')
      : '<div><label>Số dư</label><b>0 đ</b></div>';
    section.querySelector('.cb-form').elements['account'].innerHTML = accountOptions(accounts);
    if (!initial) ctx.bumpPatch();
  }

  function bind(ctx, section) {
    var form = section.querySelector('.cb-form');
    form.elements['date'].value = H.today();
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.currentTarget.elements;
      var amount = H.roundMoney(Number(f['amount'].value) || 0);
      if (!(amount > 0)) return;
      var type = f['type'].value === 'out' ? 'out' : 'in';
      var account = String(f['account'].value || '111');
      var current = H.data(ctx.key, mod);
      if (!Array.isArray(current.entries)) current.entries = [];
      var entry = {
        id: H.uid('cb'), ma: H.nextCode(current.entries, 'QB', 4),
        date: f['date'].value || H.today(),
        type: type, account: account, amount: amount,
        note: String(f['note'].value || '').trim(),
        source: 'cashbank', at: new Date().toISOString()
      };
      current.entries.push(entry);
      current.updatedAt = new Date().toISOString();

      var writes = [{ module: 'cashbank', value: current }];
      var ctMod = K.modules.chungtu;
      if (ctMod) {
        var ct = H.data(ctx.key, ctMod);
        if (!Array.isArray(ct.vouchers)) ct.vouchers = [];
        ct.vouchers.push({
          id: H.uid('v'), date: entry.date,
          note: entry.note || (type === 'out' ? 'Chi tiền' : 'Thu tiền'),
          account: account, kind: type, amount: amount, source: 'cashbank:' + entry.id
        });
        writes.push({ module: 'chungtu', value: ct });
      }
      if (!H.commit(ctx.key, writes, ctx, 'Đã lưu phiếu ' + entry.ma + '.')) return;

      e.currentTarget.reset();
      form.elements['date'].value = H.today();
      patch(ctx, section, current, false);
      ctx.sync('chungtu');
      ctx.sync('baocao');
    });

    var payrollForm = section.querySelector('.cb-payroll-form');
    payrollForm.elements['date'].value = H.today();
    payrollForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (H.isReadOnly()) { ctx.foot('Dữ liệu đang ở chế độ chỉ đọc.'); return; }
      var f = e.currentTarget.elements;
      var gross = H.roundMoney(Number(f['gross'].value) || 0);
      if (!(gross > 0)) { ctx.foot('Nhập tổng lương.'); return; }
      var rate = Number(f['rate'].value) || 0;
      if (rate < 0 || rate > 100) rate = 0;
      var hold = H.roundMoney(gross * rate / 100);
      var employer = H.roundMoney(Number(f['employer'].value) || 0);
      var net = H.roundMoney(gross - hold);
      var date = f['date'].value || H.today();
      var current = H.data(ctx.key, mod);
      if (!Array.isArray(current.payrolls)) current.payrolls = [];
      if (!Array.isArray(current.entries)) current.entries = [];
      var payroll = {
        id: H.uid('ln'), ky: f['ky'].value || H.monthOf(date), date: date,
        gross: gross, rate: rate, hold: hold, employer: employer, net: net,
        paid: f['paid'].value === '1', at: new Date().toISOString()
      };
      current.payrolls.push(payroll);
      current.updatedAt = new Date().toISOString();

      var writes = [{ module: 'cashbank', value: current }];
      var ctMod = K.modules.chungtu;
      if (payroll.paid) {
        current.entries.push({
          id: H.uid('cb'), ma: H.nextCode(current.entries, 'QB', 4), date: date,
          type: 'out', account: '111', amount: net,
          note: 'Chi lương kỳ ' + payroll.ky, source: 'luong:' + payroll.id,
          at: new Date().toISOString()
        });
        current.entries.push({
          id: H.uid('cb'), ma: H.nextCode(current.entries, 'QB', 4), date: date,
          type: 'out', account: '111', amount: H.roundMoney(hold + employer),
          note: 'Nộp trích theo lương kỳ ' + payroll.ky,
          source: 'luong-insurance:' + payroll.id, at: new Date().toISOString()
        });
        if (ctMod) {
          var ct = H.data(ctx.key, ctMod);
          if (!Array.isArray(ct.vouchers)) ct.vouchers = [];
          ct.vouchers.push({
            id: H.uid('v'), date: date, note: 'Chi lương kỳ ' + payroll.ky,
            account: '111', kind: 'out', amount: net, source: 'luong:' + payroll.id
          });
          ct.vouchers.push({
            id: H.uid('v'), date: date, note: 'Nộp trích theo lương kỳ ' + payroll.ky,
            account: '111', kind: 'out', amount: H.roundMoney(hold + employer),
            source: 'luong-insurance:' + payroll.id
          });
          writes.push({ module: 'chungtu', value: ct });
        }
      }
      if (!H.commit(ctx.key, writes, ctx, 'Đã lưu bảng lương kỳ ' + payroll.ky + '.')) return;

      e.currentTarget.reset();
      payrollForm.elements['date'].value = H.today();
      patch(ctx, section, current, false);
      ctx.sync('chungtu');
      ctx.sync('baocao');
    });
  }

  var mod = {
    label: 'Quỹ / ngân hàng',
    order: 100,
    branch: 'cashbank',
    defaults: defaults,
    mount: mount,
    bind: bind,
    patch: patch
  };
  K.register('cashbank', mod);
})(typeof window !== 'undefined' ? window : this);
