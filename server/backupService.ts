import { eq, desc, sql, and, lt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { storagePut, storageGet } from "./storage";
import {
  backups, InsertBackup, Backup,
  backupItems, InsertBackupItem, BackupItem,
  rollbacks, InsertRollback,
  backupSettings,
  backupActivityLogs, InsertBackupActivityLog, BackupActivityLog,
  users, categories, threads, posts, tags, threadTags,
  categorySubscriptions, threadSubscriptions, reports,
  notifications, links, listings, articles, advertisements,
  discounts, events, jobs
} from "../drizzle/schema";
import crypto from "crypto";

// List of all tables to backup
const ALL_TABLES = [
  { name: "users", table: users },
  { name: "categories", table: categories },
  { name: "threads", table: threads },
  { name: "posts", table: posts },
  { name: "tags", table: tags },
  { name: "thread_tags", table: threadTags },
  { name: "category_subscriptions", table: categorySubscriptions },
  { name: "thread_subscriptions", table: threadSubscriptions },
  { name: "reports", table: reports },
  { name: "notifications", table: notifications },
  { name: "links", table: links },
  { name: "listings", table: listings },
  { name: "articles", table: articles },
  { name: "advertisements", table: advertisements },
  { name: "discounts", table: discounts },
  { name: "events", table: events },
  { name: "jobs", table: jobs },
] as const;

let _db: ReturnType<typeof drizzle> | null = null;

async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[BackupService] Failed to connect to database:", error);
      _db = null;
    }
  }
  return _db;
}

