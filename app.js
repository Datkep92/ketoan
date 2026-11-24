// Vỏ ứng dụng: quản lý danh sách công ty, pane riêng và điều phối các module.
// Mỗi module tự chịu trách nhiệm dữ liệu và giao diện của mình.
(function () {
  'use strict';

  function foot(text) {
    var el = document.getElementById('side-foot');
    if (el) el.textContent = text;
  }

  var DB = window.KetoanDB;
  var K = window.Ketoan;
  if (!DB || !K) {
    foot('Không nạp được kho dữ liệu hoặc các tính năng');
    return;
  }
  var H = K.helpers;

  var list = document.getElementById('tenant-list');
  var count = document.getElementById('tenant-count');
  var crumb = document.getElementById('crumb');
  var workspace = document.getElementById('workspace');
  var empty = document.getElementById('empty');
  var counterFull = document.getElementById('counter-full');
  var counterPatch = document.getElementById('counter-patch');

  var state = {
    tenants: DB.list(),
    activeId: null,
    panes: {},
    counters: { full: 0, patch: 0 }
  };

  if (DB.memory) foot('Trình duyệt chặn lưu cục bộ — dữ liệu chỉ tồn tại đến khi đóng trang');
  else if (DB.warning) foot(DB.warning);

  function nodeKey(meta) { return H.nodeKey(meta); }

  function updateCounters() {
    counterFull.textContent = 'Render toàn bộ: ' + state.counters.full;
    counterPatch.textContent = 'Cập nhật phần: ' + state.counters.patch;
  }
  function bumpPatch() { state.counters.patch++; updateCounters(); }

  // ---------- Sidebar: chỉ thêm/xóa đúng một nút ----------
  function makeTenantButton(meta) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tenant-item';
    btn.dataset.id = nodeKey(meta);

    var dot = document.createElement('span');
    dot.className = 'dot' + (meta.type === 'hkd' ? ' hkd' : '');
    var name = document.createElement('span');
    name.className = 'tname';
    name.textContent = meta.name;
    var kind = document.createElement('small');
    kind.textContent = meta.type === 'hkd' ? 'HKD' : 'CTY';
    var mst = document.createElement('small');
    mst.className = 'mst';
    mst.textContent = meta.mst ? 'MST ' + meta.mst : 'Chưa có MST';

    btn.appendChild(dot);
    btn.appendChild(name);
    btn.appendChild(kind);
    btn.appendChild(mst);
    btn.addEventListener('click', function () { openTenant(nodeKey(meta)); });
    return btn;
  }

  function appendTenantButton(meta) {
    list.appendChild(makeTenantButton(meta));
    count.textContent = String(state.tenants.length);
    empty.hidden = true;
  }

  function renderSidebar() {
    list.innerHTML = '';
    state.tenants.forEach(appendTenantButton);
    count.textContent = String(state.tenants.length);
    empty.hidden = state.tenants.length > 0;
  }

  // ---------- Tạo công ty: mỗi MST là một nhánh trong kho chung ----------
  function createTenant(name, type, mst) {
    var result = DB.create(mst, name, type);
    if (!result || result.error === 'exists') {
      foot('Mã số thuế này đã có. Hãy nhập mã khác hoặc mở nhánh hiện có.');
      return null;
    }
    if (result.generated) foot('Chưa có mã số thuế — đã tự tạo một nhánh riêng cho công ty này.');
    else foot('Dữ liệu lưu trên thiết bị');
    return result.meta;
  }

  // ---------- Cầu nối giữa vỏ và module ----------
  function moduleContext(pane, mod) {
    return {
      key: pane.key,
      pane: pane,
      DB: DB,
      helpers: H,
      module: mod,
      foot: foot,
      bumpPatch: bumpPatch,
      data: function () { return H.data(pane.key, mod); },
      save: function (value) {
        var saved = DB.saveBranch(pane.key, mod.branch, value);
        if (!saved) foot('Dữ liệu đang ở chế độ chỉ đọc, thay đổi chưa được lưu.');
        return saved;
      },
      sync: function (name) { syncModule(pane, name, false); }
    };
  }

  function syncModule(pane, name, initial) {
    var mod = K.modules[name];
    var section = pane.modules[name];
    if (!mod || !section || !mod.patch) return;
    mod.patch(moduleContext(pane, mod), section, H.data(pane.key, mod), initial);
  }

  function activateModule(pane, name) {
    if (!pane.modules[name]) return;
    pane.activeModule = name;
    Object.keys(pane.modules).forEach(function (n) { pane.modules[n].hidden = (n !== name); });
    pane.root.querySelectorAll('.module-tab').forEach(function (tab) {
      if (tab.dataset.tab === name) tab.classList.add('active');
      else tab.classList.remove('active');
    });
    // Đồng bộ lại phần vừa mở, nhưng không tăng bộ đếm khi chỉ chuyển tab.
    syncModule(pane, name, true);
  }

  function paneChrome() {
    return '<div class="pane-head">' +
        '<div><h2 class="pane-title"></h2><p class="pane-sub"></p></div>' +
        '<button class="btn ghost btn-rename" type="button">Đổi tên</button>' +
      '</div>' +
      '<nav class="module-tabs" aria-label="Các phần của công ty"></nav>' +
      '<div class="module-body"></div>';
  }

  function createPane(meta) {
    var key = nodeKey(meta);
    var root = document.createElement('section');
    root.className = 'tenant-pane';
    root.id = 'pane-' + key;
    root.dataset.id = key;
    root.innerHTML = paneChrome();
    workspace.appendChild(root);

    var pane = { key: key, root: root, sigs: {}, modules: {}, activeModule: 'chungtu' };
    patchMeta(pane, meta, true);
    var tabBar = root.querySelector('.module-tabs');
    var body = root.querySelector('.module-body');

    K.list().forEach(function (mod) {
      var ctx = moduleContext(pane, mod);
      var section = document.createElement('div');
      section.className = 'module-section';
      section.dataset.module = mod.name;
      section.hidden = true;
      section.innerHTML = mod.mount ? mod.mount(ctx) : '';
      body.appendChild(section);
      pane.modules[mod.name] = section;
      if (mod.bind) mod.bind(ctx, section);

      var tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'module-tab';
      tab.dataset.tab = mod.name;
      tab.textContent = mod.label || mod.name;
      tab.addEventListener('click', function () { activateModule(pane, mod.name); });
      tabBar.appendChild(tab);
    });

    root.querySelector('.btn-rename').addEventListener('click', function () {
      var currentMeta = DB.meta(pane.key);
      if (!currentMeta) return;
      var next = window.prompt('Tên mới', currentMeta.name);
      if (next === null || !next.trim()) return;
      var saved = DB.rename(pane.key, next.trim());
      if (!saved) return;
      state.tenants.forEach(function (t, i) { if (nodeKey(t) === pane.key) state.tenants[i] = saved; });
      patchMeta(pane, saved);
    });

    K.list().forEach(function (mod) { syncModule(pane, mod.name, true); });
    activateModule(pane, 'chungtu');
    state.counters.full++;
    updateCounters();
    return pane;
  }

  function patchMeta(pane, meta, initial) {
    var s = H.sig(meta);
    if (pane.sigs.meta === s) return;
    pane.sigs.meta = s;
    pane.root.querySelector('.pane-title').textContent = meta.name;
    pane.root.querySelector('.pane-sub').textContent =
      (meta.type === 'hkd' ? 'Hộ kinh doanh' : 'Công ty') + ' · MST: ' + (meta.mst || 'chưa có');
    var label = list.querySelector('[data-id="' + nodeKey(meta) + '"] .tname');
    if (label) label.textContent = meta.name;
    if (!initial) bumpPatch();
  }

  // ---------- Chuyển công ty: tái dùng pane có sẵn ----------
  function openTenant(id) {
    if (state.activeId === id) return;
    var rec = DB.node(id);
    if (!rec) return;
    var meta = rec.meta;

    var oldBtn = list.querySelector('.tenant-item.active');
    if (oldBtn) oldBtn.classList.remove('active');
    var btn = list.querySelector('[data-id="' + id + '"]');
    if (btn) btn.classList.add('active');
    state.activeId = id;

    var pane = state.panes[id];
    if (pane) {
      Object.keys(state.panes).forEach(function (k) { state.panes[k].root.hidden = (k !== id); });
      pane.root.hidden = false;
    } else {
      pane = createPane(meta);
      state.panes[id] = pane;
    }

    crumb.textContent = meta.name + ' · ' + (meta.type === 'hkd' ? 'Hộ kinh doanh' : 'Công ty') +
      ' · ' + (meta.mst || 'chưa có MST');

    patchMeta(pane, DB.meta(id));
    syncModule(pane, pane.activeModule || 'chungtu', false);
  }

  // ---------- Điều khiển thêm công ty ----------
  var formNew = document.getElementById('form-new-tenant');
  document.getElementById('btn-add-tenant').addEventListener('click', function () {
    formNew.hidden = false;
    document.getElementById('new-name').focus();
  });
  document.getElementById('btn-cancel-tenant').addEventListener('click', function () {
    formNew.hidden = true;
    formNew.reset();
  });
  formNew.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = document.getElementById('new-name').value.trim();
    if (!name) return;
    var mst = document.getElementById('new-mst').value.trim();
    var meta = createTenant(name, document.getElementById('new-type').value, mst);
    if (!meta) return;
    formNew.hidden = true;
    formNew.reset();
    appendTenantButton(meta);
    crumb.textContent = '';
    openTenant(nodeKey(meta));
  });

  // ---------- Dữ liệu mẫu: tạo công ty mới, không đụng dữ liệu có sẵn ----------
  var demoBtn = document.getElementById('btn-demo');
  if (demoBtn) demoBtn.addEventListener('click', function () {
    var demo = window.KetoanDemo;
    var result = demo && demo.seed ? demo.seed() : null;
    if (!result || result.error) {
      foot(result && result.error ? result.error : 'Không tạo được dữ liệu mẫu.');
      return;
    }
    foot(result.existing ? 'Công ty dữ liệu mẫu đã có — đã mở ra.' : 'Đã tạo công ty kèm dữ liệu ở mười một phần.');
    if (result.existing) { openTenant(result.key); return; }
    state.tenants = DB.list();
    renderSidebar();
    crumb.textContent = '';
    openTenant(result.key);
  });

  // ---------- Khởi động ----------
  state.tenants = DB.list();
  renderSidebar();
  updateCounters();
  if (state.tenants.length) openTenant(nodeKey(state.tenants[0]));
})();
