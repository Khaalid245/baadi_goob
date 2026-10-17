import dotenv from "dotenv";
dotenv.config();

import { prisma } from "../lib/prisma";
import { purgeExpiredAccounts } from "../services/retention.service";

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run") || args.includes("-d");
  const cutoffArg = args.find((arg) => arg.startsWith("--cutoff="));

  let cutoffDate: Date | undefined;
  if (cutoffArg) {
    const rawDate = cutoffArg.split("=")[1];
    const parsed = new Date(rawDate);
    if (isNaN(parsed.getTime())) {
      console.error(
        `[PurgeRetention] Error: Invalid cutoff date provided: "${rawDate}". Expected valid ISO-8601 date string.`
      );
      process.exit(1);
    }
    cutoffDate = parsed;
  }

  console.log("=================================================================");
  console.log("Baadi Goob (Furan) - 12-Month Application History Retention Purge");
  console.log("=================================================================");
  console.log(`Execution Mode : ${isDryRun ? "DRY RUN (no records will be deleted)" : "LIVE PURGE"}`);
  if (cutoffDate) {
    console.log(`Specified Cutoff: ${cutoffDate.toISOString()}`);
  }

  const result = await purgeExpiredAccounts({
    dryRun: isDryRun,
    cutoffDate,
  });

  console.log("\nPurge Execution Results:");
  console.log(`- Effective Retention Cutoff Date    : ${result.cutoffDate.toISOString()}`);
  console.log(`- Eligible Deleted Student Accounts  : ${result.eligibleStudentsCount}`);
  console.log(`- Purged Student Accounts            : ${result.purgedStudentsCount}`);
  console.log(`- Purged Application Records         : ${result.purgedApplicationsCount}`);
  console.log(`- Purged Competition Registrations   : ${result.purgedRegistrationsCount}`);
  console.log("=================================================================");
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error: unknown) => {
    console.error("[PurgeRetention] Execution encountered a fatal error:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
