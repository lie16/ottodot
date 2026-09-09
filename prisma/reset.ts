import { runSeed } from "./seed";

async function main() {
  console.log("🔄 Resetting database to baseline synthetic seed state...");
  await runSeed();
  console.log("✨ Database successfully reset to baseline seed state!");
}

main().catch((err) => {
  console.error("❌ Reset error:", err);
  process.exit(1);
});
