// Kiểm dữ liệu mẫu không cần trình duyệt: node Scripts/check-demo.js
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var root = path.resolve(__dirname, '..');

var mem = {};
global.window = global;
global.localStorage = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
  setItem: function (k, v) { mem[k] = String(v); },
  removeItem: function (k) { delete mem[k]; }
};

var files = [
  'db.js', 'js/core.js',
  'js/modules/danhmuc.js', 'js/modules/chungtu.js', 'js/modules/congno.js',
  'js/modules/baocao.js', 'js/modules/caidat.js', 'js/modules/tonkho.js',
  'js/modules/banhang.js', 'js/modules/hoadon.js', 'js/modules/muahang.js',
  'js/modules/cashbank.js', 'js/modules/taisan.js',
  'js/modules/dinhkhoan.js', 'js/modules/khoaky.js', 'js/modules/quanly.js',
  'js/demo.js'
];
files.forEach(function (file) {
  vm.runInThisContext(fs.readFileSync(path.join(root, file), 'utf8'), { filename: file });
});

var failed = 0;
function check(name, ok) {
  if (ok) console.log('PASS: ' + name);
  else { console.log('FAIL: ' + name); failed++; }
}
function sum(rows, field) {
  return (rows || []).reduce(function (n, r) { return n + (Number(r[field]) || 0); }, 0);
}

var DB = global.KetoanDB;
var D = global.KetoanDemo;
check('có bộ dữ liệu mẫu', !!D && typeof D.seed === 'function');

var first = D.seed();
check('tạo được công ty mẫu', !!first && !!first.key && first.existing === false);
var key = first.key;
var node = DB.node(key);
check('công ty có đủ mười bốn nhánh', !!node && Object.keys(node.branches).length === 14);

var dm = DB.branch(key, 'danhmuc');
check('danh mục có hàng hóa và khách hàng', dm.items.length === 4 && dm.customers.length === 3 && dm.suppliers.length === 2);

var ct = DB.branch(key, 'chungtu');
check('có chín chứng từ', ct.vouchers.length === 9);

var cn = DB.branch(key, 'congno');
check('có bốn khoản công nợ', cn.records.length === 4);
check('khoản công nợ nối hai chứng từ', cn.records[0].voucherIds.length === 2 && cn.records[0].paid === 5000000);

var bh = DB.branch(key, 'banhang');
check('có ba phiếu bán và một lần trả hàng', bh.orders.length === 3 && bh.orders[2].returns.length === 1);

var hd = DB.branch(key, 'hoadon');
check('có ba hóa đơn, tổng thuế đầu ra 608000', hd.invoices.length === 3 && sum(hd.invoices, 'taxAmount') === 608000);

var mh = DB.branch(key, 'muahang');
check('có hai phiếu mua và hai hóa đơn đầu vào', mh.purchases.length === 2 && mh.bills.length === 2);
check('tổng thuế đầu vào 560000', sum(mh.bills, 'taxAmount') === 560000);

var cb = DB.branch(key, 'cashbank');
check('có ba phiếu quỹ', cb.entries.length === 3);

var ts = DB.branch(key, 'taisan');
check('có hai tài sản đã tính khấu hao', ts.assets.length === 2 && sum(ts.assets, 'accumulated') > 0);

var kho = DB.branch(key, 'tonkho');
check('tồn kho có bốn lần xuất nhập', Object.keys(kho.stock).length === 4 && kho.movements.length === 4);

var dk = DB.branch(key, 'dinhkhoan');
var balanced = (dk.entries || []).every(function (v) {
  var no = sum(v.lines, 'debit'), co = sum(v.lines, 'credit');
  return no > 0 && no === co;
});
check('có ba phiếu định khoản, mỗi phiếu cân bằng', dk.entries.length === 3 && balanced);
var nhatKy = global.Ketoan.helpers.journalFrom({ ct: ct, bh: bh, mh: mh, ts: ts, dk: dk });
check('nhật ký chung gồm bút toán định khoản', nhatKy.filter(function (e) { return e.source === 'dinhkhoan'; }).length >= 4);

var kk = DB.branch(key, 'khoaky');
check('có số dư đầu kỳ và kỳ đang mở', kk.openings.length === 2 && !kk.lockedUntil &&
  sum(kk.openings, 'amount') === 35000000);

var ql = DB.branch(key, 'quanly');
check('có nhật ký thay đổi dữ liệu', ql.audit.length >= 2 && ql.branches.length === 14);

var snapshot = JSON.stringify(DB.snapshot());
var second = D.seed();
check('bấm lại mở đúng công ty cũ', second.existing === true && second.key === key);
check('bấm lại không ghi đè dữ liệu', JSON.stringify(DB.snapshot()) === snapshot);

console.log(failed ? 'CÓ ' + failed + ' CA CHƯA ĐẠT' : 'TẤT CẢ CA DỮ LIỆU MẪU ĐẠT');
process.exit(failed ? 1 : 0);
