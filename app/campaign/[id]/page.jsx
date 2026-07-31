"use client";
import React, { useEffect, useState } from "react";
import { ArrowLeft, ChevronRight, ExternalLink, XCircle } from "lucide-react";
import Header from "../../components/Header";
import { DetailRow } from "../../components/ui";

export default function CampaignDetailPage({ params }) {
  const [data, setData] = useState(null);

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
        <div className="max-w-2xl mx-auto px-4 pt-20 text-center">
          <div className="text-slate-400 mb-4">Không tìm thấy campaign này.</div>
          <a href="/" className="text-[#5B4CFF] text-sm">← Về trang chủ</a>
        </div>
      </div>
    );
  }

  const brand = data.brands.find((b) => b.id === campaign.brandId);
  const closed = campaign.status === "done";
  const sampleLinks = typeof campaign.sampleLinks === "string" ? JSON.parse(campaign.sampleLinks) : campaign.sampleLinks;

  return (
    <div>
      <Header companyName={settings.companyName} logoDataUrl={settings.logoDataUrl} />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-8 pb-16">
        <a href="/" className="text-sm text-slate-400 hover:text-slate-600 flex items-center gap-1 mb-6"><ArrowLeft size={14} /> Tất cả campaign</a>

        <div className="flex items-center gap-2 mb-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: brand?.color || "#999" }} />
          <span className="text-sm text-slate-500">{brand?.name}</span>
        </div>
        <h1 style={{ fontFamily: "Georgia, serif" }} className="text-2xl sm:text-3xl font-medium mb-6">{campaign.name}</h1>

        {closed && (
          <div className="mb-6 text-sm bg-[#FEF3C7] text-[#B45309] px-4 py-2.5 rounded-lg flex items-center gap-2">
            <XCircle size={15} /> Campaign này đã đủ số lượng, không nhận đăng ký thêm.
          </div>
        )}

        <div className="space-y-5">
          <DetailRow label="Sản phẩm">{campaign.product}</DetailRow>
          <DetailRow label="Chi phí cast">{campaign.cost ? campaign.cost : "Không trả cast (trao đổi sản phẩm)"}</DetailRow>
          <DetailRow label="Yêu cầu về UGC">{campaign.requirements}</DetailRow>
          <DetailRow label="Brief">{campaign.brief}</DetailRow>
          {sampleLinks?.length > 0 && (
            <DetailRow label="Link tham khảo">
              <div className="flex flex-wrap gap-2">
                {sampleLinks.map((l, i) => (
                  <a key={i} href={l.url} target="_blank" rel="noreferrer" className="text-sm px-3 py-1 rounded-full bg-[#F1EFE8] hover:bg-[#EEEBFF] hover:text-[#5B4CFF] transition flex items-center gap-1">
                    {l.label || l.url} <ExternalLink size={11} />
                  </a>
                ))}
              </div>
            </DetailRow>
          )}
        </div>

        {!closed && (
          <a href={`/form/${campaign.id}`} style={{ background: "#5B4CFF" }} className="mt-8 inline-flex text-white px-6 py-3 rounded-full font-medium hover:brightness-110 transition items-center gap-2">
            Đăng ký campaign này <ChevronRight size={16} />
          </a>
        )}
      </div>
    </div>
  );
}