// Generate checksum for data integrity
function generateChecksum(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

// Format bytes to human readable
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// ============ BACKUP FUNCTIONS ============

export interface BackupOptions {
  name: string;
  description?: string;
  backupType: "full" | "database" | "files" | "incremental" | "pre_update";
  triggerType: "manual" | "automatic" | "pre_update" | "scheduled";
  createdById: number;
  tables?: string[]; // Specific tables to backup (for partial backups)
}

export async function createBackup(options: BackupOptions): Promise<Backup | null> {
  const db = await getDb();
  if (!db) {
    console.error("[BackupService] Database not available");
    return null;
  }

  try {
    // Create backup record
    const backupData: InsertBackup = {
      name: options.name,
      description: options.description,
      backupType: options.backupType,
      triggerType: options.triggerType,
      status: "in_progress",
      createdById: options.createdById,
      metadata: JSON.stringify({
        startedAt: new Date().toISOString(),
        tables: options.tables || ALL_TABLES.map(t => t.name),
      }),
    };

    const [result] = await db.insert(backups).values(backupData);
    const backupId = result.insertId;

    // Get the created backup
    const [backup] = await db.select().from(backups).where(eq(backups.id, backupId));

    // Start backup process
    await performBackup(backupId, options);

    // Return updated backup
    const [updatedBackup] = await db.select().from(backups).where(eq(backups.id, backupId));
    return updatedBackup;
  } catch (error) {
    console.error("[BackupService] Failed to create backup:", error);
    return null;
  }
}

async function performBackup(backupId: number, options: BackupOptions): Promise<void> {
  const db = await getDb();
  if (!db) return;

  let totalSize = 0;
  let fileCount = 0;
  let tableCount = 0;
  const errors: string[] = [];

  try {
    const tablesToBackup = options.tables 
      ? ALL_TABLES.filter(t => options.tables!.includes(t.name))
      : ALL_TABLES;

    // Backup each table
    for (const tableInfo of tablesToBackup) {
      try {
        const data = await db.select().from(tableInfo.table);
        const jsonData = JSON.stringify(data, null, 2);
        const checksum = generateChecksum(jsonData);
        const size = Buffer.byteLength(jsonData, "utf8");

        // Store to S3
        const storageKey = `backups/${backupId}/${tableInfo.name}.json`;
        await storagePut(storageKey, jsonData, "application/json");

        // Create backup item record
        const itemData: InsertBackupItem = {
          backupId,
          itemType: "table",
          itemName: tableInfo.name,
          itemSize: size,
          recordCount: data.length,
          storageKey,
          checksum,
          status: "completed",
        };

        await db.insert(backupItems).values(itemData);

        totalSize += size;
        tableCount++;
        fileCount++;
      } catch (tableError: any) {
        console.error(`[BackupService] Failed to backup table ${tableInfo.name}:`, tableError);
        errors.push(`Table ${tableInfo.name}: ${tableError.message}`);

        // Record failed item
        await db.insert(backupItems).values({
          backupId,
          itemType: "table",
          itemName: tableInfo.name,
          status: "failed",
          errorMessage: tableError.message,
        });
      }
    }

    // Create manifest file
    const manifest = {
      backupId,
      createdAt: new Date().toISOString(),
      backupType: options.backupType,
      tables: tablesToBackup.map(t => t.name),
      totalSize,
      tableCount,
      fileCount,
    };
    const manifestJson = JSON.stringify(manifest, null, 2);
    const manifestKey = `backups/${backupId}/manifest.json`;
    await storagePut(manifestKey, manifestJson, "application/json");

    // Update backup record
    const status = errors.length === 0 ? "completed" : (tableCount > 0 ? "completed" : "failed");
    await db.update(backups).set({
      status,
      totalSize,
      fileCount,
      tableCount,
      storageLocation: `backups/${backupId}/`,
      checksum: generateChecksum(manifestJson),
      completedAt: new Date(),
      errorMessage: errors.length > 0 ? errors.join("; ") : null,
    }).where(eq(backups.id, backupId));

  } catch (error: any) {
    console.error("[BackupService] Backup failed:", error);
    await db.update(backups).set({
      status: "failed",
      errorMessage: error.message,
    }).where(eq(backups.id, backupId));
  }
}

// ============ ROLLBACK FUNCTIONS ============

export interface RollbackOptions {
  backupId: number;
  rollbackType: "full" | "database" | "files" | "partial";
  initiatedById: number;
  tables?: string[]; // Specific tables to restore (for partial rollbacks)
  notes?: string;
}

export async function createRollback(options: RollbackOptions): Promise<{ success: boolean; message: string; rollbackId?: number }> {
  const db = await getDb();
  if (!db) {
    return { success: false, message: "Database not available" };
  }

  try {
    // Verify backup exists and is completed
    const [backup] = await db.select().from(backups).where(eq(backups.id, options.backupId));
    if (!backup) {
      return { success: false, message: "Backup not found" };
    }
    if (backup.status !== "completed") {
      return { success: false, message: "Cannot rollback from incomplete backup" };
    }

    // Create rollback record
    const rollbackData: InsertRollback = {
      backupId: options.backupId,
      rollbackType: options.rollbackType,
      status: "in_progress",
      initiatedById: options.initiatedById,
      notes: options.notes,
    };

    const [result] = await db.insert(rollbacks).values(rollbackData);
    const rollbackId = result.insertId;

    // Perform rollback
    const rollbackResult = await performRollback(rollbackId, backup, options);

    return { 
      success: rollbackResult.success, 
      message: rollbackResult.message,
      rollbackId 
    };
  } catch (error: any) {
    console.error("[BackupService] Rollback failed:", error);
    return { success: false, message: error.message };
  }
}

async function performRollback(
  rollbackId: number, 
  backup: Backup, 
  options: RollbackOptions
): Promise<{ success: boolean; message: string }> {
  const db = await getDb();
  if (!db) {
    return { success: false, message: "Database not available" };
  }

  let itemsRestored = 0;
  let itemsFailed = 0;
  const errors: string[] = [];

  try {
    // Get backup items
    const items = await db.select().from(backupItems)
      .where(eq(backupItems.backupId, backup.id));

    const tablesToRestore = options.tables 
      ? items.filter(item => options.tables!.includes(item.itemName))
      : items.filter(item => item.itemType === "table" && item.status === "completed");

    for (const item of tablesToRestore) {
      try {
        if (!item.storageKey) {
          throw new Error("No storage key for backup item");
        }

        // Get data from S3
        const { url } = await storageGet(item.storageKey);
        const response = await fetch(url);
        const data = await response.json();

        // Verify checksum
        const dataJson = JSON.stringify(data);
        const checksum = generateChecksum(dataJson);
        if (item.checksum && checksum !== item.checksum) {
          throw new Error("Checksum mismatch - data may be corrupted");
        }

        // Restore table data
        await restoreTableData(item.itemName, data);
        itemsRestored++;
      } catch (itemError: any) {
        console.error(`[BackupService] Failed to restore ${item.itemName}:`, itemError);
        errors.push(`${item.itemName}: ${itemError.message}`);
        itemsFailed++;
      }
    }

    // Update rollback record
    const status = itemsFailed === 0 ? "completed" : (itemsRestored > 0 ? "completed" : "failed");
    await db.update(rollbacks).set({
      status,
      itemsRestored,
      itemsFailed,
      completedAt: new Date(),
      errorMessage: errors.length > 0 ? errors.join("; ") : null,
    }).where(eq(rollbacks.id, rollbackId));

    if (itemsFailed === 0) {
      return { success: true, message: `Successfully restored ${itemsRestored} tables` };
    } else if (itemsRestored > 0) {
      return { success: true, message: `Restored ${itemsRestored} tables with ${itemsFailed} failures` };
    } else {
      return { success: false, message: `Rollback failed: ${errors.join("; ")}` };
    }
  } catch (error: any) {
    await db.update(rollbacks).set({
      status: "failed",
      errorMessage: error.message,
    }).where(eq(rollbacks.id, rollbackId));
    return { success: false, message: error.message };
  }
}

async function restoreTableData(tableName: string, data: any[]): Promise<void> {
  const db = await getDb();
  if (!db || data.length === 0) return;

  const tableInfo = ALL_TABLES.find(t => t.name === tableName);
  if (!tableInfo) {
    throw new Error(`Unknown table: ${tableName}`);
  }

  // Clear existing data and insert backup data
  // Using raw SQL for TRUNCATE to avoid foreign key issues
  await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0`);
  await db.execute(sql.raw(`TRUNCATE TABLE ${tableName}`));
  
  // Insert data in batches
  const batchSize = 100;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    await db.insert(tableInfo.table).values(batch);
  }
  
  await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);
}

// ============ QUERY FUNCTIONS ============

export async function getBackups(limit = 50, offset = 0): Promise<Backup[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(backups)
    .orderBy(desc(backups.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getBackupById(id: number): Promise<Backup | null> {
  const db = await getDb();
  if (!db) return null;

  const [backup] = await db.select().from(backups).where(eq(backups.id, id));
  return backup || null;
}

export async function getBackupItems(backupId: number): Promise<BackupItem[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(backupItems).where(eq(backupItems.backupId, backupId));
}

export async function getRollbackHistory(limit = 50): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(rollbacks)
    .orderBy(desc(rollbacks.createdAt))
    .limit(limit);
}

export async function deleteBackup(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    // Mark as deleted (soft delete to preserve history)
    await db.update(backups).set({ status: "deleted" }).where(eq(backups.id, id));
    return true;
  } catch (error) {
    console.error("[BackupService] Failed to delete backup:", error);
    return false;
  }
}

// ============ SETTINGS FUNCTIONS ============

export async function getBackupSetting(key: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;

  const [setting] = await db.select().from(backupSettings)
    .where(eq(backupSettings.settingKey, key));
  return setting?.settingValue || null;
}

export async function setBackupSetting(key: string, value: string, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(backupSettings).values({
    settingKey: key,
    settingValue: value,
    updatedById: userId,
  }).onDuplicateKeyUpdate({
    set: { settingValue: value, updatedById: userId },
  });
}

// ============ AUTO-BACKUP TRIGGER ============

export async function createPreUpdateBackup(userId: number, updateDescription: string): Promise<Backup | null> {
  return createBackup({
    name: `Pre-Update Backup - ${new Date().toISOString().split("T")[0]}`,
    description: `Automatic backup before: ${updateDescription}`,
    backupType: "pre_update",
    triggerType: "pre_update",
    createdById: userId,
  });
}

// ============ BACKUP STATS ============

export async function getBackupStats(): Promise<{
  totalBackups: number;
  completedBackups: number;
  totalSize: number;
  lastBackup: Date | null;
  totalRollbacks: number;
}> {
  const db = await getDb();
  if (!db) {
    return {
      totalBackups: 0,
      completedBackups: 0,
      totalSize: 0,
      lastBackup: null,
      totalRollbacks: 0,
    };
  }

  const allBackups = await db.select().from(backups);
  const completedBackups = allBackups.filter(b => b.status === "completed");
  const totalSize = completedBackups.reduce((sum, b) => sum + (b.totalSize || 0), 0);
  const lastBackup = completedBackups.length > 0 
    ? new Date(Math.max(...completedBackups.map(b => b.createdAt.getTime())))
    : null;

  const allRollbacks = await db.select().from(rollbacks);

  return {
    totalBackups: allBackups.length,
    completedBackups: completedBackups.length,
    totalSize,
    lastBackup,
    totalRollbacks: allRollbacks.length,
  };
}


// ============ INTEGRITY VERIFICATION ============

export interface IntegrityCheckResult {
  backupId: number;
  status: "passed" | "failed" | "warning";
  checkedAt: Date;
  checksPerformed: number;
  checksPassed: number;
  checksFailed: number;
  checksWarning: number;
  details: IntegrityCheckDetail[];
  summary: string;
}

export interface IntegrityCheckDetail {
  checkName: string;
  checkType: "checksum" | "structure" | "count" | "format" | "completeness";
  tableName?: string;
  status: "passed" | "failed" | "warning";
  expected?: string | number;
  actual?: string | number;
  message: string;
}

export async function verifyBackupIntegrity(backupId: number): Promise<IntegrityCheckResult> {
  const db = await getDb();
  const details: IntegrityCheckDetail[] = [];
  let checksPerformed = 0;
  let checksPassed = 0;
  let checksFailed = 0;
  let checksWarning = 0;

  if (!db) {
    return {
      backupId,
      status: "failed",
      checkedAt: new Date(),
      checksPerformed: 1,
      checksPassed: 0,
      checksFailed: 1,
      checksWarning: 0,
      details: [{
        checkName: "Database Connection",
        checkType: "structure",
        status: "failed",
        message: "Unable to connect to database",
      }],
      summary: "Integrity check failed: Database not available",
    };
  }

  try {
    // 1. Check backup record exists
    checksPerformed++;
    const [backup] = await db.select().from(backups).where(eq(backups.id, backupId));
    if (!backup) {
      checksFailed++;
      details.push({
        checkName: "Backup Record Exists",
        checkType: "structure",
        status: "failed",
        message: "Backup record not found in database",
      });
      return {
        backupId,
        status: "failed",
        checkedAt: new Date(),
        checksPerformed,
        checksPassed,
        checksFailed,
        checksWarning,
        details,
        summary: "Integrity check failed: Backup not found",
      };
    }
    checksPassed++;
    details.push({
      checkName: "Backup Record Exists",
      checkType: "structure",
      status: "passed",
      message: `Backup "${backup.name}" found`,
    });

    // 2. Check backup status is completed
    checksPerformed++;
    if (backup.status !== "completed") {
      checksWarning++;
      details.push({
        checkName: "Backup Status",
        checkType: "structure",
        status: "warning",
        expected: "completed",
        actual: backup.status,
        message: `Backup status is "${backup.status}" - may not be fully usable`,
      });
    } else {
      checksPassed++;
      details.push({
        checkName: "Backup Status",
        checkType: "structure",
        status: "passed",
        expected: "completed",
        actual: backup.status,
        message: "Backup completed successfully",
      });
    }

    // 3. Get backup items
    const items = await db.select().from(backupItems).where(eq(backupItems.backupId, backupId));
    
    // 4. Check backup has items
    checksPerformed++;
    if (items.length === 0) {
      checksFailed++;
      details.push({
        checkName: "Backup Items Exist",
        checkType: "completeness",
        status: "failed",
        message: "No backup items found",
      });
    } else {
      checksPassed++;
      details.push({
        checkName: "Backup Items Exist",
        checkType: "completeness",
        status: "passed",
        actual: items.length,
        message: `Found ${items.length} backup items`,
      });
    }

    // 5. Verify each backup item
    for (const item of items) {
      // Check item status
      checksPerformed++;
      if (item.status !== "completed") {
        checksFailed++;
        details.push({
          checkName: `Item Status: ${item.itemName}`,
          checkType: "structure",
          tableName: item.itemName,
          status: "failed",
          expected: "completed",
          actual: item.status || "unknown",
          message: `Backup item "${item.itemName}" has status "${item.status}"`,
        });
        continue;
      }
      checksPassed++;
      details.push({
        checkName: `Item Status: ${item.itemName}`,
        checkType: "structure",
        tableName: item.itemName,
        status: "passed",
        message: `Item "${item.itemName}" completed successfully`,
      });

      // Verify checksum if storage key exists
      if (item.storageKey && item.checksum) {
        checksPerformed++;
        try {
          const { url } = await storageGet(item.storageKey);
          const response = await fetch(url);
          if (response.ok) {
            const content = await response.text();
            const calculatedChecksum = generateChecksum(content);
            
            if (calculatedChecksum === item.checksum) {
              checksPassed++;
              details.push({
                checkName: `Checksum: ${item.itemName}`,
                checkType: "checksum",
                tableName: item.itemName,
                status: "passed",
                expected: item.checksum.substring(0, 16) + "...",
                actual: calculatedChecksum.substring(0, 16) + "...",
                message: "Checksum verification passed",
              });
            } else {
              checksFailed++;
              details.push({
                checkName: `Checksum: ${item.itemName}`,
                checkType: "checksum",
                tableName: item.itemName,
                status: "failed",
                expected: item.checksum.substring(0, 16) + "...",
                actual: calculatedChecksum.substring(0, 16) + "...",
                message: "Checksum mismatch - data may be corrupted",
              });
            }

            // Verify JSON format
            checksPerformed++;
            try {
              const parsed = JSON.parse(content);
              if (Array.isArray(parsed)) {
                checksPassed++;
                details.push({
                  checkName: `JSON Format: ${item.itemName}`,
                  checkType: "format",
                  tableName: item.itemName,
                  status: "passed",
                  message: "Valid JSON array format",
                });

                // Verify row count
                checksPerformed++;
                if (item.recordCount !== null && parsed.length === item.recordCount) {
                  checksPassed++;
                  details.push({
                    checkName: `Row Count: ${item.itemName}`,
                    checkType: "count",
                    tableName: item.itemName,
                    status: "passed",
                    expected: item.recordCount,
                    actual: parsed.length,
                    message: `Row count matches: ${parsed.length} records`,
                  });
                } else if (item.recordCount !== null) {
                  checksWarning++;
                  details.push({
                    checkName: `Row Count: ${item.itemName}`,
                    checkType: "count",
                    tableName: item.itemName,
                    status: "warning",
                    expected: item.recordCount,
                    actual: parsed.length,
                    message: `Row count mismatch: expected ${item.recordCount}, found ${parsed.length}`,
                  });
                }
              } else {
                checksWarning++;
                details.push({
                  checkName: `JSON Format: ${item.itemName}`,
                  checkType: "format",
                  tableName: item.itemName,
                  status: "warning",
                  message: "JSON is valid but not an array",
                });
              }
            } catch (parseError) {
              checksFailed++;
              details.push({
                checkName: `JSON Format: ${item.itemName}`,
                checkType: "format",
                tableName: item.itemName,
                status: "failed",
                message: "Invalid JSON format - data corrupted",
              });
            }
          } else {
            checksFailed++;
            details.push({
              checkName: `Checksum: ${item.itemName}`,
              checkType: "checksum",
              tableName: item.itemName,
              status: "failed",
              message: `Unable to retrieve backup file: HTTP ${response.status}`,
            });
          }
        } catch (fetchError: any) {
          checksFailed++;
          details.push({
            checkName: `Checksum: ${item.itemName}`,
            checkType: "checksum",
            tableName: item.itemName,
            status: "failed",
            message: `Error fetching backup file: ${fetchError.message}`,
          });
        }
      }
    }

    // 6. Check manifest file
    checksPerformed++;
    try {
      const manifestKey = `backups/${backupId}/manifest.json`;
      const { url } = await storageGet(manifestKey);
      const response = await fetch(url);
      if (response.ok) {
        const manifestContent = await response.text();
        const manifest = JSON.parse(manifestContent);
        
        checksPassed++;
        details.push({
          checkName: "Manifest File",
          checkType: "completeness",
          status: "passed",
          message: "Manifest file exists and is valid JSON",
        });

        // Verify manifest matches backup
        checksPerformed++;
        if (manifest.backupId === backupId) {
          checksPassed++;
          details.push({
            checkName: "Manifest Backup ID",
            checkType: "structure",
            status: "passed",
            expected: backupId,
            actual: manifest.backupId,
            message: "Manifest backup ID matches",
          });
        } else {
          checksFailed++;
          details.push({
            checkName: "Manifest Backup ID",
            checkType: "structure",
            status: "failed",
            expected: backupId,
            actual: manifest.backupId,
            message: "Manifest backup ID mismatch",
          });
        }
      } else {
        checksWarning++;
        details.push({
          checkName: "Manifest File",
          checkType: "completeness",
          status: "warning",
          message: "Manifest file not accessible",
        });
      }
    } catch (manifestError: any) {
      checksWarning++;
      details.push({
        checkName: "Manifest File",
        checkType: "completeness",
        status: "warning",
        message: `Error checking manifest: ${manifestError.message}`,
      });
    }

    // Determine overall status
    let status: "passed" | "failed" | "warning";
    let summary: string;

    if (checksFailed > 0) {
      status = "failed";
      summary = `Integrity check failed: ${checksFailed} of ${checksPerformed} checks failed`;
    } else if (checksWarning > 0) {
      status = "warning";
      summary = `Integrity check passed with warnings: ${checksWarning} warnings`;
    } else {
      status = "passed";
      summary = `All ${checksPerformed} integrity checks passed`;
    }

    return {
      backupId,
      status,
      checkedAt: new Date(),
      checksPerformed,
      checksPassed,
      checksFailed,
      checksWarning,
      details,
      summary,
    };

  } catch (error: any) {
    console.error("[BackupService] Integrity check failed:", error);
    return {
      backupId,
      status: "failed",
      checkedAt: new Date(),
      checksPerformed,
      checksPassed,
      checksFailed: checksFailed + 1,
      checksWarning,
      details: [
        ...details,
        {
          checkName: "Overall Check",
          checkType: "structure",
          status: "failed",
          message: `Integrity check error: ${error.message}`,
        },
      ],
      summary: `Integrity check failed with error: ${error.message}`,
    };
  }
}

// Quick integrity check (without fetching files)
export async function quickIntegrityCheck(backupId: number): Promise<{
  status: "passed" | "failed" | "warning";
  message: string;
}> {
  const db = await getDb();
  if (!db) {
    return { status: "failed", message: "Database not available" };
  }

  try {
    const [backup] = await db.select().from(backups).where(eq(backups.id, backupId));
    if (!backup) {
      return { status: "failed", message: "Backup not found" };
    }

    if (backup.status !== "completed") {
      return { status: "warning", message: `Backup status is "${backup.status}"` };
    }

    const items = await db.select().from(backupItems).where(eq(backupItems.backupId, backupId));
    const failedItems = items.filter(i => i.status !== "completed");

    if (failedItems.length > 0) {
      return { 
        status: "warning", 
        message: `${failedItems.length} of ${items.length} items have issues` 
      };
    }

    return { 
      status: "passed", 
      message: `All ${items.length} backup items completed successfully` 
    };
  } catch (error: any) {
    return { status: "failed", message: error.message };
  }
}

// ============ BACKUP DOWNLOAD FUNCTIONS ============

export interface BackupDownloadData {
  metadata: {
    backupId: number;
    name: string;
    description: string | null;
    backupType: string;
    triggerType: string;
    createdAt: Date;
    completedAt: Date | null;
    totalSize: number;
    tableCount: number;
    fileCount: number;
    checksum: string | null;
    notes: string | null;
  };
  tables: {
    [tableName: string]: {
      recordCount: number;
      data: any[];
    };
  };
  exportedAt: Date;
  exportVersion: string;
}

export async function generateBackupDownload(backupId: number): Promise<{
  success: boolean;
  data?: BackupDownloadData;
  error?: string;
}> {
  const db = await getDb();
  if (!db) {
    return { success: false, error: "Database not available" };
  }

  try {
    // Get backup record
    const [backup] = await db.select().from(backups).where(eq(backups.id, backupId));
    if (!backup) {
      return { success: false, error: "Backup not found" };
    }

    if (backup.status !== "completed") {
      return { success: false, error: "Cannot download incomplete backup" };
    }

    // Get backup items
    const items = await db.select().from(backupItems).where(eq(backupItems.backupId, backupId));
    
    // Fetch data for each table
    const tables: BackupDownloadData["tables"] = {};
    
    for (const item of items) {
      if (item.itemType === "table" && item.storageKey) {
        try {
          const { url } = await storageGet(item.storageKey);
          const response = await fetch(url);
          if (response.ok) {
            const content = await response.text();
            const data = JSON.parse(content);
            tables[item.itemName] = {
              recordCount: Array.isArray(data) ? data.length : 0,
              data: Array.isArray(data) ? data : [],
            };
          }
        } catch (fetchError) {
          console.warn(`[BackupService] Failed to fetch ${item.itemName}:`, fetchError);
          tables[item.itemName] = {
            recordCount: 0,
            data: [],
          };
        }
      }
    }

    const downloadData: BackupDownloadData = {
      metadata: {
        backupId: backup.id,
        name: backup.name,
        description: backup.description,
        backupType: backup.backupType,
        triggerType: backup.triggerType,
        createdAt: backup.createdAt,
        completedAt: backup.completedAt,
        totalSize: backup.totalSize,
        tableCount: backup.tableCount,
        fileCount: backup.fileCount,
        checksum: backup.checksum,
        notes: backup.notes,
      },
      tables,
      exportedAt: new Date(),
      exportVersion: "1.0.0",
    };

    return { success: true, data: downloadData };
  } catch (error: any) {
    console.error("[BackupService] Download generation failed:", error);
    return { success: false, error: error.message };
  }
}

// Generate a downloadable JSON string
export async function getBackupAsJson(backupId: number): Promise<{
  success: boolean;
  json?: string;
  filename?: string;
  error?: string;
}> {
  const result = await generateBackupDownload(backupId);
  
  if (!result.success || !result.data) {
    return { success: false, error: result.error };
  }

  const json = JSON.stringify(result.data, null, 2);
  const filename = `backup_${backupId}_${result.data.metadata.name.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().split("T")[0]}.json`;

  return { success: true, json, filename };
}

// ============ RETENTION POLICY FUNCTIONS ============

export interface RetentionPolicy {
  enabled: boolean;
  retentionDays: number;
  protectLabeled: boolean; // Protect backups with labels from auto-deletion
  protectManual: boolean;  // Protect manual backups from auto-deletion
  lastCleanup: Date | null;
  deletedCount: number;
}

// Default retention settings
const DEFAULT_RETENTION_DAYS = 30;
const RETENTION_SETTING_KEY = "retention_policy";

export async function getRetentionPolicy(): Promise<RetentionPolicy> {
  const db = await getDb();
  if (!db) {
    return {
      enabled: false,
      retentionDays: DEFAULT_RETENTION_DAYS,
      protectLabeled: true,
      protectManual: false,
      lastCleanup: null,
      deletedCount: 0,
    };
  }

  try {
    const [setting] = await db.select()
      .from(backupSettings)
      .where(eq(backupSettings.settingKey, RETENTION_SETTING_KEY));

    if (setting) {
      const policy = JSON.parse(setting.settingValue);
      return {
        enabled: policy.enabled ?? false,
        retentionDays: policy.retentionDays ?? DEFAULT_RETENTION_DAYS,
        protectLabeled: policy.protectLabeled ?? true,
        protectManual: policy.protectManual ?? false,
        lastCleanup: policy.lastCleanup ? new Date(policy.lastCleanup) : null,
        deletedCount: policy.deletedCount ?? 0,
      };
    }
  } catch (error) {
    console.warn("[BackupService] Failed to get retention policy:", error);
  }

  return {
    enabled: false,
    retentionDays: DEFAULT_RETENTION_DAYS,
    protectLabeled: true,
    protectManual: false,
    lastCleanup: null,
    deletedCount: 0,
  };
}

export async function updateRetentionPolicy(
  policy: Partial<RetentionPolicy>,
  updatedById: number
): Promise<{ success: boolean; message: string }> {
  const db = await getDb();
  if (!db) {
    return { success: false, message: "Database not available" };
  }

  try {
    const currentPolicy = await getRetentionPolicy();
    const newPolicy = {
      ...currentPolicy,
      ...policy,
    };

    const policyJson = JSON.stringify(newPolicy);

    // Check if setting exists
    const [existing] = await db.select()
      .from(backupSettings)
      .where(eq(backupSettings.settingKey, RETENTION_SETTING_KEY));

    if (existing) {
      await db.update(backupSettings)
        .set({
          settingValue: policyJson,
          updatedById,
        })
        .where(eq(backupSettings.settingKey, RETENTION_SETTING_KEY));
    } else {
      await db.insert(backupSettings).values({
        settingKey: RETENTION_SETTING_KEY,
        settingValue: policyJson,
        description: "Backup retention policy configuration",
        updatedById,
      });
    }

    return { success: true, message: "Retention policy updated" };
  } catch (error: any) {
    console.error("[BackupService] Failed to update retention policy:", error);
    return { success: false, message: error.message };
  }
}

// Import backup labels for checking protected backups
import { backupLabelAssignments } from "../drizzle/schema";

export async function applyRetentionPolicy(): Promise<{
  success: boolean;
  deletedCount: number;
  skippedCount: number;
  message: string;
}> {
  const db = await getDb();
  if (!db) {
    return { success: false, deletedCount: 0, skippedCount: 0, message: "Database not available" };
  }

  try {
    const policy = await getRetentionPolicy();

    if (!policy.enabled) {
      return { success: true, deletedCount: 0, skippedCount: 0, message: "Retention policy is disabled" };
    }

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

    // Get all backups older than cutoff date that are completed
    const oldBackups = await db.select()
      .from(backups)
      .where(
        and(
          eq(backups.status, "completed"),
          lt(backups.createdAt, cutoffDate)
        )
      );

    let deletedCount = 0;
    let skippedCount = 0;

    for (const backup of oldBackups) {
      let shouldDelete = true;

      // Check if backup has labels and protectLabeled is enabled
      if (policy.protectLabeled) {
        const labels = await db.select()
          .from(backupLabelAssignments)
          .where(eq(backupLabelAssignments.backupId, backup.id));
        
        if (labels.length > 0) {
          shouldDelete = false;
          skippedCount++;
          console.log(`[Retention] Skipping backup ${backup.id} - has labels`);
        }
      }

      // Check if backup is manual and protectManual is enabled
      if (shouldDelete && policy.protectManual && backup.triggerType === "manual") {
        shouldDelete = false;
        skippedCount++;
        console.log(`[Retention] Skipping backup ${backup.id} - manual backup`);
      }

      // Delete the backup
      if (shouldDelete) {
        await db.update(backups)
          .set({ status: "deleted" })
          .where(eq(backups.id, backup.id));
        deletedCount++;
        console.log(`[Retention] Deleted backup ${backup.id} - older than ${policy.retentionDays} days`);
      }
    }

    // Update policy with cleanup stats
    await updateRetentionPolicy({
      lastCleanup: new Date(),
      deletedCount: policy.deletedCount + deletedCount,
    }, 0); // System update

    return {
      success: true,
      deletedCount,
      skippedCount,
      message: `Retention policy applied: ${deletedCount} backups deleted, ${skippedCount} skipped`,
    };
  } catch (error: any) {
    console.error("[BackupService] Failed to apply retention policy:", error);
    return { success: false, deletedCount: 0, skippedCount: 0, message: error.message };
  }
}

// Get backups that would be affected by retention policy (preview)
export async function previewRetentionPolicy(): Promise<{
  toDelete: Backup[];
  toSkip: Backup[];
  policy: RetentionPolicy;
}> {
  const db = await getDb();
  if (!db) {
    return { toDelete: [], toSkip: [], policy: await getRetentionPolicy() };
  }

  try {
    const policy = await getRetentionPolicy();

    if (!policy.enabled) {
      return { toDelete: [], toSkip: [], policy };
    }

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

    // Get all backups older than cutoff date that are completed
    const oldBackups = await db.select()
      .from(backups)
      .where(
        and(
          eq(backups.status, "completed"),
          lt(backups.createdAt, cutoffDate)
        )
      );

    const toDelete: Backup[] = [];
    const toSkip: Backup[] = [];

    for (const backup of oldBackups) {
      let shouldDelete = true;

      // Check if backup has labels and protectLabeled is enabled
      if (policy.protectLabeled) {
        const labels = await db.select()
          .from(backupLabelAssignments)
          .where(eq(backupLabelAssignments.backupId, backup.id));
        
        if (labels.length > 0) {
          shouldDelete = false;
        }
      }

      // Check if backup is manual and protectManual is enabled
      if (shouldDelete && policy.protectManual && backup.triggerType === "manual") {
        shouldDelete = false;
      }

      if (shouldDelete) {
        toDelete.push(backup);
      } else {
        toSkip.push(backup);
      }
    }

    return { toDelete, toSkip, policy };
  } catch (error: any) {
    console.error("[BackupService] Failed to preview retention policy:", error);
    return { toDelete: [], toSkip: [], policy: await getRetentionPolicy() };
  }
}


// ============ ACTIVITY LOG FUNCTIONS ============

export type ActivityType = 
  | "backup_created"
  | "backup_deleted"
  | "backup_restored"
  | "integrity_check"
  | "retention_cleanup"
  | "backup_downloaded"
  | "label_assigned"
  | "label_removed"
  | "notes_updated"
  | "schedule_changed";

export interface ActivityLogEntry {
  activityType: ActivityType;
  backupId?: number;
  backupName?: string;
  userId: number;
  userName?: string;
  details?: Record<string, any>;
  status?: "success" | "failed" | "warning";
  ipAddress?: string;
  userAgent?: string;
}

export async function logBackupActivity(entry: ActivityLogEntry): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.warn("[BackupService] Cannot log activity: database not available");
    return false;
  }

  try {
    await db.insert(backupActivityLogs).values({
      activityType: entry.activityType,
      backupId: entry.backupId || null,
      backupName: entry.backupName || null,
      userId: entry.userId,
      userName: entry.userName || null,
      details: entry.details ? JSON.stringify(entry.details) : null,
      status: entry.status || "success",
      ipAddress: entry.ipAddress || null,
      userAgent: entry.userAgent || null,
    });
    return true;
  } catch (error) {
    console.error("[BackupService] Failed to log activity:", error);
    return false;
  }
}

export interface ActivityLogFilter {
  activityType?: ActivityType;
  backupId?: number;
  userId?: number;
  status?: "success" | "failed" | "warning";
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface ActivityLogResult {
  logs: BackupActivityLog[];
  total: number;
  hasMore: boolean;
}

export async function getActivityLogs(filter: ActivityLogFilter = {}): Promise<ActivityLogResult> {
  const db = await getDb();
  if (!db) {
    return { logs: [], total: 0, hasMore: false };
  }

  try {
    const limit = filter.limit || 50;
    const offset = filter.offset || 0;

    // Build conditions array
    const conditions: any[] = [];
    
    if (filter.activityType) {
      conditions.push(eq(backupActivityLogs.activityType, filter.activityType));
    }
    if (filter.backupId) {
      conditions.push(eq(backupActivityLogs.backupId, filter.backupId));
    }
    if (filter.userId) {
      conditions.push(eq(backupActivityLogs.userId, filter.userId));
    }
    if (filter.status) {
      conditions.push(eq(backupActivityLogs.status, filter.status));
    }
    if (filter.startDate) {
      conditions.push(sql`${backupActivityLogs.createdAt} >= ${filter.startDate}`);
    }
    if (filter.endDate) {
      conditions.push(sql`${backupActivityLogs.createdAt} <= ${filter.endDate}`);
    }

    // Get total count
    let countQuery = db.select({ count: sql<number>`count(*)` }).from(backupActivityLogs);
    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions)) as any;
    }
    const [countResult] = await countQuery;
    const total = Number(countResult?.count || 0);

    // Get logs with pagination
    let logsQuery = db.select().from(backupActivityLogs);
    if (conditions.length > 0) {
      logsQuery = logsQuery.where(and(...conditions)) as any;
    }
    const logs = await logsQuery
      .orderBy(desc(backupActivityLogs.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      logs,
      total,
      hasMore: offset + logs.length < total,
    };
  } catch (error) {
    console.error("[BackupService] Failed to get activity logs:", error);
    return { logs: [], total: 0, hasMore: false };
  }
}

export async function getActivityLogById(id: number): Promise<BackupActivityLog | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const [log] = await db.select()
      .from(backupActivityLogs)
      .where(eq(backupActivityLogs.id, id));
    return log || null;
  } catch (error) {
    console.error("[BackupService] Failed to get activity log:", error);
    return null;
  }
}

export async function getActivityStats(): Promise<{
  totalActivities: number;
  todayActivities: number;
  successCount: number;
  failedCount: number;
  warningCount: number;
  activityBreakdown: Record<string, number>;
}> {
  const db = await getDb();
  if (!db) {
    return {
      totalActivities: 0,
      todayActivities: 0,
      successCount: 0,
      failedCount: 0,
      warningCount: 0,
      activityBreakdown: {},
    };
  }

  try {
    // Get all logs
    const allLogs = await db.select().from(backupActivityLogs);
    
    // Calculate today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Count today's activities
    const todayLogs = allLogs.filter(log => {
      const logDate = new Date(log.createdAt);
      return logDate >= today && logDate < tomorrow;
    });

    // Count by status
    const successCount = allLogs.filter(log => log.status === "success").length;
    const failedCount = allLogs.filter(log => log.status === "failed").length;
    const warningCount = allLogs.filter(log => log.status === "warning").length;

    // Count by activity type
    const activityBreakdown: Record<string, number> = {};
    for (const log of allLogs) {
      activityBreakdown[log.activityType] = (activityBreakdown[log.activityType] || 0) + 1;
    }

    return {
      totalActivities: allLogs.length,
      todayActivities: todayLogs.length,
      successCount,
      failedCount,
      warningCount,
      activityBreakdown,
    };
  } catch (error) {
    console.error("[BackupService] Failed to get activity stats:", error);
    return {
      totalActivities: 0,
      todayActivities: 0,
      successCount: 0,
      failedCount: 0,
      warningCount: 0,
      activityBreakdown: {},
    };
  }
}

// Export activity logs to CSV format
export async function exportActivityLogsToCSV(filter: ActivityLogFilter = {}): Promise<string> {
  const { logs } = await getActivityLogs({ ...filter, limit: 10000 }); // Get up to 10k logs

  const headers = [
    "ID",
    "Activity Type",
    "Backup ID",
    "Backup Name",
    "User ID",
    "User Name",
    "Status",
    "Details",
    "IP Address",
    "Created At"
  ];

  const rows = logs.map(log => [
    log.id.toString(),
    log.activityType,
    log.backupId?.toString() || "",
    log.backupName || "",
    log.userId.toString(),
    log.userName || "",
    log.status,
    log.details || "",
    log.ipAddress || "",
    log.createdAt.toISOString()
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
  ].join("\n");

  return csvContent;
}
