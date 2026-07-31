"use client";
import React, { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Copy } from "lucide-react";
import Header from "../../components/Header";
import { Field, ChoiceField, FieldLabel } from "../../components/ui";

export default function RegistrationFormPage({ params }) {
  const [data, setData] = useState(null);
  const [form, setForm] = useState({
    tiktokId: "", tiktokLink: "", zaloPhone: "", address: "", email: "",
    gmvNote: "", gmvNumber: "", pastBrands: [], followers: "",
    allowReup: "", aff5: "", video30days: "", contentDesc: "",
  });
  const [submittedCode, setSubmittedCode] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/public/data").then((r) => r.json()).then(setData);
  }, []);

  if (!data) return <div className="min-h-[400px] flex items-center justify-center text-slate-400 text-sm">Đang tải…</div>;

  const campaign = data.campaigns.find((c) => c.id === params.id);
  const { settings } = data;

  if (!campaign) {
    return (
      <div>
        <Header companyName={settings.companyName} logoDataUrl={settings.logoDataUrl} />
        <div className="max-w-lg mx-auto px-4 pt-16 text-center text-slate-400">Không tìm thấy campaign này.</div>
      </div>
    );
  }

  if (campaign.status === "done") {
    return (
      <div>
        <Header companyName={settings.companyName} logoDataUrl={settings.logoDataUrl} />
        <div className="max-w-lg mx-auto px-4 pt-16">
          <div className="text-sm bg-[#FEF3C7] text-[#B45309] px-4 py-3 rounded-lg">Campaign này đã đóng đăng ký.</div>
          <a href="/" className="mt-4 inline-block text-[#5B4CFF] text-sm">← Về trang chủ</a>
        </div>
      </div>
    );
  }

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleBrandHistory = (name) => setForm((f) => ({
    ...f, pastBrands: f.pastBrands.includes(name) ? f.pastBrands.filter((x) => x !== name) : [...f.pastBrands, name],
  }));

  const submit = async () => {
    if (!form.tiktokId.trim() || !form.tiktokLink.trim() || !form.zaloPhone.trim() || !form.email.trim()) {
      setError("Vui lòng điền đủ ID TikTok, Link TikTok, SĐT Zalo và Email.");
      return;
    }
    setError("");
    setSubmitting(true);
    const res = await fetch("/api/public/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId: campaign.id, ...form }),
    });
    const json = await res.json();
    setSubmitting(false);
    if (!json.ok) { setError(json.error || "Có lỗi xảy ra."); return; }
    setSubmittedCode(json.code);
  };

  const brandNames = data.brands.map((b) => b.name);

  if (submittedCode) {
    return (
      <div>
        <Header companyName={settings.companyName} logoDataUrl={settings.logoDataUrl} />
        <div className="max-w-lg mx-auto px-4 sm:px-6 pt-16 pb-16">
          <div className="w-14 h-14 rounded-full bg-[#CCFBF1] flex items-center justify-center mb-5">
            <CheckCircle2 size={26} color="#0F766E" />
          </div>
          <h2 className="text-xl font-medium mb-2">Đã ghi nhận đăng ký!</h2>
          <p className="text-slate-500 text-sm mb-5">Lưu lại mã dưới đây để tra cứu tình trạng đơn của bạn bất cứ lúc nào.</p>
          <div className="bg-white border border-[#E7E3DA] rounded-xl p-5 flex items-center justify-between mb-6">
            <span className="text-2xl font-mono tracking-wider font-semibold">{submittedCode}</span>
            <button onClick={() => navigator.clipboard?.writeText(submittedCode)} className="text-sm text-[#5B4CFF] flex items-center gap-1"><Copy size={14} /> Sao chép</button>
          </div>
          <div className="flex gap-3">
            <a href="/lookup" className="px-4 py-2.5 rounded-full bg-[#1C1B1F] text-white text-sm">Tra cứu ngay</a>
            <a href="/" className="px-4 py-2.5 rounded-full border border-[#E7E3DA] text-sm">Về trang chủ</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header companyName={settings.companyName} logoDataUrl={settings.logoDataUrl} />
      <div className="max-w-xl mx-auto px-4 sm:px-6 pt-8 pb-16">
        <a href={`/campaign/${campaign.id}`} className="text-sm text-slate-400 hover:text-slate-600 flex items-center gap-1 mb-6"><ArrowLeft size={14} /> {campaign.name}</a>
        <h1 style={{ fontFamily: "Georgia, serif" }} className="text-2xl font-medium mb-1">Đăng ký UGC</h1>
        <p className="text-sm text-slate-500 mb-7">Cho campaign <b>{campaign.name}</b></p>

        <div className="space-y-5">
          <Field label="ID TikTok" required value={form.tiktokId} onChange={(v) => set("tiktokId", v)} placeholder="@username" />
          <Field label="Link TikTok (lấy trực tiếp từ TikTok)" required value={form.tiktokLink} onChange={(v) => set("tiktokLink", v)} placeholder="https://www.tiktok.com/@..." />
          <Field label="SĐT Zalo chính chủ" required value={form.zaloPhone} onChange={(v) => set("zaloPhone", v)} placeholder="09xxxxxxxx" />
          <Field label="Địa chỉ nhận hàng" value={form.address} onChange={(v) => set("address", v)} placeholder="Số nhà, đường, phường/xã, tỉnh/thành" textarea />
          <Field label="Email nhận thông tin" required value={form.email} onChange={(v) => set("email", v)} placeholder="you@email.com" />
          <Field label="Ảnh GMV 30 ngày gần nhất (dán link ảnh)" value={form.gmvNote} onChange={(v) => set("gmvNote", v)} placeholder="Link ảnh chụp màn hình GMV" />
          <Field label="Số liệu GMV 30 ngày gần nhất" value={form.gmvNumber} onChange={(v) => set("gmvNumber", v)} placeholder="VD: 50,000,000đ" />

          <div>
            <FieldLabel>Brand đã từng hợp tác</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {brandNames.length === 0 && <span className="text-sm text-slate-400">Chưa có brand nào trong hệ thống.</span>}
              {brandNames.map((n) => (
                <button type="button" key={n} onClick={() => toggleBrandHistory(n)}
                  className={`text-sm px-3 py-1.5 rounded-full border transition ${form.pastBrands.includes(n) ? "bg-[#5B4CFF] text-white border-[#5B4CFF]" : "border-[#E7E3DA] hover:border-[#5B4CFF]"}`}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          <Field label="Follower hiện tại" value={form.followers} onChange={(v) => set("followers", v)} placeholder="VD: 25,000" />
          <ChoiceField label="Cho reup video hay không" value={form.allowReup} onChange={(v) => set("allowReup", v)} options={["Đồng ý cho reup", "Không cho reup"]} />
          <ChoiceField label="Aff 5% gắn giỏ hàng 100%" value={form.aff5} onChange={(v) => set("aff5", v)} options={["Đồng ý", "Không đồng ý"]} />
          <ChoiceField label="Video để hiển thị ít nhất 30 ngày kể từ deadline air" value={form.video30days} onChange={(v) => set("video30days", v)} options={["Đồng ý", "Không đồng ý"]} />
          <Field label="Nội dung kênh hay làm" value={form.contentDesc} onChange={(v) => set("contentDesc", v)} placeholder="Mô tả ngắn gọn" textarea />
        </div>

        {error && <div className="mt-5 text-sm text-red-500">{error}</div>}

        <button onClick={submit} disabled={submitting} style={{ background: "#5B4CFF" }} className="mt-7 text-white px-6 py-3 rounded-full font-medium hover:brightness-110 transition disabled:opacity-60">
          {submitting ? "Đang gửi…" : "Gửi đăng ký"}
        </button>
      </div>
    </div>
  );
}
