import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getSessionUser();
  redirect(
    session?.role_code == "member"
      ? "/documents"
      : session?.role_code == "owner" || session?.role_code == "admin"
        ? "/dashboard"
        : "/login",
  );
}
