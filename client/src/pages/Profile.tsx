import Layout from "@/components/Layout";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Link, useParams } from "wouter";
import {
  User,
  Calendar,
  MessageCircle,
  FileText,
  Settings,
  Shield,
  Mail,
  Clock,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

export default function Profile() {
  const { id } = useParams<{ id: string }>();
  const userId = parseInt(id || "0");
  const { user: currentUser, isAuthenticated } = useAuth();

  const { data: profile, isLoading: profileLoading } = trpc.users.getById.useQuery(
    { id: userId },
    { enabled: userId > 0 }
  );

  const { data: userThreads, isLoading: threadsLoading } = trpc.threads.list.useQuery(
    { limit: 10 },
    { enabled: userId > 0 }
  );

  const { data: userPosts, isLoading: postsLoading } = trpc.posts.getByAuthor.useQuery(
    { authorId: userId, limit: 10 },
    { enabled: userId > 0 }
  );

  const { data: userStats } = trpc.users.getStats.useQuery(
    { userId },
    { enabled: userId > 0 }
  );

  const isOwnProfile = currentUser?.id === userId;

  if (profileLoading) {
    return (
      <Layout>
        <div className="container py-8">
          <div className="max-w-4xl mx-auto">
            <Skeleton className="h-48 mb-6" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div className="container py-8">
          <Card className="max-w-md mx-auto">
            <CardContent className="py-12 text-center">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">User Not Found</h2>
              <p className="text-muted-foreground mb-4">
                The user you're looking for doesn't exist.
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
        <div className="max-w-4xl mx-auto">
          {/* Profile Header */}
          <Card className="mb-6">
            <CardContent className="py-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                {/* Avatar */}
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-12 w-12 text-primary" />
                </div>

                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl font-bold text-foreground">
                      {profile.name || "Anonymous User"}
                    </h1>
                    {profile.role === "admin" && (
                      <Badge variant="secondary" className="gap-1">
                        <Shield className="h-3 w-3" />
                        Admin
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">

                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Joined {format(new Date(profile.createdAt), "MMMM yyyy")}
                    </div>

                  </div>
                </div>

                {/* Actions */}
                {isOwnProfile && (
                  <Button variant="outline" asChild>
                    <Link href="/settings">
                      <Settings className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="py-4 text-center">
                <div className="text-2xl font-bold text-primary">
                  {userStats?.threadCount || 0}
                </div>
                <div className="text-sm text-muted-foreground">Threads</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <div className="text-2xl font-bold text-primary">
                  {userStats?.postCount || 0}
                </div>
                <div className="text-sm text-muted-foreground">Posts</div>
              </CardContent>
            </Card>
            
          </div>

          {/* Activity Tabs */}
          <Tabs defaultValue="threads">
            <TabsList className="mb-4">
              <TabsTrigger value="threads" className="gap-2">
                <MessageCircle className="h-4 w-4" />
                Threads
              </TabsTrigger>
              <TabsTrigger value="posts" className="gap-2">
                <FileText className="h-4 w-4" />
                Posts
              </TabsTrigger>
            </TabsList>

            <TabsContent value="threads">
              {threadsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20" />
                  ))}
                </div>
              ) : userThreads && userThreads.length > 0 ? (
                <div className="space-y-3">
                  {userThreads.map((thread: any) => (
                    <Card key={thread.id}>
                      <CardContent className="py-4">
                        <Link href={`/forum/thread/${thread.id}`}>
                          <h3 className="font-semibold hover:text-primary transition-colors">
                            {thread.title}
                          </h3>
                          <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                            {thread.content.substring(0, 100)}...
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>
                              {formatDistanceToNow(new Date(thread.createdAt), { addSuffix: true })}
                            </span>
                            <span>{thread.replyCount} replies</span>
                            <span>{thread.viewCount} views</span>
                          </div>
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No threads yet.
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="posts">
              {postsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20" />
                  ))}
                </div>
              ) : userPosts && userPosts.length > 0 ? (
                <div className="space-y-3">
                  {userPosts.map((post: any) => (
                    <Card key={post.id}>
                      <CardContent className="py-4">
                        <Link href={`/forum/thread/${post.threadId}`}>
                          <p className="text-sm text-foreground line-clamp-2">
                            {post.content}
                          </p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <span>
                              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                            </span>
                            {post.isEdited && <span>(edited)</span>}
                          </div>
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No posts yet.
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}
