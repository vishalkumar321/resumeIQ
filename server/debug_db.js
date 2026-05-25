import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function check() {
  try {
    const { data: resumes, error: rErr } = await supabase.from("resumes").select("id, user_id").limit(1);
    if (rErr) throw rErr;
    if (!resumes || resumes.length === 0) {
      console.log("No resumes found to test with.");
      return;
    }
    const { id, user_id } = resumes[0];
    console.log("Found resume:", id, "for user:", user_id);

    // Check reports table
    const { count, error: cErr } = await supabase.from("reports").select("*", { count: "exact", head: true });
    if (cErr) {
      console.error("Reports table error:", cErr);
    } else {
      console.log("Reports table exists, count:", count);
    }
  } catch (e) {
    console.error("Debug check failed:", e.message);
  }
}
check();
