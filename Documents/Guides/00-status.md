# Trạng thái dự án

## 2026-11-24
- Nhiệm vụ: dựng nền tảng phần mềm kế toán dịch vụ cho nhiều công ty / hộ kinh doanh nhỏ, HTML/CSS/JS thuần, dữ liệu lưu cục bộ.
- Nhánh: `main`.
- Yêu cầu đã chốt: danh sách công ty bên trái; mỗi công ty một vùng giao diện riêng; click vào đúng công ty thì nạp metadata và dữ liệu của công ty đó; có dữ liệu mới chỉ tải phần mới, không render toàn bộ; tạo được nhiều công ty.
- Đã xong: khung giao diện, lưu trữ riêng từng công ty, cơ chế cập nhật tăng dần theo phần (metadata / thống kê / bảng chứng từ).
- Kiểm chứng bằng lệnh: `node Scripts/check-logic.js` — 18/18 PASS (tạo 2 công ty, dữ liệu không lẫn, click lại không render lại, thêm chứng từ chỉ vá 2 phần).
- Kiểm chứng máy chủ: `http://127.0.0.1:8899/index.html` trả HTTP 200, 1796 byte.
- Chưa kiểm chứng bằng mắt trên trình duyệt thiết bị: công cụ điều khiển trình duyệt bị chặn khi Apelin đang ở trước. Có thể tự mở đường dẫn ở trên để xem giao diện.

## 2026-11-24 (bổ sung)
- Nhiệm vụ mới: xây kho dữ liệu chung dạng cây, mỗi mã số thuế là một nhánh, có thể mở rộng tính năng sau này.
- Đã xong: form thêm ô MST; một khóa lưu duy nhất có `schemaVersion`; mỗi nhánh MST có `meta` và `branches`; nhánh chứng từ hoạt động; thêm nhánh khác không cần đổi cấu trúc; chuyển dữ liệu phẳng cũ sang cây; chặn MST trùng; tự tạo khóa khi MST trống; sao lưu khi gặp phiên bản lạ; sidebar hiển thị MST.
- Kiểm chứng bằng lệnh: `node --check app.js`, `node --check db.js` sạch; `node Scripts/check-logic.js` — 31/31 PASS.
- Kiểm chứng máy chủ: cổng 8899 trả HTTP 200 cho `index.html`, `db.js`, `app.js`.
- Chưa kiểm chứng bằng mắt trên trình duyệt: vẫn chưa mở được giao diện thật. Có thể tự mở `http://127.0.0.1:8899/index.html`, tạo hai công ty có MST khác nhau, thêm chứng từ rồi chuyển qua lại để xem bộ đếm “Cập nhật phần” tăng và “Render toàn bộ” đứng yên.
- Commit: `4057b28a2482967e596234af033dccf4b95a767d`.

## 2026-11-24 (khung module)
- Nhiệm vụ mới: tách phần mềm thành các phần chạy cùng nhau trên một kho dữ liệu, dễ thêm tính năng sau này mà không đụng cấu trúc cũ.
- Đã xong: vỏ ứng dụng chỉ lo sidebar, pane riêng và chuyển phần. Năm phần độc lập gồm chứng từ, danh mục, công nợ, báo cáo và thiết lập; mỗi phần tự lưu vào nhánh riêng của đúng mã số thuế và tự vá giao diện khi có dữ liệu mới.
- Bổ sung: danh mục dùng chung làm nguồn tài khoản duy nhất cho chứng từ; công nợ phải thu/phải trả; báo cáo lấy số từ chứng từ và công nợ; thiết lập lưu đơn vị tiền/ký hiệu/năm và xuất/nhập toàn bộ dữ liệu.
- Kiểm chứng bằng lệnh: kiểm cú pháp tất cả tệp sạch; `node Scripts/check-logic.js` — 47/47 PASS (giữ nguyên 31 ca cũ và thêm 16 ca cho năm phần mới).
- Kiểm chứng máy chủ: cổng 8899 trả HTTP 200 cho toàn bộ tệp giao diện và các phần mới.
- Chưa kiểm chứng bằng mắt trên trình duyệt: chưa mở giao diện thật. Có thể tự mở `http://127.0.0.1:8899/index.html`, tạo công ty, thử từng tab và xuất/nhập dữ liệu.

