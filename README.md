# Hệ thống tuyển UGC theo Campaign

Hướng dẫn bên dưới làm được **hoàn toàn trên trình duyệt**, không cần cài Node.js hay dùng dòng lệnh (terminal) ở máy tính của bạn.

## Bước 1: Đã có Firebase rồi (bạn làm xong phần này)

Bạn đã có file `.json` khoá Firebase (Service account). Giữ file này lại, lát nữa dùng.

## Bước 2: Đưa code lên GitHub bằng kéo-thả (không cần lệnh git)

1. Giải nén file `ugc-recruitment-firebase.zip` ra 1 thư mục trên máy tính.
2. Vào https://github.com → đăng nhập (hoặc tạo tài khoản mới nếu chưa có, miễn phí).
3. Bấm dấu **+** góc trên phải → **New repository** → đặt tên bất kỳ (vd `ugc-recruitment`) → chọn **Private** (để không ai khác xem được code) → **Create repository**.
4. Ở trang repo vừa tạo, bấm dòng chữ **"uploading an existing file"**.
5. Mở thư mục đã giải nén ở bước 1, chọn **hết tất cả file và thư mục con** bên trong (bấm vào 1 file rồi Ctrl+A để chọn hết), **kéo thả** cả đám vào khung upload của GitHub.
   - Nếu trình duyệt bạn không kéo được cả thư mục con, xem ghi chú cuối bước này.
6. Cuộn xuống, bấm **Commit changes**.

> Ghi chú: một số trình duyệt chỉ cho kéo file rời, không kéo được thư mục con lồng bên trong (như `app/api/...`). Nếu gặp vậy, cách chắc ăn nhất là dùng **GitHub Desktop** (app cài vào máy, không cần biết lệnh gì cả, chỉ có giao diện bấm chọn thư mục rồi bấm nút "Publish") — tải tại https://desktop.github.com. Nói mình biết nếu bạn muốn hướng dẫn cách này thay vì kéo-thả.

## Bước 3: Deploy lên Vercel (miễn phí)

1. Vào https://vercel.com → đăng nhập bằng tài khoản GitHub vừa tạo (bấm **Continue with GitHub**).
2. Bấm **Add New → Project** → chọn đúng repo `ugc-recruitment` vừa tạo → **Import**.
3. Ở phần **Environment Variables**, thêm từng dòng sau (bấm **Add** sau mỗi dòng):

   | Tên biến | Giá trị |
   |---|---|
   | `FIREBASE_SERVICE_ACCOUNT` | Mở file `.json` Firebase bằng Notepad, copy **toàn bộ nội dung**, dán vào đây |
   | `AUTH_SECRET` | Gõ đại 1 chuỗi ký tự dài bất kỳ, ví dụ `abc123xyz-cong-ty-toi-2026-bao-mat` |
   | `INITIAL_ADMIN_PASSWORD` | Mật khẩu admin bạn muốn, vd `MatKhauCuaToi123` |
   | `SETUP_KEY` | Gõ đại 1 chuỗi khác, ví dụ `mokhoa-thietlap-2026` (nhớ chuỗi này, dùng ở bước 4) |

4. Bấm **Deploy**, đợi khoảng 1-2 phút.
5. Xong sẽ có link dạng `ten-du-an.vercel.app` — đây là link chính thức của app bạn.

## Bước 4: Tạo tài khoản admin (chỉ cần mở 1 link trên trình duyệt)

Mở 1 tab trình duyệt mới, dán link sau (thay đúng tên miền của bạn và đúng `SETUP_KEY` bạn đã đặt ở bước 3):

```
https://ten-du-an.vercel.app/api/setup?key=mokhoa-thietlap-2026
```

Nếu thấy dòng chữ **"Đã tạo tài khoản admin thành công!"** là xong. Giờ vào `https://ten-du-an.vercel.app/admin`, đăng nhập bằng username `admin` và mật khẩu bạn đặt ở `INITIAL_ADMIN_PASSWORD` → vào tab **Cài đặt** đổi mật khẩu ngay.

