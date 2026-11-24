// Bán hàng: phiếu bán tự trừ tồn kho, ghi phiếu thu và khoản phải thu.
(function (global) {
  'use strict';
  var K = global.Ketoan;
  if (!K) return;
  var H = K.helpers;

  function defaults() {
    return { orders: [], updatedAt: '' };
  }

  function customerOptions(list) {
    return '<option value="">Khách lẻ</option>' + (list || []).map(function (c) {
      return '<option value="' + H.esc(c.id) + '">' + H.esc(c.name) + '</option>';
    }).join('');
  }

  function itemOptions(list) {
    return '<option value="">-- Chọn hàng --</option>' + (list || []).map(function (it) {
      return '<option value="' + H.esc(it.id) + '">' + H.esc(it.name) + '</option>';
    }).join('');
  }

  function mount(ctx) {
    return '<div class="stats">' +
        '<div class="stat"><label>Số phiếu bán</label><b data-bh="count">0</b></div>' +
        '<div class="stat"><label>Doanh thu bán</label><b data-bh="revenue">0 đ</b></div>' +
        '<div class="stat"><label>Đã thu</label><b data-bh="paid">0 đ</b></div>' +
      '</div>' +
      '<div class="card module-card">' +
        '<h3>Bán hàng</h3>' +
        '<form class="bh-form">' +
          '<input name="date" type="date" required>' +
          '<select name="customer">' + customerOptions(H.khachHang(ctx.key)) + '</select>' +
          '<select name="item">' + itemOptions(H.hangHoa(ctx.key)) + '</select>' +
          '<input name="qty" type="number" min="1" step="1" placeholder="Số lượng">' +
          '<input name="price" type="number" min="0" step="1000" placeholder="Đơn giá">' +
          '<input name="paid" type="number" min="0" step="1000" placeholder="Đã thu">' +
          '<input name="note" placeholder="Diễn giải" maxlength="120">' +
          '<button class="btn primary" type="submit">Lưu phiếu bán</button>' +
        '</form>' +
        '<table class="bh-table"><thead><tr><th>Mã</th><th>Ngày</th><th>Khách</th><th>Hàng</th><th>Số lượng</th><th>Thành tiền</th><th>Đã thu</th></tr></thead>' +
          '<tbody></tbody></table>' +
        '<p class="muted">Phiếu bán trừ tồn kho. Tiền đã thu vào chứng từ, phần còn nợ vào công nợ phải thu.</p>' +
      '</div>';
  }

  function rowHtml(o) {
    return '<tr data-bhid="' + H.esc(o.id) + '">' +
      '<td>' + H.esc(o.ma || o.id) + '</td>' +
      '<td>' + H.esc(o.date || '') + '</td>' +
      '<td>' + H.esc(o.customer || 'Khách lẻ') + '</td>' +
      '<td>' + H.esc(o.itemName || '') + '</td>' +
      '<td>' + H.money(o.qty).replace(' đ', '') + '</td>' +
      '<td>' + H.money(o.amount) + '</td>' +
      '<td>' + H.money(o.paid) + '</td>' +
    '</tr>';
  }

  function patch(ctx, section, data, initial) {
    var orders = data.orders || [];
    var so = H.sig(orders);
    if (ctx.pane.sigs['banhang.orders'] !== so) {
      ctx.pane.sigs['banhang.orders'] = so;
      var revenue = 0, paid = 0;
      orders.forEach(function (o) { revenue += Number(o.amount) || 0; paid += Number(o.paid) || 0; });
      section.querySelector('[data-bh="count"]').textContent = String(orders.length);
      section.querySelector('[data-bh="revenue"]').textContent = H.money(revenue);
      section.querySelector('[data-bh="paid"]').textContent = H.money(paid);
      section.querySelector('.bh-table tbody').innerHTML = orders.length ? orders.map(rowHtml).join('') : '<tr><td colspan="7" class="muted">Chưa có phiếu bán</td></tr>';
      if (!initial) ctx.bumpPatch();
    }

    var items = H.hangHoa(ctx.key);
    var si = H.sig(items.map(function (it) { return { id: it.id, name: it.name }; }));
    if (ctx.pane.sigs['banhang.items'] !== si) {
      ctx.pane.sigs['banhang.items'] = si;
      var itemSelect = section.querySelector('.bh-form').elements['item'];
      if (itemSelect) itemSelect.innerHTML = itemOptions(items);
      if (!initial) ctx.bumpPatch();
    }

    var customers = H.khachHang(ctx.key);
    var sc = H.sig(customers.map(function (c) { return { id: c.id, name: c.name }; }));
    if (ctx.pane.sigs['banhang.customers'] !== sc) {
      ctx.pane.sigs['banhang.customers'] = sc;
      var customerSelect = section.querySelector('.bh-form').elements['customer'];
      if (customerSelect) customerSelect.innerHTML = customerOptions(customers);
      if (!initial) ctx.bumpPatch();
    }
  }

  function bind(ctx, section) {
    var form = section.querySelector('.bh-form');
    form.elements['date'].value = H.today();
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.currentTarget.elements;
      var itemId = String(f['item'].value || '');
      var item = H.hangHoa(ctx.key).filter(function (it) { return it.id === itemId; })[0];
      if (!item) { ctx.foot('Hãy chọn hàng hóa để bán.'); return; }
      var qty = Number(f['qty'].value) || 0;
      var price = Number(f['price'].value) || 0;
      if (!(qty > 0) || !(price > 0)) return;
      var customerId = String(f['customer'].value || '');
      var customer = H.khachHang(ctx.key).filter(function (c) { return c.id === customerId; })[0];
      var customerName = customer ? customer.name : 'Khách lẻ';
      var amount = qty * price;
      var paid = Math.min(Number(f['paid'].value) || 0, amount);
      var remain = amount - paid;

      var stockMod = K.modules.tonkho;
      if (!stockMod) { ctx.foot('Chưa có phần kho hàng.'); return; }
      var stock = H.data(ctx.key, stockMod);
      if (!stock.stock || typeof stock.stock !== 'object' || Array.isArray(stock.stock)) stock.stock = {};
      if (!Array.isArray(stock.movements)) stock.movements = [];
      var before = Number(stock.stock[itemId]) || 0;
      if (qty > before) { ctx.foot('Tồn kho không đủ để bán ' + qty + ' ' + (item.extra || '') + '.'); return; }
      stock.stock[itemId] = before - qty;
      stock.movements.push({
        id: H.uid('k'), type: 'xuat', itemId: itemId, qty: qty,
        note: 'Bán hàng cho ' + customerName, at: new Date().toISOString()
      });
      stock.updatedAt = new Date().toISOString();
      if (!H.save(ctx.key, stockMod, stock)) { ctx.foot('Dữ liệu đang ở chế độ chỉ đọc, chưa lưu được tồn kho.'); return; }

      var current = H.data(ctx.key, mod);
      if (!Array.isArray(current.orders)) current.orders = [];
      var order = {
        id: H.uid('bh'),
        ma: 'BH-' + String(current.orders.length + 1).padStart(4, '0'),
        date: f['date'].value || H.today(),
        customer: customerName,
        customerId: customerId,
        itemId: itemId,
        itemName: item.name,
        qty: qty,
        price: price,
        amount: amount,
        paid: paid,
        note: String(f['note'].value || '').trim(),
        source: 'banhang',
        at: new Date().toISOString()
      };
      current.orders.push(order);
      current.updatedAt = new Date().toISOString();
      var saved = H.save(ctx.key, mod, current);
      if (!saved) { ctx.foot('Dữ liệu đang ở chế độ chỉ đọc, chưa lưu được phiếu bán.'); return; }

      if (paid > 0) {
        var ctMod = K.modules.chungtu;
        if (ctMod) {
          var ct = H.data(ctx.key, ctMod);
          if (!Array.isArray(ct.vouchers)) ct.vouchers = [];
          ct.vouchers.push({
            id: H.uid('v'), date: order.date,
            note: 'Bán hàng ' + order.ma + ' cho ' + customerName,
            account: '511', kind: 'in', amount: paid, source: 'banhang:' + order.id
          });
          H.save(ctx.key, ctMod, ct);
        }
      }
      if (remain > 0) {
        var cnMod = K.modules.congno;
        if (cnMod) {
          var cn = H.data(ctx.key, cnMod);
          if (!Array.isArray(cn.records)) cn.records = [];
          cn.records.push({
            id: H.uid('cn'), type: 'phaiThu', partner: customerName,
            amount: remain, paid: 0, due: '', source: 'banhang:' + order.id
          });
          H.save(ctx.key, cnMod, cn);
        }
      }

      e.currentTarget.reset();
      form.elements['date'].value = H.today();
      patch(ctx, section, current, false);
      ctx.sync('tonkho');
      ctx.sync('chungtu');
      ctx.sync('congno');
      ctx.sync('hoadon');
      ctx.sync('baocao');
      ctx.foot('Đã lưu phiếu bán ' + order.ma + '.');
    });
  }

  var mod = {
    label: 'Bán hàng',
    order: 70,
    branch: 'banhang',
    defaults: defaults,
    mount: mount,
    bind: bind,
    patch: patch
  };
  K.register('banhang', mod);
})(typeof window !== 'undefined' ? window : this);
