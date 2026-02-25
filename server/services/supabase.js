import { createClient } from "@supabase/supabase-js";
import { Agent, fetch as undiciFetch } from "undici";
import dotenv from "dotenv";

dotenv.config();

/**
 * Custom fetch that forces IPv4 connections only.
 * This prevents the ConnectTimeoutError caused by Node's undici trying
 * IPv6 addresses first on networks that don't support them properly.
 */
const ipv4Agent = new Agent({ connect: { family: 4 } });
const fetchWithIPv4 = (url, options = {}) =>
  undiciFetch(url, { ...options, dispatcher: ipv4Agent });

/**
 * Standard Supabase client using the ANON_KEY.
 * Use this for all standard user operations (Auth, DB with RLS).
 * This ensures security policies and email verification gates are active.
 */
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  { global: { fetch: fetchWithIPv4 } }
);

/**
 * Admin Supabase client using the SERVICE_KEY.
 * DANGER: This bypasses all RLS and security gates.
 * Use ONLY for system-level operations that cannot be done by a user.
 * NEVER use this for login or signup.
 */
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { global: { fetch: fetchWithIPv4 } }
);