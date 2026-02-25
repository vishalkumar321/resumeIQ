import { z } from "zod";

// ── Shared strong password rule ────────────────────────────────────────────
// Used by signupSchema, changePasswordSchema, and resetPasswordSchema.
const strongPassword = z
    .string({ required_error: "Password is required." })
    .min(8, "Password must be at least 8 characters.")
    .refine((p) => /[A-Z]/.test(p), {
        message: "Password must contain at least one uppercase letter.",
    })
    .refine((p) => /[a-z]/.test(p), {
        message: "Password must contain at least one lowercase letter.",
    })
    .refine((p) => /[0-9]/.test(p), {
        message: "Password must contain at least one number.",
    })
    .refine((p) => /[^A-Za-z0-9]/.test(p), {
        message: "Password must contain at least one special character (!@#$%^&* etc.).",
    });

// ── Schemas ────────────────────────────────────────────────────────────────
export const signupSchema = z.object({
    email: z
        .string({ required_error: "Email is required." })
        .email("Must be a valid email address.")
        .toLowerCase()
        .trim(),

    password: strongPassword,
});

export const loginSchema = z.object({
    email: z
        .string({ required_error: "Email is required." })
        .email("Must be a valid email address.")
        .toLowerCase()
        .trim(),

    // Login: don't run strength checks — user can't change an old password to log in
    password: z.string({ required_error: "Password is required." }).min(1, "Password is required."),
});

export const forgotPasswordSchema = z.object({
    email: z
        .string({ required_error: "Email is required." })
        .email("Must be a valid email address.")
        .toLowerCase()
        .trim(),
});

export const changePasswordSchema = z.object({
    new_password: strongPassword,
    confirm_password: z.string({ required_error: "Please confirm your new password." }),
}).refine((d) => d.new_password === d.confirm_password, {
    path: ["confirm_password"],
    message: "Passwords do not match.",
});