(Link `/api/setup` này chỉ dùng đúng 1 lần lúc đầu, dùng lại sau đó cũng không sao vì nó tự biết đã có tài khoản admin rồi thì sẽ không tạo lại.)

## Bước 5: Gửi link cho mọi người

- Link công khai để mọi người đăng ký UGC: `https://ten-du-an.vercel.app`
- Link quản trị của bạn/nhân viên: `https://ten-du-an.vercel.app/admin`

Ai vào bằng máy tính hay điện thoại cũng thấy chung 1 dữ liệu, không cần cài app gì cả.

## Sau này muốn sửa code / cập nhật app

Vì không dùng terminal, cách đơn giản nhất là: sửa trực tiếp file trên GitHub (bấm vào file → bấm bút chì để sửa → Commit changes), Vercel sẽ **tự động deploy lại** mỗi khi bạn Commit. Việc lớn hơn thì cứ nhắn lại đây, mình sửa code rồi gửi bạn file mới để bạn thay vào GitHub.

## Gửi email cho UGC (tính năng mới)

Trong tab **Đơn đăng ký**, tick chọn 1 hoặc nhiều bạn → bấm **"Gửi mail cho N bạn đã chọn"** → soạn tiêu đề + nội dung (dùng `{{tiktokId}}`, `{{code}}`, `{{campaignName}}`, `{{followers}}`, `{{email}}` để tự động điền riêng cho từng người) → Gửi. Nội dung soạn sẽ tự lưu làm mẫu cho campaign đó, lần sau mở lại sẽ tự điền sẵn để chỉnh sửa tiếp. Admin và nhân viên được phân quyền xem campaign nào thì gửi được mail cho campaign đó.

Để tính năng này hoạt động, cần cấu hình **1 Gmail công ty** để làm địa chỉ gửi đi:

1. Vào tài khoản Gmail muốn dùng để gửi → bật **Xác minh 2 bước** (2-Step Verification) tại `myaccount.google.com/security` (bắt buộc phải bật cái này trước).
2. Vào `myaccount.google.com/apppasswords` → tạo mới 1 "Mật khẩu ứng dụng" (App Password), đặt tên bất kỳ (VD: "UGC App") → Google cho ra 1 chuỗi 16 ký tự.
3. Vào Vercel → project → **Settings → Environment Variables**, thêm:
   - `MAIL_USER` = địa chỉ Gmail đó (VD: `congty@gmail.com`)
   - `MAIL_PASSWORD` = chuỗi 16 ký tự vừa tạo ở bước 2 (không phải mật khẩu Gmail thường)
   - `MAIL_FROM_NAME` = tên hiển thị khi UGC nhận mail (VD: `Công ty ABC`)
4. Bấm **Redeploy** để áp dụng biến môi trường mới.

Gmail miễn phí giới hạn khoảng 500 mail/ngày — đủ dùng cho tuyển UGC theo campaign. Nếu sau này cần gửi số lượng lớn hơn, có thể đổi sang dịch vụ email chuyên dụng (Resend, SendGrid...) bằng cách khai báo thêm `MAIL_HOST`/`MAIL_PORT`/`MAIL_SECURE` (xem chú thích trong `.env.example`), không cần sửa code.

## Gắn domain riêng

Trong project Vercel → **Settings → Domains** → nhập domain đã mua → làm theo hướng dẫn DNS Vercel đưa ra.

## Ghi chú bảo mật / vận hành

- Mật khẩu được hash (bcrypt), không lưu dạng chữ thường.
- Ảnh GMV vẫn nhập bằng link dán vào (chưa hỗ trợ upload file ảnh trực tiếp). Báo lại nếu bạn cần thêm phần upload ảnh thật.
- Toàn bộ dữ liệu (brand, campaign, đơn đăng ký, nhân viên) nằm trong Firestore của bạn, xem/backup trực tiếp trong Firebase Console → Firestore Database.
- Firestore free tier cho khoảng 50.000 lượt đọc + 20.000 lượt ghi mỗi ngày — thoải mái dùng miễn phí lâu dài với quy mô tuyển UGC theo campaign.

