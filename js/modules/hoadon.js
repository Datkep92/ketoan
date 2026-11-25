// Hóa đơn: phát hành số hóa đơn, lấy số liệu từ phiếu bán hoặc nhập tay.
(function (global) {
  'use strict';
  var K = global.Ketoan;
  if (!K) return;
  var H = K.helpers;

  function defaults() {
    return { invoices: [], updatedAt: '' };
  }

  function saleOptions(orders) {
    return '<option value="">Tự nhập</option>' + (orders || []).map(function (o) {
      return '<option value="' + H.esc(o.id) + '">' + H.esc(o.ma || o.id) + ' — ' + H.esc(o.customer || 'Khách lẻ') + '</option>';
    }).join('');
  }

  function mount(ctx) {
    return '<div class="stats">' +
        '<div class="stat"><label>Số hóa đơn</label><b data-hd="count">0</b></div>' +
        '<div class="stat"><label>Tổng tiền hàng</label><b data-hd="amount">0 đ</b></div>' +
        '<div class="stat"><label>Tiền thuế</label><b data-hd="tax">0 đ</b></div>' +
        '<div class="stat"><label>Tổng thanh toán</label><b data-hd="total">0 đ</b></div>' +
      '</div>' +
      '<div class="card module-card">' +
        '<h3>Hóa đơn</h3>' +
        '<form class="hd-form">' +
          '<select name="sale"></select>' +
          '<input name="so" placeholder="Số hóa đơn (để trống để tự tạo)" maxlength="40">' +
          '<input name="date" type="date" required>' +
          '<input name="customer" placeholder="Khách hàng" maxlength="120">' +
          '<input name="amount" type="number" min="0" step="1000" placeholder="Tiền hàng">' +
          '<input name="tax" type="number" min="0" max="100" step="1" placeholder="Thuế suất %">' +
          '<input name="paid" type="number" min="0" step="1000" placeholder="Đã thu">' +
          '<input name="note" placeholder="Diễn giải" maxlength="120">' +
          '<button class="btn primary" type="submit">Lưu hóa đơn</button>' +
        '</form>' +
        '<table class="hd-table"><thead><tr><th>Số</th><th>Ngày</th><th>Khách</th><th>Tiền hàng</th><th>Thuế</th><th>Tổng</th><th>Đã thu</th></tr></thead>' +
          '<tbody></tbody></table>' +
        '<p class="muted">Chọn một phiếu bán để lấy sẵn khách và tiền hàng, hoặc tự nhập. Ký hiệu hóa đơn lấy trong phần Thiết lập.</p>' +
      '</div>';
  }

  function rowHtml(inv) {
    return '<tr data-hdid="' + H.esc(inv.id) + '">' +
      '<td>' + H.esc(inv.so) + '</td>' +
      '<td>' + H.esc(inv.date || '') + '</td>' +
      '<td>' + H.esc(inv.customer || '') + '</td>' +
      '<td>' + H.money(inv.amount) + '</td>' +
      '<td>' + H.money(inv.taxAmount) + '</td>' +
      '<td><b>' + H.money(inv.total) + '</b></td>' +
      '<td>' + H.money(inv.paid) + '</td>' +
    '</tr>';
  }

  function patch(ctx, section, data, initial) {
    var invoices = data.invoices || [];
    var si = H.sig(invoices);
    if (ctx.pane.sigs['hoadon.invoices'] !== si) {
      ctx.pane.sigs['hoadon.invoices'] = si;
      var amount = 0, tax = 0, total = 0;
      invoices.forEach(function (inv) {
        amount += Number(inv.amount) || 0;
        tax += Number(inv.taxAmount) || 0;
        total += Number(inv.total) || 0;
      });
      section.querySelector('[data-hd="count"]').textContent = String(invoices.length);
      section.querySelector('[data-hd="amount"]').textContent = H.money(amount);
      section.querySelector('[data-hd="tax"]').textContent = H.money(tax);
      section.querySelector('[data-hd="total"]').textContent = H.money(total);
      section.querySelector('.hd-table tbody').innerHTML = invoices.length ? invoices.map(rowHtml).join('') : '<tr><td colspan="7" class="muted">Chưa có hóa đơn</td></tr>';
      if (!initial) ctx.bumpPatch();
    }

    var sales = H.donBan(ctx.key);
    var ss = H.sig(sales.map(function (o) { return { id: o.id, ma: o.ma, customer: o.customer }; }));
    if (ctx.pane.sigs['hoadon.sales'] !== ss) {
      ctx.pane.sigs['hoadon.sales'] = ss;
      var select = section.querySelector('.hd-form').elements['sale'];
      if (select) select.innerHTML = saleOptions(sales);
      if (!initial) ctx.bumpPatch();
    }
  }

  function makeSo(invoices, key) {
    var setupMod = K.modules.caidat;
    var setup = setupMod ? H.data(key, setupMod) : {};
    var year = Number(setup.nam) || new Date().getFullYear();
    var prefix = String(setup.kyHieu || '').trim() || 'HD/' + String(year).slice(-2);
    var n = invoices.length + 1;
    var so;
    do {
      so = prefix + '-' + String(n).padStart(3, '0');
      n++;
    } while (invoices.some(function (inv) { return inv.so === so; }));
    return so;
  }

  function bind(ctx, section) {
    var form = section.querySelector('.hd-form');
    form.elements['date'].value = H.today();
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.currentTarget.elements;
      if (!H.guard(ctx, f['date'].value || H.today(), 'Lập hóa đơn')) return;
      var current = H.data(ctx.key, mod);
      if (!Array.isArray(current.invoices)) current.invoices = [];
      var saleId = String(f['sale'].value || '');
      var sale = H.donBan(ctx.key).filter(function (o) { return o.id === saleId; })[0];
      var customer = sale ? String(sale.customer || 'Khách lẻ') : String(f['customer'].value || '').trim();
      var amount = sale ? Number(sale.amount) || 0 : Number(f['amount'].value) || 0;
      if (!customer || !(amount > 0)) return;
      var rate = Number(f['tax'].value) || 0;
      if (rate < 0 || rate > 100) rate = 0;
      var taxAmount = Math.round(amount * rate) / 100;
      var total = amount + taxAmount;
      var paid = Math.min(Number(f['paid'].value) || 0, total);
      var typed = String(f['so'].value || '').trim();
      if (typed && current.invoices.some(function (inv) { return inv.so === typed; })) {
        ctx.foot('Số hóa đơn ' + typed + ' đã có, hãy dùng số khác.');
        return;
      }
      var so = typed || makeSo(current.invoices, ctx.key);
      var inv = {
        id: H.uid('hd'), so: so,
        date: f['date'].value || H.today(),
        customer: customer,
        saleId: sale ? sale.id : '',
        amount: amount,
        tax: rate,
        taxAmount: taxAmount,
        total: total,
        paid: paid,
        note: String(f['note'].value || '').trim(),
        at: new Date().toISOString()
      };
      current.invoices.push(inv);
      current.updatedAt = new Date().toISOString();
      var writes = [{ module: 'hoadon', value: current }];
      var ctMod = K.modules.chungtu;
      if (paid > 0 && ctMod) {
        var ctStore = H.data(ctx.key, ctMod);
        if (!Array.isArray(ctStore.vouchers)) ctStore.vouchers = [];
        ctStore.rev = (ctStore.rev || 0) + 1;
        ctStore.vouchers.push({
          id: H.uid('v'), date: inv.date, note: 'Thu hóa đơn ' + so,
          account: '111', kind: 'in', amount: paid,
          linkId: inv.id, source: 'hdon-paid', at: new Date().toISOString()
        });
        ctStore.updatedAt = new Date().toISOString();
        writes.push({ module: 'chungtu', value: ctStore });
      }
      if (!H.commit(ctx.key, writes, ctx, 'Đã lưu hóa đơn ' + so + '.')) return;

      e.currentTarget.reset();
      form.elements['date'].value = H.today();
      patch(ctx, section, current, false);
      ctx.sync('baocao');
      if (paid > 0) ctx.sync('chungtu');
    });
  }

  var mod = {
    label: 'Hóa đơn',
    order: 80,
    branch: 'hoadon',
    defaults: defaults,
    mount: mount,
    bind: bind,
    patch: patch
  };
  K.register('hoadon', mod);
})(typeof window !== 'undefined' ? window : this);
