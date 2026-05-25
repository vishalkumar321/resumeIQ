async function run() {
  try {
    const res = await fetch("http://localhost:5000/health");
    if (!res.ok) throw new Error("HTTP Status " + res.status);
    const health = await res.json();
    console.log("Health:", health);
  } catch (e) {
    console.error("Health Check Failed:", e.message);
  }
}
run();
