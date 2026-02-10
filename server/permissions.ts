/**
 * Role-Based Access Control (RBAC) Security Framework
 * 
 * This module defines the permission system for the American Donut Association.
 * It implements CRUDIE (Create, Read, Update, Delete, Import, Export) permissions
 * for all content types across three user roles: User, Moderator, and Admin.
 */

// Define all possible operations
export type Operation = 'create' | 'read' | 'update' | 'delete' | 'import' | 'export';

// Define all content types in the system
export type ContentType = 
  | 'threads'
  | 'posts'
  | 'categories'
  | 'events'
  | 'articles'
  | 'discounts'
  | 'links'
  | 'jobs'        // Help Wanted
  | 'listings'    // For Sale
  | 'advertisements'
  | 'users'
  | 'reports'
  | 'notifications';

// Define user roles
export type Role = 'user' | 'moderator' | 'admin';

// Permission definition type
export type Permission = {
  allowed: boolean;
  ownOnly?: boolean;  // If true, user can only perform action on their own content
  requiresApproval?: boolean;  // If true, content needs admin approval
};

// Permission matrix type
export type PermissionMatrix = {
  [K in ContentType]: {
    [O in Operation]: Permission;
  };
};

// Role permission configurations
export type RolePermissions = {
  [R in Role]: PermissionMatrix;
};

/**
 * Default permission (denied)
 */
const DENIED: Permission = { allowed: false };

/**
 * Full access permission
 */
const FULL_ACCESS: Permission = { allowed: true };

/**
 * Own content only permission
 */
const OWN_ONLY: Permission = { allowed: true, ownOnly: true };

/**
 * Requires approval permission
 */
const NEEDS_APPROVAL: Permission = { allowed: true, requiresApproval: true };

/**
 * Read-only permission
 */
const READ_ONLY: Permission = { allowed: true };

/**
 * User Role Permissions
 * - Can read all public content
 * - Can create their own content (some requires approval)
 * - Can update/delete only their own content
 * - Limited import/export capabilities
 */
const userPermissions: PermissionMatrix = {
  threads: {
    create: OWN_ONLY,
    read: READ_ONLY,
    update: OWN_ONLY,
    delete: OWN_ONLY,
    import: DENIED,
    export: READ_ONLY,  // Can export threads they can read
  },
  posts: {
    create: OWN_ONLY,
    read: READ_ONLY,
    update: OWN_ONLY,
    delete: OWN_ONLY,
    import: DENIED,
    export: READ_ONLY,
  },
  categories: {
    create: DENIED,
    read: READ_ONLY,
    update: DENIED,
    delete: DENIED,
    import: DENIED,
    export: READ_ONLY,
  },
  events: {
    create: NEEDS_APPROVAL,
    read: READ_ONLY,
    update: OWN_ONLY,
    delete: OWN_ONLY,
    import: DENIED,
    export: READ_ONLY,
  },
  articles: {
    create: NEEDS_APPROVAL,
    read: READ_ONLY,
    update: OWN_ONLY,
    delete: OWN_ONLY,
    import: DENIED,
    export: READ_ONLY,
  },
  discounts: {
    create: NEEDS_APPROVAL,
    read: READ_ONLY,
    update: OWN_ONLY,
    delete: OWN_ONLY,
    import: DENIED,
    export: READ_ONLY,
  },
  links: {
    create: NEEDS_APPROVAL,
    read: READ_ONLY,
    update: OWN_ONLY,
    delete: OWN_ONLY,
    import: DENIED,
    export: READ_ONLY,
  },
  jobs: {
    create: OWN_ONLY,
    read: READ_ONLY,
    update: OWN_ONLY,
    delete: OWN_ONLY,
    import: DENIED,
    export: READ_ONLY,
  },
  listings: {
    create: OWN_ONLY,
    read: READ_ONLY,
    update: OWN_ONLY,
    delete: OWN_ONLY,
    import: DENIED,
    export: READ_ONLY,
  },
  advertisements: {
    create: NEEDS_APPROVAL,
    read: READ_ONLY,
    update: OWN_ONLY,
    delete: OWN_ONLY,
    import: DENIED,
    export: DENIED,
  },
  users: {
    create: DENIED,  // Users are created through registration
    read: { allowed: true, ownOnly: true },  // Can view own profile fully, others limited
    update: OWN_ONLY,
    delete: DENIED,  // Users cannot delete accounts (admin only)
    import: DENIED,
    export: OWN_ONLY,  // Can export own data
  },
  reports: {
    create: OWN_ONLY,  // Can report content
    read: OWN_ONLY,    // Can see own reports
    update: DENIED,
    delete: DENIED,
    import: DENIED,
    export: DENIED,
  },
  notifications: {
    create: DENIED,
    read: OWN_ONLY,
    update: OWN_ONLY,  // Mark as read
    delete: OWN_ONLY,
    import: DENIED,
    export: DENIED,
  },
};

