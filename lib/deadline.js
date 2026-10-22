// Tính hạn air bài và mốc nhắc cho KOC. Hàm thuần, dùng chung cho server (lịch gửi mail, MCP) và trang admin.
//
// Hạn air bài của 1 KOC = ngày đến TRƯỚC giữa:
//   - hạn chung của campaign (postDeadline, dạng YYYY-MM-DD)
//   - ngày gửi hàng (shipDate) + số ngày được phép đăng (postDays)
// Campaign chưa cài cả 2 thì không có hạn, không nhắc.

const REMIND_BEFORE_DAYS = 3; // nhắc khi còn 1..3 ngày tới hạn
const OVERDUE_WINDOW_DAYS = 7; // nhắc quá hạn khi đã quá 1..7 ngày (không gửi cho các đơn quá hạn lâu từ trước)

function isIsoDate(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
}

function addDays(iso, n) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Số ngày từ a đến b (b - a), cả hai dạng YYYY-MM-DD
function daysBetween(a, b) {
  return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000);
}

// Ngày hôm nay theo giờ Việt Nam
function todayVN(now = Date.now()) {
  return new Date(now + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

function fmtVN(iso) {
  if (!isIsoDate(iso)) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function deadlineOf(reg, campaign) {
  const candidates = [];
  if (campaign && isIsoDate(campaign.postDeadline)) candidates.push(campaign.postDeadline);
  const days = Number(campaign && campaign.postDays);
  if (days > 0 && reg && isIsoDate(reg.shipDate)) candidates.push(addDays(reg.shipDate, days));
  if (!candidates.length) return null;
  return candidates.sort()[0];
}

/**
 * Mốc nhắc của 1 đơn vào ngày `today`:
 *  - "before3": còn 1..3 ngày tới hạn
 *  - "overdue1": đã quá hạn 1..7 ngày
 *  - null: không cần nhắc (chưa được chọn, đã có link, chưa có hạn, chưa tới mốc)
 * `channel` = "mail" | "zalo": bỏ qua nếu kênh đó đã nhắc mốc này rồi.
 */
function reminderStage(reg, campaign, today, channel = "mail") {
  if (!reg || reg.status !== "selected" || String(reg.postLink || "").trim()) return null;
  const deadline = deadlineOf(reg, campaign);
  if (!deadline) return null;
  const left = daysBetween(today, deadline);
  const sent = (stage) => !!reg[sentField(channel, stage)];
  if (left >= 1 && left <= REMIND_BEFORE_DAYS && !sent("before3")) return { stage: "before3", deadline, daysLeft: left };
  if (left <= -1 && left >= -OVERDUE_WINDOW_DAYS && !sent("overdue1")) return { stage: "overdue1", deadline, daysLeft: left };
  return null;
}

function sentField(channel, stage) {
  const ch = channel === "zalo" ? "zalo" : "mail";
  return `${ch}Remind${stage === "before3" ? "Before" : "Overdue"}At`;
}

module.exports = {
  REMIND_BEFORE_DAYS, OVERDUE_WINDOW_DAYS,
  isIsoDate, addDays, daysBetween, todayVN, fmtVN, deadlineOf, reminderStage, sentField,
};