## 2026-11-24 (kho, bán hàng, hóa đơn)
- Nhiệm vụ mới: bổ sung các tính năng cơ bản còn thiếu là kho, bán hàng và hóa đơn, rồi nối ba phần này với chứng từ, công nợ và báo cáo có sẵn.
- Đã xong: tám phần cùng chạy trên một kho dữ liệu, mỗi phần một nhánh riêng theo từng mã số thuế. Kho thêm hàng vào danh mục và chặn xuất quá tồn; bán hàng trừ tồn, ghi phiếu thu phần đã thu và công nợ phần chưa thu; hóa đơn tự tạo số theo ký hiệu trong thiết lập, chặn trùng số, tính thuế vào tổng; báo cáo thêm doanh thu bán, giá trị tồn kho và tổng hóa đơn.
- Kiểm chứng bằng lệnh: kiểm cú pháp toàn bộ tệp sạch; `node Scripts/check-logic.js` — 74/74 PASS (47 ca cũ giữ nguyên, thêm 27 ca mới).
- Kiểm chứng máy chủ: cổng 8899 trả HTTP 200 cho toàn bộ tệp giao diện, gồm ba phần mới.
- Chưa kiểm chứng bằng mắt trên trình duyệt thiết bị: chưa mở giao diện thật. Có thể tự mở `http://127.0.0.1:8899/index.html`, tạo công ty, vào Kho thêm hàng, vào Bán hàng lập phiếu, vào Hóa đơn phát hành, rồi xem Báo cáo và thử chuyển công ty qua lại.

## 2026-11-24 (mua hàng, quỹ, tài sản)
- Nhiệm vụ mới: tiếp tục lấp các phần còn thiếu là mua hàng, quỹ / ngân hàng, tài sản; đồng thời bổ sung chiết khấu và trả hàng cho bán hàng.
- Đã xong: mười một phần cùng chạy trên một kho dữ liệu, mỗi phần một nhánh riêng theo từng mã số thuế. Mua hàng cộng tồn, ghi chứng từ chi và khoản phải trả, có hóa đơn đầu vào tự đánh số và chặn trùng số; quỹ ghi phiếu thu/chi và số dư; tài sản tính khấu hao đường thẳng, không vượt giá trị còn lại. Bán hàng có chiết khấu, trả hàng hoàn tồn/hoàn tiền và giảm đúng phần công nợ chưa thu. Báo cáo cộng thêm tổng mua, hóa đơn đầu vào, nguyên giá, khấu hao và doanh thu đã trừ hàng trả.
- Kiểm chứng bằng lệnh: kiểm cú pháp toàn bộ tệp sạch; `node Scripts/check-logic.js` — 98/98 PASS (74 ca cũ giữ nguyên, thêm 24 ca mới).
- Kiểm chứng máy chủ: cổng 8899 trả HTTP 200 cho toàn bộ tệp giao diện, gồm ba phần mới.
- Chưa kiểm chứng bằng mắt trên trình duyệt thiết bị: chưa mở giao diện thật. Có thể tự mở `http://127.0.0.1:8899/index.html`, tạo công ty, thử Mua hàng → Quỹ → Tài sản → Báo cáo, rồi vào Bán hàng thử trả hàng và xem lại tồn kho.

## Bổ sung (liên kết chứng từ và báo cáo dùng ngay)
- Nhiệm vụ: nối chứng từ vào công nợ và hoàn thiện các sổ/báo cáo có thể dùng ngay cho nghiệp vụ kế toán.
- Đã xong: phiếu thu/chi có ô chọn khoản công nợ; lưu phiếu tự cộng vào số đã thu/trả, giữ mã phiếu liên kết trên khoản công nợ và hiện số chứng từ trên bảng công nợ. Phần Báo cáo có sáu tab: tổng hợp, nhật ký chung, sổ cái, cân đối phát sinh, kết quả kinh doanh & cân đối tài sản, thuế GTGT. Chuyển tab con của báo cáo chỉ ẩn/hiện bảng, không tạo lại pane và không tăng bộ đếm “Cập nhật phần”.
- Nguồn số liệu báo cáo lấy từ đúng nhánh mã số thuế hiện tại; tổng Nợ bằng tổng Có; doanh thu đã trừ hàng trả; thuế phải nộp là thuế đầu ra trừ đầu vào.
- Kiểm chứng bằng lệnh: kiểm cú pháp toàn bộ tệp JavaScript sạch; `node Scripts/check-logic.js` — 113/113 PASS (98 ca cũ giữ nguyên, thêm 15 ca mới).
- Chưa kiểm chứng bằng mắt trên trình duyệt thiết bị: tự mở `http://127.0.0.1:8899/index.html`, tạo công ty, thêm khoản công nợ, thêm chứng từ có chọn khoản đó, rồi mở lần lượt sáu tab Báo cáo và quan sát bộ đếm trên cùng.