/**
 * Moderator Role Permissions
 * - All user permissions plus:
 * - Full control over forum threads and posts
 * - Can manage reports
 * - Can approve user-submitted content
 */
const moderatorPermissions: PermissionMatrix = {
  threads: {
    create: FULL_ACCESS,
    read: FULL_ACCESS,
    update: FULL_ACCESS,
    delete: FULL_ACCESS,
    import: FULL_ACCESS,
    export: FULL_ACCESS,
  },
  posts: {
    create: FULL_ACCESS,
    read: FULL_ACCESS,
    update: FULL_ACCESS,
    delete: FULL_ACCESS,
    import: FULL_ACCESS,
    export: FULL_ACCESS,
  },
  categories: {
    create: DENIED,
    read: FULL_ACCESS,
    update: DENIED,
    delete: DENIED,
    import: DENIED,
    export: FULL_ACCESS,
  },
  events: {
    create: FULL_ACCESS,
    read: FULL_ACCESS,
    update: OWN_ONLY,
    delete: OWN_ONLY,
    import: DENIED,
    export: FULL_ACCESS,
  },
  articles: {
    create: FULL_ACCESS,
    read: FULL_ACCESS,
    update: OWN_ONLY,
    delete: OWN_ONLY,
    import: DENIED,
    export: FULL_ACCESS,
  },
  discounts: {
    create: FULL_ACCESS,
    read: FULL_ACCESS,
    update: OWN_ONLY,
    delete: OWN_ONLY,
    import: DENIED,
    export: FULL_ACCESS,
  },
  links: {
    create: FULL_ACCESS,
    read: FULL_ACCESS,
    update: OWN_ONLY,
    delete: OWN_ONLY,
    import: DENIED,
    export: FULL_ACCESS,
  },
  jobs: {
    create: FULL_ACCESS,
    read: FULL_ACCESS,
    update: OWN_ONLY,
    delete: OWN_ONLY,
    import: DENIED,
    export: FULL_ACCESS,
  },
  listings: {
    create: FULL_ACCESS,
    read: FULL_ACCESS,
    update: OWN_ONLY,
    delete: OWN_ONLY,
    import: DENIED,
    export: FULL_ACCESS,
  },
  advertisements: {
    create: FULL_ACCESS,
    read: FULL_ACCESS,
    update: OWN_ONLY,
    delete: OWN_ONLY,
    import: DENIED,
    export: FULL_ACCESS,
  },
  users: {
    create: DENIED,
    read: FULL_ACCESS,  // Can view user profiles for moderation
    update: OWN_ONLY,
    delete: DENIED,
    import: DENIED,
    export: OWN_ONLY,
  },
  reports: {
    create: FULL_ACCESS,
    read: FULL_ACCESS,
    update: FULL_ACCESS,  // Can resolve reports
    delete: DENIED,
    import: DENIED,
    export: FULL_ACCESS,
  },
  notifications: {
    create: DENIED,
    read: OWN_ONLY,
    update: OWN_ONLY,
    delete: OWN_ONLY,
    import: DENIED,
    export: DENIED,
  },
};

/**
 * Admin Role Permissions
 * - Full control over all content types
 * - Can manage users, roles, and system settings
 */
