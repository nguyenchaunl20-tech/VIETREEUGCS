"use client";
import React, { useEffect, useState } from "react";
import { Search, DollarSign, CheckCircle2, Clock } from "lucide-react";
import Header from "../components/Header";
import { StatusPill } from "../components/ui";

export default function LookupPage() {
  const [settings, setSettings] = useState({ companyName: "", logoDataUrl: null });
  const [code, setCode] = useState("");
  const [result, setResult] = useState(undefined);

  useEffect(() => {
    fetch("/api/public/data").then((r) => r.json()).then((d) => setSettings(d.settings));
  }, []);

  const search = async () => {
    const res = await fetch(`/api/public/lookup?code=${encodeURIComponent(code.trim())}`);
    const json = await res.json();
    setResult(json.found ? json : null);
  };

  return (
    <div>
      <Header companyName={settings.companyName} logoDataUrl={settings.logoDataUrl} />
      <div className="max-w-lg mx-auto px-4 sm:px-6 pt-10 pb-16">
        <h1 style={{ fontFamily: "Georgia, serif" }} className="text-2xl font-medium mb-2">Tra cứu đơn đăng ký</h1>
        <p className="text-sm text-slate-500 mb-6">Nhập mã ID bạn nhận được sau khi đăng ký.</p>
        <div className="flex gap-2 mb-6">
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="VD: 091234 0726"
            onKeyDown={(e) => e.key === "Enter" && search()}
            className="flex-1 border border-[#E7E3DA] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#5B4CFF] bg-white font-mono tracking-wide" />
          <button onClick={search} style={{ background: "#5B4CFF" }} className="text-white px-5 rounded-lg flex items-center gap-1.5"><Search size={15} /> Tra cứu</button>
        </div>

        {result === null && <div className="text-sm bg-[#FEF2F2] text-red-500 px-4 py-3 rounded-lg">Không tìm thấy đơn với mã này. Kiểm tra lại mã ID nhé.</div>}

        {result && (
          <div className="bg-white border border-[#E7E3DA] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-mono font-semibold tracking-wide">{result.code}</span>
              <StatusPill status={result.status} />
            </div>
            <div className="text-sm text-slate-500">Campaign: <span className="text-[#1C1B1F] font-medium">{result.campaignName}</span></div>
            <div className="text-sm text-slate-500">TikTok: <span className="text-[#1C1B1F]">{result.tiktokId}</span></div>
            {result.paid !== undefined && (
              <div className="pt-3 border-t border-[#EFEBE2] flex items-center gap-2 text-sm">
                <DollarSign size={14} className="text-slate-400" /> Thanh toán:
                {result.paid === true && <span className="text-[#0F766E] font-medium flex items-center gap-1"><CheckCircle2 size={14} /> Đã chi</span>}
                {result.paid === false && <span className="text-slate-400 font-medium flex items-center gap-1"><Clock size={14} /> Chưa chi</span>}
                {result.paid == null && <span className="text-slate-400">Chưa cập nhật</span>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
