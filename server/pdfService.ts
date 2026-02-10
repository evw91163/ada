import PDFDocument from 'pdfkit';

interface ActivityLogEntry {
  id: number;
  activityType: string;
  backupId: number | null;
  backupName?: string | null;
  status: string;
  details: string | null;
  userId: number;
  userName?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date;
}

interface ActivityLogPDFOptions {
  logs: ActivityLogEntry[];
  filters: {
    activityType?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  };
  stats?: {
    totalActivities: number;
    todayActivities: number;
    successCount: number;
    failedCount: number;
    warningCount: number;
    activityBreakdown: Record<string, number>;
  };
}

/**
 * Generate a PDF report for activity logs
 */
export async function generateActivityLogPDF(options: ActivityLogPDFOptions): Promise<Buffer> {
  const { logs, filters, stats } = options;
  
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: 'Backup Activity Log Report',
          Author: 'American Donut Association',
          Subject: 'Backup Activity Log',
          CreationDate: new Date(),
        }
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(24).fillColor('#D2691E').text('American Donut Association', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(18).fillColor('#333').text('Backup Activity Log Report', { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor('#666').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.moveDown(1);

      // Filters section
      doc.fontSize(12).fillColor('#333').text('Report Filters:', { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor('#666');
      
      if (filters.activityType && filters.activityType !== 'all') {
        doc.text(`Activity Type: ${formatActivityType(filters.activityType)}`);
      } else {
        doc.text('Activity Type: All');
      }
      
      if (filters.status && filters.status !== 'all') {
        doc.text(`Status: ${filters.status.charAt(0).toUpperCase() + filters.status.slice(1)}`);
      } else {
        doc.text('Status: All');
      }
      
      if (filters.startDate) {
        doc.text(`Start Date: ${new Date(filters.startDate).toLocaleDateString()}`);
      }
      
      if (filters.endDate) {
        doc.text(`End Date: ${new Date(filters.endDate).toLocaleDateString()}`);
      }
      
      doc.moveDown(1);

      // Statistics section
      if (stats) {
        doc.fontSize(12).fillColor('#333').text('Summary Statistics:', { underline: true });
        doc.moveDown(0.3);
        doc.fontSize(10).fillColor('#666');
        doc.text(`Total Activities: ${stats.totalActivities}`);
        doc.text(`Today's Activities: ${stats.todayActivities}`);
        
        doc.moveDown(0.3);
        doc.text('By Status:');
        doc.text(`  • Success: ${stats.successCount}`);
        doc.text(`  • Failed: ${stats.failedCount}`);
        doc.text(`  • Warning: ${stats.warningCount}`);
        
        if (stats.activityBreakdown && Object.keys(stats.activityBreakdown).length > 0) {
          doc.moveDown(0.3);
          doc.text('By Activity Type:');
          Object.entries(stats.activityBreakdown).forEach(([type, count]) => {
            doc.text(`  • ${formatActivityType(type)}: ${count}`);
          });
        }
        
        doc.moveDown(1);
      }

      // Activity log table
      doc.fontSize(12).fillColor('#333').text('Activity Log Entries:', { underline: true });
      doc.moveDown(0.5);

      if (logs.length === 0) {
        doc.fontSize(10).fillColor('#666').text('No activity log entries found matching the specified filters.');
      } else {
        // Table header
        const tableTop = doc.y;
        const colWidths = [80, 100, 70, 80, 165];
        const headers = ['Date/Time', 'Activity', 'Status', 'Backup', 'Details'];
        
        doc.fontSize(9).fillColor('#333');
        let xPos = 50;
        headers.forEach((header, i) => {
          doc.text(header, xPos, tableTop, { width: colWidths[i], align: 'left' });
          xPos += colWidths[i];
        });
        
        doc.moveDown(0.5);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#ccc');
        doc.moveDown(0.3);

        // Table rows
        logs.forEach((log, index) => {
          // Check if we need a new page
          if (doc.y > 700) {
            doc.addPage();
            doc.fontSize(10).fillColor('#666').text('Activity Log Report (continued)', { align: 'center' });
            doc.moveDown(1);
          }

          const rowY = doc.y;
          doc.fontSize(8).fillColor('#333');
          
          xPos = 50;
          
          // Date/Time
          const dateStr = log.createdAt ? new Date(log.createdAt).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }) : 'N/A';
          doc.text(dateStr, xPos, rowY, { width: colWidths[0], align: 'left' });
          xPos += colWidths[0];
          
          // Activity Type
          doc.text(formatActivityType(log.activityType), xPos, rowY, { width: colWidths[1], align: 'left' });
          xPos += colWidths[1];
          
          // Status with color
          const statusColor = log.status === 'success' ? '#22c55e' : 
                             log.status === 'failed' ? '#ef4444' : '#666';
          doc.fillColor(statusColor).text(
            log.status.charAt(0).toUpperCase() + log.status.slice(1), 
            xPos, rowY, 
            { width: colWidths[2], align: 'left' }
          );
          doc.fillColor('#333');
          xPos += colWidths[2];
          
          // Backup Name
          doc.text(log.backupName || '-', xPos, rowY, { width: colWidths[3], align: 'left' });
          xPos += colWidths[3];
          
          // Details (truncated)
          const details = log.details ? 
            (log.details.length > 40 ? log.details.substring(0, 37) + '...' : log.details) : 
            '-';
          doc.text(details, xPos, rowY, { width: colWidths[4], align: 'left' });
          
          doc.moveDown(0.8);
          
          // Add subtle row separator every 5 rows
          if ((index + 1) % 5 === 0 && index < logs.length - 1) {
            doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#eee');
            doc.moveDown(0.3);
          }
        });
      }

      // Footer
      doc.moveDown(2);
      doc.fontSize(8).fillColor('#999').text(
        `Report generated by American Donut Association Backup System | Total entries: ${logs.length}`,
        { align: 'center' }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Format activity type for display
 */
function formatActivityType(type: string): string {
  const typeMap: Record<string, string> = {
    'create': 'Backup Created',
    'delete': 'Backup Deleted',
    'restore': 'Backup Restored',
    'integrity_check': 'Integrity Check',
    'retention_cleanup': 'Retention Cleanup',
    'download': 'Backup Downloaded',
    'label_change': 'Label Changed',
    'notes_update': 'Notes Updated',
    'schedule_change': 'Schedule Changed',
  };
  return typeMap[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}
