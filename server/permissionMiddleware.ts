/**
 * Permission Middleware for tRPC Procedures
 * 
 * This module provides middleware functions for enforcing RBAC permissions
 * in tRPC procedures across the American Donut Association application.
 */

import { TRPCError } from "@trpc/server";
import { 
  checkPermission, 
  ContentType, 
  Operation, 
  Role, 
  getEffectiveRole,
  canModerate,
  isAdmin 
} from "./permissions";

/**
 * Context type for permission checks
 */
interface PermissionContext {
  user: {
    id: number;
    role: string;
  } | null;
}

/**
 * Options for permission check
 */
interface PermissionCheckOptions {
  contentType: ContentType;
  operation: Operation;
  getOwnerId?: () => number | null | Promise<number | null>;
}

/**
 * Check if the current user has permission to perform an operation
 * Throws TRPCError if permission is denied
 */
export async function requirePermission(
  ctx: PermissionContext,
  options: PermissionCheckOptions
): Promise<{ requiresApproval: boolean }> {
  const { contentType, operation, getOwnerId } = options;
  
  const role = getEffectiveRole(ctx.user?.role);
  const userId = ctx.user?.id;
  
  // Determine if user is the owner of the content
  let isOwner = false;
  if (getOwnerId && userId) {
    const ownerId = await getOwnerId();
    isOwner = ownerId === userId;
  }
  
  const result = checkPermission(role, contentType, operation, isOwner);
  
  if (!result.allowed) {
    throw new TRPCError({
      code: role ? 'FORBIDDEN' : 'UNAUTHORIZED',
      message: result.reason || 'Permission denied',
    });
  }
  
  return {
    requiresApproval: result.reason?.includes('approval') || false,
  };
}

/**
 * Check if user can perform operation (returns boolean, doesn't throw)
 */
export async function hasPermission(
  ctx: PermissionContext,
  options: PermissionCheckOptions
): Promise<boolean> {
  const { contentType, operation, getOwnerId } = options;
  
  const role = getEffectiveRole(ctx.user?.role);
  const userId = ctx.user?.id;
  
  let isOwner = false;
  if (getOwnerId && userId) {
    const ownerId = await getOwnerId();
    isOwner = ownerId === userId;
  }
  
  const result = checkPermission(role, contentType, operation, isOwner);
  return result.allowed;
}

/**
 * Require user to be authenticated
 */
export function requireAuth(ctx: PermissionContext): asserts ctx is { user: NonNullable<PermissionContext['user']> } {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to perform this action',
    });
  }
}

/**
 * Require user to be a moderator or admin
 */
export function requireModerator(ctx: PermissionContext): void {
  requireAuth(ctx);
  const role = getEffectiveRole(ctx.user.role) as Role;
  
  if (!canModerate(role)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Moderator or admin access required',
    });
  }
}

/**
 * Require user to be an admin
 */
export function requireAdmin(ctx: PermissionContext): void {
  requireAuth(ctx);
  const role = getEffectiveRole(ctx.user.role) as Role;
  
  if (!isAdmin(role)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    });
  }
}

/**
 * Check if user can modify content (is owner or has elevated permissions)
 */
export async function canModifyContent(
  ctx: PermissionContext,
  contentType: ContentType,
  ownerId: number | null
): Promise<boolean> {
  if (!ctx.user) return false;
  
  const role = getEffectiveRole(ctx.user.role);
  const isOwner = ownerId === ctx.user.id;
  
  // Admins and moderators (for forum content) can modify any content
  if (role === 'admin') return true;
  if (role === 'moderator' && (contentType === 'threads' || contentType === 'posts')) return true;
  
  // Regular users can only modify their own content
  return isOwner;
}

/**
 * Get the effective permissions for the current user
 * Useful for UI to show/hide action buttons
 */
export function getUserPermissions(ctx: PermissionContext, contentType: ContentType) {
  const role = getEffectiveRole(ctx.user?.role);
  
  return {
    canCreate: checkPermission(role, contentType, 'create', true).allowed,
    canRead: checkPermission(role, contentType, 'read', false).allowed,
    canUpdate: checkPermission(role, contentType, 'update', true).allowed,
    canDelete: checkPermission(role, contentType, 'delete', true).allowed,
    canImport: checkPermission(role, contentType, 'import', false).allowed,
    canExport: checkPermission(role, contentType, 'export', false).allowed,
    isModerator: canModerate(role),
    isAdmin: isAdmin(role),
  };
}

/**
 * Permission check result type for API responses
 */
export interface PermissionResult {
  allowed: boolean;
  reason?: string;
  requiresApproval?: boolean;
}

/**
 * Batch check multiple permissions at once
 */
export function checkMultiplePermissions(
  ctx: PermissionContext,
  checks: Array<{ contentType: ContentType; operation: Operation; isOwner?: boolean }>
): PermissionResult[] {
  const role = getEffectiveRole(ctx.user?.role);
  
  return checks.map(({ contentType, operation, isOwner = false }) => {
    const result = checkPermission(role, contentType, operation, isOwner);
    return {
      allowed: result.allowed,
      reason: result.reason,
      requiresApproval: result.reason?.includes('approval'),
    };
  });
}
