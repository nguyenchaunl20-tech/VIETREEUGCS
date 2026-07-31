// Quy tắc: 2 số đầu SĐT + 3 số cuối SĐT + tháng (2 số) + 2 số cuối năm đăng ký
function generateCode(phone, date) {
  const digits = (phone || "").replace(/\D/g, "");
  const first2 = digits.slice(0, 2).padStart(2, "0");
  const last3 = digits.slice(-3).padStart(3, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  return `${first2}${last3}${mm}${yy}`.toUpperCase();
}

module.exports = { generateCode };
