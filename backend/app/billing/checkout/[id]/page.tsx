import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getPlan } from "@/lib/utils";
import { CheckoutView } from "@/components/checkout-view";

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  // Billing is restricted to admins.
  if (
    session.role_name.toLowerCase() !== "owner" &&
    session.role_name.toLowerCase() !== "admin"
  )
    redirect("/dashboard");

  const { id } = await params;
  let checkout; //getTenantCheckout(session.tenant_id, id);
  if (!checkout) redirect("/billing");

  // Already settled — send the user to the result screen instead.
  // if (checkout.status !== "pending") redirect(`/billing/callback/${id}`);

  // const plan = getPlan(checkout.plan_id);

  return (
    // <CheckoutView
    //   checkoutId={checkout?.id}
    //   planName={plan?.name}
    //   amount={checkout?.amount}
    //   tenantName={session.tenant}
    // />
    <></>
  );
}
