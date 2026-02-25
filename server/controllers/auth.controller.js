import { supabase } from "../services/supabase.js";
import { ok, fail } from "../utils/response.js";
import asyncWrapper from "../middleware/async.middleware.js";

const FRONTEND_URL = process.env.FRONTEND_URL;

// ── Error message mapper ───────────────────────────────────────────────────
function getAuthErrorMessage(error) {
  const msg = error?.message ?? "";

  // Network-level failures (Supabase unreachable, DNS timeout, etc.)
  if (
    msg.includes("fetch failed") ||
    msg.includes("network") ||
    error?.cause?.code === "UND_ERR_CONNECT_TIMEOUT" ||
    error?.cause?.code === "ECONNREFUSED" ||
    error?.cause?.code === "ENOTFOUND"
  ) {
    return { status: 503, message: "Service temporarily unavailable. Please try again in a moment." };
  }
  if (msg.includes("User already registered") || msg.includes("already exists")) {
    return { status: 409, message: "An account with this email already exists." };
  }
  if (msg.includes("Email not confirmed") || msg.includes("email_not_confirmed")) {
    return { status: 403, message: "Please verify your email before signing in." };
  }
  if (msg.includes("Invalid login credentials")) {
    return { status: 401, message: "Invalid email or password." };
  }
  if (msg.includes("Password should be")) {
    return { status: 400, message: "Password does not meet the minimum requirements." };
  }
  if (msg.includes("rate limit") || msg.includes("too many")) {
    return { status: 429, message: "Too many requests. Please wait and try again." };
  }
  return { status: 400, message: "Authentication failed. Please try again." };
}

// ── Housekeeping: wrap all exports in asyncWrapper ─────────────────────────

// POST /api/auth/signup
export const signup = asyncWrapper(async (req, res) => {
  const { email, password } = req.validated;

  // Use standard supabase client (Anon Key) to trigger verification emails
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${FRONTEND_URL}/login?verified=true`,
    }
  });

  if (error) {
    const { status, message } = getAuthErrorMessage(error);
    return fail(res, message, status);
  }

  return ok(res, {
    message: "Signup successful. Please check your email to verify your account.",
  });
});

// POST /api/auth/login
export const login = asyncWrapper(async (req, res) => {
  const { email, password } = req.validated;

  // IMPORTANT: Using supabase client (Anon Key) ensures verification rules apply
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const { status, message } = getAuthErrorMessage(error);
    return fail(res, message, status);
  }

  // Double check: block unverified users (Supabase returns a session even if unverified if config allows)
  if (!data.user?.email_confirmed_at) {
    return fail(res, "Please verify your email before signing in.", 403);
  }

  return ok(res, {
    token: data.session.access_token,
    user: { id: data.user.id, email: data.user.email },
  });
});

// POST /api/auth/forgot-password
export const forgotPassword = asyncWrapper(async (req, res) => {
  const { email } = req.validated;

  // Always return success — never confirm whether an email exists (security)
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${FRONTEND_URL}/reset-password`,
  });

  return ok(res, {
    message: "If an account with that email exists, a password reset link has been sent.",
  });
});

// POST /api/auth/change-password
export const changePassword = asyncWrapper(async (req, res) => {
  const { new_password } = req.validated;
  const supabaseUser = req.supabase;

  const { data, error } = await supabaseUser.auth.updateUser({
    password: new_password,
  });

  if (error) {
    const { status, message } = getAuthErrorMessage(error);
    return fail(res, message, status);
  }

  // Return the new session token so the client can replace the old one
  return ok(res, {
    message: "Password changed successfully.",
    token: data.session?.access_token ?? null,
  });
});