import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkSchema() {
    console.log('--- Checking "reports" table ---');
    const { data: reportData, error: reportError } = await supabase
        .from('reports')
        .select('*')
        .limit(1);

    if (reportError) {
        console.error('Error fetching from reports:', reportError.message);
    } else {
        console.log('Successfully fetched from reports.');
        if (reportData.length > 0) {
            console.log('Columns found in reports:', Object.keys(reportData[0]));
        } else {
            console.log('Reports table is empty.');
        }
    }

    console.log('\n--- Checking "job_applications" table ---');
    const { data: jobData, error: jobError } = await supabase
        .from('job_applications')
        .select('*')
        .limit(1);

    if (jobError) {
        console.error('Error fetching from job_applications:', jobError.message);
        console.log('Error code:', jobError.code);
    } else {
        console.log('Successfully fetched from job_applications.');
        if (jobData.length > 0) {
            console.log('Columns found in job_applications:', Object.keys(jobData[0]));
        } else {
            console.log('job_applications table exists but is empty.');
        }
    }
}

checkSchema();
