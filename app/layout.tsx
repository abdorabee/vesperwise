import type { Metadata, Viewport } from "next";
import { Instrument_Sans } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { GoogleAnalytics } from "@/components/google-analytics";
import "./globals.css";
import "./theme-overrides.css";
import "./responsive.css";
import "./bulk-workspace.css";

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "VesperWise — B2B Intent Scoring for MENA",
    template: "%s | VesperWise",
  },
  description:
    "Score any company 0–100 for purchase intent in one API call. Funding, hiring, news, tech stack & web signals combined with AI reasoning — 100x cheaper than 6sense or Bombora. Built for MENA sales teams.",
  metadataBase: new URL("https://www.vesperwise.com"),
  keywords: [
    "B2B intent data",
    "buyer intent signals",
    "lead scoring",
    "sales intelligence",
    "MENA",
    "intent scoring API",
    "6sense alternative",
    "Bombora alternative",
    "purchase intent",
    "B2B sales",
    "SMB sales tools",
    "intent data platform",
  ],
  authors: [{ name: "VesperWise", url: "https://www.vesperwise.com" }],
  creator: "VesperWise",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.vesperwise.com",
    siteName: "VesperWise",
    title: "VesperWise — B2B Buyer Intent Signals for SMB Sales Teams",
    description:
      "Track hiring spikes, funding rounds, tech stack changes, and news mentions. " +
      "Surface companies ready to buy before your competitors do. From $29/mo.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "VesperWise — B2B Buyer Intent Signals for SMB Sales Teams",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "VesperWise — B2B Buyer Intent Signals",
    description:
      "Track hiring spikes, funding rounds, tech stack changes and more. Find your buyers first.",
    images: ["/opengraph-image"],
  },
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b0c0e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const vercelUrl = process.env.VERCEL_URL || process.env.VERCEL_BRANCH_URL;
  const isPreview = process.env.VERCEL_ENV !== "production";
  
  const clerkProps = isPreview && vercelUrl
    ? {
        signInUrl: "/login",
        signUpUrl: "/signup",
        afterSignInUrl: "/dashboard",
        afterSignUpUrl: "/dashboard",
        allowedRedirectOrigins: [
          `https://${vercelUrl}`,
          "https://www.vesperwise.com",
        ],
      }
    : {
        signInUrl: "/login",
        signUpUrl: "/signup",
        afterSignInUrl: "/dashboard",
        afterSignUpUrl: "/dashboard",
      };

  return (
    <ClerkProvider {...clerkProps}>
      <html lang="en" className="dark" suppressHydrationWarning>
        <head>
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(){try{var t=localStorage.getItem('intentiq-theme');var d=document.documentElement;if(t==='light'){d.classList.remove('dark');}else{d.classList.add('dark');}}catch(e){}})();`,
            }}
          />
          <GoogleAnalytics />
        </head>
        <body className={`${instrumentSans.variable} font-sans antialiased`}>
          <ThemeProvider>
            <TooltipProvider>
              {children}
              <Toaster />
            </TooltipProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
