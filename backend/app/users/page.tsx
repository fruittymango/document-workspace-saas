'use client'
import { WorkspaceSidebar } from "@/components/workspace-sidebar"
import { UsersView } from "@/components/users-view"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export default function UsersPage() {
  return (
    <SidebarProvider>
      <WorkspaceSidebar  />
      <SidebarInset>
        <UsersView/>
      </SidebarInset>
    </SidebarProvider>
  )
}
