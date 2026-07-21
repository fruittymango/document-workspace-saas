"use client";

import { WorkspaceSidebar } from "@/components/workspace-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AdminDashboard } from "@/components/admin-dashboard";

export type UserType = {
  name: string;
  surname: string;
  tenant: string;
  tenant_id: string;
  email: string;
};


export default function DashboardPage() {
  return (
    <SidebarProvider>
        <WorkspaceSidebar />
        <SidebarInset>
          <AdminDashboard />
        </SidebarInset>
    </SidebarProvider>
  );

}
