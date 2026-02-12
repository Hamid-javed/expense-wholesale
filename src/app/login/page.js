import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { LoginForm } from "./LoginForm";

export const metadata = {
  title: "Login | Expense & Sales Manager",
  description: "Sign in to the expense and sales management system",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader title="Sign in" />
        <CardBody>
          <LoginForm />
          <p className="mt-4 text-center text-xs text-slate-500">
            Single-tenant system. No public registration.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
