// Tạo tài khoản admin ban đầu trong Firestore (chỉ chạy 1 lần).
// Dùng: node scripts/seed.js  (nhớ có sẵn biến môi trường Firebase, xem .env.example)
require("dotenv").config();
const { prisma } = require("../lib/db");
const bcrypt = require("bcryptjs");

async function main() {
  const existing = await prisma.settings.findUnique({ where: { id: 1 } });
  if (existing) {
    console.log("Settings đã tồn tại trong Firestore, bỏ qua seed.");
    return;
  }
  const initialPassword = process.env.INITIAL_ADMIN_PASSWORD || "admin123";
  const passwordHash = await bcrypt.hash(initialPassword, 10);
  await prisma.settings.create({
    data: { id: 1, companyName: "Công ty của bạn", passwordHash },
  });
  console.log(`Đã tạo tài khoản admin. Đăng nhập bằng username "admin" và mật khẩu: ${initialPassword}`);
  console.log("Nhớ đổi mật khẩu này trong trang Cài đặt sau khi đăng nhập lần đầu.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
