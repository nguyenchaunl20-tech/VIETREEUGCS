"use client";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  Plus, Pencil, Save, Trash2, ChevronRight, ArrowLeft, Search, Download, Upload,
  Lock, LogOut, Eye, EyeOff, ShieldCheck, Layers, Building2, ClipboardList,
  FileSpreadsheet, UserCog, Settings as SettingsIcon, DollarSign, X, ImagePlus,
  Mail, Send, CheckCircle2, XCircle, Loader2, Truck, Video, Heart, MessageCircle,
  Share2, Target, BarChart3, Users, ExternalLink, AlertTriangle,
} from "lucide-react";
import { FieldLabel, StatusPill, EmptyState, SampleLinksEditor, ProductOptionsEditor, ChannelFieldsEditor, STATUS } from "../components/ui";

const ACCENT = "#5B4CFF";

async function api(path, options) {
  const res = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Có lỗi xảy ra");
  return json;
}

function fmtDate(d) {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function AdminPage() {
  const [session, setSession] = useState(undefined); // undefined = đang tải, null = chưa đăng nhập

  const refreshSession = useCallback(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setSession(d.session));
  }, []);

  useEffect(() => { refreshSession(); }, [refreshSession]);

  if (session === undefined) return <div className="min-h-[400px] flex items-center justify-center text-slate-400 text-sm">Đang tải…</div>;
  if (!session) return <AdminLogin onLoggedIn={refreshSession} />;
  return <AdminDashboard session={session} onLogout={() => { fetch("/api/auth/logout", { method: "POST" }).then(refreshSession); }} />;
}

/* ---------------- LOGIN ---------------- */