## Bổ sung (mười bốn phần, hướng tới phát hành)
- Nhiệm vụ: hoàn thiện nghiệp vụ còn thiếu theo Thông tư 133/2016/TT-BTC — định khoản Nợ/Có, khóa kỳ, số dư đầu kỳ, sửa/xóa bản ghi có nhật ký và báo cáo tài chính in được.
- Đã xong: thêm ba phần Định khoản, Khóa kỳ, Quản lý dữ liệu; mỗi công ty giờ có mười bốn nhánh riêng. Định khoản chặn phiếu chưa cân bằng; khóa kỳ chặn mọi thay đổi trong kỳ đã khóa; số dư đầu kỳ vào đúng cột số dư đầu kỳ của bảng cân đối. Báo cáo có tab thứ bảy gồm B01a/B02 rút gọn và nút In. Dữ liệu mẫu có đủ mười bốn nhánh.
- Kiểm chứng bằng lệnh: kiểm cú pháp toàn bộ tệp JavaScript sạch; `node Scripts/check-logic.js` — 125/125 PASS (113 ca cũ giữ nguyên, thêm 12 ca mới); `node Scripts/check-demo.js` — 20/20 PASS. Máy chủ cục bộ trả HTTP 200 cho mọi tệp giao diện, gồm ba phần mới.
- Chưa kiểm chứng bằng mắt trên trình duyệt thiết bị: tự mở `http://127.0.0.1:8899/index.html`, bấm “Dữ liệu mẫu”, thử định khoản, khóa kỳ rồi thêm bút toán (phải bị chặn), mở lại kỳ, sửa bản ghi trong “Quản lý dữ liệu” và mở tab “Báo cáo tài chính” để in.
- Chưa phát hành công khai: chưa đóng gói, chưa đẩy kho và chưa công bố; cần xác nhận riêng trước khi làm.

## Bổ sung (hoàn thiện nghiệp vụ theo Thông tư 133)
- Nhiệm vụ: rà soát nghiệp vụ kế toán và bổ sung các phần còn thiếu để phát hành công khai, nhưng vẫn giữ nguyên mười bốn phần và bảy tab báo cáo.
- Đã xong: giá vốn hàng bán (kể cả hoàn giá vốn khi trả hàng); bảng lương và trích theo lương; dự phòng công nợ; trả hàng mua giảm tồn và giảm phải trả; thanh lý/nhượng bán tài sản có lãi/lỗ; kết chuyển cuối kỳ cân bằng; báo cáo lưu chuyển tiền tệ B03. Mọi bút toán mới đều đi qua nhật ký chung.
- Kiểm chứng bằng lệnh: 20 tệp JavaScript biên dịch sạch; `node Scripts/check-logic.js` — 142/142 PASS (125 ca cũ giữ nguyên); `node Scripts/check-demo.js` — 27/27 PASS (20 ca cũ giữ nguyên). Chạy bằng `node.real --jitless` vì trình bao bọc `node` trên thiết bị hỏng.
- Chưa kiểm chứng bằng mắt trên trình duyệt thiết bị: tự mở `http://127.0.0.1:8899/index.html`, bấm “Dữ liệu mẫu”, thử giá vốn, lương, dự phòng, trả mua, thanh lý, kết chuyển và tab B03.
- Chưa phát hành công khai: chỉ làm sau khi người dùng nghiệm thu và xác nhận riêng.
