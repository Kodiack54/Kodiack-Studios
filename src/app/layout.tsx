'use client';

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import Sidebar from "@/components/Sidebar";
import { UserProvider } from "@/app/settings/UserContext";
import { createContext, useState, ReactNode, Suspense } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Context for page title and description
export const PageTitleContext = createContext<(title: { title: string; description: string }) => void>(() => {});

// Context for page actions (buttons in the header bar)
export const PageActionsContext = createContext<(actions: ReactNode) => void>(() => {});

// Context for Production Status sidebar toggle (shared between Navigation and Sidebar)
export const ProductionStatusContext = createContext<{
  showServers: boolean;
  setShowServers: (show: boolean) => void;
  toggleServers: () => void;
}>({
  showServers: true,
  setShowServers: () => {},
  toggleServers: () => {},
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [pageTitle, setPageTitle] = useState<{ title: string; description: string }>({
    title: 'Dashboard',
    description: 'Your daily overview'
  });
  const [pageActions, setPageActions] = useState<ReactNode>(null);
  const [showServers, setShowServers] = useState(true);

  return (
    <html lang="en" className="dark">
      <head>
        <title>Dev Command - NextBid</title>
        <meta name="description" content="NextBid Control Center for Development Team" />
        <link rel="icon" href="/images/nextbid-logo.png" />
        <link rel="apple-touch-icon" href="/images/nextbid-logo.png" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <UserProvider>
          <PageTitleContext.Provider value={setPageTitle}>
            <PageActionsContext.Provider value={setPageActions}>
              <ProductionStatusContext.Provider value={{
                showServers,
                setShowServers,
                toggleServers: () => setShowServers(prev => !prev),
              }}>
                <div className="h-screen flex flex-col overflow-hidden">
                  <Navigation pageTitle={pageTitle} pageActions={pageActions} />
                  <div className="flex flex-1 min-h-0 overflow-hidden">
                    <Suspense fallback={<div className="w-64 bg-gray-900" />}>
                      <Sidebar />
                    </Suspense>
                    <main className="flex-1 px-8 py-4 overflow-auto bg-gray-900">
                      {children}
                    </main>
                  </div>
                </div>
              </ProductionStatusContext.Provider>
            </PageActionsContext.Provider>
          </PageTitleContext.Provider>
        </UserProvider>
      </body>
    </html>
  );
}
