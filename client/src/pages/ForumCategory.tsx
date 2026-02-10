import Layout from "@/components/Layout";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Link, useParams } from "wouter";
import { Plus, MessageCircle, Eye, Clock, Pin, ArrowLeft, Bell, BellOff } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export default function ForumCategory() {
  const { slug } = useParams<{ slug: string }>();
  const { isAuthenticated, user } = useAuth();
  const utils = trpc.useUtils();

  const { data: category, isLoading: categoryLoading } = trpc.categories.getBySlug.useQuery(
    { slug: slug || "" },
    { enabled: !!slug }
  );

  const { data: threads, isLoading: threadsLoading } = trpc.threads.list.useQuery(
    { categoryId: category?.id, limit: 50 },
    { enabled: !!category?.id }
  );

  const { data: isSubscribed } = trpc.categories.isSubscribed.useQuery(
    { categoryId: category?.id || 0 },
    { enabled: !!category?.id && isAuthenticated }
  );

  const subscribeMutation = trpc.categories.subscribe.useMutation({
    onSuccess: () => {
      utils.categories.isSubscribed.invalidate({ categoryId: category?.id });
      toast.success("Subscribed to category notifications");
    },
  });

  const unsubscribeMutation = trpc.categories.unsubscribe.useMutation({
    onSuccess: () => {
      utils.categories.isSubscribed.invalidate({ categoryId: category?.id });
      toast.success("Unsubscribed from category notifications");
    },
  });

  const handleSubscriptionToggle = () => {
    if (!category) return;
    if (isSubscribed) {
      unsubscribeMutation.mutate({ categoryId: category.id });
    } else {
      subscribeMutation.mutate({ categoryId: category.id });
    }
  };

  if (categoryLoading) {
    return (
      <Layout>
        <div className="container py-8">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-4 w-96 mb-8" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (!category) {
    return (
      <Layout>
        <div className="container py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <h2 className="text-xl font-semibold mb-2">Category Not Found</h2>
              <p className="text-muted-foreground mb-4">
                The category you're looking for doesn't exist.
              </p>
              <Button asChild>
                <Link href="/forum">Back to Forum</Link>
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
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/forum" className="hover:text-primary flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            Forum
          </Link>
          <span>/</span>
          <span className="text-foreground">{category.name}</span>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${category.color}20` }}
            >
              <MessageCircle className="h-6 w-6" style={{ color: category.color }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{category.name}</h1>
              {category.description && (
                <p className="text-muted-foreground">{category.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSubscriptionToggle}
                  disabled={subscribeMutation.isPending || unsubscribeMutation.isPending}
                >
                  {isSubscribed ? (
                    <>
                      <BellOff className="h-4 w-4 mr-2" />
                      Unsubscribe
                    </>
                  ) : (
                    <>
                      <Bell className="h-4 w-4 mr-2" />
                      Subscribe
                    </>
                  )}
                </Button>
                <Button asChild>
                  <Link href={`/forum/new?category=${category.id}`}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Thread
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Threads List */}
        {threadsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : threads && threads.length > 0 ? (
          <div className="space-y-3">
            {threads.map((thread) => (
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
            <CardContent className="py-12 text-center">
              <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Threads Yet</h3>
              <p className="text-muted-foreground mb-4">
                Be the first to start a discussion in this category!
              </p>
              {isAuthenticated && (
                <Button asChild>
                  <Link href={`/forum/new?category=${category.id}`}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Thread
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
