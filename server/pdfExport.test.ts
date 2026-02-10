import { describe, expect, it } from "vitest";
import { generateActivityLogPDF } from "./pdfService";

describe("PDF Export Service", () => {
  describe("generateActivityLogPDF", () => {
    it("should generate a PDF buffer with empty logs", async () => {
      const result = await generateActivityLogPDF({
        logs: [],
        filters: {},
      });

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
      // PDF files start with %PDF
      expect(result.toString('utf8', 0, 4)).toBe('%PDF');
    });

    it("should generate a PDF with activity log entries", async () => {
      const logs = [
        {
          id: 1,
          activityType: "backup_created",
          backupId: 1,
          backupName: "Test Backup",
          status: "success",
          details: "Created full backup",
          userId: 1,
          userName: "Admin User",
          ipAddress: "127.0.0.1",
          userAgent: "Mozilla/5.0",
          createdAt: new Date("2026-01-15T10:00:00Z"),
        },
        {
          id: 2,
          activityType: "integrity_check",
          backupId: 1,
          backupName: "Test Backup",
          status: "success",
          details: "All checks passed",
          userId: 1,
          userName: "Admin User",
          ipAddress: "127.0.0.1",
          userAgent: "Mozilla/5.0",
          createdAt: new Date("2026-01-15T11:00:00Z"),
        },
      ];

      const result = await generateActivityLogPDF({
        logs,
        filters: {
          activityType: "backup_created",
          status: "success",
        },
      });

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(100);
    });

    it("should include statistics in the PDF when provided", async () => {
      const result = await generateActivityLogPDF({
        logs: [],
        filters: {},
        stats: {
          totalActivities: 100,
          todayActivities: 5,
          successCount: 80,
          failedCount: 15,
          warningCount: 5,
          activityBreakdown: {
            backup_created: 50,
            backup_deleted: 20,
            integrity_check: 30,
          },
        },
      });

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it("should handle date range filters", async () => {
      const result = await generateActivityLogPDF({
        logs: [],
        filters: {
          startDate: "2026-01-01",
          endDate: "2026-01-31",
        },
      });

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it("should handle logs with missing optional fields", async () => {
      const logs = [
        {
          id: 1,
          activityType: "backup_created",
          backupId: null,
          status: "success",
          details: null,
          userId: 1,
          createdAt: new Date(),
        },
      ];

      const result = await generateActivityLogPDF({
        logs,
        filters: {},
      });

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it("should generate valid PDF header", async () => {
      const result = await generateActivityLogPDF({
        logs: [],
        filters: {},
      });

      // Check PDF magic number
      const header = result.slice(0, 8).toString('utf8');
      expect(header).toContain('%PDF');
    });

    it("should handle all activity types", async () => {
      const activityTypes = [
        "backup_created",
        "backup_deleted",
        "backup_restored",
        "integrity_check",
        "retention_cleanup",
        "backup_downloaded",
        "label_assigned",
        "label_removed",
        "notes_updated",
        "schedule_changed",
      ];

      const logs = activityTypes.map((type, index) => ({
        id: index + 1,
        activityType: type,
        backupId: 1,
        backupName: "Test",
        status: "success" as const,
        details: `Activity: ${type}`,
        userId: 1,
        userName: "Admin",
        ipAddress: "127.0.0.1",
        userAgent: "Test",
        createdAt: new Date(),
      }));

      const result = await generateActivityLogPDF({
        logs,
        filters: {},
      });

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(500);
    });

    it("should handle different status types", async () => {
      const logs = [
        {
          id: 1,
          activityType: "backup_created",
          backupId: 1,
          status: "success",
          details: null,
          userId: 1,
          createdAt: new Date(),
        },
        {
          id: 2,
          activityType: "backup_created",
          backupId: 2,
          status: "failed",
          details: "Error occurred",
          userId: 1,
          createdAt: new Date(),
        },
        {
          id: 3,
          activityType: "integrity_check",
          backupId: 3,
          status: "warning",
          details: "Minor issues found",
          userId: 1,
          createdAt: new Date(),
        },
      ];

      const result = await generateActivityLogPDF({
        logs,
        filters: {},
      });

      expect(result).toBeInstanceOf(Buffer);
    });
  });
});
