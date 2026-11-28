// Runs once when the server starts. Starts the Amazon stock and dispatch jobs (Node.js only).
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startAmazonJobs } = await import("./lib/amazon/jobs");
  startAmazonJobs();
}
