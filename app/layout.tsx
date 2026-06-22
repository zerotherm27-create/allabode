import type { Metadata } from "next";
import { Montserrat, Inter } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
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
  icons: { icon: "/logo/favicon.png" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${montserrat.variable} ${inter.variable} h-full`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
        />
      </head>
      <body className="min-h-full bg-cream text-ink">{children}</body>
    </html>
  );
}
