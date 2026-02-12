"use client";

import { useState } from "react";
import { login } from "./actions";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";

export function LoginForm() {
  const [error, setError] = useState(null);

  async function handleSubmit(formData) {
    setError(null);
    const result = await login(formData);
    if (result?.error) {
      setError(result.error);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      <Input
        label="Email"
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder="admin@example.com"
      />
      <Input
        label="Password"
        name="password"
        type="password"
        required
        autoComplete="current-password"
        placeholder="••••••••"
      />
      <Button type="submit" className="w-full">
        Sign in
      </Button>
    </form>
  );
}
