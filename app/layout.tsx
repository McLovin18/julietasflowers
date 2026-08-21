import "./globals.css";

import Footer from "./components/Footer";
import { cookies } from "next/headers";
import Navbar from "./components/Navbar";
import { UserProvider } from "./context/UserContext";
import { OnboardingProvider } from "./context/OnboardingContext";
import { ToastProvider } from "./context/ToastContext";
import LayoutContentClient from "./components/LayoutContentClient";
import { StructuredData } from "./components/StructuredData";
import type { Metadata, Viewport } from "next";
import { Source_Serif_4, Playfair_Display, Great_Vibes } from "next/font/google";

// ISR Global: Revalidar sitio cada 30 minutos
// Optimiza regeneración de página principal y otros contenidos estáticos
export const revalidate = 1800;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://julietasflowers.com"; // 👉 reemplazar con el dominio real de producción
const SITE_NAME = "Julietas Flowers";

// VONCA alternativa: Playfair Display (elegante contemporánea, minimalista)
const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-vonca",
});

// Lovely Flowers alternativa: Great Vibes (cursiva elegante, ornamental)
const greatVibes = Great_Vibes({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal"],
  variable: "--font-lovely-flowers",
});

const sourceSerif4 = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-source-serif-4",
});

export const metadata: Metadata = {
  title: {
    default: "Julietas Flowers - Florería en Samborondón",
    template: "%s | Julietas Flowers",
  },
  description:
    "Florería en Samborondón. Creamos emociones con cada flor: arreglos personalizados y experiencias únicas para cada ocasión.",
  keywords: [
    "florería",
    "flores",
    "arreglos florales",
    "rosas",
    "florería Samborondón",
    "florería Ecuador",
    "regalos con flores",
    "Julietas Flowers",
  ],
  creator: "Julietas Flowers",
  metadataBase: new URL(SITE_URL),
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",

  // Open Graph - Redes Sociales
  openGraph: {
    type: "website",
    locale: "es_EC",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "Julietas Flowers - Florería en Samborondón",
    description:
      "Arreglos personalizados y experiencias únicas con flores. Entre Ríos, Samborondón.",
    images: [
      {
        url: `${SITE_URL}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: "Julietas Flowers - Florería en Samborondón",
        type: "image/jpeg",
      },
    ],
  },

  // Twitter Card
  twitter: {
    card: "summary_large_image",
    title: "Julietas Flowers - Florería en Samborondón",
    description:
      "Creamos emociones con cada flor. Arreglos personalizados en Samborondón.",
    images: [`${SITE_URL}/twitter-image.jpg`],
  },

  // Canonícal URL
  alternates: {
    canonical: SITE_URL,
  },

  // Robots
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },

  // Verificación
  verification: {
    google: "tu-codigo-google-search-console", // Reemplazar con tu código
  },

  // Apple
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: SITE_NAME,
  },
};

// Viewport export - separate from metadata in Next.js 16
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${sourceSerif4.variable} ${playfairDisplay.variable} ${greatVibes.variable}`}>
      <head>
        {/* Google Analytics gtag.js - insertado justo después de <head> */}
        {/* 👉 Reemplazar G-XXXXXXXXXX con el ID de GA4 real de Julietas Flowers */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-XXXXXXXXXX');
            `,
          }}
        />
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&display=swap" rel="stylesheet" />
        
        {/* Nota: Para usar las fuentes originales VONCA y Lovely Flowers, necesitarás:
            1. Comprar las fuentes en sus respectivos sitios (MyFonts, Creative Market, etc.)
            2. Colocar los archivos de fuente en public/fonts/
            3. Agregar las declaraciones @font-face en globals.css
            4. Actualizar las variables CSS para usar las fuentes originales
            Actualmente usamos alternativas de Google Fonts: Playfair Display y Great Vibes */}
        
        <StructuredData />
      </head>
      <body className="relative">
        <ToastProvider>
          <OnboardingProvider>
            <LayoutContentClient>{children}</LayoutContentClient>
          </OnboardingProvider>
        </ToastProvider>
      </body>
    </html>
  );
}