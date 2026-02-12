"use server";

import { connectToDatabase } from "../../lib/db";
import { User } from "../../models/User";
import { verifyPassword, createToken, setAuthCookie } from "../../lib/auth";
import { redirect } from "next/navigation";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

export async function login(formData) {
  try {
    const raw = {
      email: formData.get("email")?.toString().trim(),
      password: formData.get("password")?.toString() ?? "",
    };
    const parsed = loginSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        error: parsed.error.errors.map((e) => e.message).join(", "),
      };
    }

    await connectToDatabase();
    const user = await User.findOne({
      email: parsed.data.email,
      deletedAt: null,
      isActive: true,
    }).lean();

    if (!user) {
      return { error: "Invalid email or password." };
    }

    const valid = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!valid) {
      return { error: "Invalid email or password." };
    }

    const token = await createToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });
    await setAuthCookie(token);

    redirect("/");
  } catch (err) {
    if (err?.digest?.startsWith?.("NEXT_REDIRECT")) throw err;
    console.error("Login error:", err);
    return { error: err?.message || "Login failed." };
  }
}
