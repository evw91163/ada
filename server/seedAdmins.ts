/**
 * Seed script to create admin accounts for derrick@unitybakery.com and heather@unitybakery.com
 * Run with: npx tsx server/seedAdmins.ts
 */
import bcrypt from "bcryptjs";
import * as db from "./db";
import { notifyOwner } from "./_core/notification";

const ADMIN_ACCOUNTS = [
  {
    email: "derrick@unitybakery.com",
    password: "TempP@$$123",
    firstName: "Derrick",
    lastName: "",
    role: "admin" as const,
  },
  {
    email: "heather@unitybakery.com",
    password: "TempP@$$123",
    firstName: "Heather",
    lastName: "",
    role: "admin" as const,
  },
];

async function seedAdminAccounts() {
  console.log("Creating admin accounts...\n");

  for (const account of ADMIN_ACCOUNTS) {
    try {
      // Check if email already exists
      const existing = await db.getUserByEmail(account.email);
      if (existing) {
        console.log(`Account ${account.email} already exists (ID: ${existing.id}). Skipping.`);
        continue;
      }

      // Generate username from email
      const username = account.email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_");

      // Check if username exists
      let finalUsername = username;
      const existingUsername = await db.getUserByUsername(username);
      if (existingUsername) {
        finalUsername = username + "_" + Math.random().toString(36).substring(2, 6);
      }

      // Hash password
      const passwordHash = await bcrypt.hash(account.password, 12);

      // Create user
      const userId = await db.createLocalUser({
        username: finalUsername,
        passwordHash,
        email: account.email,
        firstName: account.firstName,
        lastName: account.lastName || undefined,
        role: account.role,
        mustChangePassword: true,
      });

      if (userId) {
        console.log(`Created admin account: ${account.email} (username: ${finalUsername}, ID: ${userId})`);
        console.log(`  - Role: ${account.role}`);
        console.log(`  - Must change password on first login: YES`);
        console.log(`  - Temporary password: ${account.password}`);
        console.log("");

        // Send welcome notification
        try {
          await notifyOwner({
            title: `[ADA] New Admin Account Created: ${account.email}`,
            content: `A new admin account has been created for the American Donut Association.\n\nEmail: ${account.email}\nUsername: ${finalUsername}\nRole: Admin\nTemporary Password: ${account.password}\n\nThe user will be required to change their password on first login.\n\nLogin URL: (use the site URL)/login`,
          });
          console.log(`  Welcome notification sent for ${account.email}`);
        } catch (notifyError) {
          console.error(`  Failed to send notification for ${account.email}:`, notifyError);
        }
      } else {
        console.error(`Failed to create account for ${account.email}`);
      }
    } catch (error) {
      console.error(`Error creating account for ${account.email}:`, error);
    }
  }

  console.log("\nDone! Admin accounts seeded.");
  process.exit(0);
}

seedAdminAccounts().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
