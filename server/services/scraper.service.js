import axios from "axios";
import * as cheerio from "cheerio";

/**
 * Scrape job description text from a public job posting URL.
 * @param {string} url
 * @returns {{ success: boolean, text?: string, url?: string, error?: string }}
 */
export async function scrapeJobDescription(url) {
    // Validate URL format
    try {
        new URL(url);
    } catch {
        return { success: false, error: "Invalid URL format." };
    }

    try {
        const { data: html } = await axios.get(url, {
            timeout: 10000,
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
            },
        });

        const $ = cheerio.load(html);

        // Remove scripts, styles, nav, footer
        $("script, style, nav, footer, header, noscript, iframe").remove();

        // Try targeted selectors first
        const selectors = [
            '[class*="description"]',
            '[class*="job-detail"]',
            '[class*="posting"]',
            '[class*="job-body"]',
            '[class*="content"]',
            "main",
            "article",
        ];

        let text = "";
        for (const sel of selectors) {
            const el = $(sel).first();
            if (el.length) {
                text = el.text();
                if (text.trim().length > 200) break;
            }
        }

        // Fall back to body
        if (!text || text.trim().length < 200) {
            text = $("body").text();
        }

        // Clean up whitespace
        text = text
            .replace(/\s+/g, " ")
            .split(/[.\n]/)
            .map((l) => l.trim())
            .filter((l) => l.length > 30) // remove short fragments
            .join(". ")
            .slice(0, 3000);

        if (!text || text.length < 100) {
            return { success: false, error: "Could not extract meaningful content from the URL." };
        }

        return { success: true, text, url };
    } catch (err) {
        console.warn("[Scraper] Failed:", err.message);
        return { success: false, error: `Failed to fetch URL: ${err.message}` };
    }
}
