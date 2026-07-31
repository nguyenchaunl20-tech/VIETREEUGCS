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

## Gắn domain riêng

Trong project Vercel → **Settings → Domains** → nhập domain đã mua → làm theo hướng dẫn DNS Vercel đưa ra.

## Ghi chú bảo mật / vận hành

- Mật khẩu được hash (bcrypt), không lưu dạng chữ thường.
- Ảnh GMV vẫn nhập bằng link dán vào (chưa hỗ trợ upload file ảnh trực tiếp). Báo lại nếu bạn cần thêm phần upload ảnh thật.
- Toàn bộ dữ liệu (brand, campaign, đơn đăng ký, nhân viên) nằm trong Firestore của bạn, xem/backup trực tiếp trong Firebase Console → Firestore Database.
- Firestore free tier cho khoảng 50.000 lượt đọc + 20.000 lượt ghi mỗi ngày — thoải mái dùng miễn phí lâu dài với quy mô tuyển UGC theo campaign.
