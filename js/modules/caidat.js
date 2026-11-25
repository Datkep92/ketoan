// Thiết lập và sao lưu: nơi chứa đơn vị tiền, kỳ kế toán, xuất/nhập dữ liệu.
(function (global) {
  'use strict';
  var K = global.Ketoan;
  if (!K) return;
  var H = K.helpers;
  var DB = global.KetoanDB;

  function defaults() {
    return { donViTien: 'VNĐ', kyHieu: '', nam: new Date().getFullYear(), ghiChu: '', valMethod: 'fifo' };
  }

  function mount() {
    return '<div class="card module-card">' +
      '<h3>Thiết lập & dữ liệu</h3>' +
      '<form class="setup-form">' +
        '<label>Đơn vị tiền<input name="currency" maxlength="12"></label>' +
        '<label>Ký hiệu hóa đơn<input name="symbol" maxlength="20" placeholder="HD/2026"></label>' +
        '<label>Năm kế toán<input name="year" type="number" min="2000" max="2100"></label>' +
        '<label>Phương pháp tồn kho<select name="method"><option value="fifo">Nhập trước xuất trước (FIFO)</option>' +
          '<option value="binhquan">Bình quân gia quyền</option></select></label>' +
        '<label>Ghi chú<input name="note" maxlength="160" placeholder="Ghi chú riêng"></label>' +
        '<button class="btn primary" type="submit">Lưu thiết lập</button>' +
        '<div class="data-actions">' +
          '<button class="btn" type="button" data-action="export">Xuất dữ liệu</button>' +
          '<button class="btn" type="button" data-action="import">Nhập dữ liệu</button>' +
        '</div>' +
        '<input type="file" accept=".json,application/json" class="import-file">' +
        '<button class="btn" type="button" data-action="import-file">Nhập từ tệp</button>' +
        '<textarea class="import-text" name="payload" rows="4" placeholder="Dán nội dung đã xuất vào đây rồi bấm Nhập dữ liệu"></textarea>' +
      '</form>' +
      '<p class="muted">Xuất ra một bản sao của toàn bộ kho dữ liệu. Khi nhập, bản có phiên bản mới hơn sẽ bị từ chối để tránh ghi đè dữ liệu lạ.</p>' +
    '</div>' +
    '<div class="card module-card user-card">' +
      '<h3>Người dùng & phân quyền</h3>' +
      '<form class="user-form">' +
        '<input name="name" placeholder="Tên đăng nhập" required maxlength="40">' +
        '<input name="pass" placeholder="Mật khẩu" required maxlength="60">' +
        '<select name="role"><option value="accountant">Kế toán — nghiệp vụ</option>' +
          '<option value="viewer">Chỉ xem</option><option value="admin">Quản trị — toàn quyền</option></select>' +
        '<input name="label" placeholder="Hiển thị (vd: Kế toán A)" maxlength="60">' +
        '<button class="btn primary" type="submit">Thêm người dùng</button>' +
      '</form>' +
      '<div class="report-scroll"><table class="report-table user-table"><thead><tr>' +
        '<th>Tên đăng nhập</th><th>Hiển thị</th><th>Quyền</th><th></th></tr></thead>' +
        '<tbody data-user-body="list"></tbody></table></div>' +
      '<p class="muted">Quản trị: toàn quyền. Kế toán: mọi nghiệp vụ, trừ thiết lập, người dùng, khóa kỳ và xuất/nhập dữ liệu. Chỉ xem: không ghi dữ liệu.</p>' +
    '</div>' +
    '<div class="card module-card self-pass-card">' +
      '<h3>Mật khẩu của tôi</h3>' +
      '<form class="self-pass-form">' +
        '<input name="old" type="password" placeholder="Mật khẩu hiện tại" required maxlength="60">' +
        '<input name="next" type="password" placeholder="Mật khẩu mới (tối thiểu 4 ký tự)" required minlength="4" maxlength="60">' +
        '<button class="btn" type="submit">Đổi mật khẩu</button>' +
      '</form>' +
      '<p class="muted">Mọi tài khoản, kể cả người chỉ xem, đều tự đổi được mật khẩu của mình.</p>' +
    '</div>';
  }

  function patch(ctx, section, data, initial) {
    var allowed = H.can('users');
    var users = allowed ? DB.users() : [];
    var s = H.sig({ cfg: data, users: users, allowed: allowed });
    if (ctx.pane.sigs['caidat.setup'] === s) return;
    ctx.pane.sigs['caidat.setup'] = s;
    var f = section.querySelector('.setup-form').elements;
    f['currency'].value = data.donViTien || '';
    f['symbol'].value = data.kyHieu || '';
    f['year'].value = String(data.nam || '');
    f['method'].value = data.valMethod === 'binhquan' ? 'binhquan' : 'fifo';
    f['note'].value = data.ghiChu || '';
    var card = section.querySelector('.user-card');
    if (card) card.hidden = !allowed;
    var body = section.querySelector('[data-user-body]');
    if (body && allowed) {
      body.innerHTML = users.map(function (u) {
        var role = u.role === 'admin' ? 'Quản trị' : (u.role === 'viewer' ? 'Chỉ xem' : 'Kế toán');
        return '<tr><td>' + H.esc(u.name) + '</td><td>' + H.esc(u.label || '') + '</td><td>' + role +
          '</td><td><button class="btn small" type="button" data-user-action="pass" data-user-id="' + H.esc(u.id) + '">Đổi mật khẩu</button> ' +
          '<button class="btn small" type="button" data-user-action="del" data-user-id="' + H.esc(u.id) + '">Xóa</button></td></tr>';
      }).join('');
    }
    if (!initial) ctx.bumpPatch();
  }

  function bind(ctx, section) {
    var form = section.querySelector('.setup-form');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!H.can('settings')) { ctx.foot('Người dùng này không có quyền đổi thiết lập.'); return; }
      var f = e.currentTarget.elements;
      var current = H.data(ctx.key, mod);
      current.donViTien = String(f['currency'].value || '').trim() || 'VNĐ';
      current.kyHieu = String(f['symbol'].value || '').trim();
      current.nam = Number(f['year'].value) || new Date().getFullYear();
      current.valMethod = f['method'].value === 'binhquan' ? 'binhquan' : 'fifo';
      current.ghiChu = String(f['note'].value || '').trim();
      var saved = H.save(ctx.key, mod, current);
      if (!saved) { ctx.foot('Dữ liệu đang ở chế độ chỉ đọc, chưa lưu được thiết lập.'); return; }
      H.audit(ctx.key, 'settings', 'Đổi thiết lập, định giá tồn kho: ' + current.valMethod);
      ctx.foot('Đã lưu thiết lập cho ' + (DB.meta(ctx.key) || {}).name + '.');
      patch(ctx, section, current, false);
    });

    function applyImport(text) {
      var value;
      try { value = JSON.parse(text); } catch (e) { ctx.foot('Dữ liệu nhập không đúng định dạng.'); return; }
      if (!DB.replaceAll(value)) { ctx.foot('Không nhập được dữ liệu: phiên bản không phù hợp hoặc bị khóa.'); return; }
      ctx.foot('Đã nhập dữ liệu thành công.');
      if (global.location && global.location.reload) global.location.reload();
    }

    section.querySelector('[data-action="export"]').addEventListener('click', function () {
      if (!H.can('export')) { ctx.foot('Người dùng này không có quyền xuất dữ liệu.'); return; }
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
      if (!H.can('import')) { ctx.foot('Người dùng này không có quyền nhập dữ liệu.'); return; }
      var text = String(form.elements['payload'].value || '').trim();
      if (!text) { ctx.foot('Hãy dán nội dung dữ liệu cần nhập.'); return; }
      applyImport(text);
    });

    var fileBtn = section.querySelector('[data-action="import-file"]');
    var fileInput = section.querySelector('.import-file');
    if (fileBtn && fileInput) fileBtn.addEventListener('click', function () {
      if (!H.can('import')) { ctx.foot('Người dùng này không có quyền nhập dữ liệu.'); return; }
      var file = fileInput.files && fileInput.files[0];
      if (!file) { ctx.foot('Hãy chọn tệp dữ liệu đã xuất để nhập.'); return; }
      var reader = file.text ? file.text() : null;
      if (reader && typeof reader.then === 'function') {
        reader.then(applyImport).catch(function () { ctx.foot('Không đọc được tệp dữ liệu.'); });
      } else if (typeof FileReader !== 'undefined') {
        var fr = new FileReader();
        fr.onload = function () { applyImport(String(fr.result || '').trim()); };
        fr.onerror = function () { ctx.foot('Không đọc được tệp dữ liệu.'); };
        fr.readAsText(file);
      } else {
        ctx.foot('Trình duyệt này không hỗ trợ đọc tệp.');
      }
    });

    var selfForm = section.querySelector('.self-pass-form');
    if (selfForm) selfForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var user = DB.currentUser();
      if (!user) { ctx.foot('Hãy đăng nhập trước khi đổi mật khẩu.'); return; }
      var f = e.currentTarget.elements;
      var result = DB.changePassword(user.name, f['old'].value, f['next'].value);
      ctx.foot(result && result.ok ? 'Đã đổi mật khẩu.' : (result && result.error) || 'Không đổi được mật khẩu.');
      if (result && result.ok) {
        e.currentTarget.reset();
        H.audit(ctx.key, 'user.pass.self', 'Tài khoản ' + user.name + ' tự đổi mật khẩu');
      }
    });

    var userForm = section.querySelector('.user-form');
    if (userForm) userForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!H.can('users')) { ctx.foot('Người dùng này không có quyền quản lý tài khoản.'); return; }
      var f = e.currentTarget.elements;
      var name = String(f['name'].value || '').trim();
      var pass = String(f['pass'].value || '');
      if (!name || !pass) { ctx.foot('Cần tên đăng nhập và mật khẩu.'); return; }
      var list = DB.users();
      if (list.some(function (u) { return String(u.name).toLowerCase() === name.toLowerCase(); })) {
        ctx.foot('Tên đăng nhập này đã tồn tại.'); return;
      }
      list.push({ id: DB.uid('u'), name: name, pass: pass, role: f['role'].value || 'accountant', label: String(f['label'].value || '').trim() });
      if (!DB.saveUsers(list)) { ctx.foot('Không lưu được người dùng.'); return; }
      H.audit(ctx.key, 'user.add', 'Thêm người dùng ' + name);
      ctx.foot('Đã thêm người dùng ' + name + '.');
      e.currentTarget.reset();
      patch(ctx, section, H.data(ctx.key, mod), false);
    });

    var body = section.querySelector('[data-user-body]');
    if (body) body.addEventListener('click', function (e) {
      var btn = e.target && e.target.closest ? e.target.closest('[data-user-action]') : null;
      if (!btn || !H.can('users')) return;
      var id = btn.getAttribute('data-user-id');
      var action = btn.getAttribute('data-user-action');
      var list = DB.users();
      var target = list.filter(function (u) { return u.id === id; })[0];
      if (!target) return;
      if (action === 'del') {
        if (target.role === 'admin' && list.filter(function (u) { return u.role === 'admin'; }).length <= 1) {
          ctx.foot('Phải giữ lại ít nhất một quản trị viên.'); return;
        }
        if (global.confirm && !global.confirm('Xóa người dùng ' + target.name + '?')) return;
        list = list.filter(function (u) { return u.id !== id; });
        H.audit(ctx.key, 'user.del', 'Xóa người dùng ' + target.name);
      } else {
        if (!global.prompt) { ctx.foot('Trình duyệt không hỗ trợ đổi mật khẩu.'); return; }
        var next = global.prompt('Mật khẩu mới cho ' + target.name, '');
        if (!next) return;
        target.pass = String(next);
        H.audit(ctx.key, 'user.pass', 'Đổi mật khẩu ' + target.name);
      }
      if (!DB.saveUsers(list)) { ctx.foot('Không lưu được người dùng.'); return; }
      ctx.foot('Đã cập nhật người dùng.');
      patch(ctx, section, H.data(ctx.key, mod), false);
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
