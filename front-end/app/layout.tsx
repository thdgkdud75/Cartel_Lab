import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Header from "@/components/header";
import NextAuthSessionProvider from "@/providers/NextAuthSessionProvider";
import ReduxProvider from "@/providers/ReduxProvider";
import DevAutoLogin from "@/components/DevAutoLogin";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";

const pretendard = localFont({
  src: "../public/fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Jvision Lab",
  description: "Jvision Lab",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="ko" className={`${pretendard.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-[family-name:var(--font-pretendard)]">
        <NextAuthSessionProvider session={session}>
          <ReduxProvider>
            {process.env.NODE_ENV === "development" && <DevAutoLogin />}
            <Header />
            <main className="flex-1">
              {children}
            </main>
          </ReduxProvider>
        </NextAuthSessionProvider>
      </body>
    </html>
  );
}
