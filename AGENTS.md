# Kế toán dịch vụ — hướng dẫn dự án

## Chạy
- Mở trực tiếp `index.html` bằng trình duyệt, hoặc phục vụ cục bộ:
  `python3 -m http.server 8899 --bind 0.0.0.0 --directory .` trong thư mục dự án rồi mở `http://127.0.0.1:8899/index.html`.
- Không có bước build, không dùng thư viện ngoài: HTML/CSS/JS thuần. Các tệp được nạp bằng `<script>` thường để vẫn chạy khi mở bằng `file://`.
- Nút “Dữ liệu mẫu” ở đầu sidebar tạo một công ty mẫu có đủ mười bốn phần (MST `0102030405`); bấm lại chỉ mở công ty đó, không ghi đè dữ liệu đã sửa.

## Cấu trúc
- `index.html`: khung sidebar, form thêm công ty có ô mã số thuế và vùng làm việc.
- `styles.css`: giao diện chung và giao diện các phần mở rộng.
- `db.js`: kho dữ liệu chung dạng cây, có số phiên bản, tạo nhánh, thay toàn bộ kho, sao lưu và chuyển dữ liệu cũ.
- `js/core.js`: nơi đăng ký các phần và bộ hàm dùng chung; là nguồn duy nhất lấy danh sách tài khoản, hàng hóa, khách hàng, nhà cung cấp, phiếu bán, hóa đơn, phiếu quỹ, tài sản và tồn kho.
- `js/modules/`: mười bốn phần, mỗi phần một tệp, tự lo dữ liệu và giao diện riêng:
  chứng từ, định khoản, danh mục, công nợ, báo cáo, khóa kỳ, thiết lập, kho, bán hàng, hóa đơn, mua hàng, quỹ / ngân hàng, tài sản, quản lý dữ liệu.
- `js/demo.js`: dữ liệu mẫu một chạm, chỉ ghi vào nhánh của công ty mẫu.
- `app.js`: vỏ ứng dụng — sidebar, pane riêng từng công ty, chuyển phần và điều phối cập nhật; không chứa logic nghiệp vụ của từng phần.

## Dữ liệu lưu cục bộ
- Một khóa duy nhất `ketoan.v1:store`, bên trong có `schemaVersion` và `nodes`.
- Mỗi mã số thuế là một `nodes[<mst>]`, chứa `meta` và `branches`.
- Mỗi phần có một nhánh riêng: `chungtu`, `dinhkhoan`, `danhmuc`, `congno`, `baocao`, `khoaky`, `caidat`, `tonkho`, `banhang`, `hoadon`, `muahang`, `cashbank`, `taisan`, `quanly`. Thêm phần mới không đổi cấu trúc.
- Không nhập MST thì hệ thống tự tạo khóa riêng; MST trùng bị từ chối, không ghi đè nhánh có sẵn.
- Dữ liệu phẳng cũ `ketoan.v1:*` được chuyển sang cây khi mở trang, sau đó khóa cũ được dọn.
- Nếu gặp kho phiên bản mới hơn, hệ thống sao lưu và chuyển sang chế độ chỉ đọc, không ghi đè.
- Nếu trình duyệt chặn `localStorage`, ứng dụng tự dùng bộ nhớ phiên và báo ở chân sidebar.
- Phần thiết lập có xuất/nhập toàn bộ kho dữ liệu; nhập bản phiên bản lạ bị từ chối.