function AdminLogin({ onLoggedIn }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setErr(""); setLoading(true);
    try {
      await api("/api/auth/login", { method: "POST", body: JSON.stringify({ username: user, password: pass }) });
      onLoggedIn();
    } catch (e) {
      setErr(e.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-sm mx-auto px-4 pt-16">
      <div className="text-center mb-8">
        <div style={{ background: ACCENT }} className="w-12 h-12 rounded-xl mx-auto flex items-center justify-center text-white mb-3"><Lock size={20} /></div>
        <h1 className="text-xl font-medium">Đăng nhập quản trị</h1>
        <p className="text-sm text-slate-400 mt-1">Chủ tài khoản dùng "admin" + mật khẩu hệ thống.</p>
      </div>
      <div className="space-y-3">
        <input value={user} onChange={(e) => setUser(e.target.value)} placeholder="Tài khoản" onKeyDown={(e) => e.key === "Enter" && submit()}
          className="w-full border border-[#E7E3DA] rounded-lg px-3 py-2.5 text-sm bg-white" />
        <div className="relative">
          <input value={pass} onChange={(e) => setPass(e.target.value)} type={show ? "text" : "password"} placeholder="Mật khẩu" onKeyDown={(e) => e.key === "Enter" && submit()}
            className="w-full border border-[#E7E3DA] rounded-lg px-3 py-2.5 text-sm bg-white pr-10" />
          <button onClick={() => setShow(!show)} className="absolute right-3 top-2.5 text-slate-400">{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>
        </div>
        {err && <div className="text-sm text-red-500">{err}</div>}
        <button onClick={submit} disabled={loading} style={{ background: ACCENT }} className="w-full text-white py-2.5 rounded-lg font-medium disabled:opacity-60">
          {loading ? "Đang đăng nhập…" : "Đăng nhập"}
        </button>
      </div>
    </div>
  );
}

/* ---------------- DASHBOARD SHELL ---------------- */

const ALL_TABS = [
  { key: "campaigns", label: "Campaigns", icon: Layers },
  { key: "brands", label: "Brands", icon: Building2 },
  { key: "registrations", label: "Đơn đăng ký", icon: ClipboardList },
  { key: "results", label: "Kết quả Campaign", icon: BarChart3 },
  { key: "aggregate", label: "Bảng tổng hợp", icon: FileSpreadsheet },
  { key: "koc-check", label: "Kiểm tra KOC", icon: Users },
  { key: "staff", label: "Nhân sự & phân quyền", icon: UserCog },
  { key: "settings", label: "Cài đặt", icon: SettingsIcon },
];

function AdminDashboard({ session, onLogout }) {
  const isOwner = session.type === "owner";
  const visibleTabs = ALL_TABS.filter((t) => {
    if (isOwner) return true;
    if (t.key === "staff" || t.key === "settings") return false;
    if (t.key === "brands") return !!session.canManageBrands;
    if (t.key === "aggregate" || t.key === "koc-check") return !!session.canViewAggregate;
    return true;
  });
  const [tab, setTab] = useState(visibleTabs[0]?.key || "campaigns");

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-16">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <ShieldCheck size={15} className="text-[#5B4CFF]" />
          {isOwner ? "Chủ tài khoản" : `Nhân viên: ${session.name || session.username}`}
        </div>
        <button onClick={onLogout} className="text-sm text-slate-400 hover:text-red-500 flex items-center gap-1"><LogOut size={14} /> Đăng xuất</button>
      </div>

      <div className="flex gap-1 mb-8 overflow-x-auto border-b border-[#E7E3DA]">
        {visibleTabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3.5 py-2.5 text-sm flex items-center gap-1.5 border-b-2 -mb-px whitespace-nowrap transition ${tab === t.key ? "border-[#5B4CFF] text-[#5B4CFF] font-medium" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === "campaigns" && <CampaignsAdmin isOwner={isOwner} canManageCampaigns={!!session.canManageCampaigns} />}
      {tab === "brands" && (isOwner || session.canManageBrands) && <BrandsAdmin />}
      {tab === "registrations" && <RegistrationsAdmin isOwner={isOwner} session={session} />}
      {tab === "results" && <ResultsAdmin isOwner={isOwner} session={session} />}
      {tab === "aggregate" && <AggregateAdmin />}
      {tab === "koc-check" && <KocCheckAdmin />}
      {tab === "staff" && isOwner && <StaffAdmin />}
      {tab === "settings" && isOwner && <SettingsAdmin />}
    </div>
  );
}

/* ---------------- BRANDS ---------------- */

function BrandsAdmin() {
  const [brands, setBrands] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => { api("/api/admin/brands").then((d) => { setBrands(d.brands); setLoading(false); }); }, []);
  useEffect(() => { load(); }, [load]);

  const addBrand = async () => {
    const { brand } = await api("/api/admin/brands", { method: "POST", body: JSON.stringify({ name: "Brand mới", color: "#5B4CFF" }) });
    setBrands((b) => [...b, brand]);
    setEditing(brand.id);
  };
  const update = async (id, patch) => {
    setBrands((list) => list.map((b) => (b.id === id ? { ...b, ...patch } : b)));
    await api(`/api/admin/brands/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
  };
  const remove = async (id) => { await api(`/api/admin/brands/${id}`, { method: "DELETE" }); setBrands((list) => list.filter((b) => b.id !== id)); };

  if (loading) return null;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-medium">Danh sách brand</h2>
        <button onClick={addBrand} style={{ background: ACCENT }} className="text-white text-sm px-3.5 py-2 rounded-lg flex items-center gap-1.5"><Plus size={14} /> Thêm brand</button>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {brands.map((b) => (
          <div key={b.id} className="bg-white border border-[#E7E3DA] rounded-xl p-4">
            {editing === b.id ? (
              <div className="space-y-2">
                <input value={b.name} onChange={(e) => update(b.id, { name: e.target.value })} className="w-full border border-[#E7E3DA] rounded-lg px-2.5 py-1.5 text-sm" />
                <div className="flex items-center gap-2">
                  <input type="color" value={b.color} onChange={(e) => update(b.id, { color: e.target.value })} className="w-9 h-9 rounded cursor-pointer border border-[#E7E3DA]" />
                  <label className="text-xs flex items-center gap-1.5 text-slate-500">
                    <input type="checkbox" checked={!!b.isOwn} onChange={(e) => update(b.id, { isOwn: e.target.checked })} /> Brand nội bộ (hiện trước)
                  </label>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setEditing(null)} className="text-sm px-3 py-1.5 rounded-lg bg-[#1C1B1F] text-white flex items-center gap-1"><Save size={13} />Lưu</button>
                  <button onClick={() => remove(b.id)} className="text-sm px-3 py-1.5 rounded-lg border border-red-200 text-red-500 flex items-center gap-1"><Trash2 size={13} />Xoá</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ background: b.color }} />
                  <span className="font-medium text-sm">{b.name}</span>
                  {b.isOwn && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#EEEBFF] text-[#5B4CFF]">Nội bộ</span>}
                </div>
                <button onClick={() => setEditing(b.id)} className="text-slate-400 hover:text-[#5B4CFF]"><Pencil size={14} /></button>
              </div>
            )}
          </div>
        ))}
      </div>
      {brands.length === 0 && <EmptyState text='Chưa có brand nào. Bấm "Thêm brand" để bắt đầu.' />}
    </div>
  );
}

/* ---------------- CAMPAIGNS ---------------- */

function CampaignsAdmin({ isOwner, canManageCampaigns }) {
  const canEdit = isOwner || canManageCampaigns;
  const [brands, setBrands] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [refLinks, setRefLinks] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [savedFlashId, setSavedFlashId] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    Promise.all([api("/api/admin/brands"), api("/api/admin/campaigns"), canEdit ? api("/api/admin/reflinks") : Promise.resolve({ refLinks: [] })])
      .then(([b, c, r]) => { setBrands(b.brands); setCampaigns(c.campaigns); setRefLinks(r.refLinks); setLoading(false); });
  }, [canEdit]);
  useEffect(() => { load(); }, [load]);

  const draftOf = (c) => ({
    name: c.name || "", product: c.product || "", cost: c.cost || "", requirements: c.requirements || "",
    brief: c.brief || "", brandId: c.brandId, status: c.status || "active",
    imageUrl: c.imageUrl || "", zaloGroupLink: c.zaloGroupLink || "", trackingLink: c.trackingLink || "",
    sampleLinks: typeof c.sampleLinks === "string" ? JSON.parse(c.sampleLinks || "[]") : (c.sampleLinks || []),
    productOptions: typeof c.productOptions === "string" ? JSON.parse(c.productOptions || "[]") : (c.productOptions || []),
    requireTiktok: c.requireTiktok !== false,
    channelFields: typeof c.channelFields === "string" ? JSON.parse(c.channelFields || "[]") : (c.channelFields || []),
    goalCreators: c.goalCreators ?? "", goalViews: c.goalViews ?? "", goalGmv: c.goalGmv ?? "", goalOrders: c.goalOrders ?? "",
  });

  const toggleOpen = (c) => {
    if (openId === c.id) { setOpenId(null); return; }
    setOpenId(c.id);
    setDrafts((d) => ({ ...d, [c.id]: draftOf(c) }));
  };

  const updateDraft = (id, patch) => setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }));

  const addCampaign = async () => {
    if (brands.length === 0) { alert("Hãy thêm brand trước."); return; }
    const { campaign } = await api("/api/admin/campaigns", { method: "POST", body: JSON.stringify({ brandId: brands[0].id, name: "Campaign mới" }) });
    setCampaigns((c) => [campaign, ...c]);
    setOpenId(campaign.id);
    setDrafts((d) => ({ ...d, [campaign.id]: draftOf(campaign) }));
  };

  const saveDraft = async (id) => {
    const draft = drafts[id];
    if (!draft) return;
    setSavingId(id);
    try {
      const { campaign } = await api(`/api/admin/campaigns/${id}`, { method: "PATCH", body: JSON.stringify(draft) });
      setCampaigns((list) => list.map((c) => (c.id === id ? campaign : c)));
      setDrafts((d) => ({ ...d, [id]: draftOf(campaign) }));
      setSavedFlashId(id);
      setTimeout(() => setSavedFlashId((cur) => (cur === id ? null : cur)), 1800);
    } catch (e) {
      alert(e.message || "Lưu thất bại, thử lại nhé.");
    } finally {
      setSavingId(null);
    }
  };

  const cancelDraft = (c) => setDrafts((d) => ({ ...d, [c.id]: draftOf(c) }));

  const remove = async (id) => { await api(`/api/admin/campaigns/${id}`, { method: "DELETE" }); setCampaigns((list) => list.filter((c) => c.id !== id)); if (openId === id) setOpenId(null); };

  const addRefLink = async () => {
    const { link } = await api("/api/admin/reflinks", { method: "POST", body: JSON.stringify({ label: "", url: "" }) });
    setRefLinks((l) => [...l, link]);
  };
  const updateRefLinks = async (next) => {
    // đồng bộ đơn giản: xoá hết rồi tạo lại theo danh sách hiện tại (đủ dùng cho vài link tham khảo)
    setRefLinks(next);
    const olds = refLinks;
    for (const o of olds) if (!next.find((n) => n.id === o.id)) await api(`/api/admin/reflinks/${o.id}`, { method: "DELETE" });
    for (const n of next) {
      const isNew = !olds.find((o) => o.id === n.id);
      if (isNew) continue; // đã tạo qua addRefLink
      await api(`/api/admin/reflinks/${n.id}`, { method: "PATCH", body: JSON.stringify({ label: n.label, url: n.url }) });
    }
  };

  if (loading) return null;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-medium">Campaigns</h2>
        {canEdit && <button onClick={addCampaign} style={{ background: ACCENT }} className="text-white text-sm px-3.5 py-2 rounded-lg flex items-center gap-1.5"><Plus size={14} /> Thêm campaign</button>}
      </div>

      <div className="space-y-3">
        {campaigns.map((c) => {
          const brand = brands.find((b) => b.id === c.brandId);
          const open = openId === c.id;
          const draft = drafts[c.id] || draftOf(c);
          return (
            <div key={c.id} className="bg-white border border-[#E7E3DA] rounded-xl overflow-hidden">
              <button onClick={() => toggleOpen(c)} className="w-full flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: brand?.color || "#999" }} />
                  <span className="font-medium text-sm">{c.name}</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full ${c.status === "done" ? "bg-[#FEF3C7] text-[#B45309]" : "bg-[#CCFBF1] text-[#0F766E]"}`}>
                    {c.status === "done" ? "Đã hoàn thành" : "Đang mở"}
                  </span>
                </div>
                <ChevronRight size={16} className={`text-slate-400 transition ${open ? "rotate-90" : ""}`} />
              </button>
              {open && (
                <div className="px-4 pb-4 space-y-3 border-t border-[#EFEBE2] pt-4">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <MiniField label="Tên campaign" value={draft.name} onChange={(v) => updateDraft(c.id, { name: v })} disabled={!canEdit} />
                    <div>
                      <FieldLabel>Brand</FieldLabel>
                      <select value={draft.brandId} disabled={!canEdit} onChange={(e) => updateDraft(c.id, { brandId: e.target.value })} className="w-full border border-[#E7E3DA] rounded-lg px-2.5 py-2 text-sm bg-white">
                        {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <MiniField label="Sản phẩm" value={draft.product} onChange={(v) => updateDraft(c.id, { product: v })} textarea disabled={!canEdit} />

                  {canEdit && (
                    <div>
                      <FieldLabel>Các lựa chọn sản phẩm (nếu có nhiều màu/loại để UGC chọn khi đăng ký)</FieldLabel>
                      <ProductOptionsEditor options={draft.productOptions || []} onChange={(v) => updateDraft(c.id, { productOptions: v })} />
                    </div>
                  )}
                  <MiniField label="Chi phí cast (để trống nếu không trả cast)" value={draft.cost} onChange={(v) => updateDraft(c.id, { cost: v })} disabled={!canEdit} />
                  <MiniField label="Yêu cầu về UGC" value={draft.requirements} onChange={(v) => updateDraft(c.id, { requirements: v })} textarea disabled={!canEdit} />
                  <MiniField label="Brief (có thể dán kèm link Google Drive để xem chi tiết, nhớ để chế độ chia sẻ 'Bất kỳ ai có link đều xem được')" value={draft.brief} onChange={(v) => updateDraft(c.id, { brief: v })} textarea disabled={!canEdit} />
                  <CampaignImageUpload value={draft.imageUrl} onChange={(v) => updateDraft(c.id, { imageUrl: v })} disabled={!canEdit} />
                  <MiniField label="Link nhóm Zalo (chỉ hiện cho UGC đã được chọn khi họ tra cứu đơn)" value={draft.zaloGroupLink} onChange={(v) => updateDraft(c.id, { zaloGroupLink: v })} disabled={!canEdit} />
                  <MiniField label="Link theo dõi đơn hàng (chỉ hiện cho UGC đã được chọn khi họ tra cứu đơn)" value={draft.trackingLink} onChange={(v) => updateDraft(c.id, { trackingLink: v })} disabled={!canEdit} />

                  <div className="pt-2 border-t border-[#EFEBE2]">
                    <FieldLabel>Thông tin kênh cần thu thập khi đăng ký</FieldLabel>
                    <label className="flex items-center gap-2 text-sm mb-2.5">
                      <input type="checkbox" checked={draft.requireTiktok} disabled={!canEdit} onChange={(e) => updateDraft(c.id, { requireTiktok: e.target.checked })} />
                      Yêu cầu ID + Link TikTok (bỏ chọn nếu campaign này không cần TikTok)
                    </label>
                    <div className="text-[11px] text-slate-400 mb-1.5">Trường kênh SNS khác (VD: Instagram, Facebook, YouTube...) — tuỳ campaign mà thêm/bớt:</div>
                    {canEdit ? (
                      <ChannelFieldsEditor fields={draft.channelFields || []} onChange={(v) => updateDraft(c.id, { channelFields: v })} />
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {(draft.channelFields || []).length === 0 && <span className="text-xs text-slate-300">Không có trường nào khác.</span>}
                        {(draft.channelFields || []).map((f) => <span key={f.id} className="text-xs px-2 py-1 rounded-full bg-[#F1EFE8] text-slate-500">{f.label}{f.required ? " *" : ""}</span>)}
                      </div>
                    )}
                  </div>

                  {canEdit && (
                    <div>
                      <FieldLabel>Link tham khảo (hiển thị cho UGC xem)</FieldLabel>
                      <SampleLinksEditor links={draft.sampleLinks || []} onChange={(v) => updateDraft(c.id, { sampleLinks: v })} />
                    </div>
                  )}

                  <div className="pt-2 border-t border-[#EFEBE2]">
                    <FieldLabel><span className="flex items-center gap-1.5"><Target size={13} /> Mục tiêu campaign (để trống nếu không theo dõi %)</span></FieldLabel>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1.5">
                      <div>
                        <label className="text-[11px] text-slate-400">Số KOC/video</label>
                        <input type="number" min="0" value={draft.goalCreators} disabled={!canEdit} onChange={(e) => updateDraft(c.id, { goalCreators: e.target.value })} className="w-full border border-[#E7E3DA] rounded-lg px-2 py-1.5 text-sm disabled:bg-[#F7F7F5]" />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400">Tổng view</label>
                        <input type="number" min="0" value={draft.goalViews} disabled={!canEdit} onChange={(e) => updateDraft(c.id, { goalViews: e.target.value })} className="w-full border border-[#E7E3DA] rounded-lg px-2 py-1.5 text-sm disabled:bg-[#F7F7F5]" />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400">GMV mục tiêu</label>
                        <input type="number" min="0" value={draft.goalGmv} disabled={!canEdit} onChange={(e) => updateDraft(c.id, { goalGmv: e.target.value })} className="w-full border border-[#E7E3DA] rounded-lg px-2 py-1.5 text-sm disabled:bg-[#F7F7F5]" />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400">Số đơn mục tiêu</label>
                        <input type="number" min="0" value={draft.goalOrders} disabled={!canEdit} onChange={(e) => updateDraft(c.id, { goalOrders: e.target.value })} className="w-full border border-[#E7E3DA] rounded-lg px-2 py-1.5 text-sm disabled:bg-[#F7F7F5]" />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#EFEBE2] flex-wrap gap-2">
                    {canEdit && (
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={draft.status === "done"} onChange={(e) => updateDraft(c.id, { status: e.target.checked ? "done" : "active" })} />
                        Đánh dấu đã hoàn thành (đóng đăng ký)
                      </label>
                    )}
                    <div className="flex items-center gap-3">
                      <button onClick={() => navigator.clipboard?.writeText(window.location.origin + `/form/${c.id}`)} className="text-xs text-[#5B4CFF] flex items-center gap-1">Copy link đăng ký</button>
                      {canEdit && <button onClick={() => remove(c.id)} className="text-xs text-red-500 flex items-center gap-1"><Trash2 size={12} />Xoá</button>}
                    </div>
                  </div>

                  {canEdit && (
                    <div className="flex items-center gap-2 pt-3 border-t border-[#EFEBE2]">
                      <button onClick={() => saveDraft(c.id)} disabled={savingId === c.id} style={{ background: ACCENT }} className="text-white text-sm px-4 py-2 rounded-lg flex items-center gap-1.5 disabled:opacity-60">
                        {savingId === c.id ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {savingId === c.id ? "Đang lưu…" : "Lưu thay đổi"}
                      </button>
                      <button onClick={() => cancelDraft(c)} className="text-sm px-4 py-2 rounded-lg border border-[#E7E3DA]">Huỷ thay đổi</button>
                      {savedFlashId === c.id && <span className="text-sm text-[#0F766E] flex items-center gap-1"><CheckCircle2 size={14} /> Đã lưu</span>}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {campaigns.length === 0 && <EmptyState text="Chưa có campaign nào." />}

      {canEdit && (
        <div className="mt-10 pt-6 border-t border-[#E7E3DA]">
          <h3 className="font-medium mb-3 text-sm">Link mẫu chung (hiển thị ở trang chủ)</h3>
          <div className="space-y-2">
            {refLinks.map((l) => (
              <div key={l.id} className="flex gap-2">
                <input value={l.label} onChange={(e) => updateRefLinks(refLinks.map((x) => (x.id === l.id ? { ...x, label: e.target.value } : x)))} placeholder="Tên hiển thị" className="w-32 border border-[#E7E3DA] rounded-lg px-2 py-1.5 text-sm" />
                <input value={l.url} onChange={(e) => updateRefLinks(refLinks.map((x) => (x.id === l.id ? { ...x, url: e.target.value } : x)))} placeholder="https://..." className="flex-1 border border-[#E7E3DA] rounded-lg px-2 py-1.5 text-sm" />
                <button onClick={() => updateRefLinks(refLinks.filter((x) => x.id !== l.id))} className="text-slate-400 hover:text-red-500"><X size={16} /></button>
              </div>
            ))}
            <button onClick={addRefLink} className="text-sm text-[#5B4CFF] flex items-center gap-1"><Plus size={13} /> Thêm link</button>
          </div>
        </div>
      )}
    </div>
  );
}


function MiniField({ label, value, onChange, textarea, disabled }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      {textarea ? (
        <textarea value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} rows={2} className="w-full border border-[#E7E3DA] rounded-lg px-2.5 py-2 text-sm disabled:bg-[#F7F7F5]" />
      ) : (
        <input value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className="w-full border border-[#E7E3DA] rounded-lg px-2.5 py-2 text-sm disabled:bg-[#F7F7F5]" />
      )}
    </div>
  );
}

function CampaignImageUpload({ value, onChange, disabled }) {
  const [err, setErr] = useState("");

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) { setErr("Ảnh quá lớn, vui lòng chọn ảnh dưới 1.5MB."); return; }
    setErr("");
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div>
      <FieldLabel>Ảnh đại diện campaign (dùng để trang trí, hiển thị ở trang chủ và trang chi tiết)</FieldLabel>
      <div className="flex items-center gap-3">
        {value ? (
          <img src={value} alt="" className="w-20 h-14 rounded-lg object-cover border border-[#E7E3DA]" />
        ) : (
          <div className="w-20 h-14 rounded-lg bg-[#F1EFE8] flex items-center justify-center text-slate-300"><ImagePlus size={18} /></div>
        )}
        {!disabled && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm px-3 py-1.5 rounded-lg border border-[#E7E3DA] cursor-pointer hover:border-[#5B4CFF] w-fit">
              Tải ảnh lên
              <input type="file" accept="image/*" onChange={onFile} className="hidden" />
            </label>
            {value && <button type="button" onClick={() => onChange("")} className="text-xs text-red-500 text-left">Xoá ảnh</button>}
          </div>
        )}
      </div>
      {err && <div className="text-xs text-red-500 mt-1.5">{err}</div>}
    </div>
  );
}

/* ---------------- REGISTRATIONS ---------------- */

function RegistrationsAdmin({ isOwner, session }) {
  const [campaigns, setCampaigns] = useState([]);
  const [campaignId, setCampaignId] = useState("");
  const [rows, setRows] = useState([]);
  const [editingCell, setEditingCell] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(() => new Set());
  const [showMailModal, setShowMailModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [filters, setFilters] = useState({ code: "", tiktokId: "", zaloPhone: "", followers: "", selectedProduct: "", status: "", mail: "", paid: "" });
  const setFilter = (k, v) => setFilters((f) => ({ ...f, [k]: v }));
  const clearFilters = () => setFilters({ code: "", tiktokId: "", zaloPhone: "", followers: "", selectedProduct: "", status: "", mail: "", paid: "" });
  const hasActiveFilters = Object.values(filters).some((v) => v);

  useEffect(() => {
    api("/api/admin/campaigns").then((d) => {
      setCampaigns(d.campaigns);
      setCampaignId(d.campaigns[0]?.id || "");
      setLoading(false);
    });
  }, []);

  const loadRows = useCallback(() => {
    if (!campaignId) { setRows([]); return; }
    api(`/api/admin/registrations?campaignId=${campaignId}`).then((d) => setRows(d.registrations));
  }, [campaignId]);
  useEffect(() => { loadRows(); }, [loadRows]);
  useEffect(() => { setSelected(new Set()); }, [campaignId]);

  const toggleSelect = (code) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code); else next.add(code);
      return next;
    });
  };
  const toggleSelectAll = () => {
    setSelected((prev) => (prev.size === filteredRows.length ? new Set() : new Set(filteredRows.map((r) => r.code))));
  };

  const campaign = campaigns.find((c) => c.id === campaignId);
  const channelFields = (typeof campaign?.channelFields === "string" ? JSON.parse(campaign.channelFields || "[]") : (campaign?.channelFields || [])).filter((f) => f.label?.trim());

  const filteredRows = rows.filter((r) => {
    if (filters.code && !r.code?.toLowerCase().includes(filters.code.toLowerCase())) return false;
    if (filters.tiktokId && !r.tiktokId?.toLowerCase().includes(filters.tiktokId.toLowerCase())) return false;
    if (filters.zaloPhone && !r.zaloPhone?.toLowerCase().includes(filters.zaloPhone.toLowerCase())) return false;
    if (filters.followers && !String(r.followers || "").toLowerCase().includes(filters.followers.toLowerCase())) return false;
    if (filters.selectedProduct && !r.selectedProduct?.toLowerCase().includes(filters.selectedProduct.toLowerCase())) return false;
    if (filters.status && r.status !== filters.status) return false;
    if (filters.mail === "sent" && !r.mailSentAt) return false;
    if (filters.mail === "unsent" && r.mailSentAt) return false;
    if (filters.paid === "paid" && r.paid !== true) return false;
    if (filters.paid === "unpaid" && r.paid !== false) return false;
    return true;
  });

  const updateReg = async (code, patch) => {
    setRows((list) => list.map((r) => (r.code === code ? { ...r, ...patch } : r)));
    await api(`/api/admin/registrations/${code}`, { method: "PATCH", body: JSON.stringify(patch) });
  };

  const removeReg = async (code) => {
    if (!confirm("Xoá đơn đăng ký này? Không thể hoàn tác.")) return;
    await api(`/api/admin/registrations/${code}`, { method: "DELETE" });
    setRows((list) => list.filter((r) => r.code !== code));
    setSelected((prev) => { const next = new Set(prev); next.delete(code); return next; });
  };

  const importExcel = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const wb = XLSX.read(evt.target.result, { type: "array" });
      const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      const statusLabelToKey = (label) => Object.entries(STATUS).find(([, v]) => v.label === label)?.[0];
      for (const row of json) {
        const code = row["Mã ID"];
        const existing = rows.find((r) => r.code === code);
        if (!existing) continue;
        const patch = {
          followers: row["Follower"] ?? existing.followers,
          gmvNumber: row["Số liệu GMV"] ?? existing.gmvNumber,
          status: statusLabelToKey(row["Trạng thái"]) || existing.status,
          paid: row["Đã thanh toán"] === "Đã chi" ? true : row["Đã thanh toán"] === "Chưa chi" ? false : existing.paid,
        };
        await updateReg(code, patch);
      }
      e.target.value = "";
    };
    reader.readAsArrayBuffer(file);
  };

  if (loading) return null;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} className="border border-[#E7E3DA] rounded-lg px-3 py-2 text-sm bg-white">
          {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="flex-1" />
        {selected.size > 0 && (
          <button onClick={() => setShowMailModal(true)} style={{ background: ACCENT }} className="text-sm px-3 py-2 rounded-lg text-white flex items-center gap-1.5">
            <Mail size={14} /> Gửi mail cho {selected.size} bạn đã chọn
          </button>
        )}
        <button onClick={() => setShowExportModal(true)} className="text-sm px-3 py-2 rounded-lg border border-[#E7E3DA] flex items-center gap-1.5 hover:border-[#5B4CFF]"><Download size={14} /> Xuất Excel</button>
        <label className="text-sm px-3 py-2 rounded-lg border border-[#E7E3DA] flex items-center gap-1.5 hover:border-[#5B4CFF] cursor-pointer">
          <Upload size={14} /> Nhập Excel
          <input type="file" accept=".xlsx,.xls" onChange={importExcel} className="hidden" />
        </label>
        {hasActiveFilters && <button onClick={clearFilters} className="text-sm px-3 py-2 rounded-lg border border-[#E7E3DA] text-slate-500 hover:border-red-300 hover:text-red-500 flex items-center gap-1.5"><X size={14} /> Xoá bộ lọc</button>}
      </div>

      {showMailModal && (
        <MailComposeModal
          campaign={campaign}
          codes={Array.from(selected)}
          rows={rows}
          onClose={() => setShowMailModal(false)}
          onSent={() => { setSelected(new Set()); setShowMailModal(false); }}
        />
      )}

      {showExportModal && (
        <RegistrationsExportModal
          rows={rows}
          campaign={campaign}
          initialFilters={filters}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {campaigns.length === 0 && <EmptyState text="Bạn chưa được cấp quyền xem campaign nào." />}
      {campaigns.length > 0 && rows.length === 0 && <EmptyState text="Chưa có đơn đăng ký nào cho campaign này." />}
      {rows.length > 0 && filteredRows.length === 0 && <EmptyState text="Không có đơn nào khớp với bộ lọc." />}

      {filteredRows.length > 0 && (
        <div className="overflow-x-auto border border-[#E7E3DA] rounded-xl bg-white">
          <table className="w-full text-sm min-w-[1500px]">
            <thead>
              <tr className="border-b border-[#E7E3DA] text-left text-slate-400 text-xs uppercase tracking-wide">
                <th className="p-3 w-8"><input type="checkbox" checked={filteredRows.length > 0 && selected.size === filteredRows.length} onChange={toggleSelectAll} /></th>
                <th className="p-3">Mã ID</th><th className="p-3">TikTok</th>
                {channelFields.map((f) => <th key={f.id} className="p-3">{f.label}</th>)}
                <th className="p-3">SĐT Zalo</th>
                <th className="p-3">Follower</th><th className="p-3">GMV 30d</th><th className="p-3">Reup</th>
                <th className="p-3">Aff 5%</th><th className="p-3">Sản phẩm chọn</th><th className="p-3">Ngày đăng ký</th><th className="p-3">Mail</th><th className="p-3">Trạng thái</th>
                {campaign?.status === "done" && campaign?.cost && <th className="p-3">Thanh toán</th>}
                <th className="p-3 w-8"></th>
              </tr>
              <tr className="border-b border-[#E7E3DA] bg-[#FAF9F6]">
                <th className="p-1.5"></th>
                <th className="p-1.5"><input value={filters.code} onChange={(e) => setFilter("code", e.target.value)} placeholder="Lọc mã ID" className="w-full border border-[#E7E3DA] rounded px-2 py-1 text-xs bg-white" /></th>
                <th className="p-1.5"><input value={filters.tiktokId} onChange={(e) => setFilter("tiktokId", e.target.value)} placeholder="Lọc TikTok" className="w-full border border-[#E7E3DA] rounded px-2 py-1 text-xs bg-white" /></th>
                {channelFields.map((f) => <th key={f.id} className="p-1.5"></th>)}
                <th className="p-1.5"><input value={filters.zaloPhone} onChange={(e) => setFilter("zaloPhone", e.target.value)} placeholder="Lọc SĐT" className="w-full border border-[#E7E3DA] rounded px-2 py-1 text-xs bg-white" /></th>
                <th className="p-1.5"><input value={filters.followers} onChange={(e) => setFilter("followers", e.target.value)} placeholder="Lọc follower" className="w-full border border-[#E7E3DA] rounded px-2 py-1 text-xs bg-white" /></th>
                <th className="p-1.5"></th>
                <th className="p-1.5"></th>
                <th className="p-1.5"></th>
                <th className="p-1.5"><input value={filters.selectedProduct} onChange={(e) => setFilter("selectedProduct", e.target.value)} placeholder="Lọc sản phẩm" className="w-full border border-[#E7E3DA] rounded px-2 py-1 text-xs bg-white" /></th>
                <th className="p-1.5"></th>
                <th className="p-1.5">
                  <select value={filters.mail} onChange={(e) => setFilter("mail", e.target.value)} className="w-full border border-[#E7E3DA] rounded px-1.5 py-1 text-xs bg-white">
                    <option value="">Tất cả</option>
                    <option value="sent">Đã gửi</option>
                    <option value="unsent">Chưa gửi</option>
                  </select>
                </th>
                <th className="p-1.5">
                  <select value={filters.status} onChange={(e) => setFilter("status", e.target.value)} className="w-full border border-[#E7E3DA] rounded px-1.5 py-1 text-xs bg-white">
                    <option value="">Tất cả</option>
                    {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </th>
                {campaign?.status === "done" && campaign?.cost && (
                  <th className="p-1.5">
                    <select value={filters.paid} onChange={(e) => setFilter("paid", e.target.value)} className="w-full border border-[#E7E3DA] rounded px-1.5 py-1 text-xs bg-white">
                      <option value="">Tất cả</option>
                      <option value="paid">Đã chi</option>
                      <option value="unpaid">Chưa chi</option>
                    </select>
                  </th>
                )}
                <th className="p-1.5"></th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r) => (
                <tr key={r.code} className="border-b border-[#F1EFE8] last:border-0 align-top">
                  <td className="p-3"><input type="checkbox" checked={selected.has(r.code)} onChange={() => toggleSelect(r.code)} /></td>
                  <td className="p-3 font-mono">{r.code}</td>
                  <EditableCell reg={r} field="tiktokId" editingCell={editingCell} setEditingCell={setEditingCell} updateReg={updateReg} />
                  {channelFields.map((f) => <ExtraFieldCell key={f.id} reg={r} fieldId={f.id} editingCell={editingCell} setEditingCell={setEditingCell} updateReg={updateReg} />)}
                  <EditableCell reg={r} field="zaloPhone" editingCell={editingCell} setEditingCell={setEditingCell} updateReg={updateReg} />
                  <EditableCell reg={r} field="followers" editingCell={editingCell} setEditingCell={setEditingCell} updateReg={updateReg} />
                  <EditableCell reg={r} field="gmvNumber" editingCell={editingCell} setEditingCell={setEditingCell} updateReg={updateReg} />
                  <td className="p-3 text-slate-500">{r.allowReup}</td>
                  <td className="p-3 text-slate-500">{r.aff5}</td>
                  <td className="p-3 text-slate-500">{r.selectedProduct || <span className="text-slate-300">—</span>}</td>
                  <td className="p-3 text-slate-500 whitespace-nowrap">{fmtDate(r.createdAt)}</td>
                  <td className="p-3">
                    {r.mailSentAt ? (
                      <span title={`Đã gửi lúc ${fmtDate(r.mailSentAt)}`} className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-[#CCFBF1] text-[#0F766E]">
                        <CheckCircle2 size={12} /> Đã gửi
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-300">Chưa gửi</span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-col gap-1.5">
                      <StatusPill status={r.status} />
                      <div className="flex gap-1">
                        <button onClick={() => updateReg(r.code, { status: "suitable" })} className={`text-[11px] px-2 py-1 rounded-full border ${r.status === "suitable" ? "bg-[#FEF3C7] border-[#FEF3C7] text-[#B45309]" : "border-[#E7E3DA] text-slate-500"}`}>Phù hợp</button>
                        <button onClick={() => updateReg(r.code, { status: "selected" })} className={`text-[11px] px-2 py-1 rounded-full border ${r.status === "selected" ? "bg-[#CCFBF1] border-[#CCFBF1] text-[#0F766E]" : "border-[#E7E3DA] text-slate-500"}`}>Chọn</button>
                        {r.status !== "pending" && <button onClick={() => updateReg(r.code, { status: "pending" })} className="text-[11px] px-2 py-1 rounded-full border border-[#E7E3DA] text-slate-400">Bỏ</button>}
                      </div>
                    </div>
                  </td>
                  {campaign?.status === "done" && campaign?.cost && (
                    <td className="p-3">
                      <div className="flex gap-1">
                        <button onClick={() => updateReg(r.code, { paid: true })} className={`text-[11px] px-2 py-1 rounded-full border ${r.paid === true ? "bg-[#CCFBF1] border-[#CCFBF1] text-[#0F766E]" : "border-[#E7E3DA] text-slate-500"}`}>Đã chi</button>
                        <button onClick={() => updateReg(r.code, { paid: false })} className={`text-[11px] px-2 py-1 rounded-full border ${r.paid === false ? "bg-[#F1F5F9] border-[#F1F5F9] text-slate-500" : "border-[#E7E3DA] text-slate-500"}`}>Chưa chi</button>
                      </div>
                    </td>
                  )}
                  <td className="p-3"><button onClick={() => removeReg(r.code)} className="text-slate-300 hover:text-red-500" title="Xoá đơn"><Trash2 size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------------- SHARED: EXPORT FILTER UI ---------------- */

function ChipMultiSelect({ options, selected, onChange }) {
  const toggle = (v) => {
    const next = new Set(selected);
    if (next.has(v)) next.delete(v); else next.add(v);
    onChange(next);
  };
  const allSelected = options.length > 0 && options.every((o) => selected.has(o.value));
  const toggleAll = () => onChange(allSelected ? new Set() : new Set(options.map((o) => o.value)));
  if (options.length === 0) return <div className="text-xs text-slate-300">Không có dữ liệu</div>;
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button key={o.value} type="button" onClick={() => toggle(o.value)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${selected.has(o.value) ? "border-[#5B4CFF] bg-[#EEEDFE] text-[#3C3489]" : "border-[#E7E3DA] text-slate-500"}`}>
            {o.label}
          </button>
        ))}
      </div>
      <button type="button" onClick={toggleAll} className="text-[11px] text-[#5B4CFF] mt-1.5 hover:underline">
        {allSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
      </button>
    </div>
  );
}

function ExportModalShell({ title, count, onClose, onExport, exportDisabled, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium flex items-center gap-2"><Download size={16} /> {title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <div className="space-y-4">{children}</div>
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-[#F1EFE8]">
          <span className="text-xs text-slate-400">{count} dòng phù hợp</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-[#E7E3DA] text-sm">Huỷ</button>
            <button onClick={onExport} disabled={exportDisabled} style={{ background: ACCENT }} className="text-white px-4 py-2 rounded-lg text-sm flex items-center gap-1.5 disabled:opacity-60">
              <Download size={14} /> Xuất file
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExportFilterSection({ title, children }) {
  return (
    <div>
      <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1.5">{title}</div>
      {children}
    </div>
  );
}

const SELECT_CLS = "border border-[#E7E3DA] rounded-lg px-2.5 py-1.5 text-xs bg-white";
const DATE_CLS = "border border-[#E7E3DA] rounded-lg px-2.5 py-1.5 text-xs bg-white flex-1";

/* ---------------- IMPORT EXCEL: PREVIEW DÒNG TRÙNG TRƯỚC KHI LƯU ---------------- */
// Dùng chung cho các tab có nút "Nhập Excel". Mỗi dòng import được so khớp với dữ liệu
// hiện có; nếu đã tồn tại (trùng) thì liệt kê rõ giá trị cũ -> mới để admin xác nhận,
// tránh việc lỡ upload lại file cũ đè mất số liệu mới hơn.
function ImportPreviewModal({ title, diffs, applying, onConfirm, onClose }) {
  const toUpdate = diffs.filter((d) => d.found && d.changes.length > 0);
  const unchanged = diffs.filter((d) => d.found && d.changes.length === 0);
  const notFound = diffs.filter((d) => !d.found);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && !applying && onClose()}>
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium flex items-center gap-2"><Upload size={16} /> {title}</h3>
          {!applying && <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>}
        </div>

        {diffs.length === 0 && <EmptyState text="Không đọc được dòng nào hợp lệ từ file." />}

        {toUpdate.length > 0 && (
          <div className="mb-4">
            <div className="text-xs font-medium text-amber-600 mb-2 flex items-center gap-1.5">
              <AlertTriangle size={13} /> {toUpdate.length} dòng đã có sẵn trong hệ thống (trùng) — sẽ được CẬP NHẬT, ghi đè giá trị cũ:
            </div>
            <div className="border border-[#E7E3DA] rounded-lg divide-y divide-[#F1EFE8] max-h-64 overflow-y-auto">
              {toUpdate.map((d, i) => (
                <div key={i} className="p-2.5 text-xs">
                  <div className="font-medium mb-1">{d.label}</div>
                  {d.changes.map((c, j) => (
                    <div key={j} className="text-slate-500 flex items-center gap-1 flex-wrap">
                      <span className="text-slate-400">{c.label}:</span>
                      <span className="line-through text-slate-300">{String(c.oldVal || "—")}</span>
                      <span>→</span>
                      <span className="text-[#5B4CFF] font-medium">{String(c.newVal || "—")}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {unchanged.length > 0 && (
          <div className="text-xs text-slate-400 mb-2">{unchanged.length} dòng không có gì thay đổi so với dữ liệu hiện tại — sẽ bỏ qua.</div>
        )}

        {notFound.length > 0 && (
          <div className="text-xs text-red-400 mb-2">
            {notFound.length} dòng không khớp với dữ liệu hiện có (sai mã / đã bị xoá) — sẽ bỏ qua: {notFound.map((d) => d.label).join(", ")}
          </div>
        )}

        <div className="flex items-center justify-between mt-5 pt-4 border-t border-[#F1EFE8]">
          <span className="text-xs text-slate-400">{toUpdate.length} dòng sẽ được cập nhật</span>
          <div className="flex gap-2">
            <button onClick={onClose} disabled={applying} className="px-4 py-2 rounded-lg border border-[#E7E3DA] text-sm disabled:opacity-60">Huỷ</button>
            <button onClick={onConfirm} disabled={applying || toUpdate.length === 0} style={{ background: ACCENT }} className="text-white px-4 py-2 rounded-lg text-sm flex items-center gap-1.5 disabled:opacity-60">
              {applying ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Xác nhận cập nhật
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- REGISTRATIONS: EXPORT MODAL ---------------- */

function RegistrationsExportModal({ rows, campaign, initialFilters, onClose }) {
  const showPaid = campaign?.status === "done" && campaign?.cost;
  const distinctProducts = useMemo(() => Array.from(new Set(rows.map((r) => r.selectedProduct).filter(Boolean))), [rows]);

  const [statusSel, setStatusSel] = useState(() =>
    initialFilters?.status ? new Set([initialFilters.status]) : new Set(Object.keys(STATUS))
  );
  const [mail, setMail] = useState(initialFilters?.mail || "");
  const [paid, setPaid] = useState(initialFilters?.paid || "");
  const [productSel, setProductSel] = useState(() => {
    if (initialFilters?.selectedProduct) {
      const q = initialFilters.selectedProduct.toLowerCase();
      const match = distinctProducts.filter((p) => p.toLowerCase().includes(q));
      return new Set(match.length ? match : distinctProducts);
    }
    return new Set(distinctProducts);
  });
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const channelFields = useMemo(() => (typeof campaign?.channelFields === "string" ? JSON.parse(campaign.channelFields || "[]") : (campaign?.channelFields || [])).filter((f) => f.label?.trim()), [campaign]);

  const ALL_COLS = useMemo(() => [
    { key: "code", label: "Mã ID", get: (r) => r.code },
    { key: "status", label: "Trạng thái", get: (r) => STATUS[r.status]?.label },
    { key: "tiktokId", label: "ID TikTok", get: (r) => r.tiktokId },
    { key: "tiktokLink", label: "Link TikTok", get: (r) => r.tiktokLink },
    ...channelFields.map((f) => ({ key: `extra:${f.id}`, label: f.label, get: (r) => (typeof r.extraFields === "string" ? JSON.parse(r.extraFields || "{}") : (r.extraFields || {}))[f.id] || "" })),
    { key: "zaloPhone", label: "SĐT Zalo", get: (r) => r.zaloPhone },
    { key: "address", label: "Địa chỉ", get: (r) => r.address },
    { key: "email", label: "Email", get: (r) => r.email },
    { key: "gmvNote", label: "Ảnh GMV", get: (r) => r.gmvNote },
    { key: "gmvNumber", label: "Số liệu GMV", get: (r) => r.gmvNumber },
    { key: "followers", label: "Follower", get: (r) => r.followers },
    { key: "selectedProduct", label: "Sản phẩm chọn", get: (r) => r.selectedProduct },
    { key: "allowReup", label: "Cho reup", get: (r) => r.allowReup },
    { key: "aff5", label: "Aff 5%", get: (r) => r.aff5 },
    { key: "video30days", label: "Video ≥30 ngày", get: (r) => r.video30days },
    { key: "contentDesc", label: "Nội dung kênh", get: (r) => r.contentDesc },
    { key: "createdAt", label: "Ngày đăng ký", get: (r) => fmtDate(r.createdAt) },
    ...(showPaid ? [{ key: "paid", label: "Đã thanh toán", get: (r) => (r.paid === true ? "Đã chi" : r.paid === false ? "Chưa chi" : "") }] : []),
  ], [showPaid, channelFields]);
  const [colSel, setColSel] = useState(() => new Set(ALL_COLS.map((c) => c.key)));
  const toggleCol = (k) => setColSel((prev) => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });

  const filtered = useMemo(() => rows.filter((r) => {
    if (!statusSel.has(r.status)) return false;
    if (mail === "sent" && !r.mailSentAt) return false;
    if (mail === "unsent" && r.mailSentAt) return false;
    if (showPaid && paid === "paid" && r.paid !== true) return false;
    if (showPaid && paid === "unpaid" && r.paid !== false) return false;
    if (distinctProducts.length && productSel.size < distinctProducts.length) {
      if (!r.selectedProduct || !productSel.has(r.selectedProduct)) return false;
    }
    if (dateFrom && (!r.createdAt || new Date(r.createdAt) < new Date(dateFrom))) return false;
    if (dateTo && (!r.createdAt || new Date(r.createdAt) > new Date(dateTo + "T23:59:59"))) return false;
    return true;
  }), [rows, statusSel, mail, paid, showPaid, productSel, distinctProducts, dateFrom, dateTo]);

  const doExport = () => {
    const cols = ALL_COLS.filter((c) => colSel.has(c.key));
    const data = filtered.map((r) => {
      const obj = {};
      cols.forEach((c) => { obj[c.label] = c.get(r) ?? ""; });
      return obj;
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Đơn đăng ký");
    XLSX.writeFile(wb, `${campaign?.name || "campaign"}.xlsx`);
    onClose();
  };

  return (
    <ExportModalShell title="Xuất Excel theo bộ lọc" count={filtered.length} onClose={onClose} onExport={doExport} exportDisabled={colSel.size === 0 || filtered.length === 0}>
      <ExportFilterSection title="Trạng thái">
        <ChipMultiSelect options={Object.entries(STATUS).map(([k, v]) => ({ value: k, label: v.label }))} selected={statusSel} onChange={setStatusSel} />
      </ExportFilterSection>

      <div className="grid grid-cols-2 gap-3">
        <ExportFilterSection title="Mail">
          <select value={mail} onChange={(e) => setMail(e.target.value)} className={SELECT_CLS + " w-full"}>
            <option value="">Tất cả</option>
            <option value="sent">Đã gửi</option>
            <option value="unsent">Chưa gửi</option>
          </select>
        </ExportFilterSection>
        {showPaid && (
          <ExportFilterSection title="Thanh toán">
            <select value={paid} onChange={(e) => setPaid(e.target.value)} className={SELECT_CLS + " w-full"}>
              <option value="">Tất cả</option>
              <option value="paid">Đã chi</option>
              <option value="unpaid">Chưa chi</option>
            </select>
          </ExportFilterSection>
        )}
      </div>

      {distinctProducts.length > 0 && (
        <ExportFilterSection title="Sản phẩm chọn">
          <ChipMultiSelect options={distinctProducts.map((p) => ({ value: p, label: p }))} selected={productSel} onChange={setProductSel} />
        </ExportFilterSection>
      )}

      <ExportFilterSection title="Khoảng ngày đăng ký">
        <div className="flex items-center gap-2">
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={DATE_CLS} />
          <span className="text-xs text-slate-400">đến</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={DATE_CLS} />
        </div>
      </ExportFilterSection>

      <ExportFilterSection title="Cột muốn xuất">
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          {ALL_COLS.map((c) => (
            <label key={c.key} className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
              <input type="checkbox" checked={colSel.has(c.key)} onChange={() => toggleCol(c.key)} /> {c.label}
            </label>
          ))}
        </div>
      </ExportFilterSection>
    </ExportModalShell>
  );
}

/* ---------------- CAMPAIGN RESULTS (shipping / posting / video metrics / GMV) ---------------- */

function ResultsAdmin({ isOwner, session }) {
  const [campaigns, setCampaigns] = useState([]);
  const [campaignId, setCampaignId] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showExportModal, setShowExportModal] = useState(false);
  const [importPreview, setImportPreview] = useState(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    api("/api/admin/campaigns").then((d) => {
      setCampaigns(d.campaigns);
      setCampaignId(d.campaigns[0]?.id || "");
      setLoading(false);
    });
  }, []);

  const loadRows = useCallback(() => {
    if (!campaignId) { setRows([]); return; }
    api(`/api/admin/registrations?campaignId=${campaignId}`).then((d) => setRows(d.registrations));
  }, [campaignId]);
  useEffect(() => { loadRows(); }, [loadRows]);

  // So khớp bằng "Mã ID" — chỉ đọc & chuẩn bị diff, KHÔNG lưu ngay. Admin xem preview
  // các dòng trùng (đã có sẵn) rồi mới bấm xác nhận, để không lỡ upload lại file cũ đè số liệu mới.
  const RESULT_FIELD_DEFS = [
    { header: "Trạng thái gửi hàng", key: "shipStatus", parse: (v) => (v === "Đã nhận hàng" ? "delivered" : v === "Đã gửi" ? "shipped" : "") },
    { header: "Ngày gửi", key: "shipDate" },
    { header: "Link air bài", key: "postLink" },
    { header: "Ngày air", key: "postDate" },
    { header: "View", key: "views" },
    { header: "Like", key: "likes" },
    { header: "Comment", key: "comments" },
    { header: "Share", key: "shares" },
    { header: "GMV", key: "videoGmv" },
    { header: "Số đơn hàng", key: "videoOrders" },
  ];

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: "array" });
      const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      const diffs = json.map((row) => {
        const code = row["Mã ID"];
        if (!code) return null;
        const existing = rows.find((r) => r.code === code);
        if (!existing) return { label: `Mã ${code}`, found: false, changes: [] };
        const changes = [];
        RESULT_FIELD_DEFS.forEach(({ header, key, parse }) => {
          if (!(header in row)) return;
          const newVal = parse ? parse(row[header]) : (row[header] ?? "");
          const oldVal = existing[key] ?? "";
          if (String(newVal) !== String(oldVal)) changes.push({ key, label: header, oldVal, newVal });
        });
        return { label: `${existing.tiktokId || code} (${code})`, code, found: true, changes };
      }).filter(Boolean);
      setImportPreview(diffs);
      e.target.value = "";
    };
    reader.readAsArrayBuffer(file);
  };

  const confirmImport = async () => {
    setImporting(true);
    const toApply = importPreview.filter((d) => d.found && d.changes.length > 0);
    for (const d of toApply) {
      const patch = {};
      d.changes.forEach((c) => { patch[c.key] = c.newVal; });
      await updateReg(d.code, patch);
    }
    setImporting(false);
    setImportPreview(null);
  };

  const campaign = campaigns.find((c) => c.id === campaignId);
  // Chỉ những đơn đã ĐƯỢC CHỌN mới thực sự thực thi campaign (gửi hàng / air bài)
  const selectedRows = rows.filter((r) => r.status === "selected");
  const rangedRows = selectedRows.filter((r) => {
    const d = r.postDate || r.shipDate;
    if (dateFrom && (!d || d < dateFrom)) return false;
    if (dateTo && (!d || d > dateTo)) return false;
    return true;
  });

  const updateReg = async (code, patch) => {
    setRows((list) => list.map((r) => (r.code === code ? { ...r, ...patch } : r)));
    await api(`/api/admin/registrations/${code}`, { method: "PATCH", body: JSON.stringify(patch) });
  };

  const num = (v) => Number(v) || 0;
  const totals = rangedRows.reduce((acc, r) => ({
    posted: acc.posted + (r.postLink ? 1 : 0),
    views: acc.views + num(r.views),
    gmv: acc.gmv + num(r.videoGmv),
    orders: acc.orders + num(r.videoOrders),
  }), { posted: 0, views: 0, gmv: 0, orders: 0 });

  const goal = {
    creators: num(campaign?.goalCreators), views: num(campaign?.goalViews),
    gmv: num(campaign?.goalGmv), orders: num(campaign?.goalOrders),
  };

  if (loading) return null;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} className="border border-[#E7E3DA] rounded-lg px-3 py-2 text-sm bg-white">
          {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="border border-[#E7E3DA] rounded-lg px-2.5 py-2 text-xs bg-white" />
          <span className="text-xs text-slate-400">đến</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="border border-[#E7E3DA] rounded-lg px-2.5 py-2 text-xs bg-white" />
        </div>
        <div className="flex-1" />
        <button onClick={() => setShowExportModal(true)} className="text-sm px-3 py-2 rounded-lg border border-[#E7E3DA] flex items-center gap-1.5 hover:border-[#5B4CFF]"><Download size={14} /> Xuất Excel</button>
        <label className="text-sm px-3 py-2 rounded-lg border border-[#E7E3DA] flex items-center gap-1.5 hover:border-[#5B4CFF] cursor-pointer">
          <Upload size={14} /> Nhập Excel
          <input type="file" accept=".xlsx,.xls" onChange={handleImportFile} className="hidden" />
        </label>
      </div>

      {importPreview && (
        <ImportPreviewModal
          title="Xem trước dữ liệu nhập vào — Kết quả campaign"
          diffs={importPreview}
          applying={importing}
          onConfirm={confirmImport}
          onClose={() => setImportPreview(null)}
        />
      )}

      {campaigns.length === 0 && <EmptyState text="Chưa có campaign nào." />}

      {campaign && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <GoalStat icon={Users} label="KOC đã air bài" value={totals.posted} goal={goal.creators} />
          <GoalStat icon={Eye} label="Tổng view" value={totals.views} goal={goal.views} />
          <GoalStat icon={DollarSign} label="GMV" value={totals.gmv} goal={goal.gmv} />
          <GoalStat icon={ClipboardList} label="Số đơn hàng" value={totals.orders} goal={goal.orders} />
        </div>
      )}

      {campaigns.length > 0 && selectedRows.length === 0 && <EmptyState text="Chưa có KOC nào được chọn trong campaign này." />}
      {selectedRows.length > 0 && rangedRows.length === 0 && <EmptyState text="Không có dòng nào trong khoảng ngày đã chọn." />}

      {rangedRows.length > 0 && (
        <div className="overflow-x-auto border border-[#E7E3DA] rounded-xl bg-white">
          <table className="w-full text-sm min-w-[1400px]">
            <thead>
              <tr className="border-b border-[#E7E3DA] text-left text-slate-400 text-xs uppercase tracking-wide">
                <th className="p-3">TikTok</th>
                <th className="p-3"><Truck size={12} className="inline mr-1" />Gửi hàng</th>
                <th className="p-3">Ngày gửi</th>
                <th className="p-3"><Video size={12} className="inline mr-1" />Link air bài</th>
                <th className="p-3">Ngày air</th>
                <th className="p-3"><Eye size={12} className="inline mr-1" />View</th>
                <th className="p-3"><Heart size={12} className="inline mr-1" />Like</th>
                <th className="p-3"><MessageCircle size={12} className="inline mr-1" />Cmt</th>
                <th className="p-3"><Share2 size={12} className="inline mr-1" />Share</th>
                <th className="p-3">GMV</th>
                <th className="p-3">Đơn hàng</th>
              </tr>
            </thead>
            <tbody>
              {rangedRows.map((r) => (
                <tr key={r.code} className="border-b border-[#F1EFE8] last:border-0 align-top">
                  <td className="p-3">
                    <div className="font-medium">{r.tiktokId || "—"}</div>
                    {r.tiktokLink && <a href={r.tiktokLink} target="_blank" rel="noreferrer" className="text-[11px] text-[#5B4CFF] flex items-center gap-0.5">Trang cá nhân <ExternalLink size={10} /></a>}
                  </td>
                  <td className="p-2">
                    <select value={r.shipStatus || ""} onChange={(e) => updateReg(r.code, { shipStatus: e.target.value })} className="w-full border border-[#E7E3DA] rounded px-1.5 py-1 text-xs bg-white">
                      <option value="">Chưa gửi</option>
                      <option value="shipped">Đã gửi</option>
                      <option value="delivered">Đã nhận hàng</option>
                    </select>
                  </td>
                  <td className="p-2"><input type="date" value={r.shipDate || ""} onChange={(e) => updateReg(r.code, { shipDate: e.target.value })} className="border border-[#E7E3DA] rounded px-1.5 py-1 text-xs w-full" /></td>
                  <td className="p-2" style={{ minWidth: 210 }}>
                    <div className="flex items-center gap-1">
                      <input type="text" placeholder="Dán link video..." defaultValue={r.postLink || ""}
                        onBlur={(e) => e.target.value.trim() !== (r.postLink || "") && updateReg(r.code, { postLink: e.target.value.trim() })}
                        className="border border-[#E7E3DA] rounded px-1.5 py-1 text-xs flex-1" />
                      {r.postLink && <a href={r.postLink} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-[#5B4CFF]"><ExternalLink size={13} /></a>}
                    </div>
                  </td>
                  <td className="p-2"><input type="date" value={r.postDate || ""} onChange={(e) => updateReg(r.code, { postDate: e.target.value })} className="border border-[#E7E3DA] rounded px-1.5 py-1 text-xs w-full" /></td>
                  <NumCell reg={r} field="views" updateReg={updateReg} />
                  <NumCell reg={r} field="likes" updateReg={updateReg} />
                  <NumCell reg={r} field="comments" updateReg={updateReg} />
                  <NumCell reg={r} field="shares" updateReg={updateReg} />
                  <NumCell reg={r} field="videoGmv" updateReg={updateReg} />
                  <NumCell reg={r} field="videoOrders" updateReg={updateReg} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showExportModal && (
        <ResultsExportModal rows={rows} campaign={campaign} onClose={() => setShowExportModal(false)} />
      )}
    </div>
  );
}

function NumCell({ reg, field, updateReg }) {
  const [val, setVal] = useState(reg[field] ?? "");
  useEffect(() => { setVal(reg[field] ?? ""); }, [reg[field]]);
  return (
    <td className="p-2">
      <input type="number" min="0" value={val} onChange={(e) => setVal(e.target.value)}
        onBlur={() => { if (String(val) !== String(reg[field] ?? "")) updateReg(reg.code, { [field]: val }); }}
        className="border border-[#E7E3DA] rounded px-1.5 py-1 text-xs w-20" />
    </td>
  );
}

function GoalStat({ icon: Icon, label, value, goal }) {
  const pct = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : null;
  const fmt = (n) => Number(n || 0).toLocaleString("vi-VN");
  return (
    <div className="bg-white border border-[#E7E3DA] rounded-xl p-3.5">
      <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1.5"><Icon size={13} /> {label}</div>
      <div className="text-lg font-medium">{fmt(value)}{goal > 0 && <span className="text-xs text-slate-400 font-normal"> / {fmt(goal)}</span>}</div>
      {pct !== null && (
        <div className="mt-2">
          <div className="h-1.5 rounded-full bg-[#F1EFE8] overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 100 ? "#0F766E" : ACCENT }} />
          </div>
          <div className="text-[11px] text-slate-400 mt-1">{pct}% mục tiêu</div>
        </div>
      )}
    </div>
  );
}

function ResultsExportModal({ rows, campaign, onClose }) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [shipSel, setShipSel] = useState(() => new Set(["", "shipped", "delivered"]));
  const [onlyPosted, setOnlyPosted] = useState(false);

  // "Mã ID" luôn được xuất kèm (không cho tắt) để làm khoá so khớp khi Nhập Excel lại sau này.
  const CODE_COL = { key: "code", label: "Mã ID", get: (r) => r.code };
  const ALL_COLS = useMemo(() => [
    { key: "tiktokId", label: "ID TikTok", get: (r) => r.tiktokId },
    { key: "shipStatus", label: "Trạng thái gửi hàng", get: (r) => (r.shipStatus === "delivered" ? "Đã nhận hàng" : r.shipStatus === "shipped" ? "Đã gửi" : "Chưa gửi") },
    { key: "shipDate", label: "Ngày gửi", get: (r) => r.shipDate || "" },
    { key: "postLink", label: "Link air bài", get: (r) => r.postLink || "" },
    { key: "postDate", label: "Ngày air", get: (r) => r.postDate || "" },
    { key: "views", label: "View", get: (r) => r.views || 0 },
    { key: "likes", label: "Like", get: (r) => r.likes || 0 },
    { key: "comments", label: "Comment", get: (r) => r.comments || 0 },
    { key: "shares", label: "Share", get: (r) => r.shares || 0 },
    { key: "videoGmv", label: "GMV", get: (r) => r.videoGmv || 0 },
    { key: "videoOrders", label: "Số đơn hàng", get: (r) => r.videoOrders || 0 },
  ], []);
  const [colSel, setColSel] = useState(() => new Set(ALL_COLS.map((c) => c.key)));
  const toggleCol = (k) => setColSel((prev) => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });

  const filtered = useMemo(() => rows.filter((r) => {
    if (r.status !== "selected") return false;
    if (onlyPosted && !r.postLink) return false;
    if (!shipSel.has(r.shipStatus || "")) return false;
    const d = r.postDate || r.shipDate;
    if (dateFrom && (!d || d < dateFrom)) return false;
    if (dateTo && (!d || d > dateTo)) return false;
    return true;
  }), [rows, onlyPosted, shipSel, dateFrom, dateTo]);

  const doExport = () => {
    const cols = [CODE_COL, ...ALL_COLS.filter((c) => colSel.has(c.key))];
    const data = filtered.map((r) => {
      const obj = {};
      cols.forEach((c) => { obj[c.label] = c.get(r) ?? ""; });
      return obj;
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Kết quả campaign");
    XLSX.writeFile(wb, `${campaign?.name || "campaign"}_ket_qua.xlsx`);
    onClose();
  };

  return (
    <ExportModalShell title="Xuất kết quả theo bộ lọc" count={filtered.length} onClose={onClose} onExport={doExport} exportDisabled={colSel.size === 0 || filtered.length === 0}>
      <ExportFilterSection title="Trạng thái gửi hàng">
        <ChipMultiSelect options={[{ value: "", label: "Chưa gửi" }, { value: "shipped", label: "Đã gửi" }, { value: "delivered", label: "Đã nhận hàng" }]} selected={shipSel} onChange={setShipSel} />
      </ExportFilterSection>

      <ExportFilterSection title="Khoảng ngày air bài / gửi hàng">
        <div className="flex items-center gap-2">
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={DATE_CLS} />
          <span className="text-xs text-slate-400">đến</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={DATE_CLS} />
        </div>
      </ExportFilterSection>

      <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
        <input type="checkbox" checked={onlyPosted} onChange={(e) => setOnlyPosted(e.target.checked)} /> Chỉ lấy video đã có link air bài
      </label>

      <ExportFilterSection title="Cột muốn xuất">
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          {ALL_COLS.map((c) => (
            <label key={c.key} className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
              <input type="checkbox" checked={colSel.has(c.key)} onChange={() => toggleCol(c.key)} /> {c.label}
            </label>
          ))}
        </div>
      </ExportFilterSection>
    </ExportModalShell>
  );
}

function ExtraFieldCell({ reg, fieldId, editingCell, setEditingCell, updateReg }) {
  const cellKey = `extra:${fieldId}`;
  const isEditing = editingCell?.code === reg.code && editingCell?.field === cellKey;
  const extra = typeof reg.extraFields === "string" ? JSON.parse(reg.extraFields || "{}") : (reg.extraFields || {});
  const [val, setVal] = useState(extra[fieldId] || "");
  const commit = () => { updateReg(reg.code, { extraFields: JSON.stringify({ ...extra, [fieldId]: val }) }); setEditingCell(null); };
  if (isEditing) {
    return (
      <td className="p-2">
        <input autoFocus value={val} onChange={(e) => setVal(e.target.value)} onBlur={commit}
          onKeyDown={(e) => { if (e.key === "Enter") commit(); }}
          className="w-full border border-[#5B4CFF] rounded px-2 py-1 text-sm" />
      </td>
    );
  }
  return (
    <td className="p-3 cursor-text hover:bg-[#FAF9F6]" onClick={() => { setVal(extra[fieldId] || ""); setEditingCell({ code: reg.code, field: cellKey }); }}>
      {extra[fieldId] || <span className="text-slate-300">—</span>}
    </td>
  );
}

function EditableCell({ reg, field, editingCell, setEditingCell, updateReg }) {
  const isEditing = editingCell?.code === reg.code && editingCell?.field === field;
  const [val, setVal] = useState(reg[field] || "");
  if (isEditing) {
    return (
      <td className="p-2">
        <input autoFocus value={val} onChange={(e) => setVal(e.target.value)}
          onBlur={() => { updateReg(reg.code, { [field]: val }); setEditingCell(null); }}
          onKeyDown={(e) => { if (e.key === "Enter") { updateReg(reg.code, { [field]: val }); setEditingCell(null); } }}
          className="w-full border border-[#5B4CFF] rounded px-2 py-1 text-sm" />
      </td>
    );
  }
  return (
    <td className="p-3 cursor-text hover:bg-[#FAF9F6]" onClick={() => { setVal(reg[field] || ""); setEditingCell({ code: reg.code, field }); }}>
      {reg[field] || <span className="text-slate-300">—</span>}
    </td>
  );
}

/* ---------------- MAIL COMPOSE MODAL ---------------- */

const DEFAULT_MAIL_SUBJECT = "Thông báo kết quả campaign {{campaignName}}";
const DEFAULT_MAIL_BODY =
  "Chào {{tiktokId}},\n\nCảm ơn bạn đã đăng ký tham gia campaign {{campaignName}}.\n\n" +
  "[Nội dung thông báo - admin/nhân viên điền vào đây]\n\nMã đơn của bạn: {{code}}\n\nTrân trọng.";

function MailComposeModal({ campaign, codes, rows, onClose, onSent }) {
  const [subject, setSubject] = useState(campaign?.emailSubject || DEFAULT_MAIL_SUBJECT);
  const [mailBody, setMailBody] = useState(campaign?.emailBody || DEFAULT_MAIL_BODY);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState(null);
  const [err, setErr] = useState("");

  const recipients = rows.filter((r) => codes.includes(r.code));

  const send = async () => {
    if (!subject.trim() || !mailBody.trim()) { setErr("Nhập tiêu đề và nội dung mail."); return; }
    setErr(""); setSending(true);
    try {
      const json = await api("/api/admin/send-mail", {
        method: "POST",
        body: JSON.stringify({ campaignId: campaign.id, codes, subject, mailBody }),
      });
      setResults(json.results);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSending(false);
    }
  };

  const allOk = results && results.every((r) => r.ok);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium flex items-center gap-2"><Mail size={16} /> Soạn mail cho {recipients.length} bạn</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        {!results ? (
          <>
            <div className="text-xs text-slate-400 mb-3">
              Gửi tới: {recipients.map((r) => r.email).filter(Boolean).join(", ") || "—"}
            </div>
            <div className="space-y-3">
              <div>
                <FieldLabel>Tiêu đề</FieldLabel>
                <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full border border-[#E7E3DA] rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <FieldLabel>Nội dung</FieldLabel>
                <textarea value={mailBody} onChange={(e) => setMailBody(e.target.value)} rows={8} className="w-full border border-[#E7E3DA] rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="text-xs text-slate-400 bg-[#F7F7F5] rounded-lg p-2.5 leading-relaxed">
                Có thể dùng: <code>{"{{tiktokId}}"}</code>, <code>{"{{code}}"}</code>, <code>{"{{campaignName}}"}</code>, <code>{"{{followers}}"}</code>, <code>{"{{email}}"}</code> — hệ thống tự thay bằng thông tin riêng của từng người khi gửi. Nội dung này sẽ được lưu làm mẫu cho campaign, lần sau gửi sẽ tự điền lại.
              </div>
            </div>
            {err && <div className="mt-3 text-sm text-red-500">{err}</div>}
            <div className="flex gap-2 mt-5">
              <button onClick={send} disabled={sending} style={{ background: ACCENT }} className="text-white px-4 py-2 rounded-lg text-sm flex items-center gap-1.5 disabled:opacity-60">
                {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} {sending ? "Đang gửi…" : `Gửi cho ${recipients.length} bạn`}
              </button>
              <button onClick={onClose} className="px-4 py-2 rounded-lg border border-[#E7E3DA] text-sm">Huỷ</button>
            </div>
          </>
        ) : (
          <div>
            <div className={`text-sm px-3 py-2 rounded-lg mb-3 ${allOk ? "bg-[#CCFBF1] text-[#0F766E]" : "bg-[#FEF3C7] text-[#B45309]"}`}>
              Đã gửi {results.filter((r) => r.ok).length}/{results.length} mail thành công.
            </div>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {results.map((r) => (
                <div key={r.code} className="flex items-center justify-between text-sm border border-[#F1EFE8] rounded-lg px-3 py-2">
                  <span className="font-mono text-xs">{r.code}</span>
                  <span className="text-slate-500 flex-1 px-2 truncate">{r.email}</span>
                  {r.ok ? <CheckCircle2 size={15} className="text-[#0F766E]" /> : <span className="text-xs text-red-500">{r.error}</span>}
                </div>
              ))}
            </div>
            <button onClick={onSent} className="mt-4 px-4 py-2 rounded-lg bg-[#1C1B1F] text-white text-sm">Xong</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- AGGREGATE ---------------- */

function AggregateAdmin() {
  const [rows, setRows] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [campaignFilter, setCampaignFilter] = useState("");
  const [filters, setFilters] = useState({ tiktokId: "", zaloPhone: "", followers: "", status: "", mail: "" });
  const setFilter = (k, v) => setFilters((f) => ({ ...f, [k]: v }));
  const clearFilters = () => { setFilters({ tiktokId: "", zaloPhone: "", followers: "", status: "", mail: "" }); setCampaignFilter(""); };
  const hasActiveFilters = campaignFilter || Object.values(filters).some((v) => v);
  const [editingCell, setEditingCell] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [showExportModal, setShowExportModal] = useState(false);
  const [importPreview, setImportPreview] = useState(null);
  const [importing, setImporting] = useState(false);

  const loadRows = useCallback(() => {
    return Promise.all([api("/api/admin/registrations?all=1"), api("/api/admin/campaigns")])
      .then(([r, c]) => { setRows(r.registrations); setCampaigns(c.campaigns); setLoading(false); })
      .catch((e) => { setErr(e.message); setLoading(false); });
  }, []);
  useEffect(() => { loadRows(); }, [loadRows]);

  const merged = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => {
      const key = (r.tiktokId || r.zaloPhone || r.code).toLowerCase();
      if (!map.has(key)) map.set(key, { ...r, campaignsList: [{ id: r.campaignId, code: r.code, status: r.status, createdAt: r.createdAt, mailSentAt: r.mailSentAt, selectedProduct: r.selectedProduct }] });
      else map.get(key).campaignsList.push({ id: r.campaignId, code: r.code, status: r.status, createdAt: r.createdAt, mailSentAt: r.mailSentAt, selectedProduct: r.selectedProduct });
    });
    return Array.from(map.values());
  }, [rows]);

  const filtered = merged.filter((m) => {
    if (filters.tiktokId && !m.tiktokId?.toLowerCase().includes(filters.tiktokId.toLowerCase())) return false;
    if (filters.zaloPhone && !m.zaloPhone?.toLowerCase().includes(filters.zaloPhone.toLowerCase())) return false;
    if (filters.followers && !String(m.followers || "").toLowerCase().includes(filters.followers.toLowerCase())) return false;
    if (filters.status && !m.campaignsList.some((c) => c.status === filters.status)) return false;
    if (filters.mail === "sent" && !m.campaignsList.some((c) => c.mailSentAt)) return false;
    if (filters.mail === "unsent" && m.campaignsList.some((c) => c.mailSentAt)) return false;
    if (campaignFilter && !m.campaignsList.some((c) => c.id === campaignFilter)) return false;
    return true;
  });

  const latestDate = (m) => m.campaignsList.reduce((max, c) => (c.createdAt && (!max || new Date(c.createdAt) > new Date(max)) ? c.createdAt : max), null);

  const updateReg = async (code, patch) => {
    setRows((list) => list.map((r) => (r.code === code ? { ...r, ...patch } : r)));
    await api(`/api/admin/registrations/${code}`, { method: "PATCH", body: JSON.stringify(patch) });
  };

  // So khớp theo "ID TikTok" (ưu tiên) hoặc "SĐT Zalo" — vì bảng Tổng hợp gộp theo người,
  // không có cột Mã ID riêng. Chỉ preview & chờ xác nhận trước khi lưu, giống tab Kết quả.
  const AGG_FIELD_DEFS = [
    { header: "SĐT Zalo", key: "zaloPhone" },
    { header: "Email", key: "email" },
    { header: "Follower", key: "followers" },
  ];

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: "array" });
      const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      const diffs = json.map((row) => {
        const tiktok = (row["ID TikTok"] || "").toString().trim();
        const zalo = (row["SĐT Zalo"] || "").toString().trim();
        if (!tiktok && !zalo) return null;
        const existing = merged.find((m) =>
          (tiktok && m.tiktokId && m.tiktokId.toLowerCase() === tiktok.toLowerCase()) ||
          (!tiktok && zalo && m.zaloPhone && m.zaloPhone.toLowerCase() === zalo.toLowerCase())
        );
        const label = tiktok || zalo;
        if (!existing) return { label, found: false, changes: [] };
        const changes = [];
        AGG_FIELD_DEFS.forEach(({ header, key }) => {
          if (!(header in row)) return;
          const newVal = row[header] ?? "";
          const oldVal = existing[key] ?? "";
          if (String(newVal) !== String(oldVal)) changes.push({ key, label: header, oldVal, newVal });
        });
        return { label, code: existing.code, found: true, changes };
      }).filter(Boolean);
      setImportPreview(diffs);
      e.target.value = "";
    };
    reader.readAsArrayBuffer(file);
  };

  const confirmImport = async () => {
    setImporting(true);
    const toApply = importPreview.filter((d) => d.found && d.changes.length > 0);
    for (const d of toApply) {
      const patch = {};
      d.changes.forEach((c) => { patch[c.key] = c.newVal; });
      await updateReg(d.code, patch);
    }
    setImporting(false);
    setImportPreview(null);
  };

  // Xoá 1 lượt đăng ký (1 campaign) của người đó
  const removeOne = async (code) => {
    if (!confirm("Bỏ đăng ký campaign này khỏi người này?")) return;
    await api(`/api/admin/registrations/${code}`, { method: "DELETE" });
    setRows((list) => list.filter((r) => r.code !== code));
  };

  // Xoá toàn bộ người này (tất cả các campaign đã đăng ký)
  const removePerson = async (m) => {
    if (!confirm(`Xoá hẳn "${m.tiktokId || m.zaloPhone}" khỏi tất cả campaign? Không thể hoàn tác.`)) return;
    for (const c of m.campaignsList) {
      await api(`/api/admin/registrations/${c.code}`, { method: "DELETE" });
    }
    setRows((list) => list.filter((r) => !m.campaignsList.some((c) => c.code === r.code)));
  };

  if (loading) return null;
  if (err) return <EmptyState text={err} />;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <select value={campaignFilter} onChange={(e) => setCampaignFilter(e.target.value)} className="border border-[#E7E3DA] rounded-lg px-3 py-2 text-sm bg-white">
          <option value="">Tất cả campaign</option>
          {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="flex-1" />
        {hasActiveFilters && <button onClick={clearFilters} className="text-sm px-3 py-2 rounded-lg border border-[#E7E3DA] text-slate-500 hover:border-red-300 hover:text-red-500 flex items-center gap-1.5"><X size={14} /> Xoá bộ lọc</button>}
        <button onClick={() => setShowExportModal(true)} className="text-sm px-3 py-2 rounded-lg border border-[#E7E3DA] flex items-center gap-1.5 hover:border-[#5B4CFF]"><Download size={14} /> Xuất Excel</button>
        <label className="text-sm px-3 py-2 rounded-lg border border-[#E7E3DA] flex items-center gap-1.5 hover:border-[#5B4CFF] cursor-pointer">
          <Upload size={14} /> Nhập Excel
          <input type="file" accept=".xlsx,.xls" onChange={handleImportFile} className="hidden" />
        </label>
      </div>

      {showExportModal && (
        <AggregateExportModal
          merged={merged}
          campaigns={campaigns}
          latestDate={latestDate}
          initialFilters={filters}
          initialCampaignFilter={campaignFilter}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {importPreview && (
        <ImportPreviewModal
          title="Xem trước dữ liệu nhập vào — Tổng hợp"
          diffs={importPreview}
          applying={importing}
          onConfirm={confirmImport}
          onClose={() => setImportPreview(null)}
        />
      )}

      {merged.length === 0 && <EmptyState text="Chưa có dữ liệu." />}
      {merged.length > 0 && filtered.length === 0 && <EmptyState text="Không có ai khớp với bộ lọc." />}

      {filtered.length > 0 && (
        <div className="overflow-x-auto border border-[#E7E3DA] rounded-xl bg-white">
          <table className="w-full text-sm min-w-[1050px]">
            <thead>
              <tr className="border-b border-[#E7E3DA] text-left text-slate-400 text-xs uppercase tracking-wide">
                <th className="p-3">TikTok</th><th className="p-3">SĐT Zalo</th><th className="p-3">Follower</th>
                <th className="p-3">Ngày đăng ký</th><th className="p-3">Đã đăng ký các campaign</th><th className="p-3 w-8"></th>
              </tr>
              <tr className="border-b border-[#E7E3DA] bg-[#FAF9F6]">
                <th className="p-1.5"><input value={filters.tiktokId} onChange={(e) => setFilter("tiktokId", e.target.value)} placeholder="Lọc TikTok" className="w-full border border-[#E7E3DA] rounded px-2 py-1 text-xs bg-white" /></th>
                <th className="p-1.5"><input value={filters.zaloPhone} onChange={(e) => setFilter("zaloPhone", e.target.value)} placeholder="Lọc SĐT" className="w-full border border-[#E7E3DA] rounded px-2 py-1 text-xs bg-white" /></th>
                <th className="p-1.5"><input value={filters.followers} onChange={(e) => setFilter("followers", e.target.value)} placeholder="Lọc follower" className="w-full border border-[#E7E3DA] rounded px-2 py-1 text-xs bg-white" /></th>
                <th className="p-1.5"></th>
                <th className="p-1.5 flex gap-1.5">
                  <select value={filters.status} onChange={(e) => setFilter("status", e.target.value)} className="flex-1 border border-[#E7E3DA] rounded px-1.5 py-1 text-xs bg-white">
                    <option value="">Trạng thái: tất cả</option>
                    {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                  <select value={filters.mail} onChange={(e) => setFilter("mail", e.target.value)} className="flex-1 border border-[#E7E3DA] rounded px-1.5 py-1 text-xs bg-white">
                    <option value="">Mail: tất cả</option>
                    <option value="sent">Đã gửi</option>
                    <option value="unsent">Chưa gửi</option>
                  </select>
                </th>
                <th className="p-1.5"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m, i) => (
                <tr key={i} className="border-b border-[#F1EFE8] last:border-0 align-top">
                  <AggEditableCell m={m} field="tiktokId" editingCell={editingCell} setEditingCell={setEditingCell} updateReg={updateReg} />
                  <AggEditableCell m={m} field="zaloPhone" editingCell={editingCell} setEditingCell={setEditingCell} updateReg={updateReg} />
                  <AggEditableCell m={m} field="followers" editingCell={editingCell} setEditingCell={setEditingCell} updateReg={updateReg} />
                  <td className="p-3 text-slate-500 whitespace-nowrap">{fmtDate(latestDate(m))}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1.5">
                      {m.campaignsList.map((c, idx) => {
                        const camp = campaigns.find((cc) => cc.id === c.id);
                        const s = STATUS[c.status] || STATUS.pending;
                        return (
                          <span key={idx} title={`Đăng ký: ${fmtDate(c.createdAt)}${c.selectedProduct ? ` · SP: ${c.selectedProduct}` : ""}${c.mailSentAt ? ` · Đã gửi mail: ${fmtDate(c.mailSentAt)}` : " · Chưa gửi mail"}`}
                            className="group text-[11px] pl-2 pr-1 py-1 rounded-full flex items-center gap-1" style={{ background: s.bg, color: s.color }}>
                            {c.mailSentAt && <CheckCircle2 size={11} />}
                            {camp?.name || "—"}
                            <button onClick={() => removeOne(c.code)} className="opacity-40 hover:opacity-100 hover:text-red-500 ml-0.5" title="Bỏ đăng ký campaign này"><X size={11} /></button>
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  <td className="p-3"><button onClick={() => removePerson(m)} className="text-slate-300 hover:text-red-500" title="Xoá hẳn người này"><Trash2 size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------------- AGGREGATE: EXPORT MODAL ---------------- */

function AggregateExportModal({ merged, campaigns, latestDate, initialFilters, initialCampaignFilter, onClose }) {
  const [statusSel, setStatusSel] = useState(() =>
    initialFilters?.status ? new Set([initialFilters.status]) : new Set(Object.keys(STATUS))
  );
  const [mail, setMail] = useState(initialFilters?.mail || "");
  const [campaignSel, setCampaignSel] = useState(() =>
    initialCampaignFilter ? new Set([initialCampaignFilter]) : new Set(campaigns.map((c) => c.id))
  );
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const ALL_COLS = useMemo(() => [
    { key: "tiktokId", label: "ID TikTok", get: (m) => m.tiktokId },
    { key: "zaloPhone", label: "SĐT Zalo", get: (m) => m.zaloPhone },
    { key: "email", label: "Email", get: (m) => m.email },
    { key: "followers", label: "Follower", get: (m) => m.followers },
    { key: "latestDate", label: "Ngày đăng ký gần nhất", get: (m) => fmtDate(latestDate(m)) },
    { key: "campaignsList", label: "Campaign đã đăng ký", get: (m) => m.campaignsList.map((c) => campaigns.find((cc) => cc.id === c.id)?.name).filter(Boolean).join(", ") },
    { key: "count", label: "Số campaign", get: (m) => m.campaignsList.length },
  ], [campaigns, latestDate]);
  const [colSel, setColSel] = useState(() => new Set(ALL_COLS.map((c) => c.key)));
  const toggleCol = (k) => setColSel((prev) => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });

  const filtered = useMemo(() => merged.filter((m) => {
    if (!m.campaignsList.some((c) => statusSel.has(c.status))) return false;
    if (mail === "sent" && !m.campaignsList.some((c) => c.mailSentAt)) return false;
    if (mail === "unsent" && m.campaignsList.some((c) => c.mailSentAt)) return false;
    if (campaignSel.size < campaigns.length && !m.campaignsList.some((c) => campaignSel.has(c.id))) return false;
    const ld = latestDate(m);
    if (dateFrom && (!ld || new Date(ld) < new Date(dateFrom))) return false;
    if (dateTo && (!ld || new Date(ld) > new Date(dateTo + "T23:59:59"))) return false;
    return true;
  }), [merged, statusSel, mail, campaignSel, campaigns.length, dateFrom, dateTo, latestDate]);

  const doExport = () => {
    const cols = ALL_COLS.filter((c) => colSel.has(c.key));
    const data = filtered.map((m) => {
      const obj = {};
      cols.forEach((c) => { obj[c.label] = c.get(m) ?? ""; });
      return obj;
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tổng hợp");
    XLSX.writeFile(wb, "tong_hop_ugc.xlsx");
    onClose();
  };

  return (
    <ExportModalShell title="Xuất Excel theo bộ lọc" count={filtered.length} onClose={onClose} onExport={doExport} exportDisabled={colSel.size === 0 || filtered.length === 0}>
      <ExportFilterSection title="Trạng thái">
        <ChipMultiSelect options={Object.entries(STATUS).map(([k, v]) => ({ value: k, label: v.label }))} selected={statusSel} onChange={setStatusSel} />
      </ExportFilterSection>

      <ExportFilterSection title="Mail">
        <select value={mail} onChange={(e) => setMail(e.target.value)} className={SELECT_CLS}>
          <option value="">Tất cả</option>
          <option value="sent">Đã gửi</option>
          <option value="unsent">Chưa gửi</option>
        </select>
      </ExportFilterSection>

      {campaigns.length > 0 && (
        <ExportFilterSection title="Campaign">
          <ChipMultiSelect options={campaigns.map((c) => ({ value: c.id, label: c.name }))} selected={campaignSel} onChange={setCampaignSel} />
        </ExportFilterSection>
      )}

      <ExportFilterSection title="Khoảng ngày đăng ký gần nhất">
        <div className="flex items-center gap-2">
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={DATE_CLS} />
          <span className="text-xs text-slate-400">đến</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={DATE_CLS} />
        </div>
      </ExportFilterSection>

      <ExportFilterSection title="Cột muốn xuất">
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          {ALL_COLS.map((c) => (
            <label key={c.key} className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
              <input type="checkbox" checked={colSel.has(c.key)} onChange={() => toggleCol(c.key)} /> {c.label}
            </label>
          ))}
        </div>
      </ExportFilterSection>
    </ExportModalShell>
  );
}

/* ---------------- KOC CHECK (kiểm tra hàng loạt: đã hoàn thành hay còn nợ campaign khác) ---------------- */

function KocCheckAdmin() {
  const [merged, setMerged] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [results, setResults] = useState(null);

  useEffect(() => {
    Promise.all([api("/api/admin/registrations?all=1"), api("/api/admin/campaigns")]).then(([r, c]) => {
      const map = new Map();
      r.registrations.forEach((reg) => {
        const key = (reg.tiktokId || reg.zaloPhone || reg.code).toLowerCase();
        if (!map.has(key)) map.set(key, { tiktokId: reg.tiktokId, zaloPhone: reg.zaloPhone, entries: [] });
        map.get(key).entries.push(reg);
      });
      setMerged(Array.from(map.values()));
      setCampaigns(c.campaigns);
      setLoading(false);
    });
  }, []);

  // Chỉ tính "nợ" khi đã được CHỌN tham gia campaign nhưng chưa có link air bài
  const fulfillmentOf = (reg) => {
    if (reg.status !== "selected") return null;
    return reg.postLink ? "done" : "owing";
  };

  const check = () => {
    const queries = input.split("\n").map((s) => s.trim()).filter(Boolean);
    const out = queries.map((q) => {
      const ql = q.toLowerCase();
      const person = merged.find((m) =>
        (m.tiktokId && m.tiktokId.toLowerCase() === ql) ||
        (m.zaloPhone && m.zaloPhone.toLowerCase() === ql) ||
        (m.tiktokId && m.tiktokId.toLowerCase().includes(ql))
      );
      if (!person) return { query: q, found: false };
      const campaignsInfo = person.entries.map((e) => ({
        campaignName: campaigns.find((c) => c.id === e.campaignId)?.name || "—",
        status: e.status,
        fulfillment: fulfillmentOf(e),
      }));
      const owingCount = campaignsInfo.filter((ci) => ci.fulfillment === "owing").length;
      return { query: q, found: true, tiktokId: person.tiktokId, zaloPhone: person.zaloPhone, campaignsInfo, owingCount };
    });
    setResults(out);
  };

  if (loading) return null;

  return (
    <div>
      <div className="mb-5">
        <FieldLabel>Dán danh sách ID TikTok hoặc SĐT Zalo (mỗi người 1 dòng) để kiểm tra hàng loạt</FieldLabel>
        <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={5}
          placeholder={"vd:\n@tiktokid1\n0901234567\n@tiktokid2"}
          className="w-full border border-[#E7E3DA] rounded-lg px-3 py-2 text-sm font-mono bg-white" />
        <button onClick={check} disabled={!input.trim()} style={{ background: ACCENT }} className="mt-2 text-white text-sm px-4 py-2 rounded-lg flex items-center gap-1.5 disabled:opacity-60">
          <Search size={14} /> Kiểm tra
        </button>
      </div>

      {results && (
        <div className="space-y-3">
          {results.map((r, i) => (
            <div key={i} className="bg-white border border-[#E7E3DA] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <div className="font-medium text-sm">{r.query}</div>
                {!r.found && <span className="text-xs text-slate-400">Không tìm thấy trong hệ thống</span>}
                {r.found && r.owingCount > 0 && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#FCEBEB] text-[#A32D2D] flex items-center gap-1"><AlertTriangle size={11} /> Còn nợ {r.owingCount} campaign</span>
                )}
                {r.found && r.owingCount === 0 && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#CCFBF1] text-[#0F766E] flex items-center gap-1"><CheckCircle2 size={11} /> Không nợ campaign nào</span>
                )}
              </div>
              {r.found && (
                <div className="flex flex-wrap gap-1.5">
                  {r.campaignsInfo.map((ci, idx) => (
                    <span key={idx} className={`text-[11px] px-2 py-1 rounded-full ${ci.fulfillment === "owing" ? "bg-[#FCEBEB] text-[#A32D2D]" : ci.fulfillment === "done" ? "bg-[#CCFBF1] text-[#0F766E]" : "bg-[#F1F5F9] text-slate-500"}`}>
                      {ci.campaignName} · {ci.fulfillment === "owing" ? "Còn nợ (chưa air bài)" : ci.fulfillment === "done" ? "Đã hoàn thành" : STATUS[ci.status]?.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AggEditableCell({ m, field, editingCell, setEditingCell, updateReg }) {
  const isEditing = editingCell?.code === m.code && editingCell?.field === field;
  const [val, setVal] = useState(m[field] || "");
  if (isEditing) {
    return (
      <td className="p-2">
        <input autoFocus value={val} onChange={(e) => setVal(e.target.value)}
          onBlur={() => { updateReg(m.code, { [field]: val }); setEditingCell(null); }}
          onKeyDown={(e) => { if (e.key === "Enter") { updateReg(m.code, { [field]: val }); setEditingCell(null); } }}
          className="w-full border border-[#5B4CFF] rounded px-2 py-1 text-sm" />
      </td>
    );
  }
  return (
    <td className="p-3 cursor-text hover:bg-[#FAF9F6]" onClick={() => { setVal(m[field] || ""); setEditingCell({ code: m.code, field }); }}>
      {m[field] || <span className="text-slate-300">—</span>}
    </td>
  );
}

/* ---------------- STAFF ---------------- */

function StaffAdmin() {
  const [staff, setStaff] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [editing, setEditing] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api("/api/admin/staff"), api("/api/admin/campaigns")]).then(([s, c]) => { setStaff(s.staff); setCampaigns(c.campaigns); setLoading(false); });
  }, []);

  const add = async () => {
    const { staff: ns } = await api("/api/admin/staff", { method: "POST", body: JSON.stringify({ username: `nv${Date.now().toString().slice(-5)}`, password: "123456", name: "Nhân viên mới", campaignIds: [] }) });
    setStaff((s) => [...s, ns]);
    setEditing(ns.id);
  };
  const update = async (id, patch) => {
    setStaff((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    await api(`/api/admin/staff/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
  };
  const remove = async (id) => { await api(`/api/admin/staff/${id}`, { method: "DELETE" }); setStaff((list) => list.filter((s) => s.id !== id)); };

  if (loading) return null;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-medium">Tài khoản nhân viên</h2>
        <button onClick={add} style={{ background: ACCENT }} className="text-white text-sm px-3.5 py-2 rounded-lg flex items-center gap-1.5"><Plus size={14} /> Thêm nhân viên</button>
      </div>
      <div className="space-y-3">
        {staff.map((s) => (
          <div key={s.id} className="bg-white border border-[#E7E3DA] rounded-xl p-4">
            {editing === s.id ? (
              <div className="space-y-3">
                <div className="grid sm:grid-cols-3 gap-2">
                  <input value={s.name} onChange={(e) => update(s.id, { name: e.target.value })} placeholder="Tên hiển thị" className="border border-[#E7E3DA] rounded-lg px-2.5 py-1.5 text-sm" />
                  <input value={s.username} onChange={(e) => update(s.id, { username: e.target.value })} placeholder="Tài khoản" className="border border-[#E7E3DA] rounded-lg px-2.5 py-1.5 text-sm" />
                  <input value={drafts[s.id] ?? ""} onChange={(e) => setDrafts((d) => ({ ...d, [s.id]: e.target.value }))} onBlur={() => drafts[s.id] && update(s.id, { password: drafts[s.id] })} placeholder="Đặt mật khẩu mới" className="border border-[#E7E3DA] rounded-lg px-2.5 py-1.5 text-sm" />
                </div>
                <div>
                  <FieldLabel>Campaign được xem</FieldLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {campaigns.map((c) => {
                      const on = s.campaignIds.includes(c.id);
                      return (
                        <button key={c.id} onClick={() => update(s.id, { campaignIds: on ? s.campaignIds.filter((x) => x !== c.id) : [...s.campaignIds, c.id] })}
                          className={`text-xs px-2.5 py-1 rounded-full border ${on ? "bg-[#5B4CFF] text-white border-[#5B4CFF]" : "border-[#E7E3DA] text-slate-500"}`}>
                          {c.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={s.canViewAggregate} onChange={(e) => update(s.id, { canViewAggregate: e.target.checked })} /> Xem bảng tổng hợp</label>
                  <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={!!s.canManageCampaigns} onChange={(e) => update(s.id, { canManageCampaigns: e.target.checked })} /> Được thêm/sửa/xoá campaign (trong các campaign được xem ở trên)</label>
                  <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={!!s.canManageBrands} onChange={(e) => update(s.id, { canManageBrands: e.target.checked })} /> Được thêm/sửa/xoá brand</label>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditing(null)} className="text-sm px-3 py-1.5 rounded-lg bg-[#1C1B1F] text-white flex items-center gap-1"><Save size={13} />Xong</button>
                  <button onClick={() => remove(s.id)} className="text-sm px-3 py-1.5 rounded-lg border border-red-200 text-red-500 flex items-center gap-1"><Trash2 size={13} />Xoá</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{s.name || s.username}</div>
                  <div className="text-xs text-slate-400">@{s.username} · {s.campaignIds.length} campaign được xem</div>
                </div>
                <button onClick={() => setEditing(s.id)} className="text-slate-400 hover:text-[#5B4CFF]"><Pencil size={14} /></button>
              </div>
            )}
          </div>
        ))}
      </div>
      {staff.length === 0 && <EmptyState text="Chưa có nhân viên nào." />}
    </div>
  );
}

/* ---------------- SETTINGS (logo + tên công ty + mật khẩu) ---------------- */

function SettingsAdmin() {
  const [settings, setSettings] = useState(null);
  const [companyName, setCompanyName] = useState("");
  const [logoDataUrl, setLogoDataUrl] = useState(null);
  const [pass, setPass] = useState("");
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    api("/api/admin/settings").then((d) => { setSettings(d.settings); setCompanyName(d.settings.companyName || ""); setLogoDataUrl(d.settings.logoDataUrl || null); });
  }, []);

  const onLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) { setErr("Ảnh logo quá lớn, vui lòng chọn ảnh dưới 1.5MB."); return; }
    setErr("");
    const reader = new FileReader();
    reader.onload = () => setLogoDataUrl(reader.result);
    reader.readAsDataURL(file);
  };

  const save = async () => {
    setErr("");
    try {
      const body = { companyName, logoDataUrl };
      if (pass.trim()) body.newPassword = pass.trim();
      await api("/api/admin/settings", { method: "PATCH", body: JSON.stringify(body) });
      setPass("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { setErr(e.message); }
  };

  if (!settings) return null;

  return (
    <div className="max-w-sm space-y-5">
      <div>
        <FieldLabel>Logo công ty</FieldLabel>
        <div className="flex items-center gap-3">
          {logoDataUrl ? (
            <img src={logoDataUrl} alt="logo" className="w-14 h-14 rounded-lg object-cover border border-[#E7E3DA]" />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-[#F1EFE8] flex items-center justify-center text-slate-300"><ImagePlus size={20} /></div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm px-3 py-1.5 rounded-lg border border-[#E7E3DA] cursor-pointer hover:border-[#5B4CFF] w-fit">
              Tải logo mới
              <input type="file" accept="image/*" onChange={onLogoChange} className="hidden" />
            </label>
            {logoDataUrl && <button onClick={() => setLogoDataUrl(null)} className="text-xs text-red-500 text-left">Xoá logo</button>}
          </div>
        </div>
      </div>
      <div>
        <FieldLabel>Tên hệ thống / công ty</FieldLabel>
        <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="w-full border border-[#E7E3DA] rounded-lg px-3 py-2 text-sm bg-white" />
      </div>
      <div>
        <FieldLabel>Đổi mật khẩu admin (để trống nếu không đổi)</FieldLabel>
        <input value={pass} onChange={(e) => setPass(e.target.value)} type="password" placeholder="Mật khẩu mới" className="w-full border border-[#E7E3DA] rounded-lg px-3 py-2 text-sm bg-white" />
      </div>
      {err && <div className="text-sm text-red-500">{err}</div>}
      <button onClick={save} style={{ background: ACCENT }} className="text-white px-4 py-2 rounded-lg text-sm">Lưu thay đổi</button>
      {saved && <span className="text-sm text-[#0F766E] ml-3">Đã lưu!</span>}
    </div>
  );
}
