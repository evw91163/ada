import Layout from "@/components/Layout";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Plus, ExternalLink, Link as LinkIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Links() {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");

  const { data: links, isLoading } = trpc.links.list.useQuery({ limit: 100 });

  const createLinkMutation = trpc.links.create.useMutation({
    onSuccess: () => {
      utils.links.list.invalidate();
      setDialogOpen(false);
      setTitle("");
      setUrl("");
      setDescription("");
      setCategory("");
      toast.success("Link submitted! It will be visible after approval.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !url.trim()) {
      toast.error("Please fill in required fields");
      return;
    }
    createLinkMutation.mutate({
      title: title.trim(),
      url: url.trim(),
      description: description.trim() || undefined,
      category: category.trim() || undefined,
    });
  };

  // Group links by category
  const groupedLinks = links?.reduce((acc, link) => {
    const cat = link.category || "General";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(link);
    return acc;
  }, {} as Record<string, typeof links>);

  return (
    <Layout>
      <div className="container py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Useful Links</h1>
            <p className="text-muted-foreground mt-1">
              Curated resources for donut enthusiasts
            </p>
          </div>
          {isAuthenticated && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Submit Link
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Submit a Link</DialogTitle>
                  <DialogDescription>
                    Share a useful resource with the community
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Link title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="url">URL *</Label>
                    <Input
                      id="url"
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Brief description of this resource"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="e.g., Recipes, Suppliers, News"
                    />
                  </div>
                  <Button type="submit" disabled={createLinkMutation.isPending}>
                    {createLinkMutation.isPending ? "Submitting..." : "Submit Link"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Links Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        ) : groupedLinks && Object.keys(groupedLinks).length > 0 ? (
          <div className="space-y-8">
            {Object.entries(groupedLinks).map(([category, categoryLinks]) => (
              <div key={category}>
                <h2 className="text-xl font-semibold mb-4 text-foreground">{category}</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryLinks?.map((link) => (
                    <Card key={link.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <LinkIcon className="h-4 w-4 text-primary shrink-0" />
                          <span className="truncate">{link.title}</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {link.description && (
                          <CardDescription className="mb-3 line-clamp-2">
                            {link.description}
                          </CardDescription>
                        )}
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline flex items-center gap-1"
                        >
                          Visit Link
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <LinkIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Links Yet</h3>
              <p className="text-muted-foreground mb-4">
                Be the first to share a useful resource!
              </p>
              {isAuthenticated && (
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Submit Link
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
