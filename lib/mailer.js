const nodemailer = require("nodemailer");

function getTransporter() {
  // Cách 1: khai báo SMTP tuỳ ý (VD: dịch vụ email công ty, Zoho, Outlook, Resend SMTP...)
  if (process.env.MAIL_HOST) {
    return nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT || 587),
      secure: process.env.MAIL_SECURE === "true",
      auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASSWORD },
    });
  }
  // Cách 2 (mặc định, đơn giản nhất): gửi qua Gmail bằng Mật khẩu ứng dụng (App Password)
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASSWORD },
  });
}

// Thay {{placeholder}} trong nội dung bằng dữ liệu thật của từng người nhận
function fillTemplate(str, vars) {
  return (str || "").replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => (vars[key] !== undefined && vars[key] !== null ? String(vars[key]) : ""));
}

async function sendMail({ to, subject, html }) {
  if (!process.env.MAIL_USER || !process.env.MAIL_PASSWORD) {
    throw new Error("Chưa cấu hình MAIL_USER / MAIL_PASSWORD trên server.");
  }
  const transporter = getTransporter();
  const fromName = process.env.MAIL_FROM_NAME || "UGC Recruitment";
  await transporter.sendMail({
    from: `"${fromName}" <${process.env.MAIL_USER}>`,
    to,
    subject,
    html: html.replace(/\n/g, "<br/>"),
  });
}

module.exports = { sendMail, fillTemplate };
