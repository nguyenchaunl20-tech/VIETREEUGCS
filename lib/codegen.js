// Quy tắc: TÊN BRAND (viết liền, không dấu) + 2 số đầu SĐT + 3 số cuối SĐT + tháng (2 số) + 2 số cuối năm đăng ký
function slugifyBrand(name) {
  return (name || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // bỏ dấu tiếng Việt
    .replace(/đ/gi, "d")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, ""); // chỉ giữ chữ và số
}

function generateCode(brandName, phone, date) {
  const brandPart = slugifyBrand(brandName) || "BRAND";
  const digits = (phone || "").replace(/\D/g, "");
  const first2 = digits.slice(0, 2).padStart(2, "0");
  const last3 = digits.slice(-3).padStart(3, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  return `${brandPart}-${first2}${last3}-${mm}${yy}`;
}

module.exports = { generateCode, slugifyBrand };
