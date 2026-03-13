import { createClient } from "@supabase/supabase-js";
import { fetch as undiciFetch } from "undici";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

async function test() {
    const { data, error } = await supabase.auth.signInWithPassword({
        email: "vishalkumargupta4546@gmail.com",
        password: "Vishal@4518",
    });

    if (error) {
        console.error("Login failed:", error);
        return;
    }

    const token = data.session.access_token;
    console.log("Logged in!");

    const reportsRes = await undiciFetch("http://localhost:5000/api/report/history", {
        headers: { "Authorization": `Bearer ${token}` }
    });
    const reportsData = await reportsRes.json();

    if (!reportsData.data?.reports?.length) {
        console.log("No reports found to test optimizer with.");
        return;
    }

    const reportId = reportsData.data.reports[0].id;
    console.log("Testing optimizer on report:", reportId);

    const optRes = await undiciFetch(`http://localhost:5000/api/report/rewrite/${reportId}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ targetRole: "Software Engineer" })
    });

    const optData = await optRes.json();
    console.log("Optimizer status:", optRes.status);
    console.log("Optimizer response:", JSON.stringify(optData, null, 2));
}

test();
