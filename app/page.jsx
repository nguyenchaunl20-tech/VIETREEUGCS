"use client";
import React, { useEffect, useState } from "react";
import { ChevronRight, ExternalLink, XCircle, DollarSign } from "lucide-react";
import Header from "./components/Header";
import { EmptyState } from "./components/ui";

export default function HomePage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch("/api/public/data").then((r) => r.json()).then(setData);
  }, []);

  if (!data) return <div className="min-h-[400px] flex items-center justify-center text-slate-400 text-sm">Đang tải…</div>;

  const { brands, campaigns, refLinks, settings } = data;
  const active = campaigns.filter((c) => c.status !== "done");
  const done = campaigns.filter((c) => c.status === "done");
  const brandOrder = [...brands].sort((a, b) => (b.isOwn ? 1 : 0) - (a.isOwn ? 1 : 0));

  return (
    <div>
      <Header companyName={settings.companyName} logoDataUrl={settings.logoDataUrl} />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 pt-10">
        <div className="mb-10">
          <div className="text-[11px] tracking-widest uppercase text-slate-400 mb-2">Đang mở đăng ký</div>
          <h1 style={{ fontFamily: "var(--font-serif), Georgia, serif" }} className="text-3xl sm:text-4xl font-medium leading-tight">
            Chọn campaign phù hợp,<br />gửi thông tin của bạn.
          </h1>
        </div>

        {brandOrder.length === 0 && <EmptyState text="Chưa có brand hoặc campaign nào được đăng." />}

        <div className="space-y-10">
          {brandOrder.map((brand) => {
            const brandActive = active.filter((c) => c.brandId === brand.id);
            if (brandActive.length === 0) return null;
            return (
              <div key={brand.id}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: brand.color }} />
                  <h2 className="font-semibold text-lg">{brand.name}</h2>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {brandActive.map((c) => <CampaignCard key={c.id} campaign={c} brand={brand} />)}
                </div>
              </div>
            );
          })}
        </div>

        {done.length > 0 && (
          <div className="mt-14">
            <div className="text-[11px] tracking-widest uppercase text-slate-400 mb-3">Đã đóng đăng ký</div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 opacity-60">
              {done.map((c) => <CampaignCard key={c.id} campaign={c} brand={brands.find((b) => b.id === c.brandId)} disabled />)}
            </div>
          </div>
        )}

        {refLinks.length > 0 && (
          <div className="mt-14 border-t border-[#E7E3DA] pt-8">
            <div className="text-[11px] tracking-widest uppercase text-slate-400 mb-3">Trang mẫu tham khảo</div>
            <div className="flex flex-wrap gap-2">
              {refLinks.map((l) => (
                <a key={l.id} href={l.url} target="_blank" rel="noreferrer" className="text-sm px-3 py-1.5 rounded-full border border-[#E7E3DA] hover:border-[#5B4CFF] hover:text-[#5B4CFF] transition flex items-center gap-1.5 bg-white">
                  {l.label} <ExternalLink size={12} />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CampaignCard({ campaign, brand, disabled }) {
  return (
    <a
      href={disabled ? undefined : `/campaign/${campaign.id}`}
      className={`text-left bg-white border border-[#E7E3DA] rounded-xl overflow-hidden block transition ${disabled ? "cursor-default" : "hover:shadow-md hover:-translate-y-0.5"}`}
    >
      {campaign.imageUrl && (
        <img src={campaign.imageUrl} alt={campaign.name} className="w-full h-36 object-cover" />
      )}
      <div className="p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: (brand?.color || "#ccc") + "22", color: brand?.color || "#666" }}>
          {brand?.name || "—"}
        </span>
        {disabled && <span className="text-[11px] text-slate-400 flex items-center gap-1"><XCircle size={12} />Đã đủ</span>}
      </div>
      <div className="font-medium mb-1">{campaign.name}</div>
      <div className="text-sm text-slate-500 line-clamp-2">{campaign.product}</div>
      {campaign.cost ? (
        <div className="mt-2 text-sm font-medium text-[#10917A] flex items-center gap-1"><DollarSign size={13} /> {campaign.cost}</div>
      ) : (
        <div className="mt-2 text-sm text-slate-400">Không trả cast</div>
      )}
      {!disabled && <div className="mt-3 text-sm text-[#5B4CFF] flex items-center gap-1">Xem chi tiết <ChevronRight size={14} /></div>}
      </div>
    </a>
  );
}
