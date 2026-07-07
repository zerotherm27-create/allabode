import type { Metadata, Viewport } from "next";
import { Inter_Tight, Inter } from "next/font/google";
import "./globals.css";
import { PWARegister } from "@/components/pwa-register";
import { InstallPrompt } from "@/components/install-prompt";

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://allabodeph.com"),
  title: {
    default:
      "All Abode Property Solutions | Real Estate Services Philippines",
    template: "%s | All Abode Property Solutions",
  },
  description:
    "Brokerage, leasing, property management, and appraisal support in the Philippines. Work with All Abode for professional property guidance.",
  keywords: [
    "real estate broker Philippines",
    "real estate appraisal Philippines",
    "property management Philippines",
    "condo leasing Philippines",
    "property for rent Philippines",
    "property for sale Philippines",
    "licensed real estate broker",
    "licensed real estate appraiser",
  ],
  openGraph: {
    title: "All Abode Property Solutions",
    description:
      "Complete real estate, leasing, property management, and appraisal services in the Philippines.",
    type: "website",
    locale: "en_PH",
  },
  applicationName: "All Abode",
  appleWebApp: {
    capable: true,
    title: "All Abode",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a2540",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${interTight.variable} ${inter.variable} h-full`}
    >
      <body className="min-h-full bg-cream text-ink">
        {children}
        <PWARegister />
        <InstallPrompt />
      </body>
    </html>
  );
}
