// Các công cụ (tools) mà AI agent gọi qua MCP. Agent chỉ được:
//  - ĐỌC campaign, đơn đăng ký, lịch sử KOC, kết quả
//  - GHI đề xuất AI (aiSuggestion / aiScore / aiReason) và blacklist
// Agent KHÔNG đổi trạng thái duyệt chính thức (status), không gửi mail, không xoá dữ liệu.

const { db } = require("../db");
const { FieldValue } = require("firebase-admin/firestore");
const R = require("./rules");

const CACHE_MS = 60 * 1000;
let cache = null; // { at, data }

function serialize(snap) {
  const out = { id: snap.id, ...snap.data() };
  for (const k of Object.keys(out)) {
    const v = out[k];
    if (v && typeof v === "object" && typeof v.toDate === "function") out[k] = v.toDate();
  }
  return out;
}

async function loadAll({ fresh = false } = {}) {
  if (!fresh && cache && Date.now() - cache.at < CACHE_MS) return cache.data;
  const [b, c, r, bl] = await Promise.all([
    db.collection("brands").get(),
    db.collection("campaigns").get(),
    db.collection("registrations").get(),
    db.collection("blacklist").get(),
  ]);
  const brands = b.docs.map(serialize);
  const campaigns = c.docs.map(serialize);
  const registrations = r.docs.map(serialize);
  const blacklist = new Map(bl.docs.map((d) => [d.id, serialize(d)]));
  const brandsById = new Map(brands.map((x) => [x.id, x]));
  const campaignsById = new Map(campaigns.map((x) => [x.id, x]));
  const regsByCode = new Map(registrations.map((x) => [x.code, x]));
  const index = R.buildIndex(registrations, campaignsById);
  const data = { brands, campaigns, registrations, blacklist, brandsById, campaignsById, regsByCode, index };
  cache = { at: Date.now(), data };
  return data;
}

function invalidate() { cache = null; }

class ToolError extends Error {}

function iso(d) { const x = R.toDate(d); return x ? x.toISOString() : null; }

function num(v) {
  const d = String(v ?? "").replace(/[^\d]/g, "");
  return d ? Number(d) : 0;
}

function campaignView(c, data, withCounts = true) {
  const brand = data.brandsById.get(c.brandId);
  const out = {
    id: c.id,
    name: c.name,
    brand: brand ? brand.name : null,
    brandId: c.brandId,
    platform: R.platformOf(c),
    month: R.campaignMonth(c),
    status: c.status,
    product: c.product || "",
    productOptions: R.parseJson(c.productOptions, []),
    cost: c.cost || "",
    createdAt: iso(c.createdAt),
  };
  if (withCounts) {
    const regs = data.registrations.filter((r) => r.campaignId === c.id);
    out.registrations = {
      total: regs.length,
      pending: regs.filter((r) => (r.status || "pending") === "pending").length,
      suitable: regs.filter((r) => r.status === "suitable").length,
      selected: regs.filter((r) => r.status === "selected").length,
      aiReviewed: regs.filter((r) => r.aiSuggestion).length,
    };
  }
  return out;
}

// Bản rút gọn của đơn đăng ký: bỏ địa chỉ, email để giảm dữ liệu cá nhân gửi qua AI
function regView(r) {
  return {
    code: r.code,
    campaignId: r.campaignId,
    status: r.status || "pending",
    tiktokId: r.tiktokId || "",
    tiktokLink: r.tiktokLink || "",
    zaloPhone: r.zaloPhone || "",
    followers: r.followers || "",
    gmvNumber: r.gmvNumber || "",
    gmvNote: r.gmvNote || "",
    allowReup: r.allowReup || "",
    aff5: r.aff5 || "",
    video30days: r.video30days || "",
    contentDesc: r.contentDesc || "",
    selectedProduct: r.selectedProduct || "",
    pastBrands: R.parseJson(r.pastBrands, []),
    extraFields: R.parseJson(r.extraFields, {}),
    createdAt: iso(r.createdAt),
    shipStatus: r.shipStatus || "",
    postLink: r.postLink || "",
    aiSuggestion: r.aiSuggestion || null,
    aiScore: r.aiScore ?? null,
    aiReason: r.aiReason || null,
  };
}

function getCampaignOrThrow(data, campaignId) {
  const c = data.campaignsById.get(String(campaignId || ""));
  if (!c) throw new ToolError(`Không tìm thấy campaign "${campaignId}". Gọi list_campaigns để lấy đúng id.`);
  return c;
}

function clampInt(v, def, min, max) {
  const n = Number.isFinite(Number(v)) ? Math.floor(Number(v)) : def;
  return Math.max(min, Math.min(max, n));
}

