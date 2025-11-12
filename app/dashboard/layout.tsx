import type React from "react";
import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { MobileMenu } from "@/components/mobile-menu";
import { headers } from "next/headers";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The middleware already protects this route and sets headers
  // If we reach here, the user is authenticated (middleware redirected if not)
  const headersList = headers();
  const userId = headersList.get("x-user-id");

  // This is a safety check - middleware should have already redirected
  if (!userId) {
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
