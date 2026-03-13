export function getJobLinks(targetRole, skills = []) {
    // Clean target role for search
    const role = targetRole.trim();
    const q = encodeURIComponent(`${role} ${skills.slice(0, 2).join(" ")}`);
    const roleQ = encodeURIComponent(role);

    return [
        {
            platform: "LinkedIn",
            // f_TPR=r86400 filters for last 24 hours (86400 seconds)
            url: `https://www.linkedin.com/jobs/search/?keywords=${q}&f_TPR=r86400&sort=DD`
        },
        {
            platform: "Indeed",
            // fromage=1 filters for last 24 hours
            url: `https://www.indeed.com/jobs?q=${q}&fromage=1&sort=date`
        },
        {
            platform: "Glassdoor",
            // fromAge=1 for last 24 hours
            url: `https://www.glassdoor.com/Job/jobs.htm?suggestkw=${roleQ}&fromAge=1`
        },
        {
            platform: "Naukri",
            // freshness=1 or dayscnt=1 usually works for recent jobs
            url: `https://www.naukri.com/${role.toLowerCase().replace(/\s+/g, "-")}-jobs?experience=0&freshness=1`
        },
        {
            platform: "Wellfound",
            url: `https://wellfound.com/jobs?q=${roleQ}`
        }
    ];
}
