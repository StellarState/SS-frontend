import Link from "next/link";

export default function RegisterPage() {
  return (
    <main className="container mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold">Create an account</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Connect a Stellar wallet to continue. By signing up you agree to our{" "}
        <Link href="/terms" className="underline underline-offset-2">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline underline-offset-2">
          Privacy Policy
        </Link>
        .
      </p>
      <p className="mt-4 text-sm" data-testid="register-trust-link">
        Want to know how we protect funds first? Read our{" "}
        <Link href="/trust" className="underline underline-offset-2">
          Trust and Security page
        </Link>
        .
      </p>
    </main>
  );
}
