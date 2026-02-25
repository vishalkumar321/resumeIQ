import { createClient } from "@supabase/supabase-js";
import { Agent, fetch as undiciFetch } from "undici";
import dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Force IPv4 — prevents ConnectTimeoutError when undici tries IPv6 first
const ipv4Agent = new Agent({ connect: { family: 4 } });
const fetchWithIPv4 = (url, options = {}) =>
  undiciFetch(url, { ...options, dispatcher: ipv4Agent });

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment variables"
  );
}

export const verifyUser = async (req, res, next) => {
  try {
    // 1. Extract Bearer token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Missing or malformed Authorization header",
      });
    }

    const token = authHeader.split(" ")[1]?.trim();

    if (!token) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Token is empty",
      });
    }

    // 2. Build a request-scoped Supabase client with the user's JWT.
    //    This client inherits the user's identity for ALL downstream DB calls,
    //    ensuring RLS policies (auth.uid() = user_id) are evaluated correctly.
    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        fetch: fetchWithIPv4,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        // Disable automatic session persistence — this is a server-side client.
        // Each request builds its own ephemeral client; nothing is stored.
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    // 3. Verify the JWT by fetching the user from Supabase Auth.
    //    This call validates the token signature + expiry server-side.
    const { data, error } = await supabaseUser.auth.getUser();

    if (error || !data?.user) {
      // Network / service-unavailable — don't log the user out for this
      const isNetworkError =
        error?.message?.includes("fetch failed") ||
        error?.cause?.code === "UND_ERR_CONNECT_TIMEOUT" ||
        error?.cause?.code === "ECONNREFUSED";

      if (isNetworkError) {
        return res.status(503).json({
          error: "Service Unavailable",
          message: "Authentication service is temporarily unreachable. Please try again.",
        });
      }

      // Supabase returns an AuthError for expired JWTs.
      // The frontend Axios interceptor listens for this exact message.
      const isExpired =
        error?.message?.toLowerCase().includes("expired") ||
        error?.status === 403;

      return res.status(401).json({
        error: "Unauthorized",
        message: isExpired
          ? "Session expired. Please log in again."
          : "Invalid session. Please log in again.",
        code: isExpired ? "SESSION_EXPIRED" : "INVALID_TOKEN",
      });
    }

    // 4. Attach the verified user object and the scoped client to the request.
    //    Controllers must use req.supabase exclusively — never a service-role client —
    //    so that all DB operations flow through RLS as the authenticated user.
    req.user = data.user;          // { id: uuid, email, ... }
    req.supabase = supabaseUser;   // RLS-enforced client

    next();
  } catch (err) {
    console.error("[AUTH MIDDLEWARE] Unexpected error:", err.message);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Authentication check failed",
    });
  }
};