"use client";
import React from "react";

export const ACCENT = "#5B4CFF";
export const PAPER = "#FAF9F6";

export const STATUS = {
  pending: { label: "Chờ duyệt", color: "#94A3B8", bg: "#F1F5F9" },
  suitable: { label: "Phù hợp (bước 1)", color: "#B45309", bg: "#FEF3C7" },
  selected: { label: "Đã chọn", color: "#0F766E", bg: "#CCFBF1" },
};

export function FieldLabel({ children }) {
  return <div className="text-sm font-medium mb-1.5">{children}</div>;
}

export function Field({ label, required, value, onChange, placeholder, textarea }) {
  return (
    <div>
      <FieldLabel>{label} {required && <span className="text-red-400">*</span>}</FieldLabel>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3}
          className="w-full border border-[#E7E3DA] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#5B4CFF] bg-white" />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className="w-full border border-[#E7E3DA] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#5B4CFF] bg-white" />
      )}
    </div>
  );
}

export function ChoiceField({ label, value, onChange, options }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex gap-2 flex-wrap">
        {options.map((opt) => (
          <button type="button" key={opt} onClick={() => onChange(opt)}
            className={`text-sm px-3 py-1.5 rounded-full border transition ${value === opt ? "bg-[#5B4CFF] text-white border-[#5B4CFF]" : "border-[#E7E3DA] hover:border-[#5B4CFF]"}`}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

export function StatusPill({ status }) {
  const s = STATUS[status] || STATUS.pending;
  return (
    <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

export function EmptyState({ text }) {
  return (
    <div className="border border-dashed border-[#E7E3DA] rounded-xl py-14 text-center text-slate-400 text-sm">
      {text}
    </div>
  );
}

export function DetailRow({ label, children }) {
  return (
    <div>
      <div className="text-[11px] tracking-widest uppercase text-slate-400 mb-1">{label}</div>
      <div className="text-[15px] text-[#1C1B1F] whitespace-pre-wrap leading-relaxed">{children}</div>
    </div>
  );
}

// Turns any raw URL inside a block of text (e.g. a pasted Google Drive
// link in the Brief field) into a clickable link that opens in a new tab,
// so people can view it directly without needing to download a file.
const URL_SPLIT_REGEX = /(https?:\/\/[^\s]+)/g;
const URL_TEST_REGEX = /^https?:\/\/[^\s]+$/;

export function Linkify({ text }) {
  if (!text) return null;
  const parts = String(text).split(URL_SPLIT_REGEX);
  return (
    <>
      {parts.map((part, i) =>
        URL_TEST_REGEX.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noreferrer"
            className="text-[#5B4CFF] underline underline-offset-2 hover:brightness-110 break-all"
          >
            {part}
          </a>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  );
}

export function SampleLinksEditor({ links, onChange }) {
  const add = () => onChange([...links, { id: Math.random().toString(36).slice(2, 8), label: "", url: "" }]);
  const update = (id, patch) => onChange(links.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const remove = (id) => onChange(links.filter((l) => l.id !== id));
  return (
    <div className="space-y-2">
      {links.map((l) => (
        <div key={l.id} className="flex gap-2">
          <input value={l.label} onChange={(e) => update(l.id, { label: e.target.value })} placeholder="Tên hiển thị"
            className="w-32 border border-[#E7E3DA] rounded-lg px-2 py-1.5 text-sm" />
          <input value={l.url} onChange={(e) => update(l.id, { url: e.target.value })} placeholder="https://..."
            className="flex-1 border border-[#E7E3DA] rounded-lg px-2 py-1.5 text-sm" />
          <button type="button" onClick={() => remove(l.id)} className="text-slate-400 hover:text-red-500">✕</button>
        </div>
      ))}
      <button type="button" onClick={add} className="text-sm text-[#5B4CFF]">+ Thêm link</button>
    </div>
  );
}

// Cho phép admin khai báo nhiều lựa chọn sản phẩm trong 1 campaign
// (VD: 1 cushion nhưng có 2 màu) để UGC chọn khi đăng ký.
export function ProductOptionsEditor({ options, onChange }) {
  const add = () => onChange([...options, { id: Math.random().toString(36).slice(2, 8), name: "" }]);
  const update = (id, patch) => onChange(options.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  const remove = (id) => onChange(options.filter((o) => o.id !== id));
  return (
    <div className="space-y-2">
      {options.map((o) => (
        <div key={o.id} className="flex gap-2">
          <input value={o.name} onChange={(e) => update(o.id, { name: e.target.value })} placeholder="VD: Cushion màu 21 Vin Hồng"
            className="flex-1 border border-[#E7E3DA] rounded-lg px-2 py-1.5 text-sm" />
          <button type="button" onClick={() => remove(o.id)} className="text-slate-400 hover:text-red-500">✕</button>
        </div>
      ))}
      <button type="button" onClick={add} className="text-sm text-[#5B4CFF]">+ Thêm lựa chọn sản phẩm</button>
    </div>
  );
}

// Cho phép admin khai báo thêm các trường thông tin kênh SNS khác (Instagram, Facebook,
// YouTube...) riêng cho từng campaign, ngoài ID/Link TikTok mặc định.
export function ChannelFieldsEditor({ fields, onChange }) {
  const add = () => onChange([...fields, { id: Math.random().toString(36).slice(2, 8), label: "", placeholder: "", required: false }]);
  const update = (id, patch) => onChange(fields.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  const remove = (id) => onChange(fields.filter((f) => f.id !== id));
  return (
    <div className="space-y-2">
      {fields.map((f) => (
        <div key={f.id} className="flex gap-2 items-center">
          <input value={f.label} onChange={(e) => update(f.id, { label: e.target.value })} placeholder="Tên trường, VD: ID Instagram"
            className="w-40 border border-[#E7E3DA] rounded-lg px-2 py-1.5 text-sm" />
          <input value={f.placeholder} onChange={(e) => update(f.id, { placeholder: e.target.value })} placeholder="Placeholder gợi ý (không bắt buộc)"
            className="flex-1 border border-[#E7E3DA] rounded-lg px-2 py-1.5 text-sm" />
          <label className="text-xs text-slate-500 flex items-center gap-1 whitespace-nowrap">
            <input type="checkbox" checked={!!f.required} onChange={(e) => update(f.id, { required: e.target.checked })} /> Bắt buộc
          </label>
          <button type="button" onClick={() => remove(f.id)} className="text-slate-400 hover:text-red-500">✕</button>
        </div>
      ))}
      <button type="button" onClick={add} className="text-sm text-[#5B4CFF]">+ Thêm trường kênh SNS</button>
    </div>
  );
}
