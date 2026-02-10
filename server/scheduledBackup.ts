import { createBackup, getBackupSetting, setBackupSetting, applyRetentionPolicy, getRetentionPolicy } from "./backupService";
import { notifyOwner } from "./_core/notification";

// Scheduled backup configuration
interface ScheduleConfig {
  enabled: boolean;
  cronExpression: string; // Simplified: "day hour minute" format
  backupType: "full" | "database";
  description: string;
}

// Default schedule: Sunday at 2:00 AM
const DEFAULT_SCHEDULE: ScheduleConfig = {
  enabled: true,
  cronExpression: "0 2 * * 0", // Standard cron: minute hour day month dayOfWeek (0 = Sunday)
  backupType: "full",
  description: "Weekly full backup - Sunday 2:00 AM",
};

// Parse cron expression to check if it should run now
function shouldRunNow(cronExpression: string): boolean {
  const now = new Date();
  const parts = cronExpression.split(" ");
  
  if (parts.length !== 5) return false;
  
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  
  // Check minute
  if (minute !== "*" && parseInt(minute) !== now.getMinutes()) return false;
  
  // Check hour
  if (hour !== "*" && parseInt(hour) !== now.getHours()) return false;
  
  // Check day of month
  if (dayOfMonth !== "*" && parseInt(dayOfMonth) !== now.getDate()) return false;
  
  // Check month (1-12 in cron, 0-11 in JS)
  if (month !== "*" && parseInt(month) !== now.getMonth() + 1) return false;
  
  // Check day of week (0 = Sunday in both cron and JS getDay())
  if (dayOfWeek !== "*" && parseInt(dayOfWeek) !== now.getDay()) return false;
  
  return true;
}

// Get next scheduled run time
function getNextRunTime(cronExpression: string): Date {
  const parts = cronExpression.split(" ");
  if (parts.length !== 5) return new Date();
  
  const [minute, hour, , , dayOfWeek] = parts;
  const now = new Date();
  const next = new Date(now);
  
  // Set the time
  next.setMinutes(parseInt(minute) || 0);
  next.setHours(parseInt(hour) || 0);
  next.setSeconds(0);
  next.setMilliseconds(0);
  
  // If dayOfWeek is specified (for weekly backups)
  if (dayOfWeek !== "*") {
    const targetDay = parseInt(dayOfWeek);
    const currentDay = now.getDay();
    let daysUntilTarget = targetDay - currentDay;
    
    if (daysUntilTarget < 0) {
      daysUntilTarget += 7;
    } else if (daysUntilTarget === 0 && next <= now) {
      daysUntilTarget = 7;
    }
    
    next.setDate(now.getDate() + daysUntilTarget);
  } else if (next <= now) {
    // Daily backup - move to next day if time has passed
    next.setDate(next.getDate() + 1);
  }
  
  return next;
}

// Format cron expression to human readable
function formatSchedule(cronExpression: string): string {
  const parts = cronExpression.split(" ");
  if (parts.length !== 5) return "Invalid schedule";
  
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const hourNum = parseInt(hour);
  const minuteNum = parseInt(minute);
  const ampm = hourNum >= 12 ? "PM" : "AM";
  const hour12 = hourNum % 12 || 12;
  const timeStr = `${hour12}:${minuteNum.toString().padStart(2, "0")} ${ampm}`;
  
  if (dayOfWeek !== "*") {
    return `Every ${days[parseInt(dayOfWeek)]} at ${timeStr}`;
  } else if (dayOfMonth !== "*") {
    return `Day ${dayOfMonth} of each month at ${timeStr}`;
  } else {
    return `Daily at ${timeStr}`;
  }
}

// Scheduler state
let schedulerInterval: NodeJS.Timeout | null = null;
let lastRunTime: Date | null = null;
let isRunning = false;

// System user ID for automated backups
const SYSTEM_USER_ID = 1;

// Run scheduled backup
async function runScheduledBackup(config: ScheduleConfig): Promise<void> {
  if (isRunning) {
    console.log("[ScheduledBackup] Backup already in progress, skipping...");
    return;
  }
  
  isRunning = true;
  console.log(`[ScheduledBackup] Starting scheduled ${config.backupType} backup...`);
  
  try {
    const backup = await createBackup({
      name: `Scheduled Backup - ${new Date().toISOString().split("T")[0]}`,
      description: config.description,
      backupType: config.backupType,
      triggerType: "scheduled",
      createdById: SYSTEM_USER_ID,
    });
    
    if (backup) {
      console.log(`[ScheduledBackup] Backup completed successfully. ID: ${backup.id}`);
      lastRunTime = new Date();
      await setBackupSetting("last_scheduled_backup", lastRunTime.toISOString(), SYSTEM_USER_ID);
      
      // Apply retention policy after successful backup
      const retentionPolicy = await getRetentionPolicy();
      if (retentionPolicy.enabled) {
        console.log(`[ScheduledBackup] Applying retention policy (${retentionPolicy.retentionDays} days)...`);
        const retentionResult = await applyRetentionPolicy();
        console.log(`[ScheduledBackup] Retention: ${retentionResult.message}`);
      }
    } else {
      console.error("[ScheduledBackup] Backup failed - no backup returned");
    }
  } catch (error) {
    console.error("[ScheduledBackup] Backup failed:", error);
    
    // Send notification to admin about backup failure
    try {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await notifyOwner({
        title: `[ADA] Backup Failed - ${new Date().toLocaleString()}`,
        content: `A scheduled ${config.backupType} backup has failed.\n\nError: ${errorMessage}\n\nSchedule: ${config.description}\n\nPlease check the backup system and resolve any issues. You can manually trigger a backup from the Admin Panel > Backup & Recovery section.`,
      });
      console.log("[ScheduledBackup] Failure notification sent to admin");
    } catch (notifyError) {
      console.error("[ScheduledBackup] Failed to send failure notification:", notifyError);
    }
  } finally {
    isRunning = false;
  }
}

