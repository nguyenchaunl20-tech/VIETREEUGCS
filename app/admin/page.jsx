"use client";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  Plus, Pencil, Save, Trash2, ChevronRight, ArrowLeft, Search, Download, Upload,
  Lock, LogOut, Eye, EyeOff, ShieldCheck, Layers, Building2, ClipboardList,
  FileSpreadsheet, UserCog, Settings as SettingsIcon, DollarSign, X, ImagePlus,
  Mail, Send, CheckCircle2, XCircle, Loader2,
} from "lucide-react";
import { FieldLabel, StatusPill, EmptyState, SampleLinksEditor, STATUS } from "../components/ui";

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
  { key: "aggregate", label: "Bảng tổng hợp", icon: FileSpreadsheet },
  { key: "staff", label: "Nhân sự & phân quyền", icon: UserCog },
  { key: "settings", label: "Cài đặt", icon: SettingsIcon },
];

function AdminDashboard({ session, onLogout }) {
  const isOwner = session.type === "owner";
  const visibleTabs = ALL_TABS.filter((t) => {
    if (isOwner) return true;
    if (t.key === "staff" || t.key === "settings") return false;
    if (t.key === "brands") return !!session.canManageBrands;
    if (t.key === "aggregate") return !!session.canViewAggregate;
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
      {tab === "aggregate" && <AggregateAdmin />}
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
                  <MiniField label="Chi phí cast (để trống nếu không trả cast)" value={draft.cost} onChange={(v) => updateDraft(c.id, { cost: v })} disabled={!canEdit} />
                  <MiniField label="Yêu cầu về UGC" value={draft.requirements} onChange={(v) => updateDraft(c.id, { requirements: v })} textarea disabled={!canEdit} />
                  <MiniField label="Brief" value={draft.brief} onChange={(v) => updateDraft(c.id, { brief: v })} textarea disabled={!canEdit} />
                  <CampaignImageUpload value={draft.imageUrl} onChange={(v) => updateDraft(c.id, { imageUrl: v })} disabled={!canEdit} />
                  <MiniField label="Link nhóm Zalo (chỉ hiện cho UGC đã được chọn khi họ tra cứu đơn)" value={draft.zaloGroupLink} onChange={(v) => updateDraft(c.id, { zaloGroupLink: v })} disabled={!canEdit} />
                  <MiniField label="Link theo dõi đơn hàng (chỉ hiện cho UGC đã được chọn khi họ tra cứu đơn)" value={draft.trackingLink} onChange={(v) => updateDraft(c.id, { trackingLink: v })} disabled={!canEdit} />

                  {canEdit && (
                    <div>
                      <FieldLabel>Link tham khảo (hiển thị cho UGC xem)</FieldLabel>
                      <SampleLinksEditor links={draft.sampleLinks || []} onChange={(v) => updateDraft(c.id, { sampleLinks: v })} />
                    </div>
                  )}

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
    setSelected((prev) => (prev.size === rows.length ? new Set() : new Set(rows.map((r) => r.code))));
  };

  const campaign = campaigns.find((c) => c.id === campaignId);

  const updateReg = async (code, patch) => {
    setRows((list) => list.map((r) => (r.code === code ? { ...r, ...patch } : r)));
    await api(`/api/admin/registrations/${code}`, { method: "PATCH", body: JSON.stringify(patch) });
  };

  const exportExcel = () => {
    const data = rows.map((r) => ({
      "Mã ID": r.code, "Trạng thái": STATUS[r.status]?.label, "ID TikTok": r.tiktokId, "Link TikTok": r.tiktokLink,
      "SĐT Zalo": r.zaloPhone, "Địa chỉ": r.address, "Email": r.email, "Ảnh GMV": r.gmvNote, "Số liệu GMV": r.gmvNumber,
      "Follower": r.followers, "Cho reup": r.allowReup, "Aff 5%": r.aff5, "Video ≥30 ngày": r.video30days, "Nội dung kênh": r.contentDesc,
      "Đã thanh toán": r.paid === true ? "Đã chi" : r.paid === false ? "Chưa chi" : "",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Đơn đăng ký");
    XLSX.writeFile(wb, `${campaign?.name || "campaign"}.xlsx`);
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
        <button onClick={exportExcel} className="text-sm px-3 py-2 rounded-lg border border-[#E7E3DA] flex items-center gap-1.5 hover:border-[#5B4CFF]"><Download size={14} /> Xuất Excel</button>
        <label className="text-sm px-3 py-2 rounded-lg border border-[#E7E3DA] flex items-center gap-1.5 hover:border-[#5B4CFF] cursor-pointer">
          <Upload size={14} /> Nhập Excel
          <input type="file" accept=".xlsx,.xls" onChange={importExcel} className="hidden" />
        </label>
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

      {campaigns.length === 0 && <EmptyState text="Bạn chưa được cấp quyền xem campaign nào." />}
      {campaigns.length > 0 && rows.length === 0 && <EmptyState text="Chưa có đơn đăng ký nào cho campaign này." />}

      {rows.length > 0 && (
        <div className="overflow-x-auto border border-[#E7E3DA] rounded-xl bg-white">
          <table className="w-full text-sm min-w-[1100px]">
            <thead>
              <tr className="border-b border-[#E7E3DA] text-left text-slate-400 text-xs uppercase tracking-wide">
                <th className="p-3 w-8"><input type="checkbox" checked={rows.length > 0 && selected.size === rows.length} onChange={toggleSelectAll} /></th>
                <th className="p-3">Mã ID</th><th className="p-3">TikTok</th><th className="p-3">SĐT Zalo</th>
                <th className="p-3">Follower</th><th className="p-3">GMV 30d</th><th className="p-3">Reup</th>
                <th className="p-3">Aff 5%</th><th className="p-3">Trạng thái</th>
                {campaign?.status === "done" && campaign?.cost && <th className="p-3">Thanh toán</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.code} className="border-b border-[#F1EFE8] last:border-0 align-top">
                  <td className="p-3"><input type="checkbox" checked={selected.has(r.code)} onChange={() => toggleSelect(r.code)} /></td>
                  <td className="p-3 font-mono">{r.code}</td>
                  <EditableCell reg={r} field="tiktokId" editingCell={editingCell} setEditingCell={setEditingCell} updateReg={updateReg} />
                  <EditableCell reg={r} field="zaloPhone" editingCell={editingCell} setEditingCell={setEditingCell} updateReg={updateReg} />
                  <EditableCell reg={r} field="followers" editingCell={editingCell} setEditingCell={setEditingCell} updateReg={updateReg} />
                  <EditableCell reg={r} field="gmvNumber" editingCell={editingCell} setEditingCell={setEditingCell} updateReg={updateReg} />
                  <td className="p-3 text-slate-500">{r.allowReup}</td>
                  <td className="p-3 text-slate-500">{r.aff5}</td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
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
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    Promise.all([api("/api/admin/registrations?all=1"), api("/api/admin/campaigns")])
      .then(([r, c]) => { setRows(r.registrations); setCampaigns(c.campaigns); setLoading(false); })
      .catch((e) => { setErr(e.message); setLoading(false); });
  }, []);

  const merged = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => {
      const key = (r.tiktokId || r.zaloPhone || r.code).toLowerCase();
      if (!map.has(key)) map.set(key, { ...r, campaignsList: [{ id: r.campaignId, status: r.status }] });
      else map.get(key).campaignsList.push({ id: r.campaignId, status: r.status });
    });
    return Array.from(map.values());
  }, [rows]);

  const filtered = merged.filter((m) => !q || m.tiktokId?.toLowerCase().includes(q.toLowerCase()) || m.zaloPhone?.includes(q));

  const exportExcel = () => {
    const data = filtered.map((m) => ({
      "ID TikTok": m.tiktokId, "SĐT Zalo": m.zaloPhone, "Email": m.email, "Follower": m.followers,
      "Campaign đã đăng ký": m.campaignsList.map((c) => campaigns.find((cc) => cc.id === c.id)?.name).filter(Boolean).join(", "),
      "Số campaign": m.campaignsList.length,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tổng hợp");
    XLSX.writeFile(wb, "tong_hop_ugc.xlsx");
  };

  if (loading) return null;
  if (err) return <EmptyState text={err} />;

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm theo TikTok / SĐT" className="w-full pl-8 pr-3 py-2 border border-[#E7E3DA] rounded-lg text-sm bg-white" />
        </div>
        <div className="flex-1" />
        <button onClick={exportExcel} className="text-sm px-3 py-2 rounded-lg border border-[#E7E3DA] flex items-center gap-1.5 hover:border-[#5B4CFF]"><Download size={14} /> Xuất Excel</button>
      </div>

      {filtered.length === 0 && <EmptyState text="Chưa có dữ liệu." />}

      {filtered.length > 0 && (
        <div className="overflow-x-auto border border-[#E7E3DA] rounded-xl bg-white">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b border-[#E7E3DA] text-left text-slate-400 text-xs uppercase tracking-wide">
                <th className="p-3">TikTok</th><th className="p-3">SĐT Zalo</th><th className="p-3">Follower</th><th className="p-3">Đã đăng ký các campaign</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m, i) => (
                <tr key={i} className="border-b border-[#F1EFE8] last:border-0">
                  <td className="p-3">{m.tiktokId}</td>
                  <td className="p-3">{m.zaloPhone}</td>
                  <td className="p-3">{m.followers}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1.5">
                      {m.campaignsList.map((c, idx) => {
                        const camp = campaigns.find((cc) => cc.id === c.id);
                        const s = STATUS[c.status] || STATUS.pending;
                        return <span key={idx} className="text-[11px] px-2 py-1 rounded-full" style={{ background: s.bg, color: s.color }}>{camp?.name || "—"}</span>;
                      })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
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
