import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/auth"
import { getTenantBilling, getTenantCheckout } from "@/lib/store"
import { getPlan } from "@/lib/utils"
import { PaymentCallback } from "@/components/payment-callback"
import { getTenantCheckoutPlan, getTenantUsage } from "@/lib/billing"

export default async function CheckoutCallbackPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSessionUser()
  if (!session) redirect("/login")
  if (session.role_name.toLowerCase() !== "owner") redirect("/dashboard")

  const { id } = await params
  const checkout = await getTenantCheckoutPlan(session.tenant_id, id)
  if (!checkout) redirect("/billing")
  const billing = await getTenantUsage(session.tenant_id)

  return (
    <PaymentCallback
      status={checkout.status}
      planName={checkout.plan.name}
      amount={checkout.amountCents}
      failureReason={undefined}
      renewsAt={billing?.license?.currentPeriodEnd.toISOString()}
    />
  )
}
