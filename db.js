(function (global) {
  'use strict';

  var NS = 'ketoan.v1';
  var STORE_KEY = NS + ':store';
  var VERSION = 2;
  var LEGACY_TENANTS = NS + ':tenants';
  var LEGACY_DATA = NS + ':tenant:';

  // Trình duyệt có thể chặn localStorage (private mode / file://): dùng bộ nhớ phiên.
  var backend = (function () {
    try {
      var probe = '__ketoan_probe__';
      localStorage.setItem(probe, '1');
      localStorage.removeItem(probe);
      return localStorage;
    } catch (e) {
      var mem = {};
      return {
        __memory: true,
        getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
        setItem: function (k, v) { mem[k] = String(v); },
        removeItem: function (k) { delete mem[k]; }
      };
    }
  })();

  var DEFAULT_ACCOUNTS = [
    { code: '111', name: 'Tiền mặt' },
    { code: '112', name: 'Tiền gửi ngân hàng' },
    { code: '131', name: 'Phải thu khách hàng' },
    { code: '152', name: 'Hàng hóa' },
    { code: '211', name: 'Tài sản cố định' },
    { code: '214', name: 'Hao mòn tài sản cố định' },
    { code: '229', name: 'Dự phòng phải thu khó đòi' },
    { code: '331', name: 'Phải trả người bán' },
    { code: '3331', name: 'Thuế GTGT đầu ra' },
    { code: '334', name: 'Phải trả người lao động' },
    { code: '338', name: 'Phải trả BHXH, BHYT, BHTN' },
    { code: '511', name: 'Doanh thu bán hàng' },
    { code: '632', name: 'Giá vốn hàng bán' },
    { code: '641', name: 'Chi phí bán hàng' },
    { code: '642', name: 'Chi phí quản lý' },
    { code: '911', name: 'Kết chuyển kết quả kinh doanh' }
  ];

  var db = null;
  var readOnly = false;
  var warning = '';
  var legacyList = [];

  function uid(prefix) {
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }
  function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }
  function keyOf(value) {
    return String(value === null || value === undefined ? '' : value).trim().toUpperCase();
  }
  function defaultData() {
    return { rev: 0, vouchers: [], accounts: DEFAULT_ACCOUNTS.slice() };
  }
  function blank() {
    return { schemaVersion: VERSION, updatedAt: '', nodes: {} };
  }
  function readJSON(key, fallback) {
    var raw = backend.getItem(key);
    if (raw === null || raw === '') return fallback;
    try { return JSON.parse(raw); } catch (e) { return fallback; }
  }
  function writeJSON(key, value) { backend.setItem(key, JSON.stringify(value)); }
  function has(obj, key) { return Object.prototype.hasOwnProperty.call(obj, key); }

  function save() {
    if (readOnly || !db) return;
    db.updatedAt = new Date().toISOString();
    writeJSON(STORE_KEY, db);
  }

  function ensureShape(root) {
    if (!root || typeof root !== 'object') return blank();
    if (!root.nodes || typeof root.nodes !== 'object' || Array.isArray(root.nodes)) root.nodes = {};
    if (!root.schemaVersion) root.schemaVersion = VERSION;
    return root;
  }

  function normaliseData(data) {
    var out = data && typeof data === 'object' ? data : defaultData();
    if (!Array.isArray(out.vouchers)) out.vouchers = [];
    if (!Array.isArray(out.accounts) || !out.accounts.length) out.accounts = DEFAULT_ACCOUNTS.slice();
    if (!out.rev) out.rev = 0;
    return out;
  }

  // Chuyển dữ liệu phẳng cũ (ketoan.v1:*) sang một cây có schemaVersion.
  function legacyToTree(base) {
    var root = ensureShape(base);
    var list = readJSON(LEGACY_TENANTS, []);
    legacyList = Array.isArray(list) ? list : [];
    legacyList.forEach(function (old) {
      if (!old || typeof old !== 'object') return;
      var oldId = old.id || uid('t');
      var key = keyOf(old.mst) || keyOf(oldId);
      if (!key || has(root.nodes, key)) return;
      var data = normaliseData(readJSON(LEGACY_DATA + oldId + ':data', null));
      root.nodes[key] = {
        type: 'tenant',
        key: key,
        meta: {
          id: oldId,
          key: key,
          mst: old.mst ? keyOf(old.mst) : '',
          name: old.name || key,
          type: old.type === 'hkd' ? 'hkd' : 'company',
          createdAt: old.createdAt || '',
          updatedAt: old.updatedAt || ''
        },
        branches: { chungtu: data }
      };
    });
    return root;
  }

  function clearLegacy() {
    if (!legacyList.length) return;
    backend.removeItem(LEGACY_TENANTS);
    legacyList.forEach(function (old) {
      if (!old || !old.id) return;
      backend.removeItem(LEGACY_DATA + old.id + ':meta');
      backend.removeItem(LEGACY_DATA + old.id + ':data');
    });
    legacyList = [];
  }

  function load() {
    var raw = backend.getItem(STORE_KEY);
    if (raw) {
      var parsed = null;
      try { parsed = JSON.parse(raw); } catch (e) { parsed = null; }
      if (parsed && typeof parsed === 'object') {
        var version = Number(parsed.schemaVersion) || 0;
        if (version > VERSION) {
          // Phiên bản lạ hơn: sao lưu, không ghi đè.
          try { backend.setItem(NS + ':backup:' + String(version), raw); } catch (e) {}
          readOnly = true;
          warning = 'Dữ liệu phiên bản mới hơn đã được sao lưu; kho này chỉ đọc.';
          db = parsed;
          return db;
        }
        if (version === VERSION) {
          db = ensureShape(parsed);
          return db;
        }
      }
    }
    db = legacyToTree(parsed && typeof parsed === 'object' ? parsed : null);
    save();
    clearLegacy();
    return db;
  }

  function node(key) {
    var rec = db && db.nodes ? db.nodes[keyOf(key)] : null;
    return rec ? clone(rec) : null;
  }
  function meta(key) {
    var rec = node(key);
    return rec ? rec.meta : null;
  }
  function list() {
    var out = [];
    if (!db || !db.nodes) return out;
    Object.keys(db.nodes).forEach(function (key) {
      var rec = db.nodes[key];
      if (rec && rec.meta) out.push(clone(rec.meta));
    });
    return out;
  }
  function branch(key, name, fallback) {
    var k = keyOf(key);
    var rec = db && db.nodes ? db.nodes[k] : null;
    if (!rec) return fallback === undefined ? undefined : clone(fallback);
    if (!rec.branches || typeof rec.branches !== 'object' || Array.isArray(rec.branches)) rec.branches = {};
    if (!has(rec.branches, name)) rec.branches[name] = fallback === undefined ? {} : clone(fallback);
    return clone(rec.branches[name]);
  }
  // Module mới tự xin nhánh riêng của mình; không cần sửa cấu trúc cây khi mở rộng.
  function ensureBranch(key, name, fallback) {
    var k = keyOf(key);
    var rec = db && db.nodes ? db.nodes[k] : null;
    if (!rec) return fallback === undefined ? undefined : clone(fallback);
    if (!rec.branches || typeof rec.branches !== 'object' || Array.isArray(rec.branches)) rec.branches = {};
    if (!has(rec.branches, name)) {
      rec.branches[name] = fallback === undefined ? {} : clone(fallback);
      save();
    }
    return clone(rec.branches[name]);
  }
  function saveBranch(key, name, value) {
    var k = keyOf(key);
    var rec = db && db.nodes ? db.nodes[k] : null;
    if (!rec || readOnly) return null;
    if (!rec.branches || typeof rec.branches !== 'object' || Array.isArray(rec.branches)) rec.branches = {};
    rec.branches[name] = clone(value);
    save();
    return clone(rec.branches[name]);
  }
  function create(mst, name, type) {
    var typed = keyOf(mst);
    var key = typed;
    var generated = false;
    if (!key) {
      key = 'MST-' + uid('n').toUpperCase();
      generated = true;
    } else if (db.nodes && has(db.nodes, key)) {
      return { error: 'exists' };
    }
    var now = new Date().toISOString();
    var m = {
      id: uid('t'),
      key: key,
      mst: typed,
      name: String(name || '').trim() || key,
      type: type === 'hkd' ? 'hkd' : 'company',
      createdAt: now,
      updatedAt: now
    };
    db.nodes[key] = { type: 'tenant', key: key, meta: m, branches: { chungtu: defaultData() } };
    save();
    return { meta: clone(m), generated: generated };
  }
  function rename(key, name) {
    var rec = db && db.nodes ? db.nodes[keyOf(key)] : null;
    if (!rec || readOnly) return null;
    rec.meta.name = String(name || '').trim();
    rec.meta.updatedAt = new Date().toISOString();
    save();
    return clone(rec.meta);
  }
  function remove(key) {
    var k = keyOf(key);
    if (!db || !db.nodes || !has(db.nodes, k) || readOnly) return false;
    delete db.nodes[k];
    save();
    return true;
  }

  // API chung cho tính năng sau này: mọi thứ đều là đường dẫn trong cùng một cây.
  function getPath(parts) {
    var cur = db;
    for (var i = 0; i < parts.length; i++) {
      if (cur === null || cur === undefined || typeof cur !== 'object') return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }
  function setPath(parts, value) {
    if (readOnly || !parts || !parts.length) return null;
    var cur = db;
    for (var i = 0; i < parts.length - 1; i++) {
      var p = parts[i];
      if (!cur[p] || typeof cur[p] !== 'object' || Array.isArray(cur[p])) cur[p] = {};
      cur = cur[p];
    }
    cur[parts[parts.length - 1]] = clone(value);
    save();
    return cur[parts[parts.length - 1]];
  }
  function childKeys(parts) {
    var n = getPath(parts);
    return n && typeof n === 'object' && !Array.isArray(n) ? Object.keys(n) : [];
  }

  // Nhập lại toàn bộ kho từ bản sao lưu; chỉ nhận phiên bản cũ hơn hoặc bằng hiện tại.
  function replaceAll(input) {
    if (readOnly || !input || typeof input !== 'object') return false;
    var v = Number(input.schemaVersion);
    var nodes = input.nodes && typeof input.nodes === 'object' && !Array.isArray(input.nodes) ? input.nodes : null;
    if (!v || v > VERSION || !nodes) return false;
    db = {
      schemaVersion: v,
      updatedAt: input.updatedAt || new Date().toISOString(),
      nodes: clone(nodes)
    };
    warning = '';
    legacyList = [];
    save();
    return true;
  }

  load();

  global.KetoanDB = {
    version: VERSION,
    key: STORE_KEY,
    memory: backend.__memory === true,
    warning: warning,
    readOnly: readOnly,
    isReadOnly: function () { return readOnly; },
    list: list,
    node: node,
    meta: meta,
    branch: branch,
    saveBranch: saveBranch,
    ensureBranch: ensureBranch,
    replaceAll: replaceAll,
    defaultAccounts: function () { return clone(DEFAULT_ACCOUNTS); },
    create: create,
    rename: rename,
    remove: remove,
    getPath: getPath,
    setPath: setPath,
    childKeys: childKeys,
    snapshot: function () { return clone(db); },
    uid: uid
  };
})(typeof window !== 'undefined' ? window : this);
