// Công nợ phải thu / phải trả và dự phòng công nợ.
(function (global) {
  'use strict';
  var K = global.Ketoan;
  if (!K) return;
  var H = K.helpers;

  function defaults() {
    return { records: [], provisions: [], updatedAt: '' };
  }

  function mount() {
    return '<div class="card module-card">' +
      '<h3>Công nợ phải thu / phải trả</h3>' +
      '<form class="cn-form">' +
        '<select name="type"><option value="phaiThu">Phải thu</option><option value="phaiTra">Phải trả</option></select>' +
        '<input name="partner" placeholder="Đối tượng" required maxlength="120">' +
        '<input name="amount" type="number" min="0" step="1000" placeholder="Phát sinh">' +
        '<input name="paid" type="number" min="0" step="1000" placeholder="Đã thu / trả">' +
        '<input name="date" type="date" required>' +
        '<input name="due" type="date" placeholder="Hạn">' +
        '<button class="btn primary" type="submit">Thêm</button>' +
      '</form>' +
      '<div class="cn-summary">' +
        '<div><label>Phải thu</label><b data-cn="thu">0 đ</b></div>' +
        '<div><label>Phải trả</label><b data-cn="tra">0 đ</b></div>' +
        '<div><label>Còn thu</label><b data-cn="conThu">0 đ</b></div>' +
        '<div><label>Còn trả</label><b data-cn="conTra">0 đ</b></div>' +
        '<div><label>Dự phòng</label><b data-cn="provision">0 đ</b></div>' +
      '</div>' +
      '<div class="cn-aging">' +
        '<h4>Tuổi nợ phải thu</h4>' +
        '<div class="cn-aging-grid">' +
          '<div><label>Chưa đến hạn</label><b data-cn-age="current">0 đ</b></div>' +
          '<div><label>1 – 30 ngày</label><b data-cn-age="d30">0 đ</b></div>' +
          '<div><label>31 – 60 ngày</label><b data-cn-age="d60">0 đ</b></div>' +
          '<div><label>61 – 90 ngày</label><b data-cn-age="d90">0 đ</b></div>' +
          '<div><label>Trên 90 ngày</label><b data-cn-age="overdue">0 đ</b></div>' +
        '</div>' +
        '<div class="cn-aging-list" data-cn-body="aging"></div>' +
      '</div>' +
      '<table class="cn-table"><thead><tr><th>Loại</th><th>Đối tượng</th><th>Phát sinh</th><th>Đã trả</th><th>Còn lại</th><th>Hạn</th><th>Chứng từ</th></tr></thead>' +
        '<tbody data-cn-body="records"></tbody></table>' +
      '<p class="muted">Vào phần Chứng từ, chọn khoản công nợ khi thêm phiếu thu/chi để tự cập nhật số đã thu/trả. Các khoản đã nối hiện ở cột cuối.</p>' +
    '</div>' +
    '<div class="card module-card">' +
      '<h3>Dự phòng công nợ</h3>' +
      '<form class="cn-provision-form">' +
        '<input name="ky" type="month" required>' +
        '<input name="amount" type="number" min="0" step="1000" placeholder="Số dự phòng">' +
        '<input name="note" placeholder="Diễn giải" maxlength="120">' +
        '<button class="btn primary" type="submit">Trích dự phòng</button>' +
      '</form>' +
      '<table class="cn-provision-table"><thead><tr><th>Kỳ</th><th>Số tiền</th><th>Diễn giải</th></tr></thead><tbody data-cn-body="provisions"></tbody></table>' +
      '<p class="muted">Dự phòng được ghi vào chi phí và giảm giá trị phải thu trên báo cáo tài chính.</p>' +
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

  function provisionRow(p) {
    return '<tr data-cnpid="' + H.esc(p.id) + '">' +
      '<td>' + H.esc(p.ky || '') + '</td>' +
      '<td>' + H.money(p.amount) + '</td>' +
      '<td>' + H.esc(p.note || '') + '</td>' +
    '</tr>';
  }

  function patch(ctx, section, data, initial) {
    var records = data.records || [];
    var provisions = data.provisions || [];
    var s = H.sig({ r: records, p: provisions });
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
    section.querySelector('[data-cn="provision"]').textContent = H.money(provisions.reduce(function (sum, p) {
      return H.roundMoney(sum + (Number(p.amount) || 0));
    }, 0));
    section.querySelector('[data-cn-body="records"]').innerHTML = records.length ? records.map(rowHtml).join('') : '<tr><td colspan="7" class="muted">Chưa có khoản công nợ</td></tr>';
    section.querySelector('[data-cn-body="provisions"]').innerHTML = provisions.length
      ? provisions.map(provisionRow).join('')
      : '<tr><td colspan="3" class="muted">Chưa có dự phòng</td></tr>';

    // Tuổi nợ tính theo ngày đến hạn (nếu không có hạn thì theo ngày phát sinh).
    var todayMs = Date.parse(H.today()) || 0;
    var buckets = { current: 0, d30: 0, d60: 0, d90: 0, overdue: 0 };
    var agingRows = [];
    records.forEach(function (r) {
      if (r.type === 'phaiTra') return;
      var remain = (Number(r.amount) || 0) - (Number(r.paid) || 0);
      if (!(remain > 0)) return;
      var due = r.due || r.date || H.today();
      var days = Math.floor((todayMs - (Date.parse(due) || todayMs)) / 86400000);
      var key = days <= 0 ? 'current' : (days <= 30 ? 'd30' : (days <= 60 ? 'd60' : (days <= 90 ? 'd90' : 'overdue')));
      buckets[key] = H.roundMoney(buckets[key] + remain);
      agingRows.push('<div class="cn-aging-row"><span>' + H.esc(r.partner) + '</span><span>' + H.esc(due) + '</span><b>' +
        H.money(remain) + '</b><span>' + (days <= 0 ? 'Chưa đến hạn' : days + ' ngày') + '</span></div>');
    });
    Object.keys(buckets).forEach(function (key) {
      var el = section.querySelector('[data-cn-age="' + key + '"]');
      if (el) el.textContent = H.money(buckets[key]);
    });
    var agingBody = section.querySelector('[data-cn-body="aging"]');
    if (agingBody) agingBody.innerHTML = agingRows.length
      ? agingRows.slice(0, 12).join('')
      : '<p class="muted">Không có khoản phải thu quá hạn</p>';
    if (!initial) ctx.bumpPatch();
  }

  function bind(ctx, section) {
    var form = section.querySelector('.cn-form');
    form.elements['date'].value = H.today();
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.currentTarget.elements;
      var partner = String(f['partner'].value || '').trim();
      var amount = Number(f['amount'].value);
      if (!partner || !(amount > 0)) return;
      var date = f['date'].value || H.today();
      if (!H.guard(ctx, date, 'Thêm công nợ')) return;
      var current = H.data(ctx.key, mod);
      if (!Array.isArray(current.records)) current.records = [];
      current.records.push({
        id: H.uid('cn'),
        type: f['type'].value === 'phaiTra' ? 'phaiTra' : 'phaiThu',
        partner: partner, date: date,
        amount: amount,
        paid: Number(f['paid'].value) || 0,
        due: f['due'].value || '',
        voucherIds: []
      });
      current.updatedAt = new Date().toISOString();
      var saved = H.save(ctx.key, mod, current);
      if (!saved) { ctx.foot('Dữ liệu đang ở chế độ chỉ đọc, chưa lưu được công nợ.'); return; }
      e.currentTarget.reset();
      form.elements['date'].value = H.today();
      patch(ctx, section, current, false);
      ctx.sync('baocao');
    });

    var provisionForm = section.querySelector('.cn-provision-form');
    provisionForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (H.isReadOnly()) { ctx.foot('Dữ liệu đang ở chế độ chỉ đọc.'); return; }
      var f = e.currentTarget.elements;
      var amount = H.roundMoney(Number(f['amount'].value) || 0);
      if (!(amount > 0)) { ctx.foot('Nhập số tiền dự phòng.'); return; }
      var ky = f['ky'].value || H.monthOf(H.today());
      if (!H.guard(ctx, ky + '-01', 'Trích dự phòng công nợ')) return;
      var current = H.data(ctx.key, mod);
      if (!Array.isArray(current.provisions)) current.provisions = [];
      current.provisions.push({
        id: H.uid('dp'), ky: ky, amount: amount,
        note: String(f['note'].value || '').trim(), at: new Date().toISOString()
      });
      current.updatedAt = new Date().toISOString();
      if (!H.commit(ctx.key, [{ module: 'congno', value: current }], ctx, 'Đã trích dự phòng công nợ.')) return;
      H.audit(ctx.key, 'Trích dự phòng', current.provisions[current.provisions.length - 1].ky);
      e.currentTarget.reset();
      patch(ctx, section, current, false);
      ctx.sync('baocao');
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
