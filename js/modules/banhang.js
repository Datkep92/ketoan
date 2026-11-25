// Bán hàng: phiếu bán tự trừ tồn kho, ghi phiếu thu và khoản phải thu.
// Mở rộng: chiết khấu, trả hàng và gộp ghi nhiều nhánh để dữ liệu không lệch.
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

  function orderOptions(list) {
    return '<option value="">-- Chọn phiếu bán --</option>' + (list || []).map(function (o) {
      var left = (Number(o.qty) || 0) - (Number(o.returnedQty) || 0);
      if (left <= 0) return '';
      return '<option value="' + H.esc(o.id) + '">' + H.esc(o.ma || o.id) + ' — ' +
        H.esc(o.customer || 'Khách lẻ') + ' (còn ' + left + ')</option>';
    }).join('');
  }

  function mount(ctx) {
    return '<div class="stats">' +
        '<div class="stat"><label>Số phiếu bán</label><b data-bh="count">0</b></div>' +
        '<div class="stat"><label>Doanh thu bán</label><b data-bh="revenue">0 đ</b></div>' +
        '<div class="stat"><label>Đã thu</label><b data-bh="paid">0 đ</b></div>' +
        '<div class="stat"><label>Đã trả hàng</label><b data-bh="returned">0 đ</b></div>' +
        '<div class="stat"><label>Giá vốn</label><b data-bh="cogs">0 đ</b></div>' +
      '</div>' +
      '<div class="card module-card">' +
        '<h3>Bán hàng</h3>' +
        '<form class="bh-form">' +
          '<input name="date" type="date" required>' +
          '<select name="customer">' + customerOptions(H.khachHang(ctx.key)) + '</select>' +
          '<select name="item">' + itemOptions(H.hangHoa(ctx.key)) + '</select>' +
          '<input name="qty" type="number" min="1" step="1" placeholder="Số lượng">' +
          '<input name="price" type="number" min="0" step="1000" placeholder="Đơn giá">' +
          '<input name="cost" type="number" min="0" step="1000" placeholder="Giá vốn đơn vị">' +
          '<input name="discount" type="number" min="0" max="100" step="1" placeholder="Chiết khấu %">' +
          '<input name="paid" type="number" min="0" step="1000" placeholder="Đã thu">' +
          '<input name="note" placeholder="Diễn giải" maxlength="120">' +
          '<button class="btn primary" type="submit">Lưu phiếu bán</button>' +
        '</form>' +
        '<table class="bh-table"><thead><tr><th>Mã</th><th>Ngày</th><th>Khách</th><th>Hàng</th>' +
          '<th>Số lượng</th><th>Chiết khấu</th><th>Thành tiền</th><th>Đã thu</th><th>Trả hàng</th></tr></thead>' +
          '<tbody></tbody></table>' +
        '<p class="muted">Phiếu bán trừ tồn kho. Tiền đã thu vào chứng từ, phần còn nợ vào công nợ phải thu.</p>' +
      '</div>' +
      '<div class="card module-card">' +
        '<h3>Trả hàng</h3>' +
        '<form class="bh-return-form">' +
          '<select name="order"></select>' +
          '<input name="date" type="date" required>' +
          '<input name="qty" type="number" min="1" step="1" placeholder="Số lượng trả">' +
          '<input name="note" placeholder="Lý do trả" maxlength="120">' +
          '<button class="btn primary" type="submit">Ghi nhận trả hàng</button>' +
        '</form>' +
        '<table class="bh-return-table"><thead><tr><th>Phiếu</th><th>Ngày</th><th>Số lượng</th>' +
          '<th>Số tiền</th><th>Lý do</th></tr></thead><tbody></tbody></table>' +
        '<p class="muted">Hàng trả được cộng lại vào tồn kho; tiền đã thu được hoàn lại và công nợ được giảm tương ứng.</p>' +
      '</div>';
  }

  function rowHtml(o) {
    var returned = Number(o.returnedQty) || 0;
    var status = returned <= 0 ? '—' : (returned >= (Number(o.qty) || 0) ? 'Đã trả hết' : 'Trả một phần');
    return '<tr data-bhid="' + H.esc(o.id) + '">' +
      '<td>' + H.esc(o.ma || o.id) + '</td>' +
      '<td>' + H.esc(o.date || '') + '</td>' +
      '<td>' + H.esc(o.customer || 'Khách lẻ') + '</td>' +
      '<td>' + H.esc(o.itemName || '') + '</td>' +
      '<td>' + H.money(o.qty).replace(' đ', '') + '</td>' +
      '<td>' + (Number(o.discount) || 0) + '%</td>' +
      '<td>' + H.money(o.amount) + '</td>' +
      '<td>' + H.money(o.paid) + '</td>' +
      '<td>' + H.esc(status) + '</td>' +
    '</tr>';
  }

  function returnRowHtml(o, r) {
    return '<tr data-bhrid="' + H.esc(r.id) + '">' +
      '<td>' + H.esc(o.ma || o.id) + '</td>' +
      '<td>' + H.esc(r.date || '') + '</td>' +
      '<td>' + H.money(r.qty).replace(' đ', '') + '</td>' +
      '<td>' + H.money(r.amount) + '</td>' +
      '<td>' + H.esc(r.note || '') + '</td>' +
    '</tr>';
  }

  function patch(ctx, section, data, initial) {
    var orders = data.orders || [];
    var so = H.sig(orders);
    if (ctx.pane.sigs['banhang.orders'] !== so) {
      ctx.pane.sigs['banhang.orders'] = so;
      var revenue = 0, paid = 0, returned = 0, cogs = 0;
      var returnRows = [];
      orders.forEach(function (o) {
        revenue += (Number(o.amount) || 0) - (Number(o.returned) || 0);
        paid += Number(o.paid) || 0;
        returned += Number(o.returned) || 0;
        cogs += Number(o.cogs) || 0;
        (o.returns || []).forEach(function (r) {
          returnRows.push(returnRowHtml(o, r));
          cogs -= Number(r.cogs) || 0;
        });
      });
      section.querySelector('[data-bh="count"]').textContent = String(orders.length);
      section.querySelector('[data-bh="revenue"]').textContent = H.money(revenue);
      section.querySelector('[data-bh="paid"]').textContent = H.money(paid);
      section.querySelector('[data-bh="returned"]').textContent = H.money(returned);
      section.querySelector('[data-bh="cogs"]').textContent = H.money(H.roundMoney(cogs));
      section.querySelector('.bh-table tbody').innerHTML = orders.length
        ? orders.map(rowHtml).join('')
        : '<tr><td colspan="9" class="muted">Chưa có phiếu bán</td></tr>';
      section.querySelector('.bh-return-table tbody').innerHTML = returnRows.length
        ? returnRows.join('')
        : '<tr><td colspan="5" class="muted">Chưa có lần trả hàng</td></tr>';
      section.querySelector('.bh-return-form').elements['order'].innerHTML = orderOptions(orders);
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
      if (!H.guard(ctx, f['date'].value || H.today(), 'Thêm phiếu bán')) return;
      var itemId = String(f['item'].value || '');
      var item = H.hangHoa(ctx.key).filter(function (it) { return it.id === itemId; })[0];
      if (!item) { ctx.foot('Hãy chọn hàng hóa để bán.'); return; }
      var qty = Number(f['qty'].value) || 0;
      var price = Number(f['price'].value) || 0;
      if (!(qty > 0) || !(price > 0)) return;
      var discount = Number(f['discount'].value) || 0;
      if (discount < 0 || discount > 100) discount = 0;
      var customerId = String(f['customer'].value || '');
      var customer = H.khachHang(ctx.key).filter(function (c) { return c.id === customerId; })[0];
      var customerName = customer ? customer.name : 'Khách lẻ';
      var gross = H.roundMoney(qty * price);
      var discountAmount = H.roundMoney(gross * discount / 100);
      var amount = H.roundMoney(gross - discountAmount);
      var cogs = H.roundMoney(qty * (Number(f['cost'].value) || 0));
      var manualCost = Number(f['cost'].value) || 0;
      var paid = Math.min(H.roundMoney(Number(f['paid'].value) || 0), amount);
      var remain = H.roundMoney(amount - paid);
      if (!(amount > 0)) return;

      var stockMod = K.modules.tonkho;
      if (!stockMod) { ctx.foot('Chưa có phần kho hàng.'); return; }
      var stock = H.data(ctx.key, stockMod);
      if (!stock.stock || typeof stock.stock !== 'object' || Array.isArray(stock.stock)) stock.stock = {};
      if (!Array.isArray(stock.movements)) stock.movements = [];
      var before = Number(stock.stock[itemId]) || 0;
      if (qty > before) { ctx.foot('Tồn kho không đủ để bán ' + qty + ' ' + (item.extra || '') + '.'); return; }
      var at = new Date().toISOString();
      var lotCost = H.stockOut(stock, itemId, qty, item.price || price, H.valuation(ctx.key), at);
      if (!manualCost) cogs = lotCost;
      stock.stock[itemId] = before - qty;
      stock.movements.push({
        id: H.uid('k'), type: 'xuat', itemId: itemId, qty: qty,
        note: 'Bán hàng cho ' + customerName, at: at
      });
      stock.updatedAt = new Date().toISOString();

      var current = H.data(ctx.key, mod);
      if (!Array.isArray(current.orders)) current.orders = [];
      var order = {
        id: H.uid('bh'),
        ma: H.nextCode(current.orders, 'BH', 4),
        date: f['date'].value || H.today(),
        customer: customerName,
        customerId: customerId,
        itemId: itemId,
        itemName: item.name,
        qty: qty,
        price: price,
        gross: gross,
        discount: discount,
        discountAmount: discountAmount,
        amount: amount,
        paid: paid,
        cogs: cogs,
        returned: 0,
        returnedQty: 0,
        returns: [],
        note: String(f['note'].value || '').trim(),
        source: 'banhang',
        at: new Date().toISOString()
      };
      current.orders.push(order);
      current.updatedAt = new Date().toISOString();

      var writes = [
        { module: 'tonkho', value: stock },
        { module: 'banhang', value: current }
      ];
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
          writes.push({ module: 'chungtu', value: ct });
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
          writes.push({ module: 'congno', value: cn });
        }
      }
      if (!H.commit(ctx.key, writes, ctx, 'Đã lưu phiếu bán ' + order.ma + '.')) return;

      e.currentTarget.reset();
      form.elements['date'].value = H.today();
      patch(ctx, section, current, false);
      ctx.sync('tonkho');
      ctx.sync('chungtu');
      ctx.sync('congno');
      ctx.sync('hoadon');
      ctx.sync('baocao');
    });

    var returnForm = section.querySelector('.bh-return-form');
    returnForm.elements['date'].value = H.today();
    returnForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.currentTarget.elements;
      if (!H.guard(ctx, f['date'].value || H.today(), 'Trả hàng bán')) return;
      var current = H.data(ctx.key, mod);
      if (!Array.isArray(current.orders)) current.orders = [];
      var id = String(f['order'].value || '');
      var order = current.orders.filter(function (o) { return o.id === id; })[0];
      if (!order) { ctx.foot('Hãy chọn phiếu bán cần trả.'); return; }
      var qty = Number(f['qty'].value) || 0;
      var sold = Number(order.qty) || 0;
      var returnedQty = Number(order.returnedQty) || 0;
      if (!(qty > 0) || qty > sold - returnedQty) { ctx.foot('Số lượng trả không hợp lệ.'); return; }
      var unit = sold > 0 ? (Number(order.amount) || 0) / sold : 0;
      var amount = H.roundMoney(unit * qty);
      var backCogs = H.roundMoney(sold > 0 ? (Number(order.cogs) || 0) * qty / sold : 0);
      var refund = Math.min(amount, Number(order.paid) || 0);

      var stockMod = K.modules.tonkho;
      var stock = stockMod ? H.data(ctx.key, stockMod) : null;
      var writes = [{ module: 'banhang', value: current }];
      if (stock) {
        if (!stock.stock || typeof stock.stock !== 'object' || Array.isArray(stock.stock)) stock.stock = {};
        if (!Array.isArray(stock.movements)) stock.movements = [];
        var at = new Date().toISOString();
        stock.stock[order.itemId] = (Number(stock.stock[order.itemId]) || 0) + qty;
        H.stockIn(stock, order.itemId, qty, qty > 0 ? backCogs / qty : 0, at);
        stock.movements.push({
          id: H.uid('k'), type: 'nhap', itemId: order.itemId, qty: qty,
          note: 'Trả hàng phiếu ' + (order.ma || order.id), at: at
        });
        stock.updatedAt = new Date().toISOString();
        writes.push({ module: 'tonkho', value: stock });
      }
      if (refund > 0) {
        var ctMod = K.modules.chungtu;
        if (ctMod) {
          var ct = H.data(ctx.key, ctMod);
          if (!Array.isArray(ct.vouchers)) ct.vouchers = [];
          ct.vouchers.push({
            id: H.uid('v'), date: f['date'].value || H.today(),
            note: 'Hoàn tiền trả hàng phiếu ' + (order.ma || order.id),
            account: '111', kind: 'out', amount: refund, source: 'banhang-return:' + order.id
          });
          writes.push({ module: 'chungtu', value: ct });
        }
      }
      var cnMod = K.modules.congno;
      if (cnMod) {
        var cn = H.data(ctx.key, cnMod);
        if (!Array.isArray(cn.records)) cn.records = [];
        var debt = cn.records.filter(function (r) { return r.source === 'banhang:' + order.id; })[0];
        if (debt) {
          // Khoản công nợ từ phiếu bán chỉ ghi phần chưa thu, nên chỉ giảm
          // phần trả hàng chưa được hoàn tiền; phần đã hoàn không đụng vào nợ.
          var debtCut = Math.max(0, H.roundMoney(amount - refund));
          debt.amount = Math.max(0, H.roundMoney((Number(debt.amount) || 0) - debtCut));
          writes.push({ module: 'congno', value: cn });
        }
      }

      if (!Array.isArray(order.returns)) order.returns = [];
      order.returns.push({
        id: H.uid('bhr'), date: f['date'].value || H.today(),
        qty: qty, amount: amount, refund: refund, cogs: backCogs,
        note: String(f['note'].value || '').trim(), at: new Date().toISOString()
      });
      order.returned = H.roundMoney((Number(order.returned) || 0) + amount);
      order.returnedQty = returnedQty + qty;
      current.updatedAt = new Date().toISOString();

      if (!H.commit(ctx.key, writes, ctx, 'Đã ghi nhận trả hàng ' + (order.ma || order.id) + '.')) return;

      e.currentTarget.reset();
      returnForm.elements['date'].value = H.today();
      patch(ctx, section, current, false);
      ctx.sync('tonkho');
      ctx.sync('chungtu');
      ctx.sync('congno');
      ctx.sync('baocao');
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
