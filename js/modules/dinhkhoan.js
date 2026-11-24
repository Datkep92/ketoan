// Định khoản: chứng từ ghi nhận bút toán Nợ/Có thực thụ, nhiều dòng trên một phiếu.
// Tổng Nợ phải bằng tổng Có thì mới được lưu; kỳ đã khóa thì không sửa/xóa được.
(function (global) {
  'use strict';
  var K = global.Ketoan;
  if (!K) return;
  var H = K.helpers;

  function defaults() { return { entries: [], updatedAt: '' }; }

  function accountOptions(key) {
    return H.accounts(key).map(function (a) {
      var code = String(a.code || a.name || '');
      return '<option value="' + H.esc(code) + '">' + H.esc(code ? code + ' — ' + (a.name || '') : a.name || '') + '</option>';
    }).join('');
  }

  function mount(ctx) {
    var options = accountOptions(ctx.key);
    return '<div class="stats">' +
        '<div class="stat"><label>Số phiếu</label><b data-dk="count">0</b></div>' +
        '<div class="stat"><label>Tổng Nợ</label><b data-dk="debit">0 đ</b></div>' +
        '<div class="stat"><label>Tổng Có</label><b data-dk="credit">0 đ</b></div>' +
        '<div class="stat"><label>Tổng chênh lệch</label><b data-dk="diff">0 đ</b></div>' +
      '</div>' +
      '<div class="card module-card">' +
        '<h3>Định khoản Nợ / Có</h3>' +
        '<form class="dk-form">' +
          '<input name="date" type="date" required>' +
          '<input name="note" placeholder="Diễn giải nghiệp vụ" maxlength="160">' +
          '<div class="dk-lines" data-dk-lines></div>' +
          '<div class="dk-form-foot">' +
            '<button class="btn" type="button" data-dk-add>+ Thêm dòng</button>' +
            '<span class="dk-total" data-dk-live>Tổng Nợ: 0 đ · Tổng Có: 0 đ</span>' +
            '<button class="btn primary" type="submit" data-dk-submit>Lưu phiếu</button>' +
            '<button class="btn" type="button" data-dk-cancel hidden>Hủy sửa</button>' +
          '</div>' +
        '</form>' +
        '<div class="dk-tools">' +
          '<input name="search" class="dk-search" placeholder="Tìm số phiếu, diễn giải, tài khoản">' +
          '<input name="from" class="dk-from" type="date">' +
          '<input name="to" class="dk-to" type="date">' +
        '</div>' +
        '<div class="report-scroll"><table class="report-table dk-table"><thead><tr>' +
          '<th>Số</th><th>Ngày</th><th>Diễn giải</th><th>Tài khoản</th><th>Nợ</th><th>Có</th><th></th>' +
        '</tr></thead><tbody data-dk-body="list"></tbody></table></div>' +
        '<p class="muted">Mỗi dòng chọn một tài khoản và nhập bên Nợ hoặc bên Có. Một phiếu có thể có nhiều dòng; tổng hai bên phải bằng nhau. Các phiếu này được đưa thẳng vào nhật ký chung và sổ cái.</p>' +
      '</div>';
  }

  function lineRow(ctx, options, line) {
    var row = global.document.createElement('div');
    row.className = 'dk-line';
    row.innerHTML = '<select class="dk-acc">' + options + '</select>' +
      '<input class="dk-debit" type="number" min="0" step="1000" placeholder="Nợ">' +
      '<input class="dk-credit" type="number" min="0" step="1000" placeholder="Có">' +
      '<button class="btn btn-icon" type="button" data-dk-remove title="Bỏ dòng">×</button>';
    var selects = row.querySelectorAll('select');
    var inputs = row.querySelectorAll('input');
    row._acc = selects[0]; row._debit = inputs[0]; row._credit = inputs[1];
    row._acc.value = line && line.account ? String(line.account) : '';
    row._debit.value = line && line.debit ? String(line.debit) : '';
    row._credit.value = line && line.credit ? String(line.credit) : '';
    row.querySelector('[data-dk-remove]').addEventListener('click', function () {
      var host = row.parent;
      if (host && host.children.length > 2) host.removeChild(row);
      else if (ctx && ctx.foot) ctx.foot('Một phiếu cần ít nhất hai dòng.');
    });
    return row;
  }

  function readLines(section) {
    var host = section.querySelector('[data-dk-lines]');
    return host.children.filter(function (row) { return row.classList.contains('dk-line'); }).map(function (row) {
      return {
        account: String(row._acc.value || '').trim(),
        debit: H.roundMoney(Number(row._debit.value) || 0),
        credit: H.roundMoney(Number(row._credit.value) || 0)
      };
    });
  }

  function totals(lines) {
    var debit = 0, credit = 0;
    lines.forEach(function (l) { debit += Number(l.debit) || 0; credit += Number(l.credit) || 0; });
    return { debit: H.roundMoney(debit), credit: H.roundMoney(credit) };
  }

  function renderList(ctx, section, entries) {
    var q = String((section.querySelector('.dk-search') || {}).value || '').trim().toLowerCase();
    var from = String((section.querySelector('.dk-from') || {}).value || '');
    var to = String((section.querySelector('.dk-to') || {}).value || '');
    var body = section.querySelector('[data-dk-body="list"]');
    if (!body) return;
    var shown = (entries || []).filter(function (v) {
      var date = String(v.date || '');
      var text = [v.so, v.note, date].concat((v.lines || []).map(function (l) { return l.account; })).join(' ').toLowerCase();
      return (!q || text.indexOf(q) >= 0) && (!from || date >= from) && (!to || date <= to);
    });
    body.innerHTML = '';
    shown.forEach(function (v) {
      var t = totals(v.lines || []);
      var row = global.document.createElement('tr');
      row.dataset.dkId = v.id;
      row.innerHTML = '<td>' + H.esc(v.so || '') + '</td><td>' + H.esc(v.date || '') + '</td>' +
        '<td>' + H.esc(v.note || '') + '</td><td>' + (v.lines || []).length + ' dòng</td>' +
        '<td class="num">' + H.money(t.debit) + '</td><td class="num">' + H.money(t.credit) + '</td><td></td>';
      var cell = row.children[row.children.length - 1];
      var edit = global.document.createElement('button');
      edit.className = 'btn btn-icon'; edit.textContent = 'Sửa';
      edit.addEventListener('click', function () { startEdit(ctx, section, v); });
      var del = global.document.createElement('button');
      del.className = 'btn btn-icon danger'; del.textContent = 'Xóa';
      del.addEventListener('click', function () { remove(ctx, section, v); });
      cell.appendChild(edit); cell.appendChild(del);
      body.appendChild(row);
    });
    if (!shown.length) {
      var empty = global.document.createElement('tr');
      empty.innerHTML = '<td colspan="7" class="muted">Chưa có phiếu định khoản phù hợp</td>';
      body.appendChild(empty);
    }
  }

  function resetForm(ctx, section) {
    var form = section.querySelector('.dk-form');
    section._dkEditId = '';
    form.elements['note'].value = '';
    form.elements['date'].value = H.today();
    var submit = section.querySelector('[data-dk-submit]');
    if (submit) submit.textContent = 'Lưu phiếu';
    var cancel = section.querySelector('[data-dk-cancel]');
    if (cancel) cancel.hidden = true;
    var host = section.querySelector('[data-dk-lines]');
    host.innerHTML = '';
    var options = accountOptions(ctx.key);
    host.appendChild(lineRow(ctx, options));
    host.appendChild(lineRow(ctx, options));
    live(section);
  }

  function live(section) {
    var t = totals(readLines(section));
    var el = section.querySelector('[data-dk-live]');
    if (el) el.textContent = 'Tổng Nợ: ' + H.money(t.debit) + ' · Tổng Có: ' + H.money(t.credit) +
      (t.debit === t.credit ? ' · Đã cân đối' : ' · Chưa cân đối');
  }

  function startEdit(ctx, section, voucher) {
    if (!H.guard(ctx, voucher.date, 'Sửa định khoản')) return;
    var form = section.querySelector('.dk-form');
    section._dkEditId = voucher.id;
    form.elements['date'].value = voucher.date || '';
    form.elements['note'].value = voucher.note || '';
    var host = section.querySelector('[data-dk-lines]');
    host.innerHTML = '';
    var options = accountOptions(ctx.key);
    var lines = (voucher.lines || []).slice();
    if (lines.length < 2) lines.push({ account: '', debit: 0, credit: 0 });
    lines.forEach(function (l) { host.appendChild(lineRow(ctx, options, l)); });
    var submit = section.querySelector('[data-dk-submit]');
    if (submit) submit.textContent = 'Cập nhật phiếu';
    var cancel = section.querySelector('[data-dk-cancel]');
    if (cancel) cancel.hidden = false;
    live(section);
    if (ctx.foot) ctx.foot('Đang sửa phiếu ' + (voucher.so || voucher.id) + '.');
  }

  function remove(ctx, section, voucher) {
    if (!H.guard(ctx, voucher.date, 'Xóa định khoản')) return;
    if (global.confirm && !global.confirm('Xóa phiếu ' + (voucher.so || voucher.id) + '?')) return;
    var write = H.removeFrom(ctx.key, 'dinhkhoan', voucher.id);
    if (!write || !H.commit(ctx.key, [write], ctx, 'Đã xóa phiếu định khoản.')) return;
    resetForm(ctx, section);
    renderList(ctx, section, H.data(ctx.key, mod).entries || []);
    ctx.sync('baocao');
  }

  function bind(ctx, section) {
    var form = section.querySelector('.dk-form');
    var host = section.querySelector('[data-dk-lines]');
    var options = accountOptions(ctx.key);
    host.innerHTML = '';
    host.appendChild(lineRow(ctx, options));
    host.appendChild(lineRow(ctx, options));
    form.elements['date'].value = H.today();
    host.addEventListener('change', function () { live(section); });
    host.addEventListener('keyup', function () { live(section); });
    section.querySelector('[data-dk-add]').addEventListener('click', function () {
      host.appendChild(lineRow(ctx, options));
      live(section);
    });
    section.querySelector('[data-dk-cancel]').addEventListener('click', function () {
      resetForm(ctx, section);
      if (ctx.foot) ctx.foot('Đã hủy sửa phiếu.');
    });
    ['search', 'from', 'to'].forEach(function (name) {
      var el = section.querySelector('.dk-' + name);
      if (el) {
        el.addEventListener('input', function () { renderList(ctx, section, H.data(ctx.key, mod).entries || []); });
        el.addEventListener('change', function () { renderList(ctx, section, H.data(ctx.key, mod).entries || []); });
      }
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var date = String(form.elements['date'].value || '');
      var note = String(form.elements['note'].value || '').trim();
      var lines = readLines(section).filter(function (l) { return l.debit > 0 || l.credit > 0; });
      var t = totals(lines);
      if (!(t.debit > 0)) { ctx.foot('Nhập số tiền ở bên Nợ.'); return; }
      if (t.debit !== t.credit) { ctx.foot('Tổng Nợ và tổng Có chưa bằng nhau.'); return; }
      if (lines.some(function (l) { return !l.account; })) { ctx.foot('Mỗi dòng cần chọn tài khoản.'); return; }
      if (!H.guard(ctx, date, section._dkEditId ? 'Sửa định khoản' : 'Thêm định khoản')) return;
      var current = H.data(ctx.key, mod);
      if (!Array.isArray(current.entries)) current.entries = [];
      if (section._dkEditId) {
        var found = null;
        current.entries.forEach(function (v) { if (v.id === section._dkEditId) found = v; });
        if (!found) { ctx.foot('Không tìm thấy phiếu cần sửa.'); return; }
        found.date = date; found.note = note; found.lines = lines;
        found.updatedAt = new Date().toISOString();
      } else {
        current.entries.push({
          id: H.uid('dk'), so: H.nextCode(current.entries, 'DK', 4),
          date: date, note: note, lines: lines, at: new Date().toISOString()
        });
      }
      current.updatedAt = new Date().toISOString();
      if (!H.commit(ctx.key, [{ module: 'dinhkhoan', value: current }], ctx,
        section._dkEditId ? 'Đã cập nhật phiếu định khoản.' : 'Đã lưu phiếu định khoản.')) return;
      resetForm(ctx, section);
      renderList(ctx, section, current.entries);
      ctx.sync('baocao');
      ctx.sync('quanly');
    });
  }

  function patch(ctx, section, data, initial) {
    var entries = data.entries || [];
    var t = totals(entries.reduce(function (all, v) { return all.concat(v.lines || []); }, []));
    var s = H.sig({ e: entries, a: H.accounts(ctx.key) });
    if (ctx.pane.sigs['dinhkhoan.data'] === s) return;
    ctx.pane.sigs['dinhkhoan.data'] = s;
    var put = function (name, value) {
      var el = section.querySelector('[data-dk="' + name + '"]');
      if (el) el.textContent = value;
    };
    put('count', String(entries.length));
    put('debit', H.money(t.debit));
    put('credit', H.money(t.credit));
    put('diff', H.money(H.roundMoney(t.debit - t.credit)));
    renderList(ctx, section, entries);
    if (!initial) ctx.bumpPatch();
  }

  var mod = {
    label: 'Định khoản',
    order: 12,
    branch: 'dinhkhoan',
    recordField: 'entries',
    defaults: defaults,
    mount: mount,
    bind: bind,
    patch: patch
  };
  K.register('dinhkhoan', mod);
})(typeof window !== 'undefined' ? window : this);
