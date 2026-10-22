// MCP server (Streamable HTTP, không giữ phiên) để Claude / AI agent đọc dữ liệu campaign
// và ghi đề xuất lọc KOC. Bảo vệ bằng khoá bí mật MCP_API_KEY (đặt trong Vercel → Environment Variables).
// Claude.ai → Customize → Connectors → Add custom connector:
//   URL:  https://<domain>/api/mcp
//   Authentication: No sign in, thêm request header  Authorization: Bearer <MCP_API_KEY>

import { NextResponse } from "next/server";
import crypto from "crypto";
import { TOOLS, ToolError } from "../../../lib/mcp/tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SERVER_INFO = { name: "vietree-ugc", title: "Vietree UGC Campaigns", version: "1.0.0" };
const SUPPORTED_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];

const INSTRUCTIONS = [
  "Máy chủ dữ liệu app tuyển UGC/KOC của Vietree (TikTok, Shopee, Threads, Facebook, Instagram).",
  "Quy trình lọc đơn: list_campaigns → get_campaign (đọc yêu cầu) → screen_campaign (luật cứng, phân trang) →",
  "tự chấm chất lượng các đơn sạch theo yêu cầu campaign → save_ai_suggestions (approve/review/reject + lý do 1 câu tiếng Việt).",
  "Đơn có luật mức block thì đề xuất reject. Không bao giờ đề xuất approve cho KOC trong blacklist hoặc đang nợ bài quá hạn.",
  "Agent không tự đổi trạng thái duyệt; người dùng bấm Chọn trong trang admin.",
  "Chỉ thêm/gỡ blacklist khi người dùng yêu cầu rõ ràng.",
].join(" ");

const TOOL_MAP = new Map(TOOLS.map((t) => [t.name, t]));

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function authorize(req) {
  const expected = process.env.MCP_API_KEY;
  if (!expected || expected.length < 24 || expected.startsWith("doi-thanh-")) {
    return { ok: false, status: 503, message: "Chưa cấu hình MCP_API_KEY (ít nhất 24 ký tự) trong Environment Variables." };
  }
  const header = req.headers.get("authorization") || "";
  const bearer = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  const provided = bearer || (req.headers.get("x-api-key") || "").trim();
  if (!provided || !safeEqual(provided, expected)) {
    return { ok: false, status: 401, message: "Sai hoặc thiếu khoá truy cập." };
  }
  return { ok: true };
}

const rpcResult = (id, result) => ({ jsonrpc: "2.0", id, result });
const rpcError = (id, code, message) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

async function handleMessage(msg) {
  if (!msg || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") {
    // Phản hồi từ client (result/error) hoặc dữ liệu không hợp lệ
    if (msg && msg.id !== undefined && (msg.result !== undefined || msg.error !== undefined)) return null;
    return rpcError(msg && msg.id, -32600, "Invalid Request");
  }
  const isNotification = msg.id === undefined || msg.id === null;
  const { method, params = {} } = msg;

  if (isNotification) return null; // notifications/initialized, notifications/cancelled...

  try {
    switch (method) {
      case "initialize": {
        const requested = params.protocolVersion;
        const protocolVersion = SUPPORTED_VERSIONS.includes(requested) ? requested : SUPPORTED_VERSIONS[0];
        return rpcResult(msg.id, {
          protocolVersion,
          capabilities: { tools: { listChanged: false } },
          serverInfo: SERVER_INFO,
          instructions: INSTRUCTIONS,
        });
      }
      case "ping":
        return rpcResult(msg.id, {});
      case "tools/list":
        return rpcResult(msg.id, {
          tools: TOOLS.map(({ name, description, inputSchema, annotations }) => ({ name, description, inputSchema, annotations })),
        });
      case "tools/call": {
        const tool = TOOL_MAP.get(params.name);
        if (!tool) return rpcError(msg.id, -32602, `Unknown tool: ${params.name}`);
        try {
          const output = await tool.run(params.arguments || {});
          return rpcResult(msg.id, {
            content: [{ type: "text", text: JSON.stringify(output) }],
            structuredContent: output,
            isError: false,
          });
        } catch (e) {
          const text = e instanceof ToolError ? e.message : `Lỗi khi chạy ${params.name}: ${e.message || e}`;
          if (!(e instanceof ToolError)) console.error("[mcp]", params.name, e);
          return rpcResult(msg.id, { content: [{ type: "text", text }], isError: true });
        }
      }
      case "resources/list":
        return rpcResult(msg.id, { resources: [] });
      case "prompts/list":
        return rpcResult(msg.id, { prompts: [] });
      default:
        return rpcError(msg.id, -32601, `Method not found: ${method}`);
    }
  } catch (e) {
    console.error("[mcp]", method, e);
    return rpcError(msg.id, -32603, "Internal error");
  }
}

export async function POST(req) {
  const auth = authorize(req);
  if (!auth.ok) return NextResponse.json(rpcError(null, -32001, auth.message), { status: auth.status });

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(rpcError(null, -32700, "Parse error"), { status: 400 });
  }

  const batch = Array.isArray(body);
  const messages = batch ? body : [body];
  const responses = (await Promise.all(messages.map(handleMessage))).filter(Boolean);

  if (responses.length === 0) return new NextResponse(null, { status: 202 });
  return NextResponse.json(batch ? responses : responses[0], {
    headers: { "Cache-Control": "no-store" },
  });
}

// Server không mở luồng SSE và không giữ phiên
export async function GET() {
  return new NextResponse(null, { status: 405, headers: { Allow: "POST" } });
}

export async function DELETE() {
  return new NextResponse(null, { status: 405, headers: { Allow: "POST" } });
}
