import Layout from "@/components/Layout";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Link, useLocation, useSearch } from "wouter";
import { ArrowLeft, Send } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function NewThread() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const preselectedCategory = searchParams.get("category");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState<string>(preselectedCategory || "");
  const [tags, setTags] = useState("");

  const { data: categories } = trpc.categories.list.useQuery();

  const createThreadMutation = trpc.threads.create.useMutation({
    onSuccess: (data) => {
      toast.success("Thread created successfully!");
      navigate(`/forum/thread/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  useEffect(() => {
    if (preselectedCategory) {
      setCategoryId(preselectedCategory);
    }
  }, [preselectedCategory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !categoryId) {
      toast.error("Please fill in all required fields");
      return;
    }

    const tagList = tags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    createThreadMutation.mutate({
      title: title.trim(),
      content: content.trim(),
      categoryId: parseInt(categoryId),
      tags: tagList.length > 0 ? tagList : undefined,
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="container py-8">
          <Card>
            <CardContent className="py-12 text-center">
              Loading...
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="container py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <h2 className="text-xl font-semibold mb-2">Sign In Required</h2>
              <p className="text-muted-foreground mb-4">
                You need to be signed in to create a new thread.
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
      <div className="container py-8 max-w-2xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/forum" className="hover:text-primary flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            Forum
          </Link>
          <span>/</span>
          <span className="text-foreground">New Thread</span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create New Thread</CardTitle>
            <CardDescription>
              Start a new discussion with the community
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter a descriptive title for your thread"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={255}
                />
                <p className="text-xs text-muted-foreground">
                  {title.length}/255 characters
                </p>
              </div>

              {/* Content */}
              <div className="space-y-2">
                <Label htmlFor="content">Content *</Label>
                <Textarea
                  id="content"
                  placeholder="Write your thread content here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={8}
                />
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label htmlFor="tags">Tags (optional)</Label>
                <Input
                  id="tags"
                  placeholder="Enter tags separated by commas (e.g., recipe, glazed, chocolate)"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Add relevant tags to help others find your thread
                </p>
              </div>

              {/* Submit */}
              <div className="flex gap-4">
                <Button
                  type="submit"
                  disabled={createThreadMutation.isPending || !title.trim() || !content.trim() || !categoryId}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {createThreadMutation.isPending ? "Creating..." : "Create Thread"}
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/forum">Cancel</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
