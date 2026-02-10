import Layout from "@/components/Layout";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { trpc } from "@/lib/trpc";
import { Link, useParams, useLocation } from "wouter";
import {
  ArrowLeft,
  Bell,
  BellOff,
  Clock,
  Eye,
  Flag,
  MessageCircle,
  MoreVertical,
  Pin,
  Lock,
  Unlock,
  Pencil,
  Trash2,
  Reply,
  User,
  Send,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";

export default function Thread() {
  const { id } = useParams<{ id: string }>();
  const threadId = parseInt(id || "0");
  const { isAuthenticated, user } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const [replyContent, setReplyContent] = useState("");
  const [replyToPostId, setReplyToPostId] = useState<number | null>(null);
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "thread" | "post"; id: number } | null>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ type: "thread" | "post"; id: number } | null>(null);
  const [reportReason, setReportReason] = useState("");

  const { data: thread, isLoading: threadLoading } = trpc.threads.getById.useQuery(
    { id: threadId },
    { enabled: threadId > 0 }
  );

  const { data: posts, isLoading: postsLoading } = trpc.posts.listByThread.useQuery(
    { threadId },
    { enabled: threadId > 0 }
  );

  const { data: author } = trpc.users.getById.useQuery(
    { id: thread?.authorId || 0 },
    { enabled: !!thread?.authorId }
  );

  const { data: isSubscribed } = trpc.threads.isSubscribed.useQuery(
    { threadId },
    { enabled: threadId > 0 && isAuthenticated }
  );

  const { data: category } = trpc.categories.getBySlug.useQuery(
    { slug: "" },
    { enabled: false }
  );

  // Mutations
  const createPostMutation = trpc.posts.create.useMutation({
    onSuccess: () => {
      utils.posts.listByThread.invalidate({ threadId });
      utils.threads.getById.invalidate({ id: threadId });
      setReplyContent("");
      setReplyToPostId(null);
      toast.success("Reply posted successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updatePostMutation = trpc.posts.update.useMutation({
    onSuccess: () => {
      utils.posts.listByThread.invalidate({ threadId });
      setEditingPostId(null);
      setEditContent("");
      toast.success("Post updated successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deletePostMutation = trpc.posts.delete.useMutation({
    onSuccess: () => {
      utils.posts.listByThread.invalidate({ threadId });
      toast.success("Post deleted successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteThreadMutation = trpc.threads.delete.useMutation({
    onSuccess: () => {
      toast.success("Thread deleted successfully");
      navigate("/forum");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const subscribeMutation = trpc.threads.subscribe.useMutation({
    onSuccess: () => {
      utils.threads.isSubscribed.invalidate({ threadId });
      toast.success("Subscribed to thread notifications");
    },
  });

  const unsubscribeMutation = trpc.threads.unsubscribe.useMutation({
    onSuccess: () => {
      utils.threads.isSubscribed.invalidate({ threadId });
      toast.success("Unsubscribed from thread notifications");
    },
  });

  const togglePinMutation = trpc.threads.togglePin.useMutation({
    onSuccess: (data) => {
      utils.threads.getById.invalidate({ id: threadId });
      toast.success(data.isPinned ? "Thread pinned" : "Thread unpinned");
    },
  });

  const toggleLockMutation = trpc.threads.toggleLock.useMutation({
    onSuccess: (data) => {
      utils.threads.getById.invalidate({ id: threadId });
      toast.success(data.isLocked ? "Thread locked" : "Thread unlocked");
    },
  });

  const createReportMutation = trpc.reports.create.useMutation({
    onSuccess: () => {
      setReportDialogOpen(false);
      setReportTarget(null);
      setReportReason("");
      toast.success("Report submitted successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleReply = () => {
    if (!replyContent.trim()) return;
    createPostMutation.mutate({
      threadId,
      content: replyContent,
      parentPostId: replyToPostId || undefined,
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "thread") {
      deleteThreadMutation.mutate({ id: deleteTarget.id });
    } else {
      deletePostMutation.mutate({ id: deleteTarget.id });
    }
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
  };

  const handleReport = () => {
    if (!reportTarget || !reportReason.trim()) return;
    createReportMutation.mutate({
      contentType: reportTarget.type,
      contentId: reportTarget.id,
      reason: reportReason,
    });
  };

  const canModify = (authorId: number) => {
    return user?.id === authorId || user?.role === "admin";
  };

  if (threadLoading) {
    return (
      <Layout>
        <div className="container py-8">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-40 mb-4" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (!thread) {
    return (
      <Layout>
        <div className="container py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <h2 className="text-xl font-semibold mb-2">Thread Not Found</h2>
              <p className="text-muted-foreground mb-4">
                The thread you're looking for doesn't exist or has been deleted.
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
      <div className="container py-8 max-w-4xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/forum" className="hover:text-primary flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            Forum
          </Link>
          <span>/</span>
          <span className="text-foreground truncate">{thread.title}</span>
        </div>

        {/* Thread Header */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {thread.isPinned && (
                    <Badge variant="secondary" className="gap-1">
                      <Pin className="h-3 w-3" />
                      Pinned
                    </Badge>
                  )}
                  {thread.isLocked && (
                    <Badge variant="secondary" className="gap-1">
                      <Lock className="h-3 w-3" />
                      Locked
                    </Badge>
                  )}
                </div>
                <h1 className="text-2xl font-bold text-foreground">{thread.title}</h1>
              </div>
              <div className="flex items-center gap-2">
                {isAuthenticated && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (isSubscribed) {
                        unsubscribeMutation.mutate({ threadId });
                      } else {
                        subscribeMutation.mutate({ threadId });
                      }
                    }}
                  >
                    {isSubscribed ? (
                      <BellOff className="h-5 w-5" />
                    ) : (
                      <Bell className="h-5 w-5" />
                    )}
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {user?.role === "admin" && (
                      <>
                        <DropdownMenuItem onClick={() => togglePinMutation.mutate({ id: threadId })}>
                          <Pin className="h-4 w-4 mr-2" />
                          {thread.isPinned ? "Unpin" : "Pin"} Thread
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleLockMutation.mutate({ id: threadId })}>
                          {thread.isLocked ? (
                            <>
                              <Unlock className="h-4 w-4 mr-2" />
                              Unlock Thread
                            </>
                          ) : (
                            <>
                              <Lock className="h-4 w-4 mr-2" />
                              Lock Thread
                            </>
                          )}
                        </DropdownMenuItem>
                      </>
                    )}
                    {canModify(thread.authorId) && (
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => {
                          setDeleteTarget({ type: "thread", id: thread.id });
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Thread
                      </DropdownMenuItem>
                    )}
                    {isAuthenticated && (
                      <DropdownMenuItem
                        onClick={() => {
                          setReportTarget({ type: "thread", id: thread.id });
                          setReportDialogOpen(true);
                        }}
                      >
                        <Flag className="h-4 w-4 mr-2" />
                        Report Thread
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Author Info */}
            <div className="flex items-center gap-3 mb-4 pb-4 border-b">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <Link href={`/profile/${thread.authorId}`} className="font-medium hover:text-primary">
                  {author?.name || "Unknown User"}
                </Link>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(thread.createdAt), { addSuffix: true })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {thread.viewCount} views
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" />
                    {thread.replyCount} replies
                  </span>
                </div>
              </div>
            </div>

            {/* Thread Content */}
            <div className="prose-forum text-foreground whitespace-pre-wrap">
              {thread.content}
            </div>
          </CardContent>
        </Card>

        {/* Replies */}
        <div className="space-y-4 mb-6">
          <h2 className="text-lg font-semibold">
            Replies ({posts?.length || 0})
          </h2>

          {postsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : posts && posts.length > 0 ? (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                threadId={threadId}
                canModify={canModify(post.authorId)}
                isAuthenticated={isAuthenticated}
                onReply={() => setReplyToPostId(post.id)}
                onEdit={() => {
                  setEditingPostId(post.id);
                  setEditContent(post.content);
                }}
                onDelete={() => {
                  setDeleteTarget({ type: "post", id: post.id });
                  setDeleteDialogOpen(true);
                }}
                onReport={() => {
                  setReportTarget({ type: "post", id: post.id });
                  setReportDialogOpen(true);
                }}
                editingPostId={editingPostId}
                editContent={editContent}
                setEditContent={setEditContent}
                onSaveEdit={() => {
                  updatePostMutation.mutate({ id: post.id, content: editContent });
                }}
                onCancelEdit={() => {
                  setEditingPostId(null);
                  setEditContent("");
                }}
                isUpdating={updatePostMutation.isPending}
              />
            ))
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No replies yet. Be the first to respond!
              </CardContent>
            </Card>
          )}
        </div>

        {/* Reply Form */}
        {isAuthenticated && !thread.isLocked && (
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-4">
                {replyToPostId ? "Reply to Post" : "Post a Reply"}
                {replyToPostId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2"
                    onClick={() => setReplyToPostId(null)}
                  >
                    Cancel
                  </Button>
                )}
              </h3>
              <Textarea
                placeholder="Write your reply..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                rows={4}
                className="mb-4"
              />
              <Button
                onClick={handleReply}
                disabled={!replyContent.trim() || createPostMutation.isPending}
              >
                <Send className="h-4 w-4 mr-2" />
                {createPostMutation.isPending ? "Posting..." : "Post Reply"}
              </Button>
            </CardContent>
          </Card>
        )}

        {thread.isLocked && (
          <Card>
            <CardContent className="py-6 text-center text-muted-foreground">
              <Lock className="h-8 w-8 mx-auto mb-2" />
              This thread is locked. No new replies can be posted.
            </CardContent>
          </Card>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the{" "}
                {deleteTarget?.type === "thread" ? "thread and all its replies" : "post"}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Report Dialog */}
        <AlertDialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Report Content</AlertDialogTitle>
              <AlertDialogDescription>
                Please describe why you're reporting this {reportTarget?.type}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Textarea
              placeholder="Reason for reporting..."
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              rows={3}
              className="my-4"
            />
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleReport}
                disabled={!reportReason.trim() || createReportMutation.isPending}
              >
                Submit Report
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}

// Post Card Component
interface PostCardProps {
  post: any;
  threadId: number;
  canModify: boolean;
  isAuthenticated: boolean;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReport: () => void;
  editingPostId: number | null;
  editContent: string;
  setEditContent: (content: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  isUpdating: boolean;
}

function PostCard({
  post,
  threadId,
  canModify,
  isAuthenticated,
  onReply,
  onEdit,
  onDelete,
  onReport,
  editingPostId,
  editContent,
  setEditContent,
  onSaveEdit,
  onCancelEdit,
  isUpdating,
}: PostCardProps) {
  const { data: author } = trpc.users.getById.useQuery({ id: post.authorId });

  const isEditing = editingPostId === post.id;

  return (
    <Card className={post.parentPostId ? "ml-8 border-l-4 border-l-primary/20" : ""}>
      <CardContent className="pt-4">
        {/* Author Info */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div>
              <Link href={`/profile/${post.authorId}`} className="font-medium text-sm hover:text-primary">
                {author?.name || "Unknown User"}
              </Link>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
                {post.isEdited && <span>(edited)</span>}
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isAuthenticated && (
                <DropdownMenuItem onClick={onReply}>
                  <Reply className="h-4 w-4 mr-2" />
                  Reply
                </DropdownMenuItem>
              )}
              {canModify && (
                <>
                  <DropdownMenuItem onClick={onEdit}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
              {isAuthenticated && (
                <DropdownMenuItem onClick={onReport}>
                  <Flag className="h-4 w-4 mr-2" />
                  Report
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Post Content */}
        {isEditing ? (
          <div className="space-y-3">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={4}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={onSaveEdit} disabled={isUpdating}>
                {isUpdating ? "Saving..." : "Save"}
              </Button>
              <Button size="sm" variant="outline" onClick={onCancelEdit}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="prose-forum text-foreground whitespace-pre-wrap text-sm">
            {post.content}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
