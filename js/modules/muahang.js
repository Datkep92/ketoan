// Mua hàng: nhập kho, ghi nợ nhà cung cấp và phát hành hóa đơn đầu vào.
(function (global) {
  'use strict';
  var K = global.Ketoan;
  if (!K) return;
  var H = K.helpers;

  function defaults() {
    return { purchases: [], bills: [], updatedAt: '' };
  }

  function supplierOptions(list) {
    return '<option value="">-- Chọn nhà cung cấp --</option>' + (list || []).map(function (s) {
      return '<option value="' + H.esc(s.id) + '">' + H.esc(s.name) + '</option>';
    }).join('');
  }

  function itemOptions(list) {
    return '<option value="">-- Chọn hàng --</option>' + (list || []).map(function (it) {
      var label = H.esc(it.name) + (it.code ? ' (' + H.esc(it.code) + ')' : '');
      return '<option value="' + H.esc(it.id) + '">' + label + '</option>';
    }).join('');
  }

  function purchaseOptions(list) {
    return '<option value="">Tự nhập</option>' + (list || []).map(function (p) {
      return '<option value="' + H.esc(p.id) + '">' + H.esc(p.ma || p.id) + ' — ' + H.esc(p.supplier || '') + '</option>';
    }).join('');
  }

  function returnOptions(list) {
    return '<option value="">-- Chọn phiếu mua --</option>' + (list || []).map(function (p) {
      return '<option value="' + H.esc(p.id) + '">' + H.esc(p.ma || p.id) + ' — ' + H.esc(p.supplier || '') + '</option>';
    }).join('');
  }

  function mount(ctx) {
    return '<div class="stats">' +
        '<div class="stat"><label>Số phiếu mua</label><b data-mh="count">0</b></div>' +
        '<div class="stat"><label>Tổng mua</label><b data-mh="amount">0 đ</b></div>' +
        '<div class="stat"><label>Đã trả</label><b data-mh="paid">0 đ</b></div>' +
        '<div class="stat"><label>Hóa đơn đầu vào</label><b data-mh="billTotal">0 đ</b></div>' +
      '</div>' +
      '<div class="card module-card">' +
        '<h3>Mua hàng</h3>' +
        '<form class="mh-form">' +
          '<input name="date" type="date" required>' +
          '<select name="supplier"></select>' +
          '<select name="item"></select>' +
          '<input name="qty" type="number" min="1" step="1" placeholder="Số lượng">' +
          '<input name="price" type="number" min="0" step="1000" placeholder="Đơn giá">' +
          '<input name="tax" type="number" min="0" max="100" step="1" placeholder="Thuế suất %">' +
          '<input name="paid" type="number" min="0" step="1000" placeholder="Đã trả">' +
          '<input name="note" placeholder="Diễn giải" maxlength="120">' +
          '<button class="btn primary" type="submit">Lưu phiếu mua</button>' +
        '</form>' +
        '<table class="mh-table"><thead><tr><th>Mã</th><th>Ngày</th><th>Nhà cung cấp</th><th>Hàng</th>' +
          '<th>Số lượng</th><th>Tiền hàng</th><th>Thuế</th><th>Tổng</th><th>Đã trả</th></tr></thead><tbody></tbody></table>' +
        '<p class="muted">Phiếu mua cộng vào tồn kho. Tiền đã trả thành chứng từ chi, phần chưa trả thành khoản phải trả.</p>' +
      '</div>' +
      '<div class="card module-card">' +
        '<h3>Hóa đơn đầu vào</h3>' +
        '<form class="mh-bill-form">' +
          '<select name="purchase"></select>' +
          '<input name="so" placeholder="Số hóa đơn (để trống tự tạo)" maxlength="40">' +
          '<input name="date" type="date" required>' +
          '<input name="supplier" placeholder="Nhà cung cấp" maxlength="120">' +
          '<input name="amount" type="number" min="0" step="1000" placeholder="Tiền hàng">' +
          '<input name="tax" type="number" min="0" max="100" step="1" placeholder="Thuế suất %">' +
          '<input name="paid" type="number" min="0" step="1000" placeholder="Đã trả">' +
          '<input name="note" placeholder="Diễn giải" maxlength="120">' +
          '<button class="btn primary" type="submit">Lưu hóa đơn</button>' +
        '</form>' +
        '<table class="mh-bill-table"><thead><tr><th>Số</th><th>Ngày</th><th>Nhà cung cấp</th>' +
          '<th>Tiền hàng</th><th>Thuế</th><th>Tổng</th><th>Đã trả</th></tr></thead><tbody></tbody></table>' +
      '</div>' +
      '<div class="card module-card">' +
        '<h3>Trả hàng mua</h3>' +
        '<form class="mh-return-form">' +
          '<select name="purchase"></select>' +
          '<input name="date" type="date" required>' +
          '<input name="qty" type="number" min="1" step="1" placeholder="Số lượng trả">' +
          '<input name="note" placeholder="Lý do trả" maxlength="120">' +
          '<button class="btn primary" type="submit">Ghi nhận trả hàng</button>' +
        '</form>' +
        '<table class="mh-return-table"><thead><tr><th>Phiếu mua</th><th>Ngày</th><th>Số lượng</th>' +
          '<th>Giá trị</th><th>Lý do</th></tr></thead><tbody></tbody></table>' +
        '<p class="muted">Hàng trả được trừ vào tồn kho và giảm công nợ phải trả cho nhà cung cấp.</p>' +
      '</div>';
  }

  function purchaseRow(p) {
    return '<tr data-mhid="' + H.esc(p.id) + '">' +
      '<td>' + H.esc(p.ma || p.id) + '</td>' +
      '<td>' + H.esc(p.date || '') + '</td>' +
      '<td>' + H.esc(p.supplier || '') + '</td>' +
      '<td>' + H.esc(p.itemName || '') + '</td>' +
      '<td>' + H.money(p.qty).replace(' đ', '') + '</td>' +
      '<td>' + H.money(p.amount) + '</td>' +
      '<td>' + H.money(p.taxAmount) + '</td>' +
      '<td><b>' + H.money(p.total) + '</b></td>' +
      '<td>' + H.money(p.paid) + '</td>' +
    '</tr>';
  }

  function billRow(b) {
    return '<tr data-mhbid="' + H.esc(b.id) + '">' +
      '<td>' + H.esc(b.so) + '</td>' +
      '<td>' + H.esc(b.date || '') + '</td>' +
      '<td>' + H.esc(b.supplier || '') + '</td>' +
      '<td>' + H.money(b.amount) + '</td>' +
      '<td>' + H.money(b.taxAmount) + '</td>' +
      '<td><b>' + H.money(b.total) + '</b></td>' +
      '<td>' + H.money(b.paid) + '</td>' +
    '</tr>';
  }

  function patch(ctx, section, data, initial) {
    var purchases = data.purchases || [];
    var bills = data.bills || [];
    var suppliers = H.nhaCungCap(ctx.key).map(function (s) { return { id: s.id, name: s.name }; });
    var items = H.hangHoa(ctx.key).map(function (it) { return { id: it.id, name: it.name, code: it.code }; });
    var s = H.sig({ p: purchases, b: bills, suppliers: suppliers, items: items });
    if (ctx.pane.sigs['muahang.data'] === s) return;
    ctx.pane.sigs['muahang.data'] = s;

    var amount = 0, paid = 0, billTotal = 0;
    var returnRows = [];
    purchases.forEach(function (p) {
      amount += Number(p.total) || 0;
      paid += Number(p.paid) || 0;
      (p.returns || []).forEach(function (r) {
        returnRows.push('<tr data-mhrid="' + H.esc(r.id) + '">' +
          '<td>' + H.esc(p.ma || p.id) + '</td>' +
          '<td>' + H.esc(r.date || '') + '</td>' +
          '<td>' + H.money(r.qty).replace(' đ', '') + '</td>' +
          '<td>' + H.money(r.total) + '</td>' +
          '<td>' + H.esc(r.note || '') + '</td></tr>');
      });
    });
    bills.forEach(function (b) { billTotal += Number(b.total) || 0; });
    section.querySelector('[data-mh="count"]').textContent = String(purchases.length);
    section.querySelector('[data-mh="amount"]').textContent = H.money(amount);
    section.querySelector('[data-mh="paid"]').textContent = H.money(paid);
    section.querySelector('[data-mh="billTotal"]').textContent = H.money(billTotal);
    section.querySelector('.mh-table tbody').innerHTML = purchases.length
      ? purchases.map(purchaseRow).join('')
      : '<tr><td colspan="9" class="muted">Chưa có phiếu mua</td></tr>';
    section.querySelector('.mh-bill-table tbody').innerHTML = bills.length
      ? bills.map(billRow).join('')
      : '<tr><td colspan="7" class="muted">Chưa có hóa đơn đầu vào</td></tr>';
    section.querySelector('.mh-return-table tbody').innerHTML = returnRows.length
      ? returnRows.join('')
      : '<tr><td colspan="5" class="muted">Chưa có lần trả hàng</td></tr>';

    var mainForm = section.querySelector('.mh-form');
    mainForm.elements['supplier'].innerHTML = supplierOptions(suppliers);
    mainForm.elements['item'].innerHTML = itemOptions(items);
    section.querySelector('.mh-bill-form').elements['purchase'].innerHTML = purchaseOptions(purchases);
    section.querySelector('.mh-return-form').elements['purchase'].innerHTML = returnOptions(purchases.filter(function (p) {
      return (Number(p.returnedQty) || 0) < (Number(p.qty) || 0);
    }));
    if (!initial) ctx.bumpPatch();
  }

  function makeBillSo(key, bills) {
    var setup = H.branch(key, 'caidat');
    var year = Number(setup.nam) || new Date().getFullYear();
    var prefix = 'HH/' + String(year).slice(-2);
    var n = 1, so;
    do {
      so = prefix + '-' + String(n).padStart(3, '0');
      n++;
    } while (bills.some(function (b) { return b.so === so; }));
    return so;
  }

  function bind(ctx, section) {
    var form = section.querySelector('.mh-form');
    form.elements['date'].value = H.today();
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.currentTarget.elements;
      if (!H.guard(ctx, f['date'].value || H.today(), 'Thêm phiếu mua')) return;
      var supplierId = String(f['supplier'].value || '');
      var supplier = H.nhaCungCap(ctx.key).filter(function (s) { return s.id === supplierId; })[0];
      if (!supplier) { ctx.foot('Hãy chọn nhà cung cấp.'); return; }
      var itemId = String(f['item'].value || '');
      var item = H.hangHoa(ctx.key).filter(function (it) { return it.id === itemId; })[0];
      if (!item) { ctx.foot('Hãy chọn hàng hóa để mua.'); return; }
      var qty = Number(f['qty'].value) || 0;
      var price = Number(f['price'].value) || 0;
      if (!(qty > 0) || !(price > 0)) return;
      var rate = Number(f['tax'].value) || 0;
      if (rate < 0 || rate > 100) rate = 0;
      var amount = H.roundMoney(qty * price);
      var taxAmount = H.roundMoney(amount * rate / 100);
      var total = H.roundMoney(amount + taxAmount);
      var paid = Math.min(H.roundMoney(Number(f['paid'].value) || 0), total);
      var remain = H.roundMoney(total - paid);

      var current = H.data(ctx.key, mod);
      if (!Array.isArray(current.purchases)) current.purchases = [];
      if (!Array.isArray(current.bills)) current.bills = [];
      var purchase = {
        id: H.uid('mh'), ma: H.nextCode(current.purchases, 'MH', 4),
        date: f['date'].value || H.today(),
        supplier: supplier.name, supplierId: supplierId,
        itemId: itemId, itemName: item.name,
        qty: qty, price: price, amount: amount,
        tax: rate, taxAmount: taxAmount, total: total, paid: paid,
        note: String(f['note'].value || '').trim(),
        source: 'muahang', at: new Date().toISOString()
      };
      current.purchases.push(purchase);
      current.updatedAt = new Date().toISOString();

      var stockMod = K.modules.tonkho;
      var stock = stockMod ? H.data(ctx.key, stockMod) : null;
      var writes = [{ module: 'muahang', value: current }];
      if (stock) {
        if (!stock.stock || typeof stock.stock !== 'object' || Array.isArray(stock.stock)) stock.stock = {};
        if (!Array.isArray(stock.movements)) stock.movements = [];
        stock.stock[itemId] = (Number(stock.stock[itemId]) || 0) + qty;
        stock.movements.push({
          id: H.uid('k'), type: 'nhap', itemId: itemId, qty: qty,
          note: 'Mua hàng ' + purchase.ma + ' từ ' + supplier.name, at: new Date().toISOString()
        });
        stock.updatedAt = new Date().toISOString();
        writes.push({ module: 'tonkho', value: stock });
      }
      if (paid > 0) {
        var ctMod = K.modules.chungtu;
        if (ctMod) {
          var ct = H.data(ctx.key, ctMod);
          if (!Array.isArray(ct.vouchers)) ct.vouchers = [];
          ct.vouchers.push({
            id: H.uid('v'), date: purchase.date,
            note: 'Trả tiền mua hàng ' + purchase.ma + ' cho ' + supplier.name,
            account: '111', kind: 'out', amount: paid, source: 'muahang:' + purchase.id
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
            id: H.uid('cn'), type: 'phaiTra', partner: supplier.name,
            amount: remain, paid: 0, due: '', source: 'muahang:' + purchase.id
          });
          writes.push({ module: 'congno', value: cn });
        }
      }
      if (!H.commit(ctx.key, writes, ctx, 'Đã lưu phiếu mua ' + purchase.ma + '.')) return;

      e.currentTarget.reset();
      form.elements['date'].value = H.today();
      patch(ctx, section, current, false);
      ctx.sync('tonkho');
      ctx.sync('chungtu');
      ctx.sync('congno');
      ctx.sync('baocao');
    });

    var billForm = section.querySelector('.mh-bill-form');
    billForm.elements['date'].value = H.today();
    billForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.currentTarget.elements;
      if (!H.guard(ctx, f['date'].value || H.today(), 'Lập hóa đơn đầu vào')) return;
      var current = H.data(ctx.key, mod);
      if (!Array.isArray(current.bills)) current.bills = [];
      var purchaseId = String(f['purchase'].value || '');
      var purchase = current.purchases.filter(function (p) { return p.id === purchaseId; })[0];
      var supplier = purchase ? purchase.supplier : String(f['supplier'].value || '').trim();
      var amount = purchase ? Number(purchase.amount) || 0 : H.roundMoney(Number(f['amount'].value) || 0);
      if (!supplier || !(amount > 0)) return;
      var rate = Number(f['tax'].value) || 0;
      if (rate < 0 || rate > 100) rate = 0;
      var taxAmount = purchase ? Number(purchase.taxAmount) || 0 : H.roundMoney(amount * rate / 100);
      var total = H.roundMoney(amount + taxAmount);
      var paid = Math.min(H.roundMoney(Number(f['paid'].value) || 0), total);
      var typed = String(f['so'].value || '').trim();
      if (typed && current.bills.some(function (b) { return b.so === typed; })) {
        ctx.foot('Số hóa đơn ' + typed + ' đã có, hãy dùng số khác.');
        return;
      }
      var so = typed || makeBillSo(ctx.key, current.bills);
      current.bills.push({
        id: H.uid('mhb'), so: so,
        date: f['date'].value || H.today(),
        supplier: supplier, purchaseId: purchase ? purchase.id : '',
        amount: amount, tax: purchase ? purchase.tax : rate,
        taxAmount: taxAmount, total: total, paid: paid,
        note: String(f['note'].value || '').trim(),
        at: new Date().toISOString()
      });
      current.updatedAt = new Date().toISOString();
      if (!H.commit(ctx.key, [{ module: 'muahang', value: current }], ctx, 'Đã lưu hóa đơn đầu vào ' + so + '.')) return;

      e.currentTarget.reset();
      billForm.elements['date'].value = H.today();
      patch(ctx, section, current, false);
      ctx.sync('baocao');
    });

    var returnForm = section.querySelector('.mh-return-form');
    returnForm.elements['date'].value = H.today();
    returnForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.currentTarget.elements;
      var returnDate = f['date'] ? (f['date'].value || H.today()) : H.today();
      if (!H.guard(ctx, returnDate, 'Trả hàng mua')) return;
      var current = H.data(ctx.key, mod);
      if (!Array.isArray(current.purchases)) current.purchases = [];
      var id = String(f['purchase'].value || '');
      var purchase = current.purchases.filter(function (p) { return p.id === id; })[0];
      if (!purchase) { ctx.foot('Hãy chọn phiếu mua cần trả.'); return; }
      var qty = Number(f['qty'].value) || 0;
      var bought = Number(purchase.qty) || 0;
      var done = Number(purchase.returnedQty) || 0;
      if (!(qty > 0) || qty > bought - done) { ctx.foot('Số lượng trả không hợp lệ.'); return; }
      var total = H.roundMoney(bought > 0 ? (Number(purchase.total) || 0) * qty / bought : 0);

      var stockMod = K.modules.tonkho;
      var stock = stockMod ? H.data(ctx.key, stockMod) : null;
      if (stock) {
        if (!stock.stock || typeof stock.stock !== 'object' || Array.isArray(stock.stock)) stock.stock = {};
        if ((Number(stock.stock[purchase.itemId]) || 0) < qty) {
          ctx.foot('Tồn kho không đủ để trả hàng mua.'); return;
        }
      }
      var writes = [{ module: 'muahang', value: current }];
      if (stock) {
        if (!Array.isArray(stock.movements)) stock.movements = [];
        stock.stock[purchase.itemId] = (Number(stock.stock[purchase.itemId]) || 0) - qty;
        stock.movements.push({
          id: H.uid('k'), type: 'xuat', itemId: purchase.itemId, qty: qty,
          note: 'Trả hàng mua phiếu ' + (purchase.ma || purchase.id), at: new Date().toISOString()
        });
        stock.updatedAt = new Date().toISOString();
        writes.push({ module: 'tonkho', value: stock });
      }
      var cnMod = K.modules.congno;
      if (cnMod) {
        var cn = H.data(ctx.key, cnMod);
        if (!Array.isArray(cn.records)) cn.records = [];
        var debt = cn.records.filter(function (r) { return r.source === 'muahang:' + purchase.id; })[0];
        if (debt) {
          debt.amount = Math.max(0, H.roundMoney((Number(debt.amount) || 0) - total));
          writes.push({ module: 'congno', value: cn });
        }
      }
      if (!Array.isArray(purchase.returns)) purchase.returns = [];
      purchase.returns.push({
        id: H.uid('mhr'), date: f['date'].value || H.today(), qty: qty,
        total: total, note: String(f['note'].value || '').trim(), at: new Date().toISOString()
      });
      purchase.returnedQty = done + qty;
      purchase.returned = H.roundMoney((Number(purchase.returned) || 0) + total);
      current.updatedAt = new Date().toISOString();
      if (!H.commit(ctx.key, writes, ctx, 'Đã ghi trả hàng mua phiếu ' + (purchase.ma || purchase.id) + '.')) return;

      e.currentTarget.reset();
      returnForm.elements['date'].value = H.today();
      patch(ctx, section, current, false);
      ctx.sync('tonkho');
      ctx.sync('congno');
      ctx.sync('baocao');
    });
  }

  var mod = {
    label: 'Mua hàng',
    order: 90,
    branch: 'muahang',
    defaults: defaults,
    mount: mount,
    bind: bind,
    patch: patch
  };
  K.register('muahang', mod);
})(typeof window !== 'undefined' ? window : this);
