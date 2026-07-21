import { WorkspaceSidebar } from "@/components/workspace-sidebar"
import { BillingView } from "@/components/billing-view"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export default async function BillingPage() {
  return (
    <SidebarProvider>
      <WorkspaceSidebar/>
      <SidebarInset>
        <BillingView/>
      </SidebarInset>
    </SidebarProvider>
  )
}
