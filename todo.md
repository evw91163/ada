# American Donut Association - Project TODO

## Core Infrastructure
- [x] Database schema for forum system (categories, threads, posts, replies)
- [x] User roles and permissions (admin/user)
- [x] tRPC API endpoints for all CRUDIE operations

## Navigation Structure
- [x] Main navigation with all sections
- [x] Forum page
- [x] Links page
- [x] For Sale page
- [x] Articles page
- [x] Advertisements page
- [x] Discounts page
- [x] Free Member Sign-up page
- [x] Events page
- [x] Help Wanted page

## Forum System (CRUDIE)
- [x] Create threads
- [x] Read posts/threads
- [x] Update content
- [x] Delete items
- [x] Import thread data
- [x] Export thread data

## Threaded Discussions
- [x] Post topics
- [x] Reply to posts
- [x] Nested conversation support

## Email Notifications
- [x] Notify on post replies
- [x] Notify on thread updates
- [x] Notify on new threads in followed categories
- [x] User notification preferences

## Category & Tagging System
- [x] Forum categories
- [x] Thread tagging
- [x] Category subscriptions

## User Features
- [x] User profile pages
- [x] Post history
- [x] Activity metrics
- [x] Registration date display

## Search Functionality
- [x] Search across threads
- [x] Search across posts
- [x] Filter by category/tag

## Moderation Tools
- [x] Admin content management
- [x] User management
- [x] Report handling
- [x] Content moderation actions

## Export Capabilities
- [x] Export threads to CSV
- [x] Export threads to JSON
- [x] Export posts to CSV/JSON
- [x] Export user data

## UI/UX
- [x] Responsive layout (desktop/mobile)
- [x] Clean community-focused aesthetic
- [x] Donut-themed design elements


## Bug Fixes
- [x] Fix DialogContent accessibility error - add DialogTitle to all dialog components


## User Registration Feature
- [x] Update database schema with new user profile fields
- [x] Add required fields: userid, password
- [x] Add optional fields: first name, last name, phone, address, city, state, zip code, email
- [x] Add business fields: donut shop name, years in business, number of stores, gross monthly income
- [x] Create registration API endpoints with validation
- [x] Build registration form UI
- [x] Add password hashing for security
- [x] Test registration flow


## RBAC Security Framework
- [x] Design permission system with CRUDIE operations
- [x] Update database schema with roles table (user, moderator, admin)
- [x] Create permissions configuration for all content types
- [x] Implement permission checking middleware
- [x] Configure User role permissions (read public content, create/edit own content)
- [x] Configure Moderator role permissions (manage forum threads and posts)
- [x] Configure Admin role permissions (full control over all content)
- [x] Update forum routes with permission checks
- [x] Update events routes with permission checks
- [x] Update articles routes with permission checks
- [x] Update discounts routes with permission checks
- [x] Update links routes with permission checks
- [x] Update help wanted routes with permission checks
- [x] Update for sale routes with permission checks
- [x] Update advertisements routes with permission checks
- [x] Build admin UI for role management
- [x] Add permission-based UI visibility controls
- [x] Write unit tests for permission system


## Backup and Rollback System
- [x] Design backup system architecture
- [x] Create backups database table for tracking backups
- [x] Create backup_items table for individual backup components
- [x] Implement database backup service (export all tables to JSON)
- [x] Implement file backup service (backup uploaded files/assets)
- [x] Create automatic backup triggers before system updates
- [x] Implement full system rollback functionality
- [x] Implement partial rollback (database only, files only, specific tables)
- [x] Build admin UI for backup management
- [x] Add backup history view with timestamps and sizes
- [x] Add rollback controls with confirmation dialogs
- [x] Add backup scheduling options
- [x] Write unit tests for backup system


## Scheduled Backup Configuration
- [x] Create scheduled backup service with cron-like scheduling
- [x] Configure weekly full backup every Sunday at 2 AM
- [x] Add backup scheduler to server startup
- [x] Update admin UI to show scheduled backup status
- [x] Test scheduled backup functionality


## Backup Integrity Testing
- [x] Create integrity verification service with checksum validation
- [x] Validate backup data structure and JSON format
- [x] Check for missing or corrupted tables in backup
- [x] Verify row counts match expected values
- [x] Add API endpoint for running integrity checks
- [x] Build UI for viewing integrity test results
- [x] Store integrity check history in database
- [x] Write unit tests for integrity verification


