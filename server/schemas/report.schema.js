import { z } from "zod";

const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const generateReportSchema = z
    .object({
        resume_id: z
            .string({ required_error: "'resume_id' is required." })
            .regex(uuidRegex, "'resume_id' must be a valid UUID."),

        mode: z
            .enum(["role", "jd"], {
                errorMap: () => ({ message: "'mode' must be either \"role\" or \"jd\"." }),
            })
            .default("role"),

        role: z.string().trim().max(200).optional(),

        job_description: z
            .string()
            .trim()
            .max(8000, "Job description must be at most 8,000 characters.")
            .optional(),
    })
    .superRefine((data, ctx) => {
        if (data.mode === "role") {
            if (!data.role || data.role.length === 0) {
                ctx.addIssue({
                    path: ["role"],
                    code: "custom",
                    message: "Role mode requires a non-empty 'role'.",
                });
            }
        }

        if (data.mode === "jd") {
            if (!data.job_description || data.job_description.length < 100) {
                ctx.addIssue({
                    path: ["job_description"],
                    code: "custom",
                    message: "JD mode requires a 'job_description' of at least 100 characters.",
                });
            }
        }
    });
