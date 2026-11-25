// Kho hàng: giữ tồn theo từng mặt hàng của danh mục, nhập/xuất không âm.
(function (global) {
  'use strict';
  var K = global.Ketoan;
  if (!K) return;
  var H = K.helpers;

  function defaults() {
    return { stock: {}, movements: [], updatedAt: '' };
  }

  function options(items) {
    return '<option value="">-- Chọn hàng --</option>' + (items || []).map(function (it) {
      var label = H.esc(it.name) + (it.code ? ' (' + H.esc(it.code) + ')' : '');
      return '<option value="' + H.esc(it.id) + '">' + label + '</option>';
    }).join('');
  }

  function mount(ctx) {
    return '<div class="card module-card">' +
      '<h3>Kho hàng</h3>' +
      '<form class="kho-form">' +
        '<input name="code" placeholder="Mã hàng" maxlength="40">' +
        '<input name="name" placeholder="Tên hàng / dịch vụ" required maxlength="120">' +
        '<input name="unit" placeholder="Đơn vị tính" maxlength="20">' +
        '<input name="qty" type="number" min="0" step="1" placeholder="Số lượng nhập">' +
        '<input name="price" type="number" min="0" step="1000" placeholder="Đơn giá">' +
        '<button class="btn primary" type="submit">Thêm hàng</button>' +
      '</form>' +
      '<form class="kho-adjust">' +
        '<select name="item"></select>' +
        '<select name="type"><option value="nhap">Nhập kho</option><option value="xuat">Xuất kho</option></select>' +
        '<input name="qty" type="number" min="1" step="1" placeholder="Số lượng">' +
        '<input name="note" placeholder="Diễn giải" maxlength="120">' +
        '<button class="btn" type="submit">Điều chỉnh</button>' +
      '</form>' +
      '<div class="kho-summary">' +
        '<div><label>Số mặt hàng</label><b data-kho="items">0</b></div>' +
        '<div><label>Tổng tồn</label><b data-kho="qty">0</b></div>' +
        '<div><label>Giá trị tồn</label><b data-kho="value">0 đ</b></div>' +
      '</div>' +
      '<table class="kho-table"><thead><tr><th>Mã</th><th>Hàng hóa</th><th>Đơn vị</th><th>Tồn</th><th>Giá trị</th></tr></thead>' +
        '<tbody></tbody></table>' +
      '<p class="muted">Hàng thêm mới cũng xuất hiện trong danh mục. Bán hàng sẽ tự xuất kho đúng số lượng.</p>' +
    '</div>';
  }

  function rowHtml(it, qty, value) {
    return '<tr data-kid="' + H.esc(it.id) + '">' +
      '<td>' + H.esc(it.code || '—') + '</td>' +
      '<td>' + H.esc(it.name) + '</td>' +
      '<td>' + H.esc(it.extra || '—') + '</td>' +
      '<td><b>' + H.money(qty).replace(' đ', '') + '</b></td>' +
      '<td>' + H.money(value) + '</td>' +
    '</tr>';
  }

  function patch(ctx, section, data, initial) {
    var items = H.hangHoa(ctx.key);
    var stock = data.stock || {};
    var s = H.sig({ items: items, stock: stock, moves: (data.movements || []).length,
      lots: data.lots || {}, avg: data.avg || {}, method: H.valuation(ctx.key) });
    if (ctx.pane.sigs['tonkho.stock'] === s) return;
    ctx.pane.sigs['tonkho.stock'] = s;

    var totalQty = 0;
    var rows = items.map(function (it) {
      var qty = Number(stock[it.id]) || 0;
      totalQty += qty;
      return rowHtml(it, qty, H.stockValue(data, [it], ctx.key));
    });
    var totalValue = H.stockValue(data, items, ctx.key);
    section.querySelector('.kho-table tbody').innerHTML = rows.length ? rows.join('') : '<tr><td colspan="5" class="muted">Chưa có hàng hóa</td></tr>';
    section.querySelector('[data-kho="items"]').textContent = String(items.length);
    section.querySelector('[data-kho="qty"]').textContent = String(totalQty);
    section.querySelector('[data-kho="value"]').textContent = H.money(totalValue);
    var select = section.querySelector('.kho-adjust').elements['item'];
    if (select) select.innerHTML = options(items);
    if (!initial) ctx.bumpPatch();
  }

  function bind(ctx, section) {
    var addForm = section.querySelector('.kho-form');
    addForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.currentTarget.elements;
      var name = String(f['name'].value || '').trim();
      if (!name) return;
      if (!H.guard(ctx, H.today(), 'Thêm hàng hóa')) return;
      var dmMod = K.modules.danhmuc;
      if (!dmMod) return;
      var dm = H.data(ctx.key, dmMod);
      if (!Array.isArray(dm.items)) dm.items = [];
      var item = {
        id: H.uid('sp'),
        code: String(f['code'].value || '').trim(),
        name: name,
        extra: String(f['unit'].value || '').trim(),
        price: Number(f['price'].value) || 0
      };
      dm.items.push(item);
      if (!H.save(ctx.key, dmMod, dm)) { ctx.foot('Dữ liệu đang ở chế độ chỉ đọc, chưa lưu được hàng hóa.'); return; }

      var current = H.data(ctx.key, mod);
      if (!current.stock || typeof current.stock !== 'object' || Array.isArray(current.stock)) current.stock = {};
      if (!Array.isArray(current.movements)) current.movements = [];
      var qty = Number(f['qty'].value) || 0;
      current.stock[item.id] = qty;
      if (qty > 0) H.stockIn(current, item.id, qty, item.price, new Date().toISOString());
      current.movements.push({ id: H.uid('k'), type: 'nhap', itemId: item.id, qty: qty, note: 'Thêm hàng mới', at: new Date().toISOString() });
      current.updatedAt = new Date().toISOString();
      var saved = H.save(ctx.key, mod, current);
      if (!saved) { ctx.foot('Dữ liệu đang ở chế độ chỉ đọc, chưa lưu được tồn kho.'); return; }

      e.currentTarget.reset();
      patch(ctx, section, current, false);
      ctx.sync('danhmuc');
      ctx.sync('banhang');
      ctx.sync('baocao');
      ctx.foot('Đã thêm hàng ' + name + ' vào kho.');
    });

    var adjustForm = section.querySelector('.kho-adjust');
    adjustForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.currentTarget.elements;
      var itemId = String(f['item'].value || '');
      var items = H.hangHoa(ctx.key);
      if (!items.some(function (it) { return it.id === itemId; })) { ctx.foot('Hãy chọn hàng hóa cần điều chỉnh.'); return; }
      var qty = Number(f['qty'].value) || 0;
      if (!(qty > 0)) return;
      if (!H.guard(ctx, H.today(), 'Điều chỉnh tồn kho')) return;
      var type = f['type'].value === 'xuat' ? 'xuat' : 'nhap';
      var current = H.data(ctx.key, mod);
      if (!current.stock || typeof current.stock !== 'object' || Array.isArray(current.stock)) current.stock = {};
      if (!Array.isArray(current.movements)) current.movements = [];
      var before = Number(current.stock[itemId]) || 0;
      if (type === 'xuat' && qty > before) { ctx.foot('Tồn kho không đủ để xuất ' + qty + '.'); return; }
      var at = new Date().toISOString();
      current.stock[itemId] = type === 'nhap' ? before + qty : before - qty;
      var price = (items.filter(function (it) { return it.id === itemId; })[0] || {}).price;
      if (type === 'nhap') H.stockIn(current, itemId, qty, price, at);
      else H.stockOut(current, itemId, qty, price, H.valuation(ctx.key), at);
      current.movements.push({
        id: H.uid('k'), type: type, itemId: itemId, qty: qty,
        note: String(f['note'].value || '').trim(), at: at
      });
      current.updatedAt = new Date().toISOString();
      var saved = H.save(ctx.key, mod, current);
      if (!saved) { ctx.foot('Dữ liệu đang ở chế độ chỉ đọc, chưa lưu được tồn kho.'); return; }

      e.currentTarget.reset();
      patch(ctx, section, current, false);
      ctx.sync('baocao');
      ctx.foot(type === 'nhap' ? 'Đã nhập thêm ' + qty + ' vào kho.' : 'Đã xuất ' + qty + ' khỏi kho.');
    });
  }

  var mod = {
    label: 'Kho',
    order: 60,
    branch: 'tonkho',
    defaults: defaults,
    mount: mount,
    bind: bind,
    patch: patch
  };
  K.register('tonkho', mod);
})(typeof window !== 'undefined' ? window : this);
