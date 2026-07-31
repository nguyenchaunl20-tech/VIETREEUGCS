import "./globals.css";

export const metadata = {
  title: "Tuyển UGC theo Campaign",
  description: "Hệ thống đăng ký & quản lý UGC cho các brand/campaign",
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
