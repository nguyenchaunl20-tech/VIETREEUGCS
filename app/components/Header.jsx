"use client";
import React from "react";
import { ShieldCheck, Lock } from "lucide-react";

export default function Header({ companyName, logoDataUrl, isAdminSession }) {
  return (
    <div className="border-b border-[#E7E3DA] bg-[#FAF9F6]/95 backdrop-blur sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2">
          {logoDataUrl ? (
            <img src={logoDataUrl} alt="logo" className="w-9 h-9 rounded-lg object-cover" />
          ) : (
            <div style={{ background: "#5B4CFF" }} className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              {(companyName || "UG").slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="text-left">
            <div className="font-semibold text-[15px] leading-tight" style={{ fontFamily: "var(--font-serif), Georgia, serif" }}>{companyName || "Công ty của bạn"}</div>
            <div className="text-[11px] text-slate-400 leading-tight -mt-0.5">Tuyển UGC theo campaign</div>
          </div>
        </a>
        <div className="flex items-center gap-2">
          <a href="/lookup" className="text-sm px-3 py-1.5 rounded-full hover:bg-[#EFEBE2] text-slate-600 transition">Tra cứu đơn</a>
          <a href="/admin" className="text-sm px-3 py-1.5 rounded-full flex items-center gap-1.5 hover:bg-[#EFEBE2] transition text-slate-500">
            {isAdminSession ? <ShieldCheck size={14} /> : <Lock size={13} />} Quản trị
          </a>
        </div>
      </div>
    </div>
  );
}
