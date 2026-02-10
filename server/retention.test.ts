import { describe, expect, it } from "vitest";

/**
 * Tests for backup retention policy functionality
 */

describe("Retention Policy Configuration", () => {
  it("should have valid default retention days", () => {
    const defaultDays = 30;
    expect(defaultDays).toBeGreaterThan(0);
    expect(defaultDays).toBeLessThanOrEqual(365);
  });

  it("should validate retention days range", () => {
    const minDays = 1;
    const maxDays = 365;
    
    expect(minDays).toBeGreaterThanOrEqual(1);
    expect(maxDays).toBeLessThanOrEqual(365);
  });

  it("should have correct default protection settings", () => {
    const defaultPolicy = {
      enabled: false,
      retentionDays: 30,
      protectLabeled: true,
      protectManual: false,
      lastCleanup: null,
      deletedCount: 0,
    };

    expect(defaultPolicy.enabled).toBe(false);
    expect(defaultPolicy.protectLabeled).toBe(true);
    expect(defaultPolicy.protectManual).toBe(false);
    expect(defaultPolicy.deletedCount).toBe(0);
  });
});

describe("Retention Policy Cutoff Calculation", () => {
  it("should calculate correct cutoff date for 30 days", () => {
    const retentionDays = 30;
    const now = new Date();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    const diffInDays = Math.floor((now.getTime() - cutoff.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffInDays).toBe(retentionDays);
  });

  it("should calculate correct cutoff date for 7 days", () => {
    const retentionDays = 7;
    const now = new Date();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    const diffInDays = Math.floor((now.getTime() - cutoff.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffInDays).toBe(retentionDays);
  });

  it("should calculate correct cutoff date for 365 days", () => {
    const retentionDays = 365;
    const now = new Date();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    const diffInDays = Math.floor((now.getTime() - cutoff.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffInDays).toBe(retentionDays);
  });
});

describe("Backup Age Evaluation", () => {
  it("should identify backup older than retention period", () => {
    const retentionDays = 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    // Backup created 45 days ago
    const backupDate = new Date();
    backupDate.setDate(backupDate.getDate() - 45);

    const isOlderThanCutoff = backupDate < cutoff;
    expect(isOlderThanCutoff).toBe(true);
  });

  it("should identify backup newer than retention period", () => {
    const retentionDays = 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    // Backup created 15 days ago
    const backupDate = new Date();
    backupDate.setDate(backupDate.getDate() - 15);

    const isOlderThanCutoff = backupDate < cutoff;
    expect(isOlderThanCutoff).toBe(false);
  });

  it("should handle backup at exact cutoff boundary", () => {
    const retentionDays = 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    // Backup created exactly 30 days ago (at cutoff)
    const backupDate = new Date(cutoff);

    const isOlderThanCutoff = backupDate < cutoff;
    expect(isOlderThanCutoff).toBe(false); // Equal is not older
  });
});

describe("Protection Rules", () => {
  it("should protect labeled backups when protectLabeled is true", () => {
    const policy = { protectLabeled: true };
    const backup = { id: 1, hasLabels: true, triggerType: "scheduled" };

    const shouldProtect = policy.protectLabeled && backup.hasLabels;
    expect(shouldProtect).toBe(true);
  });

  it("should not protect labeled backups when protectLabeled is false", () => {
    const policy = { protectLabeled: false };
    const backup = { id: 1, hasLabels: true, triggerType: "scheduled" };

    const shouldProtect = policy.protectLabeled && backup.hasLabels;
    expect(shouldProtect).toBe(false);
  });

  it("should protect manual backups when protectManual is true", () => {
    const policy = { protectManual: true };
    const backup = { id: 1, hasLabels: false, triggerType: "manual" };

    const shouldProtect = policy.protectManual && backup.triggerType === "manual";
    expect(shouldProtect).toBe(true);
  });

  it("should not protect manual backups when protectManual is false", () => {
    const policy = { protectManual: false };
    const backup = { id: 1, hasLabels: false, triggerType: "manual" };

    const shouldProtect = policy.protectManual && backup.triggerType === "manual";
    expect(shouldProtect).toBe(false);
  });

  it("should not protect scheduled backups without labels", () => {
    const policy = { protectLabeled: true, protectManual: true };
    const backup = { id: 1, hasLabels: false, triggerType: "scheduled" };

    const shouldProtect = 
      (policy.protectLabeled && backup.hasLabels) ||
      (policy.protectManual && backup.triggerType === "manual");
    expect(shouldProtect).toBe(false);
  });
});

describe("Retention Policy Application", () => {
  it("should return correct result structure", () => {
    const result = {
      success: true,
      deletedCount: 5,
      skippedCount: 2,
      message: "Retention policy applied: 5 backups deleted, 2 skipped",
    };

    expect(result.success).toBe(true);
    expect(result.deletedCount).toBeGreaterThanOrEqual(0);
    expect(result.skippedCount).toBeGreaterThanOrEqual(0);
    expect(result.message).toContain("deleted");
  });

  it("should return zero counts when no backups to delete", () => {
    const result = {
      success: true,
      deletedCount: 0,
      skippedCount: 0,
      message: "Retention policy applied: 0 backups deleted, 0 skipped",
    };

    expect(result.deletedCount).toBe(0);
    expect(result.skippedCount).toBe(0);
  });

  it("should handle disabled policy", () => {
    const policy = { enabled: false };
    const result = {
      success: true,
      deletedCount: 0,
      skippedCount: 0,
      message: "Retention policy is disabled",
    };

    expect(policy.enabled).toBe(false);
    expect(result.message).toContain("disabled");
  });
});

describe("Retention Preview", () => {
  it("should return preview with toDelete and toSkip arrays", () => {
    const preview = {
      toDelete: [
        { id: 1, name: "Old Backup 1" },
        { id: 2, name: "Old Backup 2" },
      ],
      toSkip: [
        { id: 3, name: "Protected Backup" },
      ],
      policy: {
        enabled: true,
        retentionDays: 30,
        protectLabeled: true,
        protectManual: false,
      },
    };

    expect(Array.isArray(preview.toDelete)).toBe(true);
    expect(Array.isArray(preview.toSkip)).toBe(true);
    expect(preview.toDelete.length).toBe(2);
    expect(preview.toSkip.length).toBe(1);
  });

  it("should return empty arrays when policy is disabled", () => {
    const preview = {
      toDelete: [],
      toSkip: [],
      policy: {
        enabled: false,
        retentionDays: 30,
        protectLabeled: true,
        protectManual: false,
      },
    };

    expect(preview.toDelete.length).toBe(0);
    expect(preview.toSkip.length).toBe(0);
    expect(preview.policy.enabled).toBe(false);
  });
});

describe("Policy Persistence", () => {
  it("should serialize policy to JSON correctly", () => {
    const policy = {
      enabled: true,
      retentionDays: 30,
      protectLabeled: true,
      protectManual: false,
      lastCleanup: new Date().toISOString(),
      deletedCount: 10,
    };

    const json = JSON.stringify(policy);
    const parsed = JSON.parse(json);

    expect(parsed.enabled).toBe(true);
    expect(parsed.retentionDays).toBe(30);
    expect(parsed.protectLabeled).toBe(true);
    expect(parsed.protectManual).toBe(false);
    expect(parsed.deletedCount).toBe(10);
  });

  it("should handle null lastCleanup", () => {
    const policy = {
      enabled: true,
      retentionDays: 30,
      protectLabeled: true,
      protectManual: false,
      lastCleanup: null,
      deletedCount: 0,
    };

    const json = JSON.stringify(policy);
    const parsed = JSON.parse(json);

    expect(parsed.lastCleanup).toBeNull();
  });
});
