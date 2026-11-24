// Công nợ phải thu / phải trả: theo dõi ai nợ mình và mình nợ ai.
(function (global) {
  'use strict';
  var K = global.Ketoan;
  if (!K) return;
  var H = K.helpers;

  function defaults() {
    return { records: [], updatedAt: '' };
  }

  function mount() {
    return '<div class="card module-card">' +
      '<h3>Công nợ phải thu / phải trả</h3>' +
      '<form class="cn-form">' +
        '<select name="type"><option value="phaiThu">Phải thu</option><option value="phaiTra">Phải trả</option></select>' +
        '<input name="partner" placeholder="Đối tượng" required maxlength="120">' +
        '<input name="amount" type="number" min="0" step="1000" placeholder="Phát sinh">' +
        '<input name="paid" type="number" min="0" step="1000" placeholder="Đã thu / trả">' +
        '<input name="due" type="date" placeholder="Hạn">' +
        '<button class="btn primary" type="submit">Thêm</button>' +
      '</form>' +
      '<div class="cn-summary">' +
        '<div><label>Phải thu</label><b data-cn="thu">0 đ</b></div>' +
        '<div><label>Phải trả</label><b data-cn="tra">0 đ</b></div>' +
        '<div><label>Còn thu</label><b data-cn="conThu">0 đ</b></div>' +
        '<div><label>Còn trả</label><b data-cn="conTra">0 đ</b></div>' +
      '</div>' +
      '<table class="cn-table"><thead><tr><th>Loại</th><th>Đối tượng</th><th>Phát sinh</th><th>Đã trả</th><th>Còn lại</th><th>Hạn</th><th>Chứng từ</th></tr></thead>' +
        '<tbody></tbody></table>' +
      '<p class="muted">Vào phần Chứng từ, chọn khoản công nợ khi thêm phiếu thu/chi để tự cập nhật số đã thu/trả. Các khoản đã nối hiện ở cột cuối.</p>' +
    '</div>';
  }

  function rowHtml(r) {
    var remain = (Number(r.amount) || 0) - (Number(r.paid) || 0);
    var label = r.type === 'phaiTra' ? 'Phải trả' : 'Phải thu';
    var links = Array.isArray(r.voucherIds) ? r.voucherIds : [];
    return '<tr data-cnid="' + H.esc(r.id) + '">' +
      '<td><span class="badge ' + (r.type === 'phaiTra' ? 'warn' : 'ok') + '">' + label + '</span></td>' +
      '<td>' + H.esc(r.partner) + '</td>' +
      '<td>' + H.money(r.amount) + '</td>' +
      '<td>' + H.money(r.paid) + '</td>' +
      '<td><b>' + H.money(remain) + '</b></td>' +
      '<td>' + H.esc(r.due || '—') + '</td>' +
      '<td data-cn-links="' + links.length + '">' + (links.length ? links.length + ' chứng từ' : '—') + '</td>' +
    '</tr>';
  }

  function patch(ctx, section, data, initial) {
    var records = data.records || [];
    var s = H.sig(records);
    if (ctx.pane.sigs['congno.records'] === s) return;
    ctx.pane.sigs['congno.records'] = s;

    var thu = 0, tra = 0, conThu = 0, conTra = 0;
    records.forEach(function (r) {
      var amount = Number(r.amount) || 0;
      var remain = amount - (Number(r.paid) || 0);
      if (r.type === 'phaiTra') { tra += amount; conTra += remain; }
      else { thu += amount; conThu += remain; }
    });
    section.querySelector('[data-cn="thu"]').textContent = H.money(thu);
    section.querySelector('[data-cn="tra"]').textContent = H.money(tra);
    section.querySelector('[data-cn="conThu"]').textContent = H.money(conThu);
    section.querySelector('[data-cn="conTra"]').textContent = H.money(conTra);
    section.querySelector('.cn-table tbody').innerHTML = records.length ? records.map(rowHtml).join('') : '<tr><td colspan="7" class="muted">Chưa có khoản công nợ</td></tr>';
    if (!initial) ctx.bumpPatch();
  }

  function bind(ctx, section) {
    var form = section.querySelector('.cn-form');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.currentTarget.elements;
      var partner = String(f['partner'].value || '').trim();
      var amount = Number(f['amount'].value);
      if (!partner || !(amount > 0)) return;
      var current = H.data(ctx.key, mod);
      if (!Array.isArray(current.records)) current.records = [];
      current.records.push({
        id: H.uid('cn'),
        type: f['type'].value === 'phaiTra' ? 'phaiTra' : 'phaiThu',
        partner: partner,
        amount: amount,
        paid: Number(f['paid'].value) || 0,
        due: f['due'].value || '',
        voucherIds: []
      });
      current.updatedAt = new Date().toISOString();
      var saved = H.save(ctx.key, mod, current);
      if (!saved) { ctx.foot('Dữ liệu đang ở chế độ chỉ đọc, chưa lưu được công nợ.'); return; }
      e.currentTarget.reset();
      patch(ctx, section, current, false);
    });
  }

  var mod = {
    label: 'Công nợ',
    order: 30,
    branch: 'congno',
    defaults: defaults,
    mount: mount,
    bind: bind,
    patch: patch
  };
  K.register('congno', mod);
})(typeof window !== 'undefined' ? window : this);
