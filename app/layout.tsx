import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

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
      <body >
        {/*
          ml-64  → matches sidebar  w-64  (256px)
          pt-[60px] → matches topnav  h-[60px]
        */}
        <div >
          <main >
            {children}
            <Toaster />
          </main>
        </div>
      </body>
    </html>
  );
}