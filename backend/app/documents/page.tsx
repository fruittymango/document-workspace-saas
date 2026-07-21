"use client";
import { WorkspaceSidebar } from "@/components/workspace-sidebar";
import { DocumentsView } from "@/components/documents-view";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function DocumentsPage() {
  return (
    <SidebarProvider>
      <WorkspaceSidebar />
      <SidebarInset>
        <DocumentsView/>
      </SidebarInset>
      
    </SidebarProvider>
  );
}
