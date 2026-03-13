import asyncWrapper from "../middleware/async.middleware.js";
import ApiError from "../utils/ApiError.js";
import { ok, created, fail } from "../utils/response.js";

// ── GET /api/tracker ──────────────────────────────────────────────────────────
export const getApplications = asyncWrapper(async (req, res) => {
    const supabase = req.supabase;
    const { data, error } = await supabase
        .from("job_applications")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
            return ok(res, { applications: [] });
        }
        throw new ApiError(500, "Failed to fetch applications.", { cause: error });
    }
    return ok(res, { applications: data || [] });
});

// ── GET /api/tracker/stats ────────────────────────────────────────────────────
export const getTrackerStats = asyncWrapper(async (req, res) => {
    const supabase = req.supabase;
    const { data, error } = await supabase
        .from("job_applications")
        .select("status");

    if (error) {
        if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
            return ok(res, { total: 0, saved: 0, applied: 0, interviewing: 0, offer: 0, rejected: 0, withdrawn: 0, response_rate: 0 });
        }
        throw new ApiError(500, "Failed to fetch stats.", { cause: error });
    }

    const counts = { total: 0, saved: 0, applied: 0, interviewing: 0, offer: 0, rejected: 0, withdrawn: 0 };
    for (const row of data || []) {
        counts.total++;
        if (counts[row.status] !== undefined) counts[row.status]++;
    }

    const responded = counts.interviewing + counts.offer + counts.rejected;
    const response_rate = counts.applied > 0
        ? Math.round((responded / (counts.applied + responded)) * 100)
        : 0;

    return ok(res, { ...counts, response_rate });
});

// ── POST /api/tracker ─────────────────────────────────────────────────────────
export const createApplication = asyncWrapper(async (req, res) => {
    const supabase = req.supabase;
    const user = req.user;
    const { company_name, role_title, job_url, status, date_applied, notes, report_id } = req.body;

    if (!company_name || !role_title) {
        return fail(res, "company_name and role_title are required.", 400);
    }

    const { data, error } = await supabase
        .from("job_applications")
        .insert({
            user_id: user.id,
            company_name,
            role_title,
            job_url: job_url || null,
            status: status || "applied",
            date_applied: date_applied || new Date().toISOString().slice(0, 10),
            notes: notes || null,
            report_id: report_id || null,
        })
        .select()
        .single();

    if (error) throw new ApiError(500, "Failed to create application.", { cause: error });
    return created(res, { application: data });
});

// ── PATCH /api/tracker/:id ────────────────────────────────────────────────────
export const updateApplication = asyncWrapper(async (req, res) => {
    const supabase = req.supabase;
    const { id } = req.params;
    const { company_name, role_title, job_url, status, date_applied, notes, report_id } = req.body;

    const { data: existing, error: fetchErr } = await supabase
        .from("job_applications")
        .select("id")
        .eq("id", id)
        .single();

    if (fetchErr || !existing) return fail(res, "Application not found.", 404);

    const updates = {};
    if (company_name !== undefined) updates.company_name = company_name;
    if (role_title !== undefined) updates.role_title = role_title;
    if (job_url !== undefined) updates.job_url = job_url;
    if (status !== undefined) updates.status = status;
    if (date_applied !== undefined) updates.date_applied = date_applied;
    if (notes !== undefined) updates.notes = notes;
    if (report_id !== undefined) updates.report_id = report_id;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
        .from("job_applications")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

    if (error) throw new ApiError(500, "Failed to update application.");
    return ok(res, { application: data });
});

// ── DELETE /api/tracker/:id ───────────────────────────────────────────────────
export const deleteApplication = asyncWrapper(async (req, res) => {
    const supabase = req.supabase;
    const { id } = req.params;

    const { error } = await supabase
        .from("job_applications")
        .delete()
        .eq("id", id);

    if (error) throw new ApiError(500, "Failed to delete application.");
    return res.status(204).send();
});
