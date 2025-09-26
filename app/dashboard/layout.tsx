import type React from "react";
import { isAuthenticated } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { MobileMenu } from "@/components/mobile-menu";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <MobileMenu />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4">
          {children}
        </main>
      </div>
    </div>
  );
}
