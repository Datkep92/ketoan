// Tài sản, khấu hao và thanh lý / nhượng bán tài sản.
(function (global) {
  'use strict';
  var K = global.Ketoan;
  if (!K) return;
  var H = K.helpers;

  function defaults() {
    return { assets: [], disposals: [], updatedAt: '' };
  }

  function assetOptions(list) {
    return '<option value="">-- Chọn tài sản --</option>' + (list || []).map(function (a) {
      return '<option value="' + H.esc(a.id) + '">' + H.esc(a.name) + '</option>';
    }).join('');
  }

  function mount(ctx) {
    return '<div class="stats">' +
        '<div class="stat"><label>Số tài sản</label><b data-ts="count">0</b></div>' +
        '<div class="stat"><label>Nguyên giá</label><b data-ts="cost">0 đ</b></div>' +
        '<div class="stat"><label>Đã khấu hao</label><b data-ts="dep">0 đ</b></div>' +
        '<div class="stat"><label>Giá trị còn lại</label><b data-ts="left">0 đ</b></div>' +
        '<div class="stat"><label>Đã thanh lý</label><b data-ts="disposed">0</b></div>' +
      '</div>' +
      '<div class="card module-card">' +
        '<h3>Tài sản</h3>' +
        '<form class="ts-form">' +
          '<input name="name" placeholder="Tên tài sản" maxlength="120">' +
          '<input name="date" type="date" required>' +
          '<input name="cost" type="number" min="0" step="1000" placeholder="Nguyên giá">' +
          '<input name="years" type="number" min="1" step="1" placeholder="Số năm khấu hao">' +
          '<input name="note" placeholder="Ghi chú" maxlength="120">' +
          '<button class="btn primary" type="submit">Thêm tài sản</button>' +
        '</form>' +
        '<table class="ts-table"><thead><tr><th>Tài sản</th><th>Ngày mua</th><th>Nguyên giá</th>' +
          '<th>Số năm</th><th>Đã khấu hao</th><th>Còn lại</th><th>Ghi chú</th></tr></thead><tbody></tbody></table>' +
      '</div>' +
      '<div class="card module-card">' +
        '<h3>Khấu hao</h3>' +
        '<form class="ts-dep-form">' +
          '<select name="asset"></select>' +
          '<input name="date" type="date" required>' +
          '<input name="months" type="number" min="1" step="1" value="1" placeholder="Số tháng">' +
          '<button class="btn primary" type="submit">Tính khấu hao</button>' +
        '</form>' +
        '<table class="ts-dep-table"><thead><tr><th>Tài sản</th><th>Kỳ</th><th>Số tiền</th><th>Ngày</th></tr></thead>' +
          '<tbody></tbody></table>' +
        '<p class="muted">Khấu hao tính theo đường thẳng, không vượt quá giá trị còn lại.</p>' +
      '</div>' +
      '<div class="card module-card">' +
        '<h3>Thanh lý / nhượng bán</h3>' +
        '<form class="ts-dispose-form">' +
          '<select name="asset"></select>' +
          '<input name="date" type="date" required>' +
          '<input name="proceeds" type="number" min="0" step="1000" placeholder="Tiền thu thanh lý">' +
          '<input name="note" placeholder="Diễn giải" maxlength="120">' +
          '<button class="btn primary" type="submit">Ghi thanh lý</button>' +
        '</form>' +
        '<table class="ts-dispose-table"><thead><tr><th>Tài sản</th><th>Ngày</th><th>Giá trị còn lại</th>' +
          '<th>Tiền thu</th><th>Kết quả</th></tr></thead><tbody></tbody></table>' +
        '<p class="muted">Tài sản đã thanh lý không còn tính khấu hao; lãi hoặc lỗ thanh lý được đưa vào báo cáo kết quả kinh doanh.</p>' +
      '</div>';
  }

  function rowHtml(a) {
    var left = H.roundMoney((Number(a.cost) || 0) - (Number(a.accumulated) || 0));
    return '<tr data-tsid="' + H.esc(a.id) + '">' +
      '<td>' + H.esc(a.name) + (a.disposed ? ' <span class="badge warn">Đã thanh lý</span>' : '') + '</td>' +
      '<td>' + H.esc(a.date || '') + '</td>' +
      '<td>' + H.money(a.cost) + '</td>' +
      '<td>' + (Number(a.years) || 0) + '</td>' +
      '<td>' + H.money(a.accumulated) + '</td>' +
      '<td><b>' + H.money(left) + '</b></td>' +
      '<td>' + H.esc(a.note || '') + '</td>' +
    '</tr>';
  }

  function depRowHtml(a, d) {
    return '<tr data-tsdid="' + H.esc(d.id) + '">' +
      '<td>' + H.esc(a.name) + '</td>' +
      '<td>' + H.esc(d.months) + ' tháng</td>' +
      '<td>' + H.money(d.amount) + '</td>' +
      '<td>' + H.esc(d.date || '') + '</td>' +
    '</tr>';
  }

  function disposeRowHtml(d) {
    var result = H.roundMoney((Number(d.proceeds) || 0) - (Number(d.left) || 0));
    return '<tr data-tsdid2="' + H.esc(d.id) + '">' +
      '<td>' + H.esc(d.name || '') + '</td>' +
      '<td>' + H.esc(d.date || '') + '</td>' +
      '<td>' + H.money(d.left) + '</td>' +
      '<td>' + H.money(d.proceeds) + '</td>' +
      '<td><b>' + (result >= 0 ? 'Lãi ' : 'Lỗ ') + H.money(Math.abs(result)) + '</b></td>' +
    '</tr>';
  }

  function patch(ctx, section, data, initial) {
    var assets = data.assets || [];
    var disposals = data.disposals || [];
    var s = H.sig({ a: assets, d: disposals });
    if (ctx.pane.sigs['taisan.data'] === s) return;
    ctx.pane.sigs['taisan.data'] = s;

    var cost = 0, dep = 0;
    assets.forEach(function (a) {
      cost += Number(a.cost) || 0;
      dep += Number(a.accumulated) || 0;
    });
    section.querySelector('[data-ts="count"]').textContent = String(assets.length);
    section.querySelector('[data-ts="cost"]').textContent = H.money(cost);
    section.querySelector('[data-ts="dep"]').textContent = H.money(dep);
    section.querySelector('[data-ts="left"]').textContent = H.money(cost - dep);
    section.querySelector('[data-ts="disposed"]').textContent = String(disposals.length);
    section.querySelector('.ts-table tbody').innerHTML = assets.length
      ? assets.map(rowHtml).join('')
      : '<tr><td colspan="7" class="muted">Chưa có tài sản</td></tr>';

    var rows = [];
    assets.forEach(function (a) {
      (a.depreciation || []).forEach(function (d) { rows.push(depRowHtml(a, d)); });
    });
    section.querySelector('.ts-dep-table tbody').innerHTML = rows.length
      ? rows.join('')
      : '<tr><td colspan="4" class="muted">Chưa có kỳ khấu hao</td></tr>';
    section.querySelector('.ts-dispose-table tbody').innerHTML = disposals.length
      ? disposals.map(disposeRowHtml).join('')
      : '<tr><td colspan="5" class="muted">Chưa có lần thanh lý</td></tr>';
    var available = assets.filter(function (a) { return !a.disposed; });
    section.querySelector('.ts-dep-form').elements['asset'].innerHTML = assetOptions(available);
    section.querySelector('.ts-dispose-form').elements['asset'].innerHTML = assetOptions(available);
    if (!initial) ctx.bumpPatch();
  }

  function bind(ctx, section) {
    var form = section.querySelector('.ts-form');
    form.elements['date'].value = H.today();
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.currentTarget.elements;
      var name = String(f['name'].value || '').trim();
      var cost = H.roundMoney(Number(f['cost'].value) || 0);
      var years = Number(f['years'].value) || 0;
      if (!name || !(cost > 0) || !(years > 0)) return;
      var current = H.data(ctx.key, mod);
      if (!Array.isArray(current.assets)) current.assets = [];
      current.assets.push({
        id: H.uid('ts'), name: name,
        date: f['date'].value || H.today(),
        cost: cost, years: years,
        accumulated: 0, depreciation: [],
        note: String(f['note'].value || '').trim(),
        at: new Date().toISOString()
      });
      current.updatedAt = new Date().toISOString();
      if (!H.commit(ctx.key, [{ module: 'taisan', value: current }], ctx, 'Đã thêm tài sản ' + name + '.')) return;

      e.currentTarget.reset();
      form.elements['date'].value = H.today();
      patch(ctx, section, current, false);
      ctx.sync('baocao');
    });

    var depForm = section.querySelector('.ts-dep-form');
    depForm.elements['date'].value = H.today();
    depForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (H.isReadOnly()) { ctx.foot('Dữ liệu đang ở chế độ chỉ đọc.'); return; }
      var f = e.currentTarget.elements;
      var current = H.data(ctx.key, mod);
      if (!Array.isArray(current.assets)) current.assets = [];
      var id = String(f['asset'].value || '');
      var asset = current.assets.filter(function (a) { return a.id === id; })[0];
      if (!asset || asset.disposed) { ctx.foot('Hãy chọn tài sản còn đang dùng.'); return; }
      var months = Number(f['months'].value) || 0;
      if (!(months > 0)) return;
      var left = H.roundMoney((Number(asset.cost) || 0) - (Number(asset.accumulated) || 0));
      if (left <= 0) { ctx.foot('Tài sản đã khấu hao hết.'); return; }
      var monthly = H.roundMoney((Number(asset.cost) || 0) / ((Number(asset.years) || 1) * 12));
      var amount = Math.min(left, H.roundMoney(monthly * months));
      if (!(amount > 0)) return;
      if (!Array.isArray(asset.depreciation)) asset.depreciation = [];
      asset.depreciation.push({
        id: H.uid('kh'), months: months, amount: amount,
        date: f['date'].value || H.today(), at: new Date().toISOString()
      });
      asset.accumulated = H.roundMoney((Number(asset.accumulated) || 0) + amount);
      current.updatedAt = new Date().toISOString();
      if (!H.commit(ctx.key, [{ module: 'taisan', value: current }], ctx, 'Đã tính khấu hao ' + H.money(amount) + '.')) return;

      depForm.elements['months'].value = '1';
      patch(ctx, section, current, false);
      ctx.sync('baocao');
    });

    var disposeForm = section.querySelector('.ts-dispose-form');
    disposeForm.elements['date'].value = H.today();
    disposeForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (H.isReadOnly()) { ctx.foot('Dữ liệu đang ở chế độ chỉ đọc.'); return; }
      var f = e.currentTarget.elements;
      var current = H.data(ctx.key, mod);
      if (!Array.isArray(current.assets)) current.assets = [];
      if (!Array.isArray(current.disposals)) current.disposals = [];
      var id = String(f['asset'].value || '');
      var asset = current.assets.filter(function (a) { return a.id === id; })[0];
      if (!asset || asset.disposed) { ctx.foot('Hãy chọn tài sản chưa thanh lý.'); return; }
      var left = H.roundMoney((Number(asset.cost) || 0) - (Number(asset.accumulated) || 0));
      var date = f['date'].value || H.today();
      var disposal = {
        id: H.uid('tl'), assetId: asset.id, name: asset.name, date: date,
        cost: Number(asset.cost) || 0, accumulated: Number(asset.accumulated) || 0,
        left: left, proceeds: H.roundMoney(Number(f['proceeds'].value) || 0),
        note: String(f['note'].value || '').trim(), at: new Date().toISOString()
      };
      asset.disposed = true;
      asset.disposedAt = date;
      current.disposals.push(disposal);
      current.updatedAt = new Date().toISOString();
      if (!H.commit(ctx.key, [{ module: 'taisan', value: current }], ctx, 'Đã ghi thanh lý tài sản ' + asset.name + '.')) return;
      H.audit(ctx.key, 'Thanh lý tài sản', asset.name);
      e.currentTarget.reset();
      disposeForm.elements['date'].value = H.today();
      patch(ctx, section, current, false);
      ctx.sync('baocao');
    });
  }

  var mod = {
    label: 'Tài sản',
    order: 110,
    branch: 'taisan',
    defaults: defaults,
    mount: mount,
    bind: bind,
    patch: patch
  };
  K.register('taisan', mod);
})(typeof window !== 'undefined' ? window : this);
