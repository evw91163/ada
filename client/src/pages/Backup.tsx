import Layout from "@/components/Layout";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import {
  Shield,
  ShieldCheck,
  Database,
  Download,
  Upload,
  History,
  Settings,
  HardDrive,
  RefreshCw,
  Trash2,
  Eye,
  RotateCcw,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Plus,
  Calendar,
  Play,
  Pause,
  FileCheck,
  Loader2,
  Tag,
  Pencil,
  StickyNote,
  X,
  Trash,
  ShieldAlert,
  Activity,
  FileText,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function ScheduleTab() {
  const utils = trpc.useUtils();
  const { data: schedulerStatus, isLoading } = trpc.backup.getSchedulerStatus.useQuery();
  
  const configureMutation = trpc.backup.configureScheduler.useMutation({
    onSuccess: () => {
      utils.backup.getSchedulerStatus.invalidate();
      toast.success("Schedule updated successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const toggleScheduler = () => {
    configureMutation.mutate({ enabled: !schedulerStatus?.enabled });
  };

  const updateBackupType = (type: "full" | "database") => {
    configureMutation.mutate({ backupType: type });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Scheduled Backups</CardTitle>
            <CardDescription>Configure automatic backup schedule</CardDescription>
          </div>
          <Button
            variant={schedulerStatus?.enabled ? "default" : "outline"}
            onClick={toggleScheduler}
            disabled={configureMutation.isPending}
          >
            {schedulerStatus?.enabled ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Disable
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Enable
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Current Schedule */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Current Schedule</h3>
            </div>
            <p className="text-lg font-medium text-primary">
              {schedulerStatus?.humanReadable || "Not configured"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Cron: {schedulerStatus?.cronExpression || "N/A"}
            </p>
          </div>

          {/* Status Info */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                {schedulerStatus?.enabled ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <h3 className="font-semibold">Status</h3>
              </div>
              <p className={schedulerStatus?.enabled ? "text-green-600" : "text-red-600"}>
                {schedulerStatus?.enabled ? "Active" : "Disabled"}
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-blue-500" />
                <h3 className="font-semibold">Next Run</h3>
              </div>
              <p className="text-sm">
                {schedulerStatus?.nextRun
                  ? format(new Date(schedulerStatus.nextRun), "PPpp")
                  : "N/A"}
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <History className="h-5 w-5 text-orange-500" />
                <h3 className="font-semibold">Last Run</h3>
              </div>
              <p className="text-sm">
                {schedulerStatus?.lastRun
                  ? format(new Date(schedulerStatus.lastRun), "PPpp")
                  : "Never"}
              </p>
            </div>
          </div>

          {/* Backup Type Selection */}
          <div className="space-y-2">
            <Label>Backup Type</Label>
            <Select
              value={schedulerStatus?.backupType || "full"}
              onValueChange={(v) => updateBackupType(v as "full" | "database")}
              disabled={configureMutation.isPending}
            >
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Full Backup (All Tables)</SelectItem>
                <SelectItem value="database">Database Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-700 dark:text-blue-300">Scheduled Backup Information</h4>
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                  Automatic backups run every Sunday at 2:00 AM. The scheduler checks every minute
                  and creates a timestamped backup with all database tables. Backups are stored
                  securely and can be used for rollback operations.
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RetentionTab() {
  const utils = trpc.useUtils();
  const { data: policy, isLoading } = trpc.backup.getRetentionPolicy.useQuery();
  const { data: preview } = trpc.backup.previewRetention.useQuery();
  
  const [retentionDays, setRetentionDays] = useState<number>(30);
  const [protectLabeled, setProtectLabeled] = useState(true);
  const [protectManual, setProtectManual] = useState(false);

  // Update local state when policy loads
  useState(() => {
    if (policy) {
      setRetentionDays(policy.retentionDays);
      setProtectLabeled(policy.protectLabeled);
      setProtectManual(policy.protectManual);
    }
  });

  const updateMutation = trpc.backup.updateRetentionPolicy.useMutation({
    onSuccess: () => {
      utils.backup.getRetentionPolicy.invalidate();
      utils.backup.previewRetention.invalidate();
      toast.success("Retention policy updated");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const applyMutation = trpc.backup.applyRetention.useMutation({
    onSuccess: (result) => {
      utils.backup.list.invalidate();
      utils.backup.stats.invalidate();
      utils.backup.previewRetention.invalidate();
      toast.success(`Retention applied: ${result.deletedCount} backups deleted, ${result.skippedCount} skipped`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const toggleEnabled = () => {
    updateMutation.mutate({ enabled: !policy?.enabled });
  };

  const saveSettings = () => {
    updateMutation.mutate({
      retentionDays,
      protectLabeled,
      protectManual,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trash className="h-5 w-5" />
          Retention Policy
        </CardTitle>
        <CardDescription>
          Automatically delete old backups to manage storage space
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <h3 className="font-semibold">Automatic Cleanup</h3>
            <p className="text-sm text-muted-foreground">
              Automatically delete backups older than the retention period
            </p>
          </div>
          <Button
            variant={policy?.enabled ? "default" : "outline"}
            onClick={toggleEnabled}
            disabled={updateMutation.isPending}
          >
            {policy?.enabled ? (
              <><Play className="h-4 w-4 mr-2" /> Enabled</>
            ) : (
              <><Pause className="h-4 w-4 mr-2" /> Disabled</>
            )}
          </Button>
        </div>

        {/* Settings */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="retentionDays">Retention Period (Days)</Label>
            <div className="flex items-center gap-4">
              <Input
                id="retentionDays"
                type="number"
                min={1}
                max={365}
                value={retentionDays}
                onChange={(e) => setRetentionDays(parseInt(e.target.value) || 30)}
                className="w-32"
              />
              <span className="text-sm text-muted-foreground">
                Backups older than {retentionDays} days will be deleted
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Protection Options</Label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="protectLabeled"
                checked={protectLabeled}
                onCheckedChange={(checked) => setProtectLabeled(checked === true)}
              />
              <label htmlFor="protectLabeled" className="text-sm cursor-pointer">
                Protect labeled backups from automatic deletion
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="protectManual"
                checked={protectManual}
                onCheckedChange={(checked) => setProtectManual(checked === true)}
              />
              <label htmlFor="protectManual" className="text-sm cursor-pointer">
                Protect manual backups from automatic deletion
              </label>
            </div>
          </div>

          <Button onClick={saveSettings} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
            ) : (
              "Save Settings"
            )}
          </Button>
        </div>

        {/* Preview */}
        {policy?.enabled && preview && (preview.toDelete.length > 0 || preview.toSkip.length > 0) && (
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-orange-500" />
              Retention Preview
            </h3>
            
            {preview.toDelete.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-red-600">
                  <strong>{preview.toDelete.length}</strong> backup(s) will be deleted:
                </p>
                <ul className="text-sm text-muted-foreground list-disc list-inside">
                  {preview.toDelete.slice(0, 5).map((b) => (
                    <li key={b.id}>{b.name} ({format(new Date(b.createdAt), "PP")})</li>
                  ))}
                  {preview.toDelete.length > 5 && (
                    <li>...and {preview.toDelete.length - 5} more</li>
                  )}
                </ul>
              </div>
            )}

            {preview.toSkip.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-green-600">
                  <strong>{preview.toSkip.length}</strong> backup(s) will be protected:
                </p>
                <ul className="text-sm text-muted-foreground list-disc list-inside">
                  {preview.toSkip.slice(0, 5).map((b) => (
                    <li key={b.id}>{b.name} ({format(new Date(b.createdAt), "PP")})</li>
                  ))}
                  {preview.toSkip.length > 5 && (
                    <li>...and {preview.toSkip.length - 5} more</li>
                  )}
                </ul>
              </div>
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={preview.toDelete.length === 0}>
                  <Trash className="h-4 w-4 mr-2" />
                  Apply Now
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Apply Retention Policy?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete {preview.toDelete.length} backup(s) older than {policy.retentionDays} days.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => applyMutation.mutate()}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {applyMutation.isPending ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Deleting...</>
                    ) : (
                      "Delete Backups"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <History className="h-5 w-5 text-blue-500" />
              <h3 className="font-semibold">Last Cleanup</h3>
            </div>
            <p className="text-sm">
              {policy?.lastCleanup
                ? format(new Date(policy.lastCleanup), "PPpp")
                : "Never"}
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Trash className="h-5 w-5 text-red-500" />
              <h3 className="font-semibold">Total Deleted</h3>
            </div>
            <p className="text-sm">
              {policy?.deletedCount || 0} backups
            </p>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
            <div>
              <h4 className="font-semibold text-amber-700 dark:text-amber-300">Retention Policy Information</h4>
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                The retention policy runs automatically after each scheduled backup. You can also
                apply it manually using the "Apply Now" button. Labeled and manual backups can be
                protected from automatic deletion using the options above.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ActivityLogTab() {
  const utils = trpc.useUtils();
  const [activityFilter, setActivityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [datePreset, setDatePreset] = useState<string>("all");
  const [page, setPage] = useState(0);
  const limit = 20;

  const applyDatePreset = (preset: string) => {
    setDatePreset(preset);
    const now = new Date();
    switch (preset) {
      case "today":
        setStartDate(startOfDay(now));
        setEndDate(endOfDay(now));
        break;
      case "7days":
        setStartDate(startOfDay(subDays(now, 7)));
        setEndDate(endOfDay(now));
        break;
      case "30days":
        setStartDate(startOfDay(subDays(now, 30)));
        setEndDate(endOfDay(now));
        break;
      case "90days":
        setStartDate(startOfDay(subDays(now, 90)));
        setEndDate(endOfDay(now));
        break;
      case "all":
      default:
        setStartDate(undefined);
        setEndDate(undefined);
        break;
    }
    setPage(0);
  };

  const { data: logs, isLoading } = trpc.backup.getActivityLogs.useQuery({
    activityType: activityFilter !== "all" ? activityFilter as any : undefined,
    status: statusFilter !== "all" ? statusFilter as any : undefined,
    startDate: startDate?.toISOString(),
    endDate: endDate?.toISOString(),
    limit,
    offset: page * limit,
  });

  const { data: stats } = trpc.backup.getActivityStats.useQuery();

  const exportMutation = trpc.backup.exportActivityLogs.useMutation({
    onSuccess: (data) => {
      const blob = new Blob([data.csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Activity logs exported to CSV");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const exportPDFMutation = trpc.backup.exportActivityLogsPDF.useMutation({
    onSuccess: (data) => {
      // Convert base64 to blob
      const byteCharacters = atob(data.pdf);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Activity report exported to PDF");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const activityTypeLabels: Record<string, string> = {
    backup_created: "Backup Created",
    backup_deleted: "Backup Deleted",
    backup_restored: "Backup Restored",
    integrity_check: "Integrity Check",
    retention_cleanup: "Retention Cleanup",
    backup_downloaded: "Backup Downloaded",
    label_assigned: "Label Assigned",
    label_removed: "Label Removed",
    notes_updated: "Notes Updated",
    schedule_changed: "Schedule Changed",
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "backup_created": return <Plus className="h-4 w-4 text-green-500" />;
      case "backup_deleted": return <Trash2 className="h-4 w-4 text-red-500" />;
      case "backup_restored": return <RotateCcw className="h-4 w-4 text-blue-500" />;
      case "integrity_check": return <ShieldCheck className="h-4 w-4 text-purple-500" />;
      case "retention_cleanup": return <Trash className="h-4 w-4 text-orange-500" />;
      case "backup_downloaded": return <Download className="h-4 w-4 text-cyan-500" />;
      case "label_assigned": return <Tag className="h-4 w-4 text-yellow-500" />;
      case "label_removed": return <X className="h-4 w-4 text-gray-500" />;
      case "notes_updated": return <Pencil className="h-4 w-4 text-indigo-500" />;
      case "schedule_changed": return <Calendar className="h-4 w-4 text-pink-500" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success": return <Badge variant="default" className="bg-green-500">Success</Badge>;
      case "failed": return <Badge variant="destructive">Failed</Badge>;
      case "warning": return <Badge variant="secondary" className="bg-yellow-500 text-white">Warning</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-64" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activity Log
            </CardTitle>
            <CardDescription>View all backup-related activities</CardDescription>
          </div>
          <Button
            variant="outline"
            onClick={() => exportMutation.mutate({
              activityType: activityFilter !== "all" ? activityFilter as any : undefined,
              status: statusFilter !== "all" ? statusFilter as any : undefined,
              startDate: startDate?.toISOString(),
              endDate: endDate?.toISOString(),
            })}
            disabled={exportMutation.isPending}
          >
            {exportMutation.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Exporting...</>
            ) : (
              <><FileText className="h-4 w-4 mr-2" /> Export CSV</>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => exportPDFMutation.mutate({
              activityType: activityFilter !== "all" ? activityFilter as any : undefined,
              status: statusFilter !== "all" ? statusFilter as any : undefined,
              startDate: startDate?.toISOString(),
              endDate: endDate?.toISOString(),
            })}
            disabled={exportPDFMutation.isPending}
          >
            {exportPDFMutation.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
            ) : (
              <><Download className="h-4 w-4 mr-2" /> Export PDF</>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">{stats.totalActivities}</p>
              <p className="text-xs text-muted-foreground">Total Activities</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">{stats.todayActivities}</p>
              <p className="text-xs text-muted-foreground">Today</p>
            </div>
            <div className="bg-green-50 dark:bg-green-950 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.successCount}</p>
              <p className="text-xs text-muted-foreground">Success</p>
            </div>
            <div className="bg-red-50 dark:bg-red-950 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-red-600">{stats.failedCount}</p>
              <p className="text-xs text-muted-foreground">Failed</p>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-950 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-yellow-600">{stats.warningCount}</p>
              <p className="text-xs text-muted-foreground">Warnings</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Label>Filter by:</Label>
          </div>
          <Select value={activityFilter} onValueChange={setActivityFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Activity Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Activities</SelectItem>
              {Object.entries(activityTypeLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date Range Filter */}
        <div className="flex flex-wrap gap-4 items-center border-t pt-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Label>Date Range:</Label>
          </div>
          <Select value={datePreset} onValueChange={applyDatePreset}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="90days">Last 90 Days</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
          
          {datePreset === "custom" && (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-40 justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PP") : "Start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => {
                      setStartDate(date ? startOfDay(date) : undefined);
                      setPage(0);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <span className="text-muted-foreground">to</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-40 justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PP") : "End date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => {
                      setEndDate(date ? endOfDay(date) : undefined);
                      setPage(0);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </>
          )}

          {(startDate || endDate) && (
            <Badge variant="secondary" className="gap-1">
              {startDate && format(startDate, "MMM d, yyyy")}
              {startDate && endDate && " - "}
              {endDate && format(endDate, "MMM d, yyyy")}
            </Badge>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setActivityFilter("all");
              setStatusFilter("all");
              setStartDate(undefined);
              setEndDate(undefined);
              setDatePreset("all");
              setPage(0);
            }}
          >
            Clear All Filters
          </Button>
        </div>

        {/* Activity Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Activity</TableHead>
                <TableHead>Backup</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs?.logs && logs.logs.length > 0 ? (
                logs.logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{getActivityIcon(log.activityType)}</TableCell>
                    <TableCell className="font-medium">
                      {activityTypeLabels[log.activityType] || log.activityType}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {log.backupName || (log.backupId ? `#${log.backupId}` : "-")}
                    </TableCell>
                    <TableCell>{log.userName || `User #${log.userId}`}</TableCell>
                    <TableCell>{getStatusBadge(log.status)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(log.createdAt), "PP p")}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No activity logs found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {logs && logs.total > limit && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {page * limit + 1} - {Math.min((page + 1) * limit, logs.total)} of {logs.total} activities
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={!logs.hasMore}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
    completed: { variant: "default", icon: <CheckCircle className="h-3 w-3 mr-1" /> },
    in_progress: { variant: "secondary", icon: <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> },
    pending: { variant: "outline", icon: <Clock className="h-3 w-3 mr-1" /> },
    failed: { variant: "destructive", icon: <XCircle className="h-3 w-3 mr-1" /> },
    deleted: { variant: "outline", icon: <Trash2 className="h-3 w-3 mr-1" /> },
  };
  const config = variants[status] || variants.pending;
  return (
    <Badge variant={config.variant} className="flex items-center w-fit">
      {config.icon}
      {status}
    </Badge>
  );
}

export default function Backup() {
  const { user, isAuthenticated, loading } = useAuth();
  const utils = trpc.useUtils();
  const isAdmin = user?.role === "admin";

  // State
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [backupName, setBackupName] = useState("");
  const [backupDescription, setBackupDescription] = useState("");
  const [backupType, setBackupType] = useState<"full" | "database">("full");
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [viewBackupId, setViewBackupId] = useState<number | null>(null);
  const [rollbackBackupId, setRollbackBackupId] = useState<number | null>(null);
  const [rollbackType, setRollbackType] = useState<"full" | "database" | "partial">("full");
  const [rollbackTables, setRollbackTables] = useState<string[]>([]);
  const [rollbackNotes, setRollbackNotes] = useState("");
  const [integrityCheckId, setIntegrityCheckId] = useState<number | null>(null);
  const [integrityResult, setIntegrityResult] = useState<any>(null);
  // Notes and Labels state
  const [notesDialogOpen, setNotesDialogOpen] = useState<number | null>(null);
  const [editingNotes, setEditingNotes] = useState("");
  const [labelsDialogOpen, setLabelsDialogOpen] = useState<number | null>(null);
  const [labelManageOpen, setLabelManageOpen] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#6B7280");
  const [newLabelDescription, setNewLabelDescription] = useState("");
  const [filterByLabel, setFilterByLabel] = useState<number | null>(null);

  // Queries
  const { data: backups, isLoading: backupsLoading } = trpc.backup.list.useQuery(
    { limit: 50 },
    { enabled: isAdmin }
  );

  const { data: stats, isLoading: statsLoading } = trpc.backup.stats.useQuery(
    undefined,
    { enabled: isAdmin }
  );

  const { data: availableTables } = trpc.backup.getAvailableTables.useQuery(
    undefined,
    { enabled: isAdmin }
  );

  const { data: backupDetails } = trpc.backup.getById.useQuery(
    { id: viewBackupId! },
    { enabled: !!viewBackupId && isAdmin }
  );

  const { data: rollbackHistory } = trpc.backup.rollbackHistory.useQuery(
    { limit: 50 },
    { enabled: isAdmin }
  );

  // Labels queries
  const { data: allLabels } = trpc.backup.listLabels.useQuery(
    undefined,
    { enabled: isAdmin }
  );

  const { data: backupLabels } = trpc.backup.getBackupLabels.useQuery(
    { backupId: labelsDialogOpen! },
    { enabled: !!labelsDialogOpen && isAdmin }
  );

  const { data: filteredBackups } = trpc.backup.getBackupsByLabel.useQuery(
    { labelId: filterByLabel! },
    { enabled: !!filterByLabel && isAdmin }
  );

  // Mutations
  const createBackupMutation = trpc.backup.create.useMutation({
    onSuccess: () => {
      utils.backup.list.invalidate();
      utils.backup.stats.invalidate();
      toast.success("Backup created successfully");
      setCreateDialogOpen(false);
      resetCreateForm();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteBackupMutation = trpc.backup.delete.useMutation({
    onSuccess: () => {
      utils.backup.list.invalidate();
      utils.backup.stats.invalidate();
      toast.success("Backup deleted");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const rollbackMutation = trpc.backup.rollback.useMutation({
    onSuccess: (result) => {
      utils.backup.rollbackHistory.invalidate();
      toast.success(result.message);
      setRollbackBackupId(null);
      resetRollbackForm();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const integrityCheckMutation = trpc.backup.verifyIntegrity.useMutation({
    onSuccess: (result) => {
      setIntegrityResult(result);
      if (result.status === "passed") {
        toast.success(result.summary);
      } else if (result.status === "warning") {
        toast.warning(result.summary);
      } else {
        toast.error(result.summary);
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Notes and Labels mutations
  const updateNotesMutation = trpc.backup.updateNotes.useMutation({
    onSuccess: () => {
      utils.backup.list.invalidate();
      utils.backup.getById.invalidate();
      toast.success("Notes updated");
      setNotesDialogOpen(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const createLabelMutation = trpc.backup.createLabel.useMutation({
    onSuccess: () => {
      utils.backup.listLabels.invalidate();
      toast.success("Label created");
      setNewLabelName("");
      setNewLabelColor("#6B7280");
      setNewLabelDescription("");
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteLabelMutation = trpc.backup.deleteLabel.useMutation({
    onSuccess: () => {
      utils.backup.listLabels.invalidate();
      utils.backup.getBackupLabels.invalidate();
      toast.success("Label deleted");
    },
    onError: (error) => toast.error(error.message),
  });

  const assignLabelMutation = trpc.backup.assignLabel.useMutation({
    onSuccess: () => {
      utils.backup.getBackupLabels.invalidate();
      utils.backup.list.invalidate();
      toast.success("Label assigned");
    },
    onError: (error) => toast.error(error.message),
  });

  const removeLabelMutation = trpc.backup.removeLabel.useMutation({
    onSuccess: () => {
      utils.backup.getBackupLabels.invalidate();
      utils.backup.list.invalidate();
      toast.success("Label removed");
    },
    onError: (error) => toast.error(error.message),
  });

  const downloadMutation = trpc.backup.download.useMutation({
    onSuccess: (result) => {
      // Create a blob and download it
      const blob = new Blob([result.json || ""], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename || "backup.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Backup downloaded successfully");
    },
    onError: (error) => toast.error(error.message),
  });

  const resetCreateForm = () => {
    setBackupName("");
    setBackupDescription("");
    setBackupType("full");
    setSelectedTables([]);
  };

  const resetRollbackForm = () => {
    setRollbackType("full");
    setRollbackTables([]);
    setRollbackNotes("");
  };

  const handleCreateBackup = () => {
    if (!backupName.trim()) {
      toast.error("Please enter a backup name");
      return;
    }
    createBackupMutation.mutate({
      name: backupName,
      description: backupDescription || undefined,
      backupType,
      tables: backupType === "database" && selectedTables.length > 0 ? selectedTables : undefined,
    });
  };

  const handleRollback = () => {
    if (!rollbackBackupId) return;
    rollbackMutation.mutate({
      backupId: rollbackBackupId,
      rollbackType,
      tables: rollbackType === "partial" ? rollbackTables : undefined,
      notes: rollbackNotes || undefined,
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="container py-8">
          <Skeleton className="h-96" />
        </div>
      </Layout>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <Layout>
        <div className="container py-8">
          <Card className="max-w-md mx-auto">
            <CardContent className="py-12 text-center">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Admin Access Required</h2>
              <p className="text-muted-foreground mb-4">
                You don't have permission to access the backup system.
              </p>
              <Button asChild>
                <Link href="/">Go Home</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Database className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">Backup & Recovery</h1>
              <p className="text-muted-foreground">Manage system backups and perform rollbacks</p>
            </div>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Backup
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Backup</DialogTitle>
                <DialogDescription>
                  Create a backup of your system data
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="backup-name">Backup Name *</Label>
                  <Input
                    id="backup-name"
                    placeholder="e.g., Pre-update backup"
                    value={backupName}
                    onChange={(e) => setBackupName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="backup-description">Description</Label>
                  <Textarea
                    id="backup-description"
                    placeholder="Optional description..."
                    value={backupDescription}
                    onChange={(e) => setBackupDescription(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Backup Type</Label>
                  <Select value={backupType} onValueChange={(v) => setBackupType(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Full Backup (All Tables)</SelectItem>
                      <SelectItem value="database">Database Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {backupType === "database" && availableTables && (
                  <div className="space-y-2">
                    <Label>Select Tables (optional - leave empty for all)</Label>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded p-2">
                      {availableTables.map((table) => (
                        <div key={table} className="flex items-center space-x-2">
                          <Checkbox
                            id={`table-${table}`}
                            checked={selectedTables.includes(table)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedTables([...selectedTables, table]);
                              } else {
                                setSelectedTables(selectedTables.filter((t) => t !== table));
                              }
                            }}
                          />
                          <label htmlFor={`table-${table}`} className="text-sm">
                            {table}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateBackup} disabled={createBackupMutation.isPending}>
                  {createBackupMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Backup"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <HardDrive className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{stats?.totalBackups || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Backups</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{stats?.completedBackups || 0}</p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Database className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{formatBytes(stats?.totalSize || 0)}</p>
                  <p className="text-sm text-muted-foreground">Total Size</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <RotateCcw className="h-8 w-8 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{stats?.totalRollbacks || 0}</p>
                  <p className="text-sm text-muted-foreground">Rollbacks</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="backups">
          <TabsList className="mb-6">
            <TabsTrigger value="backups" className="gap-2">
              <HardDrive className="h-4 w-4" />
              Backups
            </TabsTrigger>
            <TabsTrigger value="schedule" className="gap-2">
              <Calendar className="h-4 w-4" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              Rollback History
            </TabsTrigger>
            <TabsTrigger value="retention" className="gap-2">
              <Trash className="h-4 w-4" />
              Retention
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-2">
              <Activity className="h-4 w-4" />
              Activity Log
            </TabsTrigger>
          </TabsList>

          {/* Backups Tab */}
          <TabsContent value="backups">
            <Card>
              <CardHeader>
                <CardTitle>Backup History</CardTitle>
                <CardDescription>View and manage all system backups</CardDescription>
              </CardHeader>
              <CardContent>
                {backupsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-12" />
                    ))}
                  </div>
                ) : backups && backups.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Trigger</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Tables</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {backups.map((backup: any) => (
                        <TableRow key={backup.id}>
                          <TableCell className="font-medium">{backup.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{backup.backupType}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{backup.triggerType}</Badge>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={backup.status} />
                          </TableCell>
                          <TableCell>{formatBytes(backup.totalSize || 0)}</TableCell>
                          <TableCell>{backup.tableCount || 0}</TableCell>
                          <TableCell>
                            {format(new Date(backup.createdAt), "MMM d, yyyy HH:mm")}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setViewBackupId(backup.id)}
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setNotesDialogOpen(backup.id);
                                  setEditingNotes(backup.notes || "");
                                }}
                                title="Edit Notes"
                              >
                                <StickyNote className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setLabelsDialogOpen(backup.id)}
                                title="Manage Labels"
                              >
                                <Tag className="h-4 w-4" />
                              </Button>
                              {backup.status === "completed" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setIntegrityCheckId(backup.id);
                                      setIntegrityResult(null);
                                      integrityCheckMutation.mutate({ backupId: backup.id });
                                    }}
                                    disabled={integrityCheckMutation.isPending && integrityCheckId === backup.id}
                                    title="Verify Integrity"
                                  >
                                    {integrityCheckMutation.isPending && integrityCheckId === backup.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <ShieldCheck className="h-4 w-4" />
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setRollbackBackupId(backup.id)}
                                    title="Rollback"
                                  >
                                    <RotateCcw className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => downloadMutation.mutate({ backupId: backup.id })}
                                    disabled={downloadMutation.isPending}
                                    title="Download Backup"
                                  >
                                    {downloadMutation.isPending ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Download className="h-4 w-4" />
                                    )}
                                  </Button>
                                </>
                              )}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="destructive">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Backup?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will mark the backup as deleted. The backup data may still be recoverable.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteBackupMutation.mutate({ id: backup.id })}
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <HardDrive className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">No backups yet</p>
                    <Button onClick={() => setCreateDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Backup
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule">
            <ScheduleTab />
          </TabsContent>

          {/* Retention Tab */}
          <TabsContent value="retention">
            <RetentionTab />
          </TabsContent>

          {/* Activity Log Tab */}
          <TabsContent value="activity">
            <ActivityLogTab />
          </TabsContent>

          {/* Rollback History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Rollback History</CardTitle>
                <CardDescription>View all rollback operations</CardDescription>
              </CardHeader>
              <CardContent>
                {rollbackHistory && rollbackHistory.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Backup ID</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Items Restored</TableHead>
                        <TableHead>Items Failed</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rollbackHistory.map((rollback: any) => (
                        <TableRow key={rollback.id}>
                          <TableCell>#{rollback.backupId}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{rollback.rollbackType}</Badge>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={rollback.status} />
                          </TableCell>
                          <TableCell className="text-green-600">{rollback.itemsRestored}</TableCell>
                          <TableCell className="text-red-600">{rollback.itemsFailed}</TableCell>
                          <TableCell>
                            {format(new Date(rollback.createdAt), "MMM d, yyyy HH:mm")}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {rollback.notes || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No rollback operations yet
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* View Backup Details Dialog */}
        <Dialog open={!!viewBackupId} onOpenChange={() => setViewBackupId(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Backup Details</DialogTitle>
              <DialogDescription>
                {backupDetails?.backup?.name}
              </DialogDescription>
            </DialogHeader>
            {backupDetails && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <div className="mt-1">
                      <StatusBadge status={backupDetails.backup.status} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Type</Label>
                    <p className="mt-1">{backupDetails.backup.backupType}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Total Size</Label>
                    <p className="mt-1">{formatBytes(backupDetails.backup.totalSize || 0)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Tables</Label>
                    <p className="mt-1">{backupDetails.backup.tableCount}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Created</Label>
                    <p className="mt-1">
                      {format(new Date(backupDetails.backup.createdAt), "PPpp")}
                    </p>
                  </div>
                  {backupDetails.backup.completedAt && (
                    <div>
                      <Label className="text-muted-foreground">Completed</Label>
                      <p className="mt-1">
                        {format(new Date(backupDetails.backup.completedAt), "PPpp")}
                      </p>
                    </div>
                  )}
                </div>
                {backupDetails.backup.description && (
                  <div>
                    <Label className="text-muted-foreground">Description</Label>
                    <p className="mt-1">{backupDetails.backup.description}</p>
                  </div>
                )}
                {backupDetails.backup.errorMessage && (
                  <div className="p-3 bg-destructive/10 rounded border border-destructive/20">
                    <Label className="text-destructive">Error</Label>
                    <p className="mt-1 text-sm text-destructive">{backupDetails.backup.errorMessage}</p>
                  </div>
                )}
                <div>
                  <Label className="text-muted-foreground">Backup Items</Label>
                  <div className="mt-2 max-h-64 overflow-y-auto border rounded">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Table</TableHead>
                          <TableHead>Records</TableHead>
                          <TableHead>Size</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {backupDetails.items.map((item: any) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.itemName}</TableCell>
                            <TableCell>{item.recordCount ?? "-"}</TableCell>
                            <TableCell>{formatBytes(item.itemSize || 0)}</TableCell>
                            <TableCell>
                              <StatusBadge status={item.status} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Rollback Dialog */}
        <Dialog open={!!rollbackBackupId} onOpenChange={() => setRollbackBackupId(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Perform Rollback
              </DialogTitle>
              <DialogDescription>
                This will restore data from backup #{rollbackBackupId}. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Rollback Type</Label>
                <Select value={rollbackType} onValueChange={(v) => setRollbackType(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full Rollback (All Data)</SelectItem>
                    <SelectItem value="database">Database Only</SelectItem>
                    <SelectItem value="partial">Partial (Select Tables)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {rollbackType === "partial" && availableTables && (
                <div className="space-y-2">
                  <Label>Select Tables to Restore</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded p-2">
                    {availableTables.map((table) => (
                      <div key={table} className="flex items-center space-x-2">
                        <Checkbox
                          id={`rollback-table-${table}`}
                          checked={rollbackTables.includes(table)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setRollbackTables([...rollbackTables, table]);
                            } else {
                              setRollbackTables(rollbackTables.filter((t) => t !== table));
                            }
                          }}
                        />
                        <label htmlFor={`rollback-table-${table}`} className="text-sm">
                          {table}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="rollback-notes">Notes (optional)</Label>
                <Textarea
                  id="rollback-notes"
                  placeholder="Reason for rollback..."
                  value={rollbackNotes}
                  onChange={(e) => setRollbackNotes(e.target.value)}
                />
              </div>
              <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded border border-orange-200 dark:border-orange-800">
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  <strong>Warning:</strong> Rolling back will replace current data with backup data. 
                  Consider creating a new backup before proceeding.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRollbackBackupId(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRollback}
                disabled={rollbackMutation.isPending || (rollbackType === "partial" && rollbackTables.length === 0)}
              >
                {rollbackMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Rolling back...
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Perform Rollback
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Integrity Check Results Dialog */}
        <Dialog open={!!integrityResult} onOpenChange={() => setIntegrityResult(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {integrityResult?.status === "passed" && (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
                {integrityResult?.status === "warning" && (
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                )}
                {integrityResult?.status === "failed" && (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                Integrity Check Results
              </DialogTitle>
              <DialogDescription>
                Backup #{integrityResult?.backupId} - {integrityResult?.summary}
              </DialogDescription>
            </DialogHeader>
            {integrityResult && (
              <div className="space-y-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold">{integrityResult.checksPerformed}</p>
                    <p className="text-xs text-muted-foreground">Total Checks</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-green-600">{integrityResult.checksPassed}</p>
                    <p className="text-xs text-muted-foreground">Passed</p>
                  </div>
                  <div className="bg-yellow-50 dark:bg-yellow-950/30 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-yellow-600">{integrityResult.checksWarning}</p>
                    <p className="text-xs text-muted-foreground">Warnings</p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-red-600">{integrityResult.checksFailed}</p>
                    <p className="text-xs text-muted-foreground">Failed</p>
                  </div>
                </div>

                {/* Check Details */}
                <div>
                  <Label className="text-muted-foreground">Check Details</Label>
                  <div className="mt-2 max-h-80 overflow-y-auto border rounded">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Check</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Table</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Details</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {integrityResult.details.map((detail: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium text-sm">{detail.checkName}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {detail.checkType}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">{detail.tableName || "-"}</TableCell>
                            <TableCell>
                              {detail.status === "passed" && (
                                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Passed
                                </Badge>
                              )}
                              {detail.status === "warning" && (
                                <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Warning
                                </Badge>
                              )}
                              {detail.status === "failed" && (
                                <Badge variant="destructive">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Failed
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-sm max-w-xs truncate" title={detail.message}>
                              {detail.message}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Timestamp */}
                <p className="text-xs text-muted-foreground text-right">
                  Checked at: {integrityResult.checkedAt && format(new Date(integrityResult.checkedAt), "PPpp")}
                </p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Notes Dialog */}
      <Dialog open={!!notesDialogOpen} onOpenChange={(open) => !open && setNotesDialogOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Backup Notes</DialogTitle>
            <DialogDescription>
              Add descriptive notes to help identify this backup's purpose or contents.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Enter notes about this backup..."
              value={editingNotes}
              onChange={(e) => setEditingNotes(e.target.value)}
              rows={5}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesDialogOpen(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (notesDialogOpen) {
                  updateNotesMutation.mutate({
                    backupId: notesDialogOpen,
                    notes: editingNotes || null,
                  });
                }
              }}
              disabled={updateNotesMutation.isPending}
            >
              {updateNotesMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                "Save Notes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Labels Dialog */}
      <Dialog open={!!labelsDialogOpen} onOpenChange={(open) => !open && setLabelsDialogOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Labels</DialogTitle>
            <DialogDescription>
              Assign labels to categorize and organize this backup.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Current labels */}
            <div>
              <Label className="text-sm font-medium">Assigned Labels</Label>
              <div className="flex flex-wrap gap-2 mt-2 min-h-[32px]">
                {backupLabels && backupLabels.length > 0 ? (
                  backupLabels.map((label: any) => (
                    <Badge
                      key={label.id}
                      style={{ backgroundColor: label.color, color: '#fff' }}
                      className="flex items-center gap-1 pr-1"
                    >
                      {label.name}
                      <button
                        onClick={() => {
                          if (labelsDialogOpen) {
                            removeLabelMutation.mutate({
                              backupId: labelsDialogOpen,
                              labelId: label.id,
                            });
                          }
                        }}
                        className="hover:bg-white/20 rounded p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">No labels assigned</span>
                )}
              </div>
            </div>

            {/* Available labels */}
            <div>
              <Label className="text-sm font-medium">Available Labels</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {allLabels && allLabels.filter((l: any) => !backupLabels?.some((bl: any) => bl.id === l.id)).map((label: any) => (
                  <Badge
                    key={label.id}
                    variant="outline"
                    style={{ borderColor: label.color, color: label.color }}
                    className="cursor-pointer hover:opacity-80"
                    onClick={() => {
                      if (labelsDialogOpen) {
                        assignLabelMutation.mutate({
                          backupId: labelsDialogOpen,
                          labelId: label.id,
                        });
                      }
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {label.name}
                  </Badge>
                ))}
                {(!allLabels || allLabels.length === 0) && (
                  <span className="text-sm text-muted-foreground">No labels created yet</span>
                )}
              </div>
            </div>

            {/* Manage labels link */}
            <div className="pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setLabelsDialogOpen(null);
                  setLabelManageOpen(true);
                }}
              >
                <Settings className="h-4 w-4 mr-2" />
                Manage Labels
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Label Management Dialog */}
      <Dialog open={labelManageOpen} onOpenChange={setLabelManageOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage Labels</DialogTitle>
            <DialogDescription>
              Create and manage labels for organizing backups.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Create new label */}
            <div className="space-y-3 p-4 border rounded-lg">
              <Label className="text-sm font-medium">Create New Label</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Label name"
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  className="flex-1"
                />
                <input
                  type="color"
                  value={newLabelColor}
                  onChange={(e) => setNewLabelColor(e.target.value)}
                  className="w-10 h-10 rounded border cursor-pointer"
                />
              </div>
              <Input
                placeholder="Description (optional)"
                value={newLabelDescription}
                onChange={(e) => setNewLabelDescription(e.target.value)}
              />
              <Button
                onClick={() => {
                  if (newLabelName.trim()) {
                    createLabelMutation.mutate({
                      name: newLabelName.trim(),
                      color: newLabelColor,
                      description: newLabelDescription || undefined,
                    });
                  }
                }}
                disabled={!newLabelName.trim() || createLabelMutation.isPending}
                size="sm"
              >
                {createLabelMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</>
                ) : (
                  <><Plus className="h-4 w-4 mr-2" /> Create Label</>
                )}
              </Button>
            </div>

            {/* Existing labels */}
            <div>
              <Label className="text-sm font-medium">Existing Labels</Label>
              <div className="mt-2 space-y-2 max-h-[200px] overflow-y-auto">
                {allLabels && allLabels.length > 0 ? (
                  allLabels.map((label: any) => (
                    <div
                      key={label.id}
                      className="flex items-center justify-between p-2 border rounded"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: label.color }}
                        />
                        <span className="font-medium">{label.name}</span>
                        {label.description && (
                          <span className="text-sm text-muted-foreground">- {label.description}</span>
                        )}
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Label?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove the label "{label.name}" from all backups. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteLabelMutation.mutate({ id: label.id })}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No labels created yet
                  </p>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