## Nghiệp vụ đã nối
- Kho: thêm hàng đưa luôn vào danh mục; nhập/xuất có kiểm tồn, không cho xuất quá số đang có.
- Bán hàng: chọn hàng và khách, tự trừ tồn kho; có chiết khấu và trả hàng (hoàn tồn, hoàn tiền đã thu, giảm công nợ phần chưa thu); tiền đã thu ghi thêm một phiếu thu, phần chưa thu ghi thêm một khoản phải thu.
- Hóa đơn: có thể lấy từ một phiếu bán hoặc tự nhập; số hóa đơn tự tăng theo ký hiệu và năm trong phần thiết lập, trùng số bị từ chối; thuế suất tính vào tổng thanh toán.
- Mua hàng: phiếu mua cộng tồn kho, tiền đã trả ghi chứng từ chi, phần chưa trả ghi khoản phải trả; hóa đơn đầu vào tự tạo số `HH/yy-001`, trùng số bị từ chối.
- Quỹ / ngân hàng: phiếu thu/chi theo tài khoản, mỗi phiếu đồng thời ghi một chứng từ; số dư tính riêng cho các phiếu quỹ.
- Tài sản: thêm tài sản, tính khấu hao đường thẳng theo số tháng, không vượt quá giá trị còn lại; khấu hao cộng vào chi phí báo cáo.
- Báo cáo: cộng thêm doanh thu bán hàng (đã trừ trả hàng), giá trị tồn kho, tổng hóa đơn, tổng mua, hóa đơn đầu vào, nguyên giá và khấu hao cạnh các số liệu chứng từ, công nợ. Có bảy tab: tổng hợp, nhật ký chung, sổ cái, cân đối phát sinh, kết quả kinh doanh & cân đối tài sản, thuế GTGT, báo cáo tài chính.
- Chứng từ ↔ công nợ: khi thêm phiếu có chọn khoản công nợ thì tự cộng vào số đã thu / đã trả, lưu mã phiếu liên kết trên khoản công nợ và hiện số chứng từ ở bảng công nợ.
- Định khoản: thêm phiếu Nợ/Có nhiều dòng, tổng Nợ phải bằng tổng Có mới lưu được; có sửa, xóa và hiện trong nhật ký chung.
- Khóa kỳ: khóa đến tháng nào thì mọi nghiệp vụ trước hoặc tháng đó bị chặn thêm/sửa/xóa; có thể mở lại khi cần, có ghi nhật ký.
- Số dư đầu kỳ: khai báo số dư Nợ/Có theo tài khoản, dùng làm số dư đầu kỳ của báo cáo tài chính.
- Quản lý dữ liệu: tìm, sửa, xóa bản ghi trên từng phần, xuất CSV theo từng nhánh và xem nhật ký thay đổi.
- Báo cáo tài chính: tab thứ bảy gồm B01a/B02 rút gọn, cân đối phát sinh và nút In; số liệu lấy đúng nhánh công ty đang mở.
- Giá vốn hàng bán: phiếu bán có ô giá vốn, trả hàng hoàn đúng giá vốn; B02 hiện riêng dòng giá vốn.
- Lương: bảng lương theo kỳ, tự tính khấu trừ theo tỷ lệ và trích theo lương; tiền lương, khấu trừ và trích theo lương đều vào nhật ký chung.
- Dự phòng công nợ: trích theo kỳ, hiện trên tổng hợp công nợ và giảm giá trị phải thu trên báo cáo tài chính.
- Trả hàng mua: hoàn tồn kho và giảm đúng khoản phải trả; thanh lý/nhượng bán tài sản ghi tiền thu, hao mòn và lãi/lỗ, đánh dấu tài sản đã thanh lý.
- Kết chuyển cuối kỳ: phiếu Nợ/Có luôn cân bằng, hiện trong bảng và nhật ký chung.
- Báo cáo: thêm B03 lưu chuyển tiền tệ trong bảy tab hiện có (không thêm tab mới).
- Đăng nhập & phân quyền: mở trang hiện màn hình đăng nhập; ba tài khoản mặc định là `admin/admin` (quản trị), `ketoan/123456` (kế toán), `xem/123456` (chỉ xem). Kế toán được ghi nghiệp vụ nhưng không nhập/xuất cả bộ dữ liệu hay đổi thiết lập và tài khoản; người xem chỉ đọc. Đổi mật khẩu mặc định trước khi dùng thật.
- Định giá tồn kho: thiết lập chọn FIFO hoặc bình quân; nhập có lô, xuất tính đúng giá theo phương pháp đã chọn; thuyết minh B02 nêu rõ phương pháp đang dùng.
- Công nợ: bảng tuổi nợ theo nhóm quá hạn; sổ chi tiết công nợ nằm trong tab tổng hợp báo cáo.
- Báo cáo bổ sung trong bảy tab hiện có: bảng lương, bảng khấu hao, tờ khai thuế GTGT rút gọn và thuyết minh B02/B03.
- Quản lý dữ liệu: xuất/nhập CSV có kèm mã bản ghi; nhập lại cùng tệp không tạo bản ghi trùng và không ghi đè bản ghi cũ. Nhật ký thay đổi ghi tên người dùng đang đăng nhập.

## Nguyên tắc render
- Mỗi công ty có một vùng `.tenant-pane` riêng, cache trong `state.panes` theo khóa MST.
- Click sidebar: tạo pane lần đầu; các lần sau chỉ đổi `hidden` và vá metadata.
- Mỗi pane có mười bốn tab; chuyển tab chỉ ẩn/hiện phần, không tạo lại pane, không tăng bộ đếm. Tab con trong Báo cáo cũng chỉ ẩn/hiện bảng, không tăng bộ đếm.
- Có dữ liệu mới: mỗi module tự so sánh chữ ký và chỉ vá đúng chỗ của mình trong đúng nhánh MST.
- Bộ đếm trên thanh trên cùng: “Render toàn bộ” chỉ tăng khi tạo công ty; “Cập nhật phần” tăng khi vá dữ liệu thật.

## Kiểm tra
- Chạy server cục bộ, mở trình duyệt: thêm công ty có MST, thêm hàng trong kho, bán hàng, phát hành hóa đơn, rồi sang công ty khác và quay lại.
- Kỳ vọng: bộ đếm “Cập nhật phần” tăng, “Render toàn bộ” đứng yên khi thêm dữ liệu và khi chuyển công ty cũ hoặc chuyển tab.
- Kiểm cú pháp 20 tệp (lõi, mười bốn phần, dữ liệu mẫu và hai tập lệnh kiểm): biên dịch từng tệp bằng `new vm.Script(...)` trong một lệnh `node.real --jitless -e`.
- Kiểm dữ liệu mẫu: `node Scripts/check-demo.js` — 27 dòng PASS (20 ca cũ giữ nguyên, thêm 7 ca cho nghiệp vụ mới).
- Kiểm logic không cần trình duyệt: `node Scripts/check-logic.js`.
  Kỳ vọng 160 dòng PASS: giữ nguyên 149 ca cũ, thêm 11 ca cho đăng nhập/phân quyền, nhật ký người dùng, định giá FIFO/bình quân, tuổi nợ, sổ chi tiết và nhập CSV chống trùng.
- Trên thiết bị này `node --check` bị Bus error; dùng `node.real --jitless` như trên.
