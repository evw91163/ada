import Layout from "@/components/Layout";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Megaphone, ExternalLink } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Advertisements() {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  const { data: ads, isLoading } = trpc.advertisements.listActive.useQuery({ limit: 50 });

  const createAdMutation = trpc.advertisements.create.useMutation({
    onSuccess: () => {
      utils.advertisements.listActive.invalidate();
      setDialogOpen(false);
      setTitle("");
      setContent("");
      setImageUrl("");
      setLinkUrl("");
      toast.success("Advertisement submitted! It will be reviewed shortly.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error("Please fill in required fields");
      return;
    }
    createAdMutation.mutate({
      title: title.trim(),
      content: content.trim(),
      imageUrl: imageUrl.trim() || undefined,
      linkUrl: linkUrl.trim() || undefined,
    });
  };

  return (
    <Layout>
      <div className="container py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Advertisements</h1>
            <p className="text-muted-foreground mt-1">
              Promote your donut business or products
            </p>
          </div>
          {isAuthenticated && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Submit Ad
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Submit Advertisement</DialogTitle>
                  <DialogDescription>
                    Promote your business to the donut community
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Advertisement title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="content">Content *</Label>
                    <Textarea
                      id="content"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Describe your offer..."
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="imageUrl">Image URL</Label>
                    <Input
                      id="imageUrl"
                      type="url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="linkUrl">Link URL</Label>
                    <Input
                      id="linkUrl"
                      type="url"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                  <Button type="submit" disabled={createAdMutation.isPending}>
                    {createAdMutation.isPending ? "Submitting..." : "Submit Ad"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Info Banner */}
        <Card className="mb-8 bg-primary/5 border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Megaphone className="h-6 w-6 text-primary" />
              <div>
                <p className="font-medium text-foreground">Want to advertise?</p>
                <p className="text-sm text-muted-foreground">
                  Submit your advertisement and reach thousands of donut enthusiasts!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ads Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : ads && ads.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6">
            {ads.map((ad) => (
              <Card key={ad.id} className="hover:shadow-md transition-shadow overflow-hidden">
                <div className="flex">
                  {ad.imageUrl && (
                    <div className="w-1/3 shrink-0">
                      <img
                        src={ad.imageUrl}
                        alt={ad.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base">{ad.title}</CardTitle>
                        <Badge variant="outline" className="shrink-0">Sponsored</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="mb-3 line-clamp-3">
                        {ad.content}
                      </CardDescription>
                      {ad.linkUrl && (
                        <a
                          href={ad.linkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline flex items-center gap-1"
                        >
                          Learn More
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </CardContent>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Megaphone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Advertisements Yet</h3>
              <p className="text-muted-foreground mb-4">
                Be the first to advertise to our community!
              </p>
              {isAuthenticated && (
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Submit Ad
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
