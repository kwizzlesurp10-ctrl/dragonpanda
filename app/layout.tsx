import './globals.css';
import type { Metadata } from 'next';
import Header from "@/components/header";
import Footer from "@/components/footer";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  metadataBase: new URL("https://dragonandpanda.space"),
  title: {
    default: "Dragon & Panda",
    template: "%s • Dragon & Panda"
  },
  description: "Playful experiments and serious craft. Dragon power. Panda calm.",
  openGraph: { title: "Dragon & Panda", url: "/", siteName: "Dragon & Panda", type: "website" },
  icons: { icon: "/favicon.svg" }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AuthProvider>
          <Header />
          <main className="min-h-[70vh]">{children}</main>
          <Footer />
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
