const { spawnSync } = require("child_process");
const fs = require("fs");

const check = process.platform === "win32"
  ? spawnSync(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", "npm.cmd run check"], { stdio: "inherit" })
  : spawnSync("npm", ["run", "check"], { stdio: "inherit" });
if (check.status !== 0) {
  console.error("\nHandoff stopped: fix the current validation failures before starting new work.");
  process.exit(check.status || 1);
}

const tasks = JSON.parse(fs.readFileSync("coder-tasks.json", "utf8"));
const task = tasks.find(item => item.status === "next" && item.onHold !== true) || tasks.find(item => item.status === "pending" && item.onHold !== true);
if (!task) {
  const held = tasks.filter(item => item.onHold === true && item.status !== "complete");
  console.log(held.length ? `\nNo coder task is currently queued. ${held.length} pending task${held.length === 1 ? " is" : "s are"} explicitly on hold.` : "\nAll coder roadmap tasks are marked complete.");
  process.exit(0);
}

console.log(`\n=== NEXT CODER TASK ${task.id}: ${task.title} ===`);
console.log(`Model: ${task.model}`);
console.log(`Chat: ${task.freshChat ? "Fresh chat" : "Continue the approved prior task chat"}`);
console.log("\nPROMPT\n");
console.log(task.prompt);
console.log("\nACCEPTANCE CHECKS\n");
task.acceptance.forEach((item, index) => console.log(`${index + 1}. ${item}`));
console.log("\nReturn the coder report to the reviewer before advancing the task status.");
