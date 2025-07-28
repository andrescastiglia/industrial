import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "Maese",
  description: "Sistema de Producción",
  keywords: ["industrial", "manufactura", "producción", "inventario"],
  authors: [{ name: "Andrés Castiglia" }],
  creator: "Andrés Castiglia",
  publisher: "Maese",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  },
  verification: {
    google: "google-site-verification-code",
  },
  openGraph: {
    title: "Maese - Sistema de Gestión Industrial",
    description: "Sistema integral para la gestión de procesos industriales",
    url: "https://maese.com.ar",
    siteName: "Maese",
    images: [
      {
        url: "https://maese.com.ar/og-image.jpg",
        width: 1200,
        height: 630,
      },
    ],
    locale: "es_AR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Maese - Sistema de Gestión Industrial",
    description: "Sistema integral para la gestión de procesos industriales",
    images: ["https://maese.com.ar/twitter-image.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
