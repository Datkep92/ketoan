// Danh mục dùng chung: tài khoản, khách hàng, nhà cung cấp, hàng hóa/dịch vụ.
(function (global) {
  'use strict';
  var K = global.Ketoan;
  if (!K) return;
  var H = K.helpers;

  var KINDS = [
    { key: 'accounts', label: 'Tài khoản' },
    { key: 'customers', label: 'Khách hàng' },
    { key: 'suppliers', label: 'Nhà cung cấp' },
    { key: 'items', label: 'Hàng hóa / dịch vụ' }
  ];

  function defaults() {
    var DB = global.KetoanDB;
    return {
      accounts: DB && DB.defaultAccounts ? DB.defaultAccounts() : [],
      customers: [],
      suppliers: [],
      items: [],
      updatedAt: ''
    };
  }

  function mount() {
    var options = KINDS.map(function (k) {
      return '<option value="' + k.key + '">' + k.label + '</option>';
    }).join('');
    var columns = KINDS.map(function (k) {
      return '<div class="dm-col"><h4>' + k.label + '</h4><ul class="dm-list" data-kind="' + k.key + '"></ul></div>';
    }).join('');
    return '<div class="card module-card">' +
      '<h3>Danh mục dùng chung</h3>' +
      '<form class="dm-form">' +
        '<select name="type">' + options + '</select>' +
        '<input name="code" placeholder="Mã / số hiệu">' +
        '<input name="name" placeholder="Tên" required maxlength="120">' +
        '<input name="extra" placeholder="MST hoặc đơn vị tính" maxlength="60">' +
        '<input name="price" type="number" min="0" step="1000" placeholder="Đơn giá">' +
        '<button class="btn primary" type="submit">Thêm</button>' +
      '</form>' +
      '<div class="dm-columns">' + columns + '</div>' +
      '<p class="muted">Tài khoản ở đây sẽ hiện trong form chứng từ. Có thể nối thêm nhóm danh mục khác mà không đổi cấu trúc lưu trữ.</p>' +
    '</div>';
  }

  function itemHtml(item) {
    var code = item.code ? '<b>' + H.esc(item.code) + '</b> · ' : '';
    var extra = item.extra ? ' <small>' + H.esc(item.extra) + '</small>' : '';
    var price = item.price ? ' <span>' + H.money(item.price) + '</span>' : '';
    return '<li>' + code + H.esc(item.name) + extra + price + '</li>';
  }

  function patch(ctx, section, data, initial) {
    var changed = false;
    KINDS.forEach(function (kind) {
      var value = data[kind.key] || [];
      var s = H.sig(value);
      var key = 'danhmuc.' + kind.key;
      if (ctx.pane.sigs[key] === s) return;
      ctx.pane.sigs[key] = s;
      var ul = section.querySelector('[data-kind="' + kind.key + '"]');
      if (ul) ul.innerHTML = value.length ? value.map(itemHtml).join('') : '<li class="muted">Chưa có</li>';
      changed = true;
    });
    if (changed && !initial) ctx.bumpPatch();
  }

  function bind(ctx, section) {
    var form = section.querySelector('.dm-form');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.currentTarget.elements;
      var type = f['type'].value;
      if (!KINDS.some(function (k) { return k.key === type; })) return;
      var name = String(f['name'].value || '').trim();
      var code = String(f['code'].value || '').trim();
      if (!name || (type === 'accounts' && !code)) return;
      var current = H.data(ctx.key, mod);
      if (!Array.isArray(current[type])) current[type] = [];
      current[type].push({
        id: H.uid('dm'),
        code: code,
        name: name,
        extra: String(f['extra'].value || '').trim(),
        price: Number(f['price'].value) || 0
      });
      current.updatedAt = new Date().toISOString();
      var saved = H.save(ctx.key, mod, current);
      if (!saved) { ctx.foot('Dữ liệu đang ở chế độ chỉ đọc, chưa lưu được danh mục.'); return; }
      e.currentTarget.reset();
      patch(ctx, section, current, false);
      if (type === 'accounts') ctx.sync('chungtu');
    });
  }

  var mod = {
    label: 'Danh mục',
    order: 20,
    branch: 'danhmuc',
    defaults: defaults,
    mount: mount,
    bind: bind,
    patch: patch
  };
  K.register('danhmuc', mod);
})(typeof window !== 'undefined' ? window : this);
