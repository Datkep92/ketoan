# Kế toán dịch vụ — hướng dẫn dự án

## Chạy
- Mở trực tiếp `index.html` bằng trình duyệt, hoặc phục vụ cục bộ:
  `python3 -m http.server 8899 --bind 0.0.0.0 --directory .` trong thư mục dự án rồi mở `http://127.0.0.1:8899/index.html`.
- Không có bước build, không dùng thư viện ngoài: HTML/CSS/JS thuần. Các tệp được nạp bằng `<script>` thường để vẫn chạy khi mở bằng `file://`.

## Cấu trúc
- `index.html`: khung sidebar, form thêm công ty có ô mã số thuế và vùng làm việc.
- `styles.css`: giao diện chung và giao diện các phần mở rộng.
- `db.js`: kho dữ liệu chung dạng cây, có số phiên bản, tạo nhánh, thay toàn bộ kho, sao lưu và chuyển dữ liệu cũ.
- `js/core.js`: nơi đăng ký các phần và bộ hàm dùng chung; là nguồn duy nhất lấy danh sách tài khoản, hàng hóa, khách hàng, phiếu bán và tồn kho.
- `js/modules/`: tám phần, mỗi phần một tệp, tự lo dữ liệu và giao diện riêng:
  chứng từ, danh mục, công nợ, báo cáo, thiết lập, kho, bán hàng, hóa đơn.
- `app.js`: vỏ ứng dụng — sidebar, pane riêng từng công ty, chuyển phần và điều phối cập nhật; không chứa logic nghiệp vụ của từng phần.

## Dữ liệu lưu cục bộ
- Một khóa duy nhất `ketoan.v1:store`, bên trong có `schemaVersion` và `nodes`.
- Mỗi mã số thuế là một `nodes[<mst>]`, chứa `meta` và `branches`.
- Mỗi phần có một nhánh riêng: `chungtu`, `danhmuc`, `congno`, `baocao`, `caidat`, `tonkho`, `banhang`, `hoadon`. Thêm phần mới không đổi cấu trúc.
- Không nhập MST thì hệ thống tự tạo khóa riêng; MST trùng bị từ chối, không ghi đè nhánh có sẵn.
- Dữ liệu phẳng cũ `ketoan.v1:*` được chuyển sang cây khi mở trang, sau đó khóa cũ được dọn.
- Nếu gặp kho phiên bản mới hơn, hệ thống sao lưu và chuyển sang chế độ chỉ đọc, không ghi đè.
- Nếu trình duyệt chặn `localStorage`, ứng dụng tự dùng bộ nhớ phiên và báo ở chân sidebar.
- Phần thiết lập có xuất/nhập toàn bộ kho dữ liệu; nhập bản phiên bản lạ bị từ chối.

## Nghiệp vụ đã nối
- Kho: thêm hàng đưa luôn vào danh mục; nhập/xuất có kiểm tồn, không cho xuất quá số đang có.
- Bán hàng: chọn hàng và khách, tự trừ tồn kho; tiền đã thu ghi thêm một phiếu thu, phần chưa thu ghi thêm một khoản phải thu.
- Hóa đơn: có thể lấy từ một phiếu bán hoặc tự nhập; số hóa đơn tự tăng theo ký hiệu và năm trong phần thiết lập, trùng số bị từ chối; thuế suất tính vào tổng thanh toán.
- Báo cáo: cộng thêm doanh thu bán hàng, giá trị tồn kho và tổng hóa đơn cạnh các số liệu chứng từ, công nợ.

## Nguyên tắc render
- Mỗi công ty có một vùng `.tenant-pane` riêng, cache trong `state.panes` theo khóa MST.
- Click sidebar: tạo pane lần đầu; các lần sau chỉ đổi `hidden` và vá metadata.
- Mỗi pane có tám tab; chuyển tab chỉ ẩn/hiện phần, không tạo lại pane, không tăng bộ đếm.
- Có dữ liệu mới: mỗi module tự so sánh chữ ký và chỉ vá đúng chỗ của mình trong đúng nhánh MST.
- Bộ đếm trên thanh trên cùng: “Render toàn bộ” chỉ tăng khi tạo công ty; “Cập nhật phần” tăng khi vá dữ liệu thật.

## Kiểm tra
- Chạy server cục bộ, mở trình duyệt: thêm công ty có MST, thêm hàng trong kho, bán hàng, phát hành hóa đơn, rồi sang công ty khác và quay lại.
- Kỳ vọng: bộ đếm “Cập nhật phần” tăng, “Render toàn bộ” đứng yên khi thêm dữ liệu và khi chuyển công ty cũ hoặc chuyển tab.
- Kiểm cú pháp từng tệp: `node --check db.js`, `node --check js/core.js`, `node --check js/modules/*.js`, `node --check app.js`.
- Kiểm logic không cần trình duyệt: `node Scripts/check-logic.js`.
  Kỳ vọng 74 dòng PASS: gồm 47 ca cũ và 27 ca mới cho kho, bán hàng, hóa đơn, chặn tồn, chặn trùng số và điểm nối báo cáo.
