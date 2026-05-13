import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { StealthProvider } from "@/components/StealthContext";
import { PWARegister } from "@/components/PWARegister";
import "./globals.css";

export const metadata: Metadata = {
  title: "folio",
  description:
    "Multi-account portfolio tracker for stocks, options, and crypto. Upload your Wealthsimple CSV; folio tracks day-over-day movement, signals, and what your friends are holding.",
  applicationName: "folio",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "folio",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0B0E16",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#7A8CFA",
          colorBackground: "#0B0E16",
          colorInputBackground: "#181C26",
          colorInputText: "#F2F4F7",
          colorText: "#F2F4F7",
          colorTextSecondary: "#8B91A1",
        },
      }}
    >
      <html lang="en">
        <body>
          <StealthProvider>
            {children}
            <PWARegister />
          </StealthProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
