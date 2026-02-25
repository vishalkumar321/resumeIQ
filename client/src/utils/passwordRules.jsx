/**
 * Reusable password strength rules.
 * Used by Signup, ResetPassword, and Settings (change password).
 *
 * Each rule has:
 *   - label  : human-readable description shown in the UI
 *   - test   : function that returns true if the rule passes
 */
export const PASSWORD_RULES = [
    { id: "length", label: "At least 8 characters", test: (p) => p.length >= 8 },
    { id: "upper", label: "One uppercase letter (A–Z)", test: (p) => /[A-Z]/.test(p) },
    { id: "lower", label: "One lowercase letter (a–z)", test: (p) => /[a-z]/.test(p) },
    { id: "number", label: "One number (0–9)", test: (p) => /[0-9]/.test(p) },
    { id: "special", label: "One special character (!@#$%^&*…)", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

/** Returns true only when every rule passes. */
export const isPasswordStrong = (password) =>
    PASSWORD_RULES.every((rule) => rule.test(password));

/**
 * PasswordStrengthIndicator — drop-in JSX component.
 * Shows a checklist of password rules with live pass/fail coloring.
 *
 * Usage:
 *   <PasswordStrengthIndicator password={password} />
 */
export function PasswordStrengthIndicator({ password }) {
    if (!password) return null;

    return (
        <ul className="mt-2 space-y-1">
            {PASSWORD_RULES.map((rule) => {
                const ok = rule.test(password);
                return (
                    <li key={rule.id} className={`flex items-center gap-1.5 text-xs ${ok ? "text-green-600" : "text-gray-400"}`}>
                        <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 text-[9px] font-bold ${ok ? "bg-green-100 border-green-400 text-green-600" : "border-gray-300"}`}>
                            {ok ? "✓" : ""}
                        </span>
                        {rule.label}
                    </li>
                );
            })}
        </ul>
    );
}
