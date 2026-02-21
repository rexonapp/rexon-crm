import type { Metadata, Viewport } from "next";
import "./globals.css";
import TopNav from "@/components/crm/TopNav";
import Sidebar from "@/components/crm/Sidebar";

export const metadata: Metadata = {
  title: { default: "Rexon CRM", template: "%s | Rexon CRM" },
  description: "Agent & Domain Management Platform",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen bg-background antialiased">
        <Sidebar />
        {/*
          ml-64  → matches sidebar  w-64  (256px)
          pt-[60px] → matches topnav  h-[60px]
        */}
        <div className="flex-1 flex flex-col ml-64">
          <TopNav />
          <main className="flex-1 pt-[60px] bg-muted/30 min-h-screen">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}