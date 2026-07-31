const { getSession } = require("./auth");
const { prisma } = require("./db");

// Trả về { isOwner, staff } hoặc null nếu chưa đăng nhập.
async function getAuthContext() {
  const session = await getSession();
  if (!session) return null;
  if (session.type === "owner") return { isOwner: true, staff: null };
  if (session.type === "staff") {
    const staff = await prisma.staff.findUnique({ where: { id: session.staffId } });
    if (!staff) return null;
    return { isOwner: false, staff };
  }
  return null;
}

function staffCampaignIds(staff) {
  try {
    return JSON.parse(staff.campaignIds || "[]");
  } catch {
    return Array.isArray(staff.campaignIds) ? staff.campaignIds : [];
  }
}

function canAccessCampaign(ctx, campaignId) {
  if (!ctx) return false;
  if (ctx.isOwner) return true;
  return staffCampaignIds(ctx.staff).includes(campaignId);
}

module.exports = { getAuthContext, staffCampaignIds, canAccessCampaign };