const adminPermissions: PermissionMatrix = {
  threads: {
    create: FULL_ACCESS,
    read: FULL_ACCESS,
    update: FULL_ACCESS,
    delete: FULL_ACCESS,
    import: FULL_ACCESS,
    export: FULL_ACCESS,
  },
  posts: {
    create: FULL_ACCESS,
    read: FULL_ACCESS,
    update: FULL_ACCESS,
    delete: FULL_ACCESS,
    import: FULL_ACCESS,
    export: FULL_ACCESS,
  },
  categories: {
    create: FULL_ACCESS,
    read: FULL_ACCESS,
    update: FULL_ACCESS,
    delete: FULL_ACCESS,
    import: FULL_ACCESS,
    export: FULL_ACCESS,
  },
  events: {
    create: FULL_ACCESS,
    read: FULL_ACCESS,
    update: FULL_ACCESS,
    delete: FULL_ACCESS,
    import: FULL_ACCESS,
    export: FULL_ACCESS,
  },
  articles: {
    create: FULL_ACCESS,
    read: FULL_ACCESS,
    update: FULL_ACCESS,
    delete: FULL_ACCESS,
    import: FULL_ACCESS,
    export: FULL_ACCESS,
  },
  discounts: {
    create: FULL_ACCESS,
    read: FULL_ACCESS,
    update: FULL_ACCESS,
    delete: FULL_ACCESS,
    import: FULL_ACCESS,
    export: FULL_ACCESS,
  },
  links: {
    create: FULL_ACCESS,
    read: FULL_ACCESS,
    update: FULL_ACCESS,
    delete: FULL_ACCESS,
    import: FULL_ACCESS,
    export: FULL_ACCESS,
  },
  jobs: {
    create: FULL_ACCESS,
    read: FULL_ACCESS,
    update: FULL_ACCESS,
    delete: FULL_ACCESS,
    import: FULL_ACCESS,
    export: FULL_ACCESS,
  },
  listings: {
    create: FULL_ACCESS,
    read: FULL_ACCESS,
    update: FULL_ACCESS,
    delete: FULL_ACCESS,
    import: FULL_ACCESS,
    export: FULL_ACCESS,
  },
  advertisements: {
    create: FULL_ACCESS,
    read: FULL_ACCESS,
    update: FULL_ACCESS,
    delete: FULL_ACCESS,
    import: FULL_ACCESS,
    export: FULL_ACCESS,
  },
  users: {
    create: FULL_ACCESS,
    read: FULL_ACCESS,
    update: FULL_ACCESS,
    delete: FULL_ACCESS,
    import: FULL_ACCESS,
    export: FULL_ACCESS,
  },
  reports: {
    create: FULL_ACCESS,
    read: FULL_ACCESS,
    update: FULL_ACCESS,
    delete: FULL_ACCESS,
    import: FULL_ACCESS,
    export: FULL_ACCESS,
  },
  notifications: {
    create: FULL_ACCESS,
    read: FULL_ACCESS,
    update: FULL_ACCESS,
    delete: FULL_ACCESS,
    import: FULL_ACCESS,
    export: FULL_ACCESS,
  },
};

/**
 * Complete role permissions configuration
 */
export const rolePermissions: RolePermissions = {
  user: userPermissions,
  moderator: moderatorPermissions,
  admin: adminPermissions,
};

/**
 * Guest (unauthenticated) permissions - read-only access to public content
 */
