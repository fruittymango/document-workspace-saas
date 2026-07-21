import { SignupForm } from "@/components/signup-form"

export default async function SignupPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <SignupForm />
    </main>
  )
}
