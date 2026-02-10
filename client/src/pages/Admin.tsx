import Layout from "@/components/Layout";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
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
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import {
  Shield,
  Users,
  MessageCircle,
  Flag,
  Check,
  X,
  Download,
  FileJson,
  FileSpreadsheet,
  Database,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function Admin() {
  const { user, isAuthenticated, loading } = useAuth();
  const utils = trpc.useUtils();

  const isAdmin = user?.role === "admin";

  // Data queries
  const { data: users, isLoading: usersLoading } = trpc.users.list.useQuery(
    { limit: 100 },
    { enabled: isAdmin }
  );

  const reportsLoading = false;
  const reportedPosts: any[] = [];

  const { data: pendingListings } = trpc.listings.list.useQuery(
    { limit: 50 },
    { enabled: isAdmin }
  );

  // Mutations
  const updateRoleMutation = trpc.users.updateRole.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate();
      toast.success("User role updated");
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  

  

  // Export functions
  const exportThreadsToJSON = async () => {
    try {
      const response = await fetch("/api/trpc/export.threads?input=" + encodeURIComponent(JSON.stringify({ format: "json" })));
      const data = await response.json();
      if (data.result?.data) {
        const blob = new Blob([JSON.stringify(data.result.data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `forum-threads-${format(new Date(), "yyyy-MM-dd")}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Export completed");
      }
    } catch (error) {
      toast.error("Export failed");
    }
  };

  const exportUsersToCSV = async () => {
    try {
      const response = await fetch("/api/trpc/export.users?input=" + encodeURIComponent(JSON.stringify({ format: "csv" })));
      const data = await response.json();
      if (data.result?.data) {
        const blob = new Blob([data.result.data], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `users-${format(new Date(), "yyyy-MM-dd")}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Export completed");
      }
    } catch (error) {
      toast.error("Export failed");
    }
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
                You don't have permission to access this page.
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
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">Admin Panel</h1>
              <p className="text-muted-foreground">Manage users, content, and exports</p>
            </div>
          </div>
          <Button asChild variant="outline">
            <Link href="/admin/backup">
              <Database className="h-4 w-4 mr-2" />
              Backup & Recovery
            </Link>
          </Button>
        </div>

        <Tabs defaultValue="users">
          <TabsList className="mb-6">
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-2">
              <Flag className="h-4 w-4" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="moderation" className="gap-2">
              <MessageCircle className="h-4 w-4" />
              Moderation
            </TabsTrigger>
            <TabsTrigger value="export" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </TabsTrigger>
            <TabsTrigger value="permissions" className="gap-2">
              <Shield className="h-4 w-4" />
              Permissions
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage user roles and permissions</CardDescription>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-12" />
                    ))}
                  </div>
                ) : users && users.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u: any) => (
                        <TableRow key={u.id}>
                          <TableCell>{u.id}</TableCell>
                          <TableCell>
                            <Link href={`/profile/${u.id}`} className="hover:text-primary">
                              {u.name || "Anonymous"}
                            </Link>
                          </TableCell>
                          <TableCell>{u.email || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={u.role === "admin" ? "default" : u.role === "moderator" ? "outline" : "secondary"}>
                              {u.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(u.createdAt), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={u.role}
                              onValueChange={(role) =>
                                updateRoleMutation.mutate({ userId: u.id, role: role as any })
                              }
                              disabled={u.id === user?.id}
                            >
                              <SelectTrigger className="w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="moderator">Moderator</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No users found</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle>Reported Content</CardTitle>
                <CardDescription>Review and resolve reported posts</CardDescription>
              </CardHeader>
              <CardContent>
                {reportsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-24" />
                    ))}
                  </div>
                ) : reportedPosts && reportedPosts.length > 0 ? (
                  <div className="space-y-4">
                    {reportedPosts.map((post: any) => (
                      <Card key={post.id}>
                        <CardContent className="py-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <p className="text-sm text-foreground line-clamp-3">
                                {post.content}
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span>By User #{post.authorId}</span>
                                <span>
                                  {format(new Date(post.createdAt), "MMM d, yyyy")}
                                </span>
                                <Badge variant="destructive">Reported</Badge>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toast.info("Feature coming soon")}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => toast.info("Feature coming soon")}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No reported content
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Moderation Tab */}
          <TabsContent value="moderation">
            <Card>
              <CardHeader>
                <CardTitle>Pending Approvals</CardTitle>
                <CardDescription>Review and approve user submissions</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingListings && pendingListings.filter((l: any) => !l.isApproved).length > 0 ? (
                  <div className="space-y-4">
                    {pendingListings
                      .filter((l: any) => !l.isApproved)
                      .map((listing: any) => (
                        <Card key={listing.id}>
                          <CardContent className="py-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <h4 className="font-semibold">{listing.title}</h4>
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {listing.description}
                                </p>
                                <Badge variant="outline" className="mt-2">
                                  {listing.price ? `$${listing.price}` : "Price not set"}
                                </Badge>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => toast.info("Feature coming soon")}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No pending approvals
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Export Tab */}
          <TabsContent value="export">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileJson className="h-5 w-5" />
                    Export Forum Data
                  </CardTitle>
                  <CardDescription>
                    Download all threads and posts as JSON
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={exportThreadsToJSON} className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Export Threads (JSON)
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5" />
                    Export User Data
                  </CardTitle>
                  <CardDescription>
                    Download user list as CSV
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={exportUsersToCSV} className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Export Users (CSV)
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Permissions Tab */}
          <TabsContent value="permissions">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Role-Based Access Control (RBAC)</CardTitle>
                  <CardDescription>
                    Overview of permissions for each role. CRUDIE = Create, Read, Update, Delete, Import, Export
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-6">
                    {/* User Role */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Badge variant="secondary">User</Badge>
                        </CardTitle>
                        <CardDescription>Standard registered members</CardDescription>
                      </CardHeader>
                      <CardContent className="text-sm space-y-2">
                        <div>
                          <strong>Forum:</strong>
                          <p className="text-muted-foreground">Create, Read, Update (own), Delete (own), Export</p>
                        </div>
                        <div>
                          <strong>Events/Articles/Links:</strong>
                          <p className="text-muted-foreground">Create (needs approval), Read, Update (own), Delete (own)</p>
                        </div>
                        <div>
                          <strong>Listings/Jobs:</strong>
                          <p className="text-muted-foreground">Create, Read, Update (own), Delete (own)</p>
                        </div>
                        <div>
                          <strong>Reports:</strong>
                          <p className="text-muted-foreground">Create (can report content)</p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Moderator Role */}
                    <Card className="border-primary/50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Badge variant="outline">Moderator</Badge>
                        </CardTitle>
                        <CardDescription>Forum moderators</CardDescription>
                      </CardHeader>
                      <CardContent className="text-sm space-y-2">
                        <div>
                          <strong>Forum:</strong>
                          <p className="text-muted-foreground">Full CRUDIE access on all threads/posts</p>
                        </div>
                        <div>
                          <strong>Reports:</strong>
                          <p className="text-muted-foreground">Full access - can review and resolve</p>
                        </div>
                        <div>
                          <strong>Moderation Tools:</strong>
                          <p className="text-muted-foreground">Pin/unpin threads, Lock/unlock threads</p>
                        </div>
                        <div>
                          <strong>Other Content:</strong>
                          <p className="text-muted-foreground">Same as User role + can view all user profiles</p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Admin Role */}
                    <Card className="border-primary">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Badge>Admin</Badge>
                        </CardTitle>
                        <CardDescription>Full system administrators</CardDescription>
                      </CardHeader>
                      <CardContent className="text-sm space-y-2">
                        <div>
                          <strong>All Content Types:</strong>
                          <p className="text-muted-foreground">Full CRUDIE access</p>
                        </div>
                        <div>
                          <strong>User Management:</strong>
                          <p className="text-muted-foreground">Create, Read, Update, Delete users</p>
                        </div>
                        <div>
                          <strong>Categories:</strong>
                          <p className="text-muted-foreground">Create, Update, Delete forum categories</p>
                        </div>
                        <div>
                          <strong>System:</strong>
                          <p className="text-muted-foreground">Full access to all admin features</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Content Type Permissions Matrix</CardTitle>
                  <CardDescription>Detailed breakdown by content type</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Content Type</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Moderator</TableHead>
                        <TableHead>Admin</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Forum Threads</TableCell>
                        <TableCell>CRUD (own) + R + E</TableCell>
                        <TableCell>Full CRUDIE</TableCell>
                        <TableCell>Full CRUDIE</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Forum Posts</TableCell>
                        <TableCell>CRUD (own) + R + E</TableCell>
                        <TableCell>Full CRUDIE</TableCell>
                        <TableCell>Full CRUDIE</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Categories</TableCell>
                        <TableCell>R only</TableCell>
                        <TableCell>R + E</TableCell>
                        <TableCell>Full CRUDIE</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Events</TableCell>
                        <TableCell>C* + R + UD (own)</TableCell>
                        <TableCell>C + R + UD (own) + E</TableCell>
                        <TableCell>Full CRUDIE</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Articles</TableCell>
                        <TableCell>C* + R + UD (own)</TableCell>
                        <TableCell>C + R + UD (own) + E</TableCell>
                        <TableCell>Full CRUDIE</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Discounts</TableCell>
                        <TableCell>C* + R + UD (own)</TableCell>
                        <TableCell>C + R + UD (own) + E</TableCell>
                        <TableCell>Full CRUDIE</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Links</TableCell>
                        <TableCell>C* + R + UD (own)</TableCell>
                        <TableCell>C + R + UD (own) + E</TableCell>
                        <TableCell>Full CRUDIE</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Jobs (Help Wanted)</TableCell>
                        <TableCell>CRUD (own) + R</TableCell>
                        <TableCell>C + R + UD (own) + E</TableCell>
                        <TableCell>Full CRUDIE</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Listings (For Sale)</TableCell>
                        <TableCell>CRUD (own) + R</TableCell>
                        <TableCell>C + R + UD (own) + E</TableCell>
                        <TableCell>Full CRUDIE</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Advertisements</TableCell>
                        <TableCell>C* + R + UD (own)</TableCell>
                        <TableCell>C + R + UD (own) + E</TableCell>
                        <TableCell>Full CRUDIE</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Users</TableCell>
                        <TableCell>R (own) + U (own)</TableCell>
                        <TableCell>R (all)</TableCell>
                        <TableCell>Full CRUDIE</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Reports</TableCell>
                        <TableCell>C + R (own)</TableCell>
                        <TableCell>Full CRUD</TableCell>
                        <TableCell>Full CRUDIE</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                  <p className="text-xs text-muted-foreground mt-4">
                    * = Requires admin approval | (own) = Only own content | C=Create, R=Read, U=Update, D=Delete, I=Import, E=Export
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
