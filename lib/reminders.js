// Tìm KOC cần nhắc air bài và gửi mail nhắc. Dùng cho lịch chạy hằng ngày (/api/cron/reminders) và cho MCP.

const { db } = require("./db");
const { FieldValue } = require("firebase-admin/firestore");
const { sendMail } = require("./mailer");
const D = require("./deadline");

const MAX_MAILS_PER_RUN = Number(process.env.REMINDER_MAX_PER_RUN || 120); // Gmail miễn phí ~500 mail/ngày

const TEMPLATES = {
  before3: {
    subject: "[Nhắc hạn] Còn {{daysLeft}} ngày để đăng video campaign {{campaignName}}",
    body:
      "Chào {{tiktokId}},\n\n" +
      "Cảm ơn bạn đã tham gia campaign <b>{{campaignName}}</b> (mã {{code}}).\n" +
      "Hạn đăng video của bạn là <b>{{deadline}}</b>, còn <b>{{daysLeft}} ngày</b>.\n\n" +
      "Sau khi đăng, bạn vui lòng gửi link video vào nhóm Zalo của campaign hoặc trả lời email này kèm link nhé.{{zaloLine}}\n\n" +
      "Nếu bạn đã đăng rồi, chỉ cần gửi link để bên mình ghi nhận. Cảm ơn bạn!",
  },
  overdue1: {
    subject: "[Quá hạn] Bạn chưa gửi link video campaign {{campaignName}}",
    body:
      "Chào {{tiktokId}},\n\n" +
      "Hạn đăng video campaign <b>{{campaignName}}</b> (mã {{code}}) là <b>{{deadline}}</b> và bên mình chưa nhận được link video của bạn.\n\n" +
      "Bạn vui lòng đăng video và gửi link vào nhóm Zalo của campaign hoặc trả lời email này trong hôm nay nhé.{{zaloLine}}\n\n" +
      "Lưu ý: KOC nhận sản phẩm nhưng không đăng đủ video sẽ không được tham gia các campaign tiếp theo. Cảm ơn bạn!",
  },
};

function escapeHtml(v) {
  return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function fill(tpl, vars) {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (vars[k] === undefined ? "" : vars[k]));
}

function render(stage, reg, campaign, info) {
  const t = TEMPLATES[stage];
  const zalo = campaign.zaloGroupLink ? `\nLink nhóm Zalo: <a href="${escapeHtml(campaign.zaloGroupLink)}">${escapeHtml(campaign.zaloGroupLink)}</a>` : "";
  const vars = {
    tiktokId: escapeHtml(reg.tiktokId || "bạn"),
    code: escapeHtml(reg.code),
    campaignName: escapeHtml(campaign.name || ""),
    deadline: D.fmtVN(info.deadline),
    daysLeft: String(Math.abs(info.daysLeft)),
    zaloLine: zalo,
  };
  // Tiêu đề là văn bản thuần, không cần escape HTML
  const subjectVars = { ...vars, tiktokId: reg.tiktokId || "bạn", campaignName: campaign.name || "" };
  return { subject: fill(t.subject, subjectVars), html: fill(t.body, vars) };
}

async function loadSelected() {
  const [cSnap, rSnap] = await Promise.all([
    db.collection("campaigns").get(),
    db.collection("registrations").where("status", "==", "selected").get(),
  ]);
  const campaigns = new Map(cSnap.docs.map((d) => [d.id, { id: d.id, ...d.data() }]));
  const regs = rSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return { campaigns, regs };
}

// Danh sách cần nhắc hôm nay theo kênh ("mail" hoặc "zalo")
async function findDue({ channel = "mail", today = D.todayVN(), campaignId } = {}) {
  const { campaigns, regs } = await loadSelected();
  const due = [];
  for (const reg of regs) {
    if (campaignId && reg.campaignId !== campaignId) continue;
    const campaign = campaigns.get(reg.campaignId);
    if (!campaign) continue;
    const info = D.reminderStage(reg, campaign, today, channel);
    if (info) due.push({ reg, campaign, ...info });
  }
  due.sort((a, b) => a.deadline.localeCompare(b.deadline));
  return due;
}

async function sendDueMails({ today = D.todayVN(), dryRun = false } = {}) {
  const due = await findDue({ channel: "mail", today });
  const withEmail = due.filter((d) => String(d.reg.email || "").includes("@"));
  const noEmail = due.filter((d) => !String(d.reg.email || "").includes("@")).map((d) => d.reg.code);
  const batch = withEmail.slice(0, MAX_MAILS_PER_RUN);
  const sent = [];
  const failed = [];

  if (!dryRun) {
    // Gửi song song 4 mail một lúc cho kịp thời gian chạy tối đa của Vercel
    for (let i = 0; i < batch.length; i += 4) {
      await Promise.all(batch.slice(i, i + 4).map(async (d) => {
        try {
          const { subject, html } = render(d.stage, d.reg, d.campaign, d);
          await sendMail({ to: d.reg.email, subject, html });
          await db.collection("registrations").doc(d.reg.id).update({ [D.sentField("mail", d.stage)]: FieldValue.serverTimestamp() });
          sent.push({ code: d.reg.code, stage: d.stage });
        } catch (e) {
          failed.push({ code: d.reg.code, stage: d.stage, error: String(e.message || e).slice(0, 200) });
        }
      }));
    }
    await db.collection("reminderRuns").add({
      at: FieldValue.serverTimestamp(), today, channel: "mail",
      sent: sent.length, failed, noEmail, leftover: Math.max(0, withEmail.length - batch.length),
    });
  }

  return {
    today,
    dryRun,
    due: due.length,
    sent: dryRun ? [] : sent,
    wouldSend: dryRun ? batch.map((d) => ({ code: d.reg.code, stage: d.stage, deadline: d.deadline, email: d.reg.email })) : undefined,
    failed,
    noEmail,
    leftover: Math.max(0, withEmail.length - batch.length),
  };
}

module.exports = { TEMPLATES, render, findDue, sendDueMails };
