import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkReports() {
    const { data, error } = await supabase
        .from("reports")
        .select("id, report_name, role, cover_letter")
        .limit(5);

    if (error) {
        console.error("Error fetching reports:", error);
        return;
    }

    console.log("Reports data:");
    data.forEach((r) => {
        console.log(`ID: ${r.id}`);
        console.log(`Name: ${r.report_name}`);
        console.log(`Role: ${r.role}`);
        console.log(`Cover Letter length: ${r.cover_letter ? JSON.stringify(r.cover_letter).length : 0}`);
        console.log("---");
    });
}

checkReports();
