import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "iStudy AI",
  description: "Upload your answer. Get examiner-level feedback.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* Loại bỏ các biến geistSans.variable và geistMono.variable */}
      <body className="antialiased" style={{ margin: 0, background: "#0a0a0a", fontFamily: "sans-serif" }}>
        {children}
      </body>
    </html>
  );
}