function findPeople(data, query) {
  const q = String(query || "").trim();
  const keys = [];
  const tt = R.normTiktok(q);
  const ph = R.normPhone(q);
  if (ph.length >= 9 && /^[\d\s+().-]+$/.test(q)) keys.push("ph:" + ph);
  else if (tt) keys.push("tt:" + tt);
  const seen = new Map();
  for (const k of keys) for (const e of data.index.get(k) || []) seen.set(e.reg.code, e);
  // Mở rộng theo cả ID TikTok và SĐT của những đơn tìm được
  for (const e of Array.from(seen.values())) {
    for (const e2 of R.historyOf(e.reg, data.index)) seen.set(e2.reg.code, e2);
  }
  return { keys, entries: Array.from(seen.values()) };
}

const SUGGESTIONS = ["approve", "review", "reject"];

const TOOLS = [
  {
    name: "list_campaigns",
    description: "Liệt kê campaign (id, brand, nền tảng, tháng, sản phẩm, số đơn theo trạng thái). Dùng đầu tiên để lấy campaignId.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["active", "done"], description: "Lọc theo trạng thái campaign" },
        brand: { type: "string", description: "Lọc theo tên brand (không phân biệt hoa thường, khớp một phần)" },
        month: { type: "string", description: "Lọc theo tháng YYYY-MM" },
      },
      additionalProperties: false,
    },
    annotations: { title: "Danh sách campaign", readOnlyHint: true },
    async run(args) {
      const data = await loadAll();
      let list = data.campaigns.map((c) => campaignView(c, data));
      if (args.status) list = list.filter((c) => c.status === args.status);
      if (args.brand) list = list.filter((c) => (c.brand || "").toLowerCase().includes(String(args.brand).toLowerCase()));
      if (args.month) list = list.filter((c) => c.month === args.month);
      list.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
      return { count: list.length, campaigns: list };
    },
  },
  {
    name: "get_campaign",
    description: "Xem chi tiết 1 campaign: yêu cầu, brief, sản phẩm, trường kênh SNS, mục tiêu KPI. Dùng để biết tiêu chí khi chấm điểm KOC.",
    inputSchema: {
      type: "object",
      properties: { campaignId: { type: "string" } },
      required: ["campaignId"],
      additionalProperties: false,
    },
    annotations: { title: "Chi tiết campaign", readOnlyHint: true },
    async run(args) {
      const data = await loadAll();
      const c = getCampaignOrThrow(data, args.campaignId);
      return {
        ...campaignView(c, data),
        requirements: c.requirements || "",
        brief: c.brief || "",
        requireTiktok: c.requireTiktok !== false,
        channelFields: R.parseJson(c.channelFields, []),
        goals: { creators: num(c.goalCreators), views: num(c.goalViews), gmv: num(c.goalGmv), orders: num(c.goalOrders) },
      };
    },
  },
  {
    name: "get_registrations",
    description: "Lấy đơn đăng ký của 1 campaign (không kèm địa chỉ, email). Có phân trang bằng offset/limit.",
    inputSchema: {
      type: "object",
      properties: {
        campaignId: { type: "string" },
        status: { type: "string", enum: ["pending", "suitable", "selected"] },
        aiSuggestion: { type: "string", enum: ["approve", "review", "reject", "none"], description: "none = chưa có đề xuất AI" },
        offset: { type: "integer", minimum: 0, default: 0 },
        limit: { type: "integer", minimum: 1, maximum: 300, default: 100 },
      },
      required: ["campaignId"],
      additionalProperties: false,
    },
    annotations: { title: "Đơn đăng ký", readOnlyHint: true },
    async run(args) {
      const data = await loadAll();
      const c = getCampaignOrThrow(data, args.campaignId);
      let regs = data.registrations.filter((r) => r.campaignId === c.id);
      if (args.status) regs = regs.filter((r) => (r.status || "pending") === args.status);
      if (args.aiSuggestion === "none") regs = regs.filter((r) => !r.aiSuggestion);
      else if (args.aiSuggestion) regs = regs.filter((r) => r.aiSuggestion === args.aiSuggestion);
      regs.sort((a, b) => (R.toDate(a.createdAt)?.getTime() ?? 0) - (R.toDate(b.createdAt)?.getTime() ?? 0));
      const offset = clampInt(args.offset, 0, 0, 1e6);
      const limit = clampInt(args.limit, 100, 1, 300);
      const page = regs.slice(offset, offset + limit).map(regView);
      return { campaign: c.name, total: regs.length, offset, returned: page.length, nextOffset: offset + page.length < regs.length ? offset + page.length : null, registrations: page };
    },
  },
  {
    name: "screen_campaign",
    description:
      "Chạy bộ luật lọc cho các đơn của 1 campaign và trả về, cho từng đơn: dữ liệu đơn, các luật vi phạm (block = phải loại, review = cần người xem, info = tham khảo), tóm tắt lịch sử KOC, và ruleSuggestion. " +
      "Luật: BLACKLIST, DUP_IN_CAMPAIGN (trùng người trong campaign), OWING_POST (đã nhận hàng campaign trước nhưng quá hạn chưa air bài), " +
      "SAME_BRAND_PLATFORM_MONTH (1 người chỉ 1 campaign/brand/nền tảng/tháng), SAME_PRODUCT_3_MONTHS (không nhận cùng sản phẩm 3 tháng liền, không tính phân loại), MISSING_INFO. " +
      "Đơn không vi phạm luật nào có ruleSuggestion = null: bạn tự chấm chất lượng theo yêu cầu campaign, rồi lưu bằng save_ai_suggestions.",
    inputSchema: {
      type: "object",
      properties: {
        campaignId: { type: "string" },
        scope: { type: "string", enum: ["unreviewed", "not_selected", "all"], default: "unreviewed", description: "unreviewed = chưa có đề xuất AI và chưa được chọn; not_selected = mọi đơn chưa được chọn; all = tất cả" },
        onlyFlagged: { type: "boolean", default: false, description: "Chỉ trả về đơn vi phạm luật" },
        offset: { type: "integer", minimum: 0, default: 0 },
        limit: { type: "integer", minimum: 1, maximum: 200, default: 100 },
      },
      required: ["campaignId"],
      additionalProperties: false,
    },
    annotations: { title: "Lọc đơn theo luật", readOnlyHint: true },
    async run(args) {
      const data = await loadAll();
      const c = getCampaignOrThrow(data, args.campaignId);
      const campaignRegs = data.registrations.filter((r) => r.campaignId === c.id);
      const scope = args.scope || "unreviewed";
      let target = campaignRegs;
      if (scope === "unreviewed") target = target.filter((r) => r.status !== "selected" && !r.aiSuggestion);
      if (scope === "not_selected") target = target.filter((r) => r.status !== "selected");
      target = [...target].sort((a, b) => (R.toDate(a.createdAt)?.getTime() ?? 0) - (R.toDate(b.createdAt)?.getTime() ?? 0));

      const ctx = { campaign: c, campaignsById: data.campaignsById, index: data.index, blacklist: data.blacklist, campaignRegs, now: Date.now() };
      let results = target.map((r) => {
        const ev = R.evaluate(r, ctx);
        return { ...regView(r), rules: ev.hits, history: ev.history, ruleSuggestion: ev.ruleSuggestion };
      });
      if (args.onlyFlagged) results = results.filter((x) => x.rules.some((h) => h.severity !== "info"));

      const summary = {
        inScope: results.length,
        block: results.filter((x) => x.ruleSuggestion === "reject").length,
        review: results.filter((x) => x.ruleSuggestion === "review").length,
        clean: results.filter((x) => x.ruleSuggestion === null).length,
      };
      const offset = clampInt(args.offset, 0, 0, 1e6);
      const limit = clampInt(args.limit, 100, 1, 200);
      const page = results.slice(offset, offset + limit);
      return {
        campaign: campaignView(c, data, false),
        requirements: c.requirements || "",
        owingDays: R.OWING_DAYS,
        summary,
        offset,
        returned: page.length,
        nextOffset: offset + page.length < results.length ? offset + page.length : null,
        results: page,
      };
    },
  },
  {
    name: "get_koc_history",
    description: "Tra lịch sử tham gia của KOC theo ID TikTok hoặc SĐT (tối đa 50 người/lần): các campaign đã đăng ký, trạng thái, đã air bài chưa, có trong blacklist không.",
    inputSchema: {
      type: "object",
      properties: { queries: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 50 } },
      required: ["queries"],
      additionalProperties: false,
    },
    annotations: { title: "Lịch sử KOC", readOnlyHint: true },
    async run(args) {
      const data = await loadAll();
      const out = (args.queries || []).slice(0, 50).map((q) => {
        const { entries } = findPeople(data, q);
        if (!entries.length) return { query: q, found: false };
        const bl = entries.map((e) => R.identityKeys(e.reg)).flat().map((k) => data.blacklist.get(k)).find(Boolean);
        const now = Date.now();
        return {
          query: q,
          found: true,
          tiktokId: entries[0].reg.tiktokId || "",
          zaloPhone: entries[0].reg.zaloPhone || "",
          blacklisted: bl ? { reason: bl.reason || "", addedAt: iso(bl.createdAt) } : null,
          entries: entries
            .map((e) => {
              const c = e.campaign;
              const { owing, overdue } = R.isOwingOverdue(e, now);
              return {
                code: e.reg.code,
                campaign: c ? c.name : e.reg.campaignId,
                brand: c ? (data.brandsById.get(c.brandId) || {}).name || null : null,
                platform: R.platformOf(c),
                month: R.campaignMonth(c),
                status: e.reg.status || "pending",
                shipStatus: e.reg.shipStatus || "",
                posted: !!e.reg.postLink,
                owingPost: owing,
                overdue: owing && overdue,
                aiSuggestion: e.reg.aiSuggestion || null,
              };
            })
            .sort((a, b) => String(b.month).localeCompare(String(a.month))),
        };
      });
      return { results: out };
    },
  },
  {
    name: "save_ai_suggestions",
    description:
      "Lưu đề xuất của AI vào từng đơn (hiện ở cột 'Đề xuất AI' trong trang admin). suggestion: approve = nên chọn, review = cần người xem, reject = nên loại. " +
      "reason: 1 câu tiếng Việt, nêu luật vi phạm hoặc lý do chất lượng. Không đổi trạng thái duyệt chính thức; người dùng tự bấm Chọn trong admin. Tối đa 500 đơn/lần.",
    inputSchema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          minItems: 1,
          maxItems: 500,
          items: {
            type: "object",
            properties: {
              code: { type: "string", description: "Mã ID đơn đăng ký" },
              suggestion: { type: "string", enum: SUGGESTIONS },
              score: { type: "number", minimum: 0, maximum: 100 },
              reason: { type: "string", maxLength: 400 },
            },
            required: ["code", "suggestion", "reason"],
            additionalProperties: false,
          },
        },
      },
      required: ["items"],
      additionalProperties: false,
    },
    annotations: { title: "Lưu đề xuất AI", readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    async run(args) {
      const data = await loadAll();
      const items = (args.items || []).slice(0, 500);
      const notFound = [];
      const invalid = [];
      const batch = db.batch();
      let n = 0;
      for (const it of items) {
        const reg = data.regsByCode.get(it.code);
        if (!reg) { notFound.push(it.code); continue; }
        if (!SUGGESTIONS.includes(it.suggestion)) { invalid.push(it.code); continue; }
        const score = it.score === undefined || it.score === null ? null : Math.max(0, Math.min(100, Math.round(Number(it.score))));
        batch.update(db.collection("registrations").doc(reg.id), {
          aiSuggestion: it.suggestion,
          aiScore: Number.isFinite(score) ? score : null,
          aiReason: String(it.reason || "").slice(0, 400),
          aiAt: FieldValue.serverTimestamp(),
        });
        n += 1;
      }
      if (n > 0) await batch.commit();
      invalidate();
      return { saved: n, notFound, invalid };
    },
  },
  {
    name: "clear_ai_suggestions",
    description: "Xoá toàn bộ đề xuất AI của 1 campaign để chấm lại từ đầu. Không đụng tới trạng thái duyệt.",
    inputSchema: {
      type: "object",
      properties: { campaignId: { type: "string" } },
      required: ["campaignId"],
      additionalProperties: false,
    },
    annotations: { title: "Xoá đề xuất AI", readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    async run(args) {
      const data = await loadAll();
      const c = getCampaignOrThrow(data, args.campaignId);
      const regs = data.registrations.filter((r) => r.campaignId === c.id && r.aiSuggestion);
      for (let i = 0; i < regs.length; i += 450) {
        const batch = db.batch();
        for (const r of regs.slice(i, i + 450)) {
          batch.update(db.collection("registrations").doc(r.id), {
            aiSuggestion: FieldValue.delete(), aiScore: FieldValue.delete(), aiReason: FieldValue.delete(), aiAt: FieldValue.delete(),
          });
        }
        await batch.commit();
      }
      invalidate();
      return { cleared: regs.length };
    },
  },
  {
    name: "check_duplicate_posts",
    description: "Tìm link air bài bị nộp trùng (1 video nộp cho 2 đơn / 2 campaign). Bỏ campaignId để quét toàn bộ.",
    inputSchema: {
      type: "object",
      properties: { campaignId: { type: "string" } },
      additionalProperties: false,
    },
    annotations: { title: "Video nộp trùng", readOnlyHint: true },
    async run(args) {
      const data = await loadAll();
      let dups = R.findDuplicatePosts(data.registrations);
      if (args.campaignId) {
        const c = getCampaignOrThrow(data, args.campaignId);
        dups = dups.filter((d) => d.campaignIds.includes(c.id));
      }
      return {
        count: dups.length,
        duplicates: dups.map((d) => ({
          link: d.link,
          codes: d.codes,
          campaigns: d.campaignIds.map((id) => (data.campaignsById.get(id) || {}).name || id),
        })),
      };
    },
  },
  {
    name: "campaign_results",
    description: "Tổng hợp kết quả 1 campaign so với mục tiêu: số KOC được chọn, đã gửi hàng, đã air bài, view, like, comment, share, GMV, đơn hàng; kèm danh sách KOC chưa air bài.",
    inputSchema: {
      type: "object",
      properties: { campaignId: { type: "string" } },
      required: ["campaignId"],
      additionalProperties: false,
    },
    annotations: { title: "Kết quả campaign", readOnlyHint: true },
    async run(args) {
      const data = await loadAll();
      const c = getCampaignOrThrow(data, args.campaignId);
      const sel = data.registrations.filter((r) => r.campaignId === c.id && r.status === "selected");
      const sum = (k) => sel.reduce((a, r) => a + num(r[k]), 0);
      return {
        campaign: campaignView(c, data, false),
        goals: { creators: num(c.goalCreators), views: num(c.goalViews), gmv: num(c.goalGmv), orders: num(c.goalOrders) },
        totals: {
          selected: sel.length,
          shipped: sel.filter((r) => r.shipStatus === "shipped" || r.shipStatus === "delivered").length,
          delivered: sel.filter((r) => r.shipStatus === "delivered").length,
          posted: sel.filter((r) => r.postLink).length,
          views: sum("views"), likes: sum("likes"), comments: sum("comments"), shares: sum("shares"),
          gmv: sum("videoGmv"), orders: sum("videoOrders"),
        },
        notPosted: sel.filter((r) => !r.postLink).map((r) => ({ code: r.code, tiktokId: r.tiktokId || "", shipStatus: r.shipStatus || "", shipDate: r.shipDate || "" })),
      };
    },
  },
  {
    name: "list_blacklist",
    description: "Xem danh sách KOC bị chặn (scam, không đăng bài, đăng thiếu).",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { title: "Blacklist", readOnlyHint: true },
    async run() {
      const data = await loadAll();
      return { count: data.blacklist.size, items: Array.from(data.blacklist.values()).map((b) => ({ key: b.id, label: b.label || b.id, reason: b.reason || "", addedAt: iso(b.createdAt) })) };
    },
  },
  {
    name: "add_to_blacklist",
    description: "Chặn vĩnh viễn 1 KOC (theo ID TikTok hoặc SĐT; tự chặn cả ID và SĐT liên quan). CHỈ gọi khi người dùng yêu cầu rõ ràng trong cuộc trò chuyện, không tự quyết.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string" }, reason: { type: "string", maxLength: 300 } },
      required: ["query", "reason"],
      additionalProperties: false,
    },
    annotations: { title: "Thêm vào blacklist", readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    async run(args) {
      const data = await loadAll();
      const { keys, entries } = findPeople(data, args.query);
      const all = new Set(keys);
      entries.forEach((e) => R.identityKeys(e.reg).forEach((k) => all.add(k)));
      if (!all.size) throw new ToolError("Không nhận ra ID TikTok hoặc SĐT hợp lệ.");
      const batch = db.batch();
      for (const k of all) {
        batch.set(db.collection("blacklist").doc(k), { label: String(args.query), reason: String(args.reason || ""), createdAt: FieldValue.serverTimestamp(), source: "ai-agent" }, { merge: true });
      }
      await batch.commit();
      invalidate();
      return { blocked: Array.from(all), matchedRegistrations: entries.length };
    },
  },
  {
    name: "remove_from_blacklist",
    description: "Gỡ 1 KOC khỏi blacklist (theo ID TikTok hoặc SĐT). Chỉ gọi khi người dùng yêu cầu.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
      additionalProperties: false,
    },
    annotations: { title: "Gỡ khỏi blacklist", readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    async run(args) {
      const data = await loadAll();
      const { keys, entries } = findPeople(data, args.query);
      const all = new Set(keys);
      entries.forEach((e) => R.identityKeys(e.reg).forEach((k) => all.add(k)));
      const present = Array.from(all).filter((k) => data.blacklist.has(k));
      if (present.length) {
        const batch = db.batch();
        present.forEach((k) => batch.delete(db.collection("blacklist").doc(k)));
        await batch.commit();
      }
      invalidate();
      return { removed: present };
    },
  },
];

module.exports = { TOOLS, ToolError, invalidate };
