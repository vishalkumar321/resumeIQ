/**
 * Validates that every required environment variable is set before the server
 * starts handling any requests. Fails fast with a clear message rather than
 * letting the app crash later with an obscure error.
 *
 * Call this once near the top of server.js, after dotenv.config().
 */
const REQUIRED_VARS = [
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_KEY",
    "JWT_SECRET",
    "GROQ_API_KEY",
    "ALLOWED_ORIGINS",
    "FRONTEND_URL",
];

export function validateEnv() {
    const missing = REQUIRED_VARS.filter((key) => !process.env[key]);

    if (missing.length > 0) {
        console.error(
            `[startup] Missing required environment variables:\n  ${missing.join("\n  ")}\n` +
            `Make sure your .env file is present and all variables are set.`
        );
        process.exit(1);
    }

    console.log("[startup] Environment variables validated ✓");
}
