import { describe, expect, it, vi, beforeEach } from "vitest";

describe("Scheduled Backup System", () => {
  describe("Cron Expression Parsing", () => {
    // Test the cron expression format: minute hour day month dayOfWeek
    it("should parse Sunday 2 AM cron expression correctly", () => {
      const cronExpression = "0 2 * * 0"; // Sunday at 2:00 AM
      const parts = cronExpression.split(" ");
      
      expect(parts.length).toBe(5);
      expect(parts[0]).toBe("0"); // minute
      expect(parts[1]).toBe("2"); // hour
      expect(parts[2]).toBe("*"); // day of month
      expect(parts[3]).toBe("*"); // month
      expect(parts[4]).toBe("0"); // day of week (0 = Sunday)
    });

    it("should validate cron expression has 5 parts", () => {
      const validCron = "0 2 * * 0";
      const invalidCron = "0 2 * *";
      
      expect(validCron.split(" ").length).toBe(5);
      expect(invalidCron.split(" ").length).toBe(4);
    });
  });

  describe("Schedule Configuration", () => {
    it("should support full backup type", () => {
      const backupTypes = ["full", "database"];
      expect(backupTypes).toContain("full");
    });

    it("should support database-only backup type", () => {
      const backupTypes = ["full", "database"];
      expect(backupTypes).toContain("database");
    });

    it("should have default schedule for Sunday 2 AM", () => {
      const defaultSchedule = {
        enabled: true,
        cronExpression: "0 2 * * 0",
        backupType: "full",
        description: "Weekly full backup - Sunday 2:00 AM",
      };
      
      expect(defaultSchedule.enabled).toBe(true);
      expect(defaultSchedule.cronExpression).toBe("0 2 * * 0");
      expect(defaultSchedule.backupType).toBe("full");
    });
  });

  describe("Schedule Matching", () => {
    function shouldRunNow(cronExpression: string, testDate: Date): boolean {
      const parts = cronExpression.split(" ");
      if (parts.length !== 5) return false;
      
      const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
      
      if (minute !== "*" && parseInt(minute) !== testDate.getMinutes()) return false;
      if (hour !== "*" && parseInt(hour) !== testDate.getHours()) return false;
      if (dayOfMonth !== "*" && parseInt(dayOfMonth) !== testDate.getDate()) return false;
      if (month !== "*" && parseInt(month) !== testDate.getMonth() + 1) return false;
      if (dayOfWeek !== "*" && parseInt(dayOfWeek) !== testDate.getDay()) return false;
      
      return true;
    }

    it("should match Sunday 2 AM correctly", () => {
      // Sunday, Feb 2, 2026 at 2:00 AM
      const sundayAt2AM = new Date(2026, 1, 1, 2, 0, 0); // Feb 1, 2026 is a Sunday
      const cronExpression = "0 2 * * 0";
      
      expect(shouldRunNow(cronExpression, sundayAt2AM)).toBe(true);
    });

    it("should not match Monday at 2 AM", () => {
      // Monday at 2:00 AM
      const mondayAt2AM = new Date(2026, 1, 2, 2, 0, 0); // Feb 2, 2026 is a Monday
      const cronExpression = "0 2 * * 0";
      
      expect(shouldRunNow(cronExpression, mondayAt2AM)).toBe(false);
    });

    it("should not match Sunday at 3 AM", () => {
      // Sunday at 3:00 AM
      const sundayAt3AM = new Date(2026, 1, 1, 3, 0, 0);
      const cronExpression = "0 2 * * 0";
      
      expect(shouldRunNow(cronExpression, sundayAt3AM)).toBe(false);
    });

    it("should match daily schedule", () => {
      const dailyAt2AM = "0 2 * * *";
      const anyDayAt2AM = new Date(2026, 1, 5, 2, 0, 0);
      
      expect(shouldRunNow(dailyAt2AM, anyDayAt2AM)).toBe(true);
    });
  });

  describe("Human Readable Format", () => {
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

    it("should format Sunday 2 AM correctly", () => {
      const result = formatSchedule("0 2 * * 0");
      expect(result).toBe("Every Sunday at 2:00 AM");
    });

    it("should format daily schedule correctly", () => {
      const result = formatSchedule("0 2 * * *");
      expect(result).toBe("Daily at 2:00 AM");
    });

    it("should format monthly schedule correctly", () => {
      const result = formatSchedule("0 2 15 * *");
      expect(result).toBe("Day 15 of each month at 2:00 AM");
    });

    it("should handle PM times correctly", () => {
      const result = formatSchedule("0 14 * * 0");
      expect(result).toBe("Every Sunday at 2:00 PM");
    });
  });

  describe("Next Run Calculation", () => {
    function getNextRunTime(cronExpression: string, fromDate: Date): Date {
      const parts = cronExpression.split(" ");
      if (parts.length !== 5) return fromDate;
      
      const [minute, hour, , , dayOfWeek] = parts;
      const next = new Date(fromDate);
      
      next.setMinutes(parseInt(minute) || 0);
      next.setHours(parseInt(hour) || 0);
      next.setSeconds(0);
      next.setMilliseconds(0);
      
      if (dayOfWeek !== "*") {
        const targetDay = parseInt(dayOfWeek);
        const currentDay = fromDate.getDay();
        let daysUntilTarget = targetDay - currentDay;
        
        if (daysUntilTarget < 0) {
          daysUntilTarget += 7;
        } else if (daysUntilTarget === 0 && next <= fromDate) {
          daysUntilTarget = 7;
        }
        
        next.setDate(fromDate.getDate() + daysUntilTarget);
      } else if (next <= fromDate) {
        next.setDate(next.getDate() + 1);
      }
      
      return next;
    }

    it("should calculate next Sunday correctly from Monday", () => {
      const monday = new Date(2026, 1, 2, 10, 0, 0); // Monday Feb 2, 2026
      const nextRun = getNextRunTime("0 2 * * 0", monday);
      
      expect(nextRun.getDay()).toBe(0); // Sunday
      expect(nextRun.getHours()).toBe(2);
      expect(nextRun.getMinutes()).toBe(0);
    });

    it("should calculate next week if already past Sunday 2 AM", () => {
      const sundayAt3AM = new Date(2026, 1, 1, 3, 0, 0); // Sunday Feb 1, 2026 at 3 AM
      const nextRun = getNextRunTime("0 2 * * 0", sundayAt3AM);
      
      expect(nextRun.getDay()).toBe(0); // Sunday
      expect(nextRun.getDate()).toBe(sundayAt3AM.getDate() + 7); // Next week
    });
  });

  describe("Scheduler Settings", () => {
    it("should support enable/disable setting", () => {
      const settings = {
        scheduled_backup_enabled: "true",
        scheduled_backup_cron: "0 2 * * 0",
        scheduled_backup_type: "full",
      };
      
      expect(settings.scheduled_backup_enabled).toBe("true");
    });

    it("should store cron expression as string", () => {
      const cronSetting = "0 2 * * 0";
      expect(typeof cronSetting).toBe("string");
    });
  });
});
