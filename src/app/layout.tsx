import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster-simple"
import { I18nProvider } from "@/components/I18nProvider"
import Script from "next/script"

const inter = Inter({ subsets: ["latin"] })
const faviconSvgDataUrl =
  "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cg transform='translate(16,16) scale(0.12)'%3E%3Cpath fill='%237D3C98' d='M0,-100 L86,-50 L86,50 L0,100 L-86,50 L-86,-50 Z'/%3E%3Cpath fill='white' d='M30,-50 L-15,10 H15 L-10,55 L40,0 H15 Z'/%3E%3C/g%3E%3C/svg%3E"

export const metadata: Metadata = {
  title: "Purple Stock - Your Inventory Simplified",
  description: "Inventory management system with QR code support",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Purple Stock",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [{ url: faviconSvgDataUrl, type: "image/svg+xml" }],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      {
        rel: "android-chrome-192x192",
        url: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        rel: "android-chrome-512x512",
        url: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  },
}

export const viewport: Viewport = {
  themeColor: "#6B21A8",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="application-name" content="Purple Stock" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Purple Stock" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href={faviconSvgDataUrl} type="image/svg+xml" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <I18nProvider>
        {children}
        </I18nProvider>
        <Toaster />
        <Script id="sw-register" strategy="afterInteractive">
          {`
            if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
              window.addEventListener('load', () => {
                navigator.serviceWorker
                  .register('/sw.js')
                  .then((registration) => {
                    console.log('Service Worker registered:', registration.scope);
                    setInterval(() => {
                      registration.update();
                    }, 60 * 60 * 1000);
                  })
                  .catch((error) => {
                    console.error('Service Worker registration failed:', error);
                  });
              });
            }
          `}
        </Script>
      </body>
    </html>
  )
}
