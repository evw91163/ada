import Layout from "@/components/Layout";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Bell, Settings as SettingsIcon, User, Mail, Trash2, Lock, KeyRound, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const { user, isAuthenticated, loading } = useAuth();
  const utils = trpc.useUtils();

  const { data: userProfile, isLoading: settingsLoading } =
    trpc.users.getProfile.useQuery(undefined, {
      enabled: isAuthenticated,
    });

  const { data: notifications, isLoading: notificationsLoading } =
    trpc.notifications.list.useQuery({ limit: 20 }, { enabled: isAuthenticated });

  const updateSettingsMutation = trpc.users.updateProfile.useMutation({
    onSuccess: () => {
      utils.users.getProfile.invalidate();
      toast.success("Settings updated");
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const markAllReadMutation = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
      toast.success("All notifications marked as read");
    },
  });

  const handleSettingChange = (key: string, value: boolean) => {
    updateSettingsMutation.mutate({
      [key]: value,
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

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="container py-8">
          <Card className="max-w-md mx-auto">
            <CardContent className="py-12 text-center">
              <SettingsIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Sign In Required</h2>
              <p className="text-muted-foreground mb-4">
                Please sign in to access your settings.
              </p>
              <Button asChild>
                <a href={getLoginUrl()}>Sign In</a>
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
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground mb-8">Settings</h1>

          <Tabs defaultValue="notifications">
            <TabsList className="mb-6">
              <TabsTrigger value="notifications" className="gap-2">
                <Bell className="h-4 w-4" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="profile" className="gap-2">
                <User className="h-4 w-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="security" className="gap-2">
                <Lock className="h-4 w-4" />
                Security
              </TabsTrigger>
            </TabsList>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6">
              {/* Email Notification Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Email Notifications
                  </CardTitle>
                  <CardDescription>
                    Choose when you want to receive email notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {settingsLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-10" />
                      ))}
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="emailOnReply">Replies to my posts</Label>
                          <p className="text-sm text-muted-foreground">
                            Get notified when someone replies to your posts
                          </p>
                        </div>
                        <Switch
                          id="emailOnReply"
                          checked={userProfile?.emailOnReply ?? true}
                          onCheckedChange={(checked) =>
                            handleSettingChange("emailOnReply", checked)
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="emailOnThreadUpdate">Thread updates</Label>
                          <p className="text-sm text-muted-foreground">
                            Get notified when threads you follow are updated
                          </p>
                        </div>
                        <Switch
                          id="emailOnThreadUpdate"
                          checked={userProfile?.emailOnThreadUpdate ?? true}
                          onCheckedChange={(checked) =>
                            handleSettingChange("emailOnThreadUpdate", checked)
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="emailOnNewThread">New threads in subscribed categories</Label>
                          <p className="text-sm text-muted-foreground">
                            Get notified when new threads are created in categories you follow
                          </p>
                        </div>
                        <Switch
                          id="emailOnNewThread"
                          checked={userProfile?.emailOnNewThread ?? true}
                          onCheckedChange={(checked) =>
                            handleSettingChange("emailOnNewThread", checked)
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="emailOnMention">Mentions</Label>
                          <p className="text-sm text-muted-foreground">
                            Get notified when someone mentions you
                          </p>
                        </div>
                        <Switch
                          id="emailOnMention"
                          checked={true}
                          onCheckedChange={(checked) =>
                            handleSettingChange("emailOnMention", checked)
                          }
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Recent Notifications */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Recent Notifications</CardTitle>
                      <CardDescription>Your latest activity updates</CardDescription>
                    </div>
                    {notifications && notifications.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => markAllReadMutation.mutate()}
                        disabled={markAllReadMutation.isPending}
                      >
                        Mark all read
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {notificationsLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-16" />
                      ))}
                    </div>
                  ) : notifications && notifications.length > 0 ? (
                    <div className="space-y-3">
                      {notifications.map((notification: any) => (
                        <div
                          key={notification.id}
                          className={`p-3 rounded-lg border ${
                            notification.isRead ? "bg-background" : "bg-primary/5 border-primary/20"
                          }`}
                        >
                          <p className="text-sm">{notification.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(notification.createdAt).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No notifications yet
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Your account details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground">Name</Label>
                    <p className="text-foreground">{user?.name || "Not set"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="text-foreground">{user?.email || "Not set"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Role</Label>
                    <p className="text-foreground capitalize">{user?.role || "User"}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Links</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href={`/profile/${user?.id}`}>
                      <User className="h-4 w-4 mr-2" />
                      View Public Profile
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <KeyRound className="h-5 w-5" />
                    Password
                  </CardTitle>
                  <CardDescription>
                    Manage your account password and security settings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {user?.loginMethod === 'local' ? (
                    <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                      <div>
                        <p className="font-medium text-foreground">Change your password</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Update your password regularly to keep your account secure.
                        </p>
                      </div>
                      <Button asChild>
                        <Link href="/change-password">
                          Change Password
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg border bg-muted/30">
                      <p className="font-medium text-foreground">OAuth Account</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Your account uses external authentication. Password management is handled by your identity provider.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                  <CardDescription>Details about your account security</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-muted-foreground">Login Method</Label>
                      <p className="text-foreground capitalize">{user?.loginMethod || 'Unknown'}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-muted-foreground">Account Created</Label>
                      <p className="text-foreground">
                        {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}
