/**
 * Zod v4-compatible validation middleware factory.
 * Uses error.flatten() which is stable across Zod versions.
 */
export const validate = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
        // Zod v4: use flatten() for reliable field-level errors
        const flat = result.error.flatten();
        const fields = [];

        // Form-level errors (e.g. superRefine errors with no path)
        for (const msg of flat.formErrors ?? []) {
            fields.push({ field: "_form", message: msg });
        }

        // Field-level errors
        for (const [fieldName, messages] of Object.entries(flat.fieldErrors ?? {})) {
            for (const msg of messages ?? []) {
                fields.push({ field: fieldName, message: msg });
            }
        }

        return res.status(422).json({
            success: false,
            error: {
                code: "VALIDATION_ERROR",
                message: "Request validation failed.",
                fields,
            },
        });
    }

    req.validated = result.data;
    next();
};
