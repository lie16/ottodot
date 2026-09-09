import { prisma } from "../lib/prisma";

async function main() {
  console.log("================================================================================");
  console.log("             📋 OTTODOT TRIAL BOOKING - TEST & SYSTEM AUDIT LOGS               ");
  console.log("================================================================================\n");

  const logs = await prisma.auditLog.findMany({
    orderBy: { timestamp: "desc" },
    take: 50,
  });

  if (logs.length === 0) {
    console.log("No audit logs found in the database. Run 'pnpm run test' or 'pnpm run db:seed' to generate logs.");
    return;
  }

  console.log(`Retrieved ${logs.length} most recent audit log entries (newest first):\n`);

  for (const log of logs) {
    const time = log.timestamp.toISOString();
    const tag = log.tag.padEnd(24, " ");
    const level = `[${log.level}]`.padEnd(9, " ");
    const event = `[${log.event}]`.padEnd(35, " ");
    
    console.log(`${time} ${level} ${tag} ${event}`);
    try {
      const parsed = JSON.parse(log.details);
      console.log(`   └─ Details:`, JSON.stringify(parsed, null, 2).replace(/\n/g, "\n      "));
    } catch {
      console.log(`   └─ Details: ${log.details}`);
    }
    console.log("--------------------------------------------------------------------------------");
  }

  console.log(`\n💡 Tip: You can also inspect real-time logs in the web app under the Admin Portal > Live Audit Stream,`);
  console.log(`   or read 'logs/audit.log' on disk.\n`);
}

main()
  .catch((e) => {
    console.error("Error retrieving audit logs:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
