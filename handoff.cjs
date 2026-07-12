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
const task = tasks.find(item => item.status === "next") || tasks.find(item => item.status === "pending");
if (!task) {
  console.log("\nAll coder roadmap tasks are marked complete.");
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
