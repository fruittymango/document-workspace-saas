import { LoginForm } from "@/components/login-form"

export default async function LoginPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <LoginForm />
    </main>
  )
}