// Check and run backup if scheduled
async function checkAndRunBackup(): Promise<void> {
  try {
    const enabledStr = await getBackupSetting("scheduled_backup_enabled");
    const enabled = enabledStr !== "false"; // Default to enabled
    
    if (!enabled) return;
    
    const cronExpression = await getBackupSetting("scheduled_backup_cron") || DEFAULT_SCHEDULE.cronExpression;
    const backupType = (await getBackupSetting("scheduled_backup_type") || DEFAULT_SCHEDULE.backupType) as "full" | "database";
    
    if (shouldRunNow(cronExpression)) {
      // Check if we already ran this minute
      const lastRunStr = await getBackupSetting("last_scheduled_backup");
      if (lastRunStr) {
        const lastRun = new Date(lastRunStr);
        const now = new Date();
        // Don't run if we ran in the last 59 seconds
        if (now.getTime() - lastRun.getTime() < 59000) {
          return;
        }
      }
      
      await runScheduledBackup({
        enabled: true,
        cronExpression,
        backupType,
        description: `Scheduled ${backupType} backup`,
      });
    }
  } catch (error) {
    console.error("[ScheduledBackup] Error checking schedule:", error);
  }
}

// Start the scheduler
export function startBackupScheduler(): void {
  if (schedulerInterval) {
    console.log("[ScheduledBackup] Scheduler already running");
    return;
  }
  
  console.log("[ScheduledBackup] Starting backup scheduler...");
  
  // Check every minute
  schedulerInterval = setInterval(checkAndRunBackup, 60000);
  
  // Also check immediately on startup
  checkAndRunBackup();
  
  console.log("[ScheduledBackup] Scheduler started - checking every minute");
}

// Stop the scheduler
export function stopBackupScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log("[ScheduledBackup] Scheduler stopped");
  }
}

// Get scheduler status
export async function getSchedulerStatus(): Promise<{
  enabled: boolean;
  cronExpression: string;
  humanReadable: string;
  backupType: string;
  nextRun: Date;
  lastRun: Date | null;
  isRunning: boolean;
}> {
  const enabledStr = await getBackupSetting("scheduled_backup_enabled");
  const enabled = enabledStr !== "false";
  const cronExpression = await getBackupSetting("scheduled_backup_cron") || DEFAULT_SCHEDULE.cronExpression;
  const backupType = await getBackupSetting("scheduled_backup_type") || DEFAULT_SCHEDULE.backupType;
  const lastRunStr = await getBackupSetting("last_scheduled_backup");
  
  return {
    enabled,
    cronExpression,
    humanReadable: formatSchedule(cronExpression),
    backupType,
    nextRun: getNextRunTime(cronExpression),
    lastRun: lastRunStr ? new Date(lastRunStr) : null,
    isRunning,
  };
}

// Configure the scheduler
export async function configureScheduler(
  userId: number,
  options: {
    enabled?: boolean;
    cronExpression?: string;
    backupType?: "full" | "database";
  }
): Promise<void> {
  if (options.enabled !== undefined) {
    await setBackupSetting("scheduled_backup_enabled", String(options.enabled), userId);
  }
  if (options.cronExpression) {
    await setBackupSetting("scheduled_backup_cron", options.cronExpression, userId);
  }
  if (options.backupType) {
    await setBackupSetting("scheduled_backup_type", options.backupType, userId);
  }
  
  console.log("[ScheduledBackup] Configuration updated:", options);
}

// Initialize with default Sunday 2 AM schedule
export async function initializeDefaultSchedule(userId: number): Promise<void> {
  const existingCron = await getBackupSetting("scheduled_backup_cron");
  
  if (!existingCron) {
    console.log("[ScheduledBackup] Initializing default schedule: Sunday 2:00 AM");
    await configureScheduler(userId, {
      enabled: true,
      cronExpression: DEFAULT_SCHEDULE.cronExpression,
      backupType: DEFAULT_SCHEDULE.backupType,
    });
  }
}
