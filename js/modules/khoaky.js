// Khóa kỳ, số dư đầu kỳ và kết chuyển cuối kỳ. Sau khi khóa đến một tháng,
// mọi nghiệp vụ có ngày từ tháng đó trở về trước bị từ chối.
(function (global) {
  'use strict';
  var K = global.Ketoan;
  if (!K) return;
  var H = K.helpers;

  function defaults() { return { lockedUntil: '', openings: [], closings: [], updatedAt: '' }; }

  function mount(ctx) {
    var options = H.accounts(ctx.key).map(function (a) {
      var code = String(a.code || a.name || '');
      return '<option value="' + H.esc(code) + '">' + H.esc(code ? code + ' — ' + (a.name || '') : a.name || '') + '</option>';
    }).join('');
    return '<div class="stats">' +
        '<div class="stat"><label>Trạng thái kỳ</label><b data-kk="status">Đang mở</b></div>' +
        '<div class="stat"><label>Số dư đầu kỳ Nợ</label><b data-kk="debit">0 đ</b></div>' +
        '<div class="stat"><label>Số dư đầu kỳ Có</label><b data-kk="credit">0 đ</b></div>' +
        '<div class="stat"><label>Số khoản số dư</label><b data-kk="count">0</b></div>' +
        '<div class="stat"><label>Kết chuyển</label><b data-kk="closings">0</b></div>' +
      '</div>' +
      '<div class="card module-card">' +
        '<h3>Khóa kỳ kế toán</h3>' +
        '<form class="kk-lock-form">' +
          '<input name="ky" type="month" required>' +
          '<button class="btn primary" type="submit" data-kk-act="lock">Khóa đến kỳ này</button>' +
          '<button class="btn" type="button" data-kk-act="unlock">Mở lại toàn bộ</button>' +
        '</form>' +
        '<p class="muted">Khóa đến tháng chọn nghĩa là các nghiệp vụ từ tháng đó trở về trước không thêm/sửa/xóa được. Mở lại chỉ nên làm khi có lý do chính đáng; mỗi lần đổi kỳ đều ghi vào nhật ký.</p>' +
      '</div>' +
      '<div class="card module-card">' +
        '<h3>Số dư đầu kỳ</h3>' +
        '<form class="kk-form">' +
          '<select name="account">' + options + '</select>' +
          '<select name="side"><option value="no">Dư Nợ</option><option value="co">Dư Có</option></select>' +
          '<input name="amount" type="number" min="0" step="1000" placeholder="Số tiền">' +
          '<input name="note" placeholder="Ghi chú" maxlength="120">' +
          '<button class="btn primary" type="submit">Thêm số dư</button>' +
        '</form>' +
        '<div class="report-scroll"><table class="report-table kk-table"><thead><tr>' +
          '<th>Tài khoản</th><th>Bên</th><th>Số tiền</th><th>Ghi chú</th><th></th>' +
        '</tr></thead><tbody data-kk-body="list"></tbody></table></div>' +
        '<p class="muted">Nhập số dư của các tài khoản có số dư đầu kỳ (tiền, công nợ, vốn…). Số này cộng vào bảng cân đối tài sản nhưng không tính vào phát sinh trong kỳ.</p>' +
      '</div>' +
      '<div class="card module-card">' +
        '<h3>Kết chuyển cuối kỳ</h3>' +
        '<form class="kk-close-form">' +
          '<select name="from">' + options + '</select>' +
          '<select name="to">' + options + '</select>' +
          '<input name="date" type="date" placeholder="Ngày kết chuyển">' +
          '<input name="amount" type="number" min="0" step="1000" placeholder="Số tiền">' +
          '<input name="note" placeholder="Diễn giải" maxlength="120">' +
          '<button class="btn primary" type="submit">Ghi kết chuyển</button>' +
        '</form>' +
        '<table class="kk-close-table"><thead><tr><th>Kỳ</th><th>Từ tài khoản</th><th>Sang tài khoản</th>' +
          '<th>Số tiền</th><th>Diễn giải</th></tr></thead><tbody></tbody></table>' +
        '<p class="muted">Bút toán kết chuyển gồm một dòng Có tài khoản nguồn và một dòng Nợ tài khoản đích,luôn cân bằng và hiện trong nhật ký chung.</p>' +
      '</div>';
  }

  function renderList(ctx, section, openings) {
    var body = section.querySelector('[data-kk-body="list"]');
    if (!body) return;
    body.innerHTML = '';
    (openings || []).forEach(function (o) {
      var row = global.document.createElement('tr');
      row.dataset.kkId = o.id;
      row.innerHTML = '<td>' + H.esc(o.account || '') + '</td>' +
        '<td>' + (o.side === 'co' ? 'Có' : 'Nợ') + '</td>' +
        '<td class="num">' + H.money(o.amount) + '</td>' +
        '<td>' + H.esc(o.note || '') + '</td><td></td>';
      var cell = row.children[row.children.length - 1];
      var del = global.document.createElement('button');
      del.className = 'btn btn-icon danger'; del.textContent = 'Xóa';
      del.addEventListener('click', function () {
        if (H.isReadOnly()) { ctx.foot('Dữ liệu đang ở chế độ chỉ đọc.'); return; }
        var write = H.removeFrom(ctx.key, 'khoaky', o.id);
        if (!write || !H.commit(ctx.key, [write], ctx, 'Đã xóa số dư đầu kỳ.')) return;
        H.audit(ctx.key, 'Xóa số dư đầu kỳ', o.account || '');
        renderList(ctx, section, H.data(ctx.key, mod).openings || []);
        ctx.sync('baocao');
      });
      cell.appendChild(del);
      body.appendChild(row);
    });
    if (!(openings || []).length) {
      var empty = global.document.createElement('tr');
      empty.innerHTML = '<td colspan="5" class="muted">Chưa có số dư đầu kỳ</td>';
      body.appendChild(empty);
    }
  }

  function bind(ctx, section) {
    var lockForm = section.querySelector('.kk-lock-form');
    lockForm.elements['ky'].value = H.monthOf(H.today());
    section.querySelector('[data-kk-act="lock"]').addEventListener('click', function (e) {
      e.preventDefault();
      if (H.isReadOnly()) { ctx.foot('Dữ liệu đang ở chế độ chỉ đọc.'); return; }
      var ky = String(lockForm.elements['ky'].value || '');
      if (!ky) return;
      var store = H.data(ctx.key, mod);
      store.lockedUntil = ky;
      store.updatedAt = new Date().toISOString();
      if (!H.commit(ctx.key, [{ module: 'khoaky', value: store }], ctx, 'Đã khóa đến kỳ ' + ky + '.')) return;
      H.audit(ctx.key, 'Khóa kỳ', ky);
      patch(ctx, section, store, false);
    });
    section.querySelector('[data-kk-act="unlock"]').addEventListener('click', function () {
      if (H.isReadOnly()) { ctx.foot('Dữ liệu đang ở chế độ chỉ đọc.'); return; }
      var store = H.data(ctx.key, mod);
      store.lockedUntil = '';
      store.updatedAt = new Date().toISOString();
      if (!H.commit(ctx.key, [{ module: 'khoaky', value: store }], ctx, 'Đã mở lại các kỳ.')) return;
      H.audit(ctx.key, 'Mở kỳ', '');
      patch(ctx, section, store, false);
    });

    var form = section.querySelector('.kk-form');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (H.isReadOnly()) { ctx.foot('Dữ liệu đang ở chế độ chỉ đọc.'); return; }
      var amount = H.roundMoney(Number(form.elements['amount'].value) || 0);
      if (!(amount > 0)) { ctx.foot('Nhập số tiền số dư.'); return; }
      var current = H.data(ctx.key, mod);
      if (!Array.isArray(current.openings)) current.openings = [];
      var row = {
        id: H.uid('sd'), account: String(form.elements['account'].value || ''),
        side: form.elements['side'].value === 'co' ? 'co' : 'no',
        amount: amount, note: String(form.elements['note'].value || '').trim(),
        at: new Date().toISOString()
      };
      current.openings.push(row);
      current.updatedAt = new Date().toISOString();
      if (!H.commit(ctx.key, [{ module: 'khoaky', value: current }], ctx, 'Đã thêm số dư đầu kỳ.')) return;
      H.audit(ctx.key, 'Thêm số dư đầu kỳ', row.account);
      form.elements['amount'].value = ''; form.elements['note'].value = '';
      renderList(ctx, section, current.openings);
      patch(ctx, section, current, false);
      ctx.sync('baocao');
    });

    var closeForm = section.querySelector('.kk-close-form');
    closeForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (H.isReadOnly()) { ctx.foot('Dữ liệu đang ở chế độ chỉ đọc.'); return; }
      var f = e.currentTarget.elements;
      var amount = H.roundMoney(Number(f['amount'].value) || 0);
      var from = String(f['from'].value || '');
      var to = String(f['to'].value || '');
      if (!(amount > 0) || !from || !to) { ctx.foot('Nhập đủ tài khoản và số tiền kết chuyển.'); return; }
      if (from === to) { ctx.foot('Tài khoản nguồn và đích phải khác nhau.'); return; }
      var current = H.data(ctx.key, mod);
      if (!Array.isArray(current.closings)) current.closings = [];
      var row = {
        id: H.uid('kc'), so: H.nextCode(current.closings, 'KC', 4),
        date: f['date'] ? (f['date'].value || H.today()) : H.today(),
        lines: [
          { account: from, credit: amount },
          { account: to, debit: amount }
        ],
        note: String(f['note'].value || '').trim(),
        at: new Date().toISOString()
      };
      current.closings.push(row);
      current.updatedAt = new Date().toISOString();
      if (!H.commit(ctx.key, [{ module: 'khoaky', value: current }], ctx, 'Đã ghi kết chuyển ' + row.so + '.')) return;
      H.audit(ctx.key, 'Kết chuyển', from + ' → ' + to + ': ' + H.money(amount));
      e.currentTarget.reset();
      if (closeForm.elements['date']) closeForm.elements['date'].value = H.today();
      patch(ctx, section, current, false);
      ctx.sync('baocao');
    });
  }

  function patch(ctx, section, data, initial) {
    var openings = data.openings || [];
    var closings = data.closings || [];
    var s = H.sig({ o: openings, k: data.lockedUntil || '', c: closings });
    if (ctx.pane.sigs['khoaky.data'] === s) return;
    ctx.pane.sigs['khoaky.data'] = s;
    var debit = 0, credit = 0;
    openings.forEach(function (o) {
      if (o.side === 'co') credit += Number(o.amount) || 0;
      else debit += Number(o.amount) || 0;
    });
    var put = function (name, value) {
      var el = section.querySelector('[data-kk="' + name + '"]');
      if (el) el.textContent = value;
    };
    put('status', data.lockedUntil ? 'Khóa đến ' + data.lockedUntil : 'Đang mở');
    put('debit', H.money(H.roundMoney(debit)));
    put('credit', H.money(H.roundMoney(credit)));
    put('count', String(openings.length));
    put('closings', String(closings.length));
    renderList(ctx, section, openings);
    var body = section.querySelector('.kk-close-table tbody');
    if (body) {
      body.innerHTML = closings.length ? closings.map(function (c) {
        return '<tr data-kkid="' + H.esc(c.id) + '">' +
          '<td>' + H.esc(c.date || '') + '</td>' +
          '<td>' + H.esc(c.lines[0].account) + '</td>' +
          '<td>' + H.esc(c.lines[1].account) + '</td>' +
          '<td>' + H.money(c.lines[0].credit) + '</td>' +
          '<td>' + H.esc(c.note || '') + '</td></tr>';
      }).join('') : '<tr><td colspan="5" class="muted">Chưa có kết chuyển</td></tr>';
    }
    if (!initial) ctx.bumpPatch();
  }

  var mod = {
    label: 'Khóa kỳ & số dư',
    order: 45,
    branch: 'khoaky',
    recordField: 'openings',
    defaults: defaults,
    mount: mount,
    bind: bind,
    patch: patch
  };
  K.register('khoaky', mod);
})(typeof window !== 'undefined' ? window : this);
