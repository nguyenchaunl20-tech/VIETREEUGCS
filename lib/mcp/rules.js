// Bộ luật lọc KOC dùng cho AI agent (MCP). Toàn bộ là hàm thuần, không đọc/ghi database,
// để dễ kiểm thử và để mọi agent lọc cùng một kiểu.

const OWING_DAYS = Number(process.env.MCP_OWING_DAYS || 30); // quá số ngày này kể từ lúc gửi hàng mà chưa air bài = nợ bài
const DAY_MS = 24 * 60 * 60 * 1000;

function parseJson(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string") return value;
  try { return JSON.parse(value); } catch { return fallback; }
}

function toDate(v) {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === "object" && typeof v.toDate === "function") return v.toDate();
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

// ID TikTok: bỏ @, bỏ phần link, chữ thường
function normTiktok(raw) {
  if (!raw) return "";
  let s = String(raw).trim().toLowerCase();
  const m = s.match(/tiktok\.com\/@([^/?#\s]+)/);
  if (m) s = m[1];
  s = s.replace(/^@+/, "").replace(/[/?#].*$/, "").trim();
  return s;
}

// SĐT: chỉ giữ số, đổi 84xxxxxxxxx thành 0xxxxxxxxx
function normPhone(raw) {
  let d = String(raw || "").replace(/\D/g, "");
  if (d.startsWith("84") && d.length === 11) d = "0" + d.slice(2);
  if (d.length === 9) d = "0" + d;
  return d;
}

function identityKeys(reg) {
  const keys = [];
  const tt = normTiktok(reg.tiktokId) || normTiktok(reg.tiktokLink);
  const ph = normPhone(reg.zaloPhone);
  if (tt) keys.push("tt:" + tt);
  if (ph.length >= 9) keys.push("ph:" + ph);
  return keys;
}

// Tháng theo giờ Việt Nam (UTC+7), dạng "YYYY-MM"
function monthKey(date) {
  const d = toDate(date);
  if (!d) return "";
  const vn = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  return `${vn.getUTCFullYear()}-${String(vn.getUTCMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(key, delta) {
  if (!key) return "";
  const [y, m] = key.split("-").map(Number);
  const total = y * 12 + (m - 1) + delta;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

// Tháng của campaign: ưu tiên trường "month" (YYYY-MM) nếu có, không thì lấy tháng tạo campaign
function campaignMonth(c) {
  if (c && /^\d{4}-\d{2}$/.test(String(c.month || ""))) return c.month;
  return monthKey(c && c.createdAt);
}

const PLATFORM_WORDS = [
  ["threads", /threads/i],
  ["instagram", /instagram|\big\b/i],
  ["facebook", /facebook|\bfb\b/i],
  ["shopee", /shopee/i],
  ["youtube", /youtube/i],
  ["tiktok", /tiktok/i],
];

// Nền tảng của campaign: trường "platform" nếu có; không thì đoán từ tên campaign; cuối cùng dựa vào việc có bắt buộc TikTok
function platformOf(c) {
  if (!c) return "other";
  if (c.platform) return String(c.platform).trim().toLowerCase();
  const text = `${c.name || ""}`;
  for (const [name, re] of PLATFORM_WORDS) if (re.test(text)) return name;
  if (c.requireTiktok !== false) return "tiktok";
  const fields = parseJson(c.channelFields, []);
  const labels = fields.map((f) => f.label || "").join(" ");
  for (const [name, re] of PLATFORM_WORDS) if (re.test(labels)) return name;
  return "other";
}

function slug(s) {
  return String(s || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

// "Cùng sản phẩm" không tính phân loại: lấy tên sản phẩm của campaign; nếu trống thì lấy phần trước dấu - ( / của sản phẩm UGC chọn
function productKey(campaign, reg) {
  const base = (campaign && campaign.product) || String((reg && reg.selectedProduct) || "").split(/\s[-–|/]\s|\(|\//)[0];
  const p = slug(base);
  if (!p) return "";
  return `${(campaign && campaign.brandId) || ""}|${p}`;
}

function normPostLink(raw) {
  if (!raw) return "";
  const s = String(raw).trim();
  const vid = s.match(/\/video\/(\d+)/);
  if (vid) return "tiktok-video:" + vid[1];
  try {
    const u = new URL(s.startsWith("http") ? s : "https://" + s);
    return (u.hostname.replace(/^www\./, "") + u.pathname.replace(/\/+$/, "")).toLowerCase();
  } catch {
    return s.toLowerCase().replace(/[?#].*$/, "").replace(/\/+$/, "");
  }
}

// Gom toàn bộ đơn đăng ký theo người (ID TikTok hoặc SĐT)
function buildIndex(registrations, campaignsById) {
  const byKey = new Map();
  for (const reg of registrations) {
    const entry = { reg, campaign: campaignsById.get(reg.campaignId) || null };
    for (const k of identityKeys(reg)) {
      if (!byKey.has(k)) byKey.set(k, []);
      byKey.get(k).push(entry);
    }
  }
  return byKey;
}

function historyOf(reg, index) {
  const seen = new Map();
  for (const k of identityKeys(reg)) {
    for (const e of index.get(k) || []) seen.set(e.reg.code, e);
  }
  return Array.from(seen.values());
}

function isOwingOverdue(entry, now) {
  const { reg, campaign } = entry;
  if (reg.status !== "selected" || reg.postLink) return { owing: false, overdue: false };
  const shipped = reg.shipStatus === "shipped" || reg.shipStatus === "delivered";
  const owing = shipped || (campaign && campaign.status === "done");
  if (!owing) return { owing: false, overdue: false };
  const deadline = toDate(campaign && campaign.postDeadline);
  if (deadline) return { owing: true, overdue: now > deadline };
  const since = toDate(reg.shipDate) || toDate(reg.createdAt);
  const overdue = since ? now - since.getTime() > OWING_DAYS * DAY_MS : true;
  return { owing: true, overdue };
}

function blacklistHit(reg, blacklist) {
  for (const k of identityKeys(reg)) {
    const hit = blacklist.get(k);
    if (hit) return hit;
  }
  return null;
}

/**
 * Chấm luật cho 1 đơn trong 1 campaign.
 * Trả về { hits: [{rule, severity: "block"|"review"|"info", detail}], history: {...}, ruleSuggestion }
 */
function evaluate(reg, ctx) {
  const { campaign, campaignsById, index, blacklist, campaignRegs, now } = ctx;
  const hits = [];
  const month = campaignMonth(campaign);
  const platform = platformOf(campaign);
  const myProduct = productKey(campaign, reg);

  const bl = blacklistHit(reg, blacklist);
  if (bl) hits.push({ rule: "BLACKLIST", severity: "block", detail: `Nằm trong blacklist: ${bl.reason || "không ghi lý do"}` });

  // Trùng người trong cùng campaign: giữ đơn đăng ký sớm nhất
  const myKeys = new Set(identityKeys(reg));
  const myTime = toDate(reg.createdAt)?.getTime() ?? 0;
  const earlier = campaignRegs.find((o) => o.code !== reg.code
    && identityKeys(o).some((k) => myKeys.has(k))
    && ((toDate(o.createdAt)?.getTime() ?? 0) < myTime || ((toDate(o.createdAt)?.getTime() ?? 0) === myTime && o.code < reg.code)));
  if (earlier) hits.push({ rule: "DUP_IN_CAMPAIGN", severity: "block", detail: `Trùng người với đơn ${earlier.code} đăng ký trước trong cùng campaign` });

  if (campaign.requireTiktok !== false && !normTiktok(reg.tiktokId) && !normTiktok(reg.tiktokLink)) {
    hits.push({ rule: "MISSING_INFO", severity: "review", detail: "Thiếu ID/link TikTok" });
  }
  if (normPhone(reg.zaloPhone).length < 9) hits.push({ rule: "MISSING_INFO", severity: "review", detail: "SĐT không hợp lệ" });

  const others = historyOf(reg, index).filter((e) => e.reg.code !== reg.code && e.reg.campaignId !== campaign.id);
  let owingCount = 0;
  const productMonths = new Set();

  for (const e of others) {
    const oc = e.campaign;
    const name = (oc && oc.name) || e.reg.campaignId;
    const { owing, overdue } = isOwingOverdue(e, now);
    if (owing) {
      owingCount += 1;
      if (overdue) hits.push({ rule: "OWING_POST", severity: "block", detail: `Chưa air bài campaign "${name}" (${e.reg.code}) dù đã quá hạn` });
      else hits.push({ rule: "IN_PROGRESS", severity: "info", detail: `Đang thực hiện campaign "${name}", chưa tới hạn air bài` });
    }
    if (!oc) continue;
    const oMonth = campaignMonth(oc);
    if (oc.brandId === campaign.brandId && oMonth === month && platformOf(oc) === platform) {
      if (e.reg.status === "selected") {
        hits.push({ rule: "SAME_BRAND_PLATFORM_MONTH", severity: "block", detail: `Đã được chọn campaign "${name}" cùng brand, cùng nền tảng trong tháng ${month}` });
      } else {
        hits.push({ rule: "SAME_BRAND_PLATFORM_MONTH", severity: "review", detail: `Cũng đang đăng ký campaign "${name}" cùng brand, cùng nền tảng trong tháng ${month} (chỉ được nhận 1)` });
      }
    }
    if (e.reg.status === "selected" && myProduct && productKey(oc, e.reg) === myProduct) productMonths.add(oMonth);
  }

  if (myProduct && productMonths.has(shiftMonth(month, -1)) && productMonths.has(shiftMonth(month, -2))) {
    hits.push({ rule: "SAME_PRODUCT_3_MONTHS", severity: "block", detail: `Đã nhận cùng sản phẩm 2 tháng liền trước (${shiftMonth(month, -2)}, ${shiftMonth(month, -1)})` });
  }

  const selected = others.filter((e) => e.reg.status === "selected");
  const history = {
    otherCampaigns: others.length,
    selectedBefore: selected.length,
    postedBefore: selected.filter((e) => !!e.reg.postLink).length,
    owing: owingCount,
    lastSelected: selected
      .map((e) => ({ month: campaignMonth(e.campaign), campaign: e.campaign && e.campaign.name, posted: !!e.reg.postLink }))
      .sort((a, b) => (a.month < b.month ? 1 : -1))
      .slice(0, 5),
  };

  const ruleSuggestion = hits.some((h) => h.severity === "block") ? "reject"
    : hits.some((h) => h.severity === "review") ? "review" : null;

  return { hits, history, ruleSuggestion };
}

function findDuplicatePosts(registrations) {
  const map = new Map();
  for (const r of registrations) {
    // Một ô có thể dán nhiều link (cách nhau bởi khoảng trắng / xuống dòng)
    const links = String(r.postLink || "").split(/\s+/).filter(Boolean);
    for (const link of links) {
      const k = normPostLink(link);
      if (!k) continue;
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(r);
    }
  }
  return Array.from(map.entries())
    .filter(([, list]) => new Set(list.map((r) => r.code)).size > 1)
    .map(([link, list]) => ({ link, codes: Array.from(new Set(list.map((r) => r.code))), campaignIds: Array.from(new Set(list.map((r) => r.campaignId))) }));
}

module.exports = {
  OWING_DAYS, parseJson, toDate, normTiktok, normPhone, identityKeys, monthKey, shiftMonth,
  campaignMonth, platformOf, productKey, normPostLink, buildIndex, historyOf, isOwingOverdue, evaluate, findDuplicatePosts,
};