## Kết nối AI agent (Claude) để tự lọc đơn

App có sẵn 1 cổng MCP tại `https://<domain-của-bạn>/api/mcp` để Claude đọc campaign, đơn đăng ký, lịch sử KOC và **ghi đề xuất lọc** (cột "Đề xuất AI" trong tab Đơn đăng ký). Claude **không** tự đổi trạng thái duyệt, không gửi mail, không xoá dữ liệu: bạn vẫn bấm Chọn như bình thường.

1. Tạo 1 chuỗi bí mật ngẫu nhiên dài (ít nhất 24 ký tự, ví dụ dùng trình tạo mật khẩu), rồi vào Vercel → project → **Settings → Environment Variables** → thêm `MCP_API_KEY` = chuỗi đó → **Redeploy**.
2. Vào claude.ai → **Customize → Connectors → + Add → Add custom connector**:
   - Tên: `Vietree UGC`
   - URL: `https://<domain-của-bạn>/api/mcp`
   - Authentication: **No sign in**, thêm request header `Authorization` = `Bearer <MCP_API_KEY>`
3. Trong cuộc trò chuyện, bật connector rồi nhắn ví dụ: *"Lọc đơn campaign CLIO Cushion tháng 11, lưu đề xuất vào app"*.

Các luật Claude áp dụng (công cụ `screen_campaign`):

| Mã luật | Ý nghĩa | Mức |
|---|---|---|
| BLACKLIST | KOC trong blacklist (collection `blacklist`) | Loại |
| DUP_IN_CAMPAIGN | Trùng ID TikTok hoặc SĐT với đơn đăng ký trước trong cùng campaign | Loại |
| OWING_POST | Đã được chọn + đã gửi hàng campaign trước, quá `MCP_OWING_DAYS` ngày (mặc định 30) chưa air bài | Loại |
| SAME_BRAND_PLATFORM_MONTH | Đã được chọn campaign khác cùng brand, cùng nền tảng, cùng tháng | Loại (chỉ đang đăng ký thì Xem lại) |
| SAME_PRODUCT_3_MONTHS | Đã nhận cùng sản phẩm (không tính phân loại) 2 tháng liền trước | Loại |
| MISSING_INFO | Thiếu ID TikTok (campaign bắt buộc TikTok) hoặc SĐT sai | Xem lại |

Ghi chú: nền tảng của campaign lấy từ trường `platform` nếu có, không thì đoán theo tên campaign (Threads, Instagram, Facebook, Shopee...) và việc có bắt buộc TikTok. Luật "cùng tháng" và "3 tháng liền" tính theo **tháng KOC đăng ký** (giờ VN), nên campaign dùng lại qua nhiều tháng vẫn đúng. Đặt tên campaign có chữ nền tảng để luật chạy chính xác.

## Nhắc KOC air bài (mail tự động + nhóm Zalo)

1. Trong tab **Campaigns**, mở campaign → mục **Hạn air bài & nhắc nhở**: đặt *Hạn chung* và/hoặc *Số ngày được đăng sau khi gửi hàng*, và *Tên nhóm Zalo*. Hạn của mỗi KOC là ngày đến trước trong hai cách tính.
2. Trong tab **Kết quả Campaign**, nhập *Ngày gửi* hàng cho từng KOC (cần cho cách tính theo số ngày). Cột **Hạn air · Đã nhắc** hiện hạn của từng người và các lần đã nhắc.
3. Vercel → Environment Variables: thêm `CRON_SECRET` (chuỗi ngẫu nhiên ≥ 16 ký tự) → Redeploy. Mỗi sáng khoảng 8–9h, hệ thống tự gửi mail cho KOC đã được chọn, chưa có link air bài, **còn 1–3 ngày tới hạn** (1 lần) và **quá hạn 1–7 ngày** (1 lần).
4. Nhóm Zalo: Claude dùng công cụ `get_post_reminders` để soạn tin nhắc theo từng campaign; bạn xác nhận thì Claude dán vào nhóm trên Zalo PC và đánh dấu bằng `mark_zalo_reminders_sent`.
