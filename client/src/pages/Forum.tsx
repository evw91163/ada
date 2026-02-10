import Layout from "@/components/Layout";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Plus, MessageCircle, Users, Eye, Clock, Pin } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function Forum() {
  const { isAuthenticated } = useAuth();
  const { data: categories, isLoading: categoriesLoading } = trpc.categories.list.useQuery();
  const { data: recentThreads, isLoading: threadsLoading } = trpc.threads.list.useQuery({ limit: 10 });
  const { data: stats } = trpc.stats.overview.useQuery();

  return (
    <Layout>
      <div className="container py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Community Forum</h1>
            <p className="text-muted-foreground mt-1">
              Join discussions with fellow donut enthusiasts
            </p>
          </div>
          {isAuthenticated && (
            <Button asChild>
              <Link href="/forum/new">
                <Plus className="h-4 w-4 mr-2" />
                New Thread
              </Link>
            </Button>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Categories */}
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-4">Categories</h2>
              {categoriesLoading ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-24" />
                  ))}
                </div>
              ) : categories && categories.length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  {categories.map((category) => (
                    <Link key={category.id} href={`/forum/category/${category.slug}`}>
                      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                        <CardHeader className="pb-2">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: `${category.color}20` }}
                            >
                              <MessageCircle
                                className="h-5 w-5"
                                style={{ color: category.color }}
                              />
                            </div>
                            <div>
                              <CardTitle className="text-base">{category.name}</CardTitle>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <CardDescription className="line-clamp-2">
                            {category.description || "Explore discussions in this category"}
                          </CardDescription>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No categories available yet.
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Recent Threads */}
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-4">Recent Threads</h2>
              {threadsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-20" />
                  ))}
                </div>
              ) : recentThreads && recentThreads.length > 0 ? (
                <div className="space-y-3">
                  {recentThreads.map((thread) => (
                    <Card key={thread.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="py-4">
                        <Link href={`/forum/thread/${thread.id}`}>
                          <div className="flex items-start gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {thread.isPinned && (
                                  <Pin className="h-4 w-4 text-primary shrink-0" />
                                )}
                                {thread.isLocked && (
                                  <Badge variant="secondary" className="text-xs">
                                    Locked
                                  </Badge>
                                )}
                                <h3 className="font-semibold text-foreground hover:text-primary transition-colors truncate">
                                  {thread.title}
                                </h3>
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {thread.content.substring(0, 100)}...
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDistanceToNow(new Date(thread.createdAt), {
                                    addSuffix: true,
                                  })}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 text-sm text-muted-foreground shrink-0">
                              <div className="flex items-center gap-1">
                                <MessageCircle className="h-4 w-4" />
                                <span>{thread.replyCount}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Eye className="h-4 w-4" />
                                <span>{thread.viewCount}</span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No threads yet. Be the first to start a discussion!
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Forum Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Forum Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Total Threads
                  </span>
                  <span className="font-semibold">{stats?.threadCount || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Total Posts
                  </span>
                  <span className="font-semibold">{stats?.postCount || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Members
                  </span>
                  <span className="font-semibold">{stats?.userCount || 0}</span>
                </div>
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {isAuthenticated ? (
                  <>
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <Link href="/forum/new">
                        <Plus className="h-4 w-4 mr-2" />
                        Create New Thread
                      </Link>
                    </Button>
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <Link href="/settings">
                        <MessageCircle className="h-4 w-4 mr-2" />
                        My Subscriptions
                      </Link>
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Sign in to create threads and participate in discussions.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Forum Guidelines */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Forum Guidelines</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>• Be respectful to all members</li>
                  <li>• Stay on topic in discussions</li>
                  <li>• No spam or self-promotion</li>
                  <li>• Share your donut knowledge!</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
