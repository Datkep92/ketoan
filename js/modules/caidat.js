// Thiết lập và sao lưu: nơi chứa đơn vị tiền, kỳ kế toán, xuất/nhập dữ liệu.
(function (global) {
  'use strict';
  var K = global.Ketoan;
  if (!K) return;
  var H = K.helpers;
  var DB = global.KetoanDB;

  function defaults() {
    return { donViTien: 'VNĐ', kyHieu: '', nam: new Date().getFullYear(), ghiChu: '' };
  }

  function mount() {
    return '<div class="card module-card">' +
      '<h3>Thiết lập & dữ liệu</h3>' +
      '<form class="setup-form">' +
        '<label>Đơn vị tiền<input name="currency" maxlength="12"></label>' +
        '<label>Ký hiệu hóa đơn<input name="symbol" maxlength="20" placeholder="HD/2026"></label>' +
        '<label>Năm kế toán<input name="year" type="number" min="2000" max="2100"></label>' +
        '<label>Ghi chú<input name="note" maxlength="160" placeholder="Ghi chú riêng"></label>' +
        '<button class="btn primary" type="submit">Lưu thiết lập</button>' +
        '<div class="data-actions">' +
          '<button class="btn" type="button" data-action="export">Xuất dữ liệu</button>' +
          '<button class="btn" type="button" data-action="import">Nhập dữ liệu</button>' +
        '</div>' +
        '<textarea class="import-text" name="payload" rows="4" placeholder="Dán nội dung đã xuất vào đây rồi bấm Nhập dữ liệu"></textarea>' +
      '</form>' +
      '<p class="muted">Xuất ra một bản sao của toàn bộ kho dữ liệu. Khi nhập, bản có phiên bản mới hơn sẽ bị từ chối để tránh ghi đè dữ liệu lạ.</p>' +
    '</div>';
  }

  function patch(ctx, section, data, initial) {
    var s = H.sig(data);
    if (ctx.pane.sigs['caidat.setup'] === s) return;
    ctx.pane.sigs['caidat.setup'] = s;
    var f = section.querySelector('.setup-form').elements;
    f['currency'].value = data.donViTien || '';
    f['symbol'].value = data.kyHieu || '';
    f['year'].value = String(data.nam || '');
    f['note'].value = data.ghiChu || '';
    if (!initial) ctx.bumpPatch();
  }

  function bind(ctx, section) {
    var form = section.querySelector('.setup-form');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.currentTarget.elements;
      var current = H.data(ctx.key, mod);
      current.donViTien = String(f['currency'].value || '').trim() || 'VNĐ';
      current.kyHieu = String(f['symbol'].value || '').trim();
      current.nam = Number(f['year'].value) || new Date().getFullYear();
      current.ghiChu = String(f['note'].value || '').trim();
      var saved = H.save(ctx.key, mod, current);
      if (!saved) { ctx.foot('Dữ liệu đang ở chế độ chỉ đọc, chưa lưu được thiết lập.'); return; }
      ctx.foot('Đã lưu thiết lập cho ' + (DB.meta(ctx.key) || {}).name + '.');
      patch(ctx, section, current, false);
    });

    section.querySelector('[data-action="export"]').addEventListener('click', function () {
      var text = JSON.stringify(DB.snapshot(), null, 2);
      if (typeof Blob !== 'undefined' && global.URL && global.URL.createObjectURL) {
        var url = global.URL.createObjectURL(new Blob([text], { type: 'application/json' }));
        var a = document.createElement('a');
        a.href = url;
        a.download = 'ketoan-' + ctx.key + '.json';
        a.click();
        global.URL.revokeObjectURL(url);
        ctx.foot('Đã xuất bản sao dữ liệu.');
      } else if (global.prompt) {
        global.prompt('Sao chép dữ liệu', text);
      }
    });

    section.querySelector('[data-action="import"]').addEventListener('click', function () {
      var text = String(form.elements['payload'].value || '').trim();
      if (!text) { ctx.foot('Hãy dán nội dung dữ liệu cần nhập.'); return; }
      var value;
      try { value = JSON.parse(text); } catch (e) { ctx.foot('Dữ liệu nhập không đúng định dạng.'); return; }
      if (!DB.replaceAll(value)) { ctx.foot('Không nhập được dữ liệu: phiên bản không phù hợp hoặc bị khóa.'); return; }
      ctx.foot('Đã nhập dữ liệu thành công.');
      if (global.location && global.location.reload) global.location.reload();
    });
  }

  var mod = {
    label: 'Thiết lập',
    order: 50,
    branch: 'caidat',
    defaults: defaults,
    mount: mount,
    bind: bind,
    patch: patch
  };
  K.register('caidat', mod);
})(typeof window !== 'undefined' ? window : this);