export const guestPermissions: Partial<PermissionMatrix> = {
  threads: {
    create: DENIED,
    read: READ_ONLY,
    update: DENIED,
    delete: DENIED,
    import: DENIED,
    export: DENIED,
  },
  posts: {
    create: DENIED,
    read: READ_ONLY,
    update: DENIED,
    delete: DENIED,
    import: DENIED,
    export: DENIED,
  },
  categories: {
    create: DENIED,
    read: READ_ONLY,
    update: DENIED,
    delete: DENIED,
    import: DENIED,
    export: DENIED,
  },
  events: {
    create: DENIED,
    read: READ_ONLY,
    update: DENIED,
    delete: DENIED,
    import: DENIED,
    export: DENIED,
  },
  articles: {
    create: DENIED,
    read: READ_ONLY,
    update: DENIED,
    delete: DENIED,
    import: DENIED,
    export: DENIED,
  },
  discounts: {
    create: DENIED,
    read: READ_ONLY,
    update: DENIED,
    delete: DENIED,
    import: DENIED,
    export: DENIED,
  },
  links: {
    create: DENIED,
    read: READ_ONLY,
    update: DENIED,
    delete: DENIED,
    import: DENIED,
    export: DENIED,
  },
  jobs: {
    create: DENIED,
    read: READ_ONLY,
    update: DENIED,
    delete: DENIED,
    import: DENIED,
    export: DENIED,
  },
  listings: {
    create: DENIED,
    read: READ_ONLY,
    update: DENIED,
    delete: DENIED,
    import: DENIED,
    export: DENIED,
  },
  advertisements: {
    create: DENIED,
    read: READ_ONLY,
    update: DENIED,
    delete: DENIED,
    import: DENIED,
    export: DENIED,
  },
};

/**
 * Check if a user has permission to perform an operation on a content type
 * 
 * @param role - The user's role (null for guests)
 * @param contentType - The type of content being accessed
 * @param operation - The operation being performed
 * @param isOwner - Whether the user owns the content (for ownOnly checks)
 * @returns Permission object with allowed status and any conditions
 */
export function checkPermission(
  role: Role | null,
  contentType: ContentType,
  operation: Operation,
  isOwner: boolean = false
): { allowed: boolean; reason?: string } {
  // Guest users
  if (!role) {
    const guestPerm = guestPermissions[contentType]?.[operation];
    if (!guestPerm || !guestPerm.allowed) {
      return { allowed: false, reason: 'Authentication required' };
    }
    return { allowed: true };
  }

  // Get permissions for the role
  const permissions = rolePermissions[role];
  if (!permissions) {
    return { allowed: false, reason: 'Invalid role' };
  }

  const permission = permissions[contentType]?.[operation];
  if (!permission) {
    return { allowed: false, reason: 'Permission not defined' };
  }

  if (!permission.allowed) {
    return { allowed: false, reason: 'Operation not permitted for this role' };
  }

  // Check ownOnly restriction
  if (permission.ownOnly && !isOwner) {
    return { allowed: false, reason: 'Can only perform this action on your own content' };
  }

  return { 
    allowed: true,
    reason: permission.requiresApproval ? 'Content will require approval' : undefined
  };
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: Role): PermissionMatrix {
  return rolePermissions[role];
}

/**
 * Get a summary of permissions for a role (for UI display)
 */
export function getPermissionSummary(role: Role): Record<ContentType, string[]> {
  const permissions = rolePermissions[role];
  const summary: Record<string, string[]> = {};

  for (const [contentType, ops] of Object.entries(permissions)) {
    const allowedOps: string[] = [];
    for (const [op, perm] of Object.entries(ops)) {
      if (perm.allowed) {
        let opLabel = op.charAt(0).toUpperCase() + op.slice(1);
        if (perm.ownOnly) opLabel += ' (own)';
        if (perm.requiresApproval) opLabel += ' (needs approval)';
        allowedOps.push(opLabel);
      }
    }
    summary[contentType] = allowedOps;
  }

  return summary as Record<ContentType, string[]>;
}

/**
 * Check if a role can moderate content
 */
export function canModerate(role: Role | null): boolean {
  return role === 'moderator' || role === 'admin';
}

/**
 * Check if a role has admin privileges
 */
export function isAdmin(role: Role | null): boolean {
  return role === 'admin';
}

/**
 * Get the effective role for permission checks
 * Maps the database role enum to the permission system roles
 */
export function getEffectiveRole(dbRole: string | null | undefined): Role | null {
  if (!dbRole) return null;
  
  // Map database roles to permission roles
  const roleMap: Record<string, Role> = {
    'user': 'user',
    'moderator': 'moderator',
    'admin': 'admin',
  };

  return roleMap[dbRole] || 'user';
}