## Backup Notes and Labels
- [x] Add notes column to backups table
- [x] Add backup_labels table for custom labels
- [x] Create API endpoints for updating backup notes
- [x] Create API endpoints for managing labels (CRUD)
- [x] Build UI for adding/editing notes on backups
- [x] Build UI for assigning labels to backups
- [x] Add label filtering in backup list
- [x] Display notes and labels in backup details view
- [x] Write unit tests for notes and labels feature

## Backup Download Feature
- [x] Create API endpoint to generate downloadable backup data
- [x] Support JSON format for database backups
- [x] Include backup metadata in download
- [x] Add download button to backup table row
- [x] Add download option in backup details dialog
- [x] Handle large backups with streaming
- [x] Write unit tests for download feature

## Backup Retention Policy
- [x] Add retention settings to backup_settings table
- [x] Create retention policy cleanup function
- [x] Integrate cleanup with scheduled backup runs
- [x] Add manual cleanup trigger for admins
- [x] Build admin UI for configuring retention days
- [x] Add retention status display in backup dashboard
- [x] Protect labeled/pinned backups from auto-deletion
- [x] Write unit tests for retention policy

## Backup Activity Log Dashboard
- [x] Create backup_activity_logs database table
- [x] Add activity types: create, delete, restore, integrity_check, retention_cleanup
- [x] Create logBackupActivity service function
- [x] Create getActivityLogs function with filtering and pagination
- [x] Add API endpoints for activity log retrieval
- [x] Build admin dashboard UI with activity log table
- [x] Add filtering by activity type and date range
- [x] Add export activity logs to CSV
- [x] Write unit tests for activity log feature

## Activity Log Date Range Filtering
- [x] Add date picker inputs for start and end date
- [x] Integrate date range with activity log query
- [x] Add quick date range presets (Today, Last 7 days, Last 30 days, Last 90 days)
- [x] Add custom date range option with calendar pickers
- [x] Update CSV export to include date range filter
- [x] Test date range filtering functionality

## Activity Log PDF Export
- [x] Install PDF generation library (pdfkit)
- [x] Create PDF generation service for activity logs
- [x] Add API endpoint for PDF export with filters
- [x] Design professional PDF report layout
- [x] Add PDF export button to activity log UI
- [x] Include report metadata (date range, filters, generation time)
- [x] Test PDF export functionality


## Password Change Functionality
- [x] Add password change API endpoint (changePassword)
- [x] Add force password change API endpoint (forceChangePassword)
- [x] Add mustChangePassword query endpoint
- [x] Add admin create user endpoint (adminCreateUser)
- [x] Create password change UI page
- [x] Validate current password before allowing change
- [x] Hash new password securely
- [x] Add updateUserPassword db function
- [x] Add clearMustChangePassword db function
- [x] Add getUserByEmail db function

## Force Password Change on First Login
- [x] Add mustChangePassword field to users schema
- [x] Set flag to true for new accounts created by admin
- [x] Redirect users to password change page if flag is true
- [x] Clear flag after successful password change

## Login-Only Site Access
- [x] Create AuthGuard wrapper component
- [x] Protect all routes except login and signup pages
- [x] Redirect unauthenticated users to login page
- [x] Redirect users with mustChangePassword to change-password page

## Backup Failure Email Notifications
- [x] Add notifyOwner call when scheduled backup fails
- [x] Include backup details and error message in notification
- [x] Add notification for manual backup failures

## Create Admin Accounts
- [x] Create account for derrick@unitybakery.com with admin role
- [x] Create account for heather@unitybakery.com with admin role
- [x] Set mustChangePassword flag for both accounts
- [x] Send welcome notification with credentials and login link

## Unit Tests
- [x] Write tests for password change endpoints
- [x] Write tests for force password change flow
- [x] Write tests for admin create user endpoint
- [x] Write tests for backup failure notifications (covered in scheduledBackup.test.ts)

## Settings Page - Change Password Link
- [x] Add a dedicated Change Password section to the Settings page
- [x] Include link/button that navigates to /change-password
- [x] Show section only for local-login users (not OAuth users)
