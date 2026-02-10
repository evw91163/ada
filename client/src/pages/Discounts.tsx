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
import { Plus, Percent, Calendar, Tag, Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function Discounts() {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [code, setCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const { data: discounts, isLoading } = trpc.discounts.list.useQuery({ limit: 50 });

  const createDiscountMutation = trpc.discounts.create.useMutation({
    onSuccess: () => {
      utils.discounts.list.invalidate();
      setDialogOpen(false);
      setTitle("");
      setDescription("");
      setCode("");
      setDiscountPercent("");
      setExpiresAt("");
      toast.success("Discount submitted! It will be reviewed shortly.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast.error("Please fill in required fields");
      return;
    }
    createDiscountMutation.mutate({
      title: title.trim(),
      description: description.trim(),
      code: code.trim() || undefined,
      discountType: discountPercent ? `${discountPercent}%` : undefined,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });
  };

  const copyCode = (discountCode: string) => {
    navigator.clipboard.writeText(discountCode);
    setCopiedCode(discountCode);
    toast.success("Code copied to clipboard!");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <Layout>
      <div className="container py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Discounts & Deals</h1>
            <p className="text-muted-foreground mt-1">
              Exclusive offers for donut lovers
            </p>
          </div>
          {isAuthenticated && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Share Discount
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Share a Discount</DialogTitle>
                  <DialogDescription>
                    Share a deal with the community
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., 20% off at Donut King"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe the offer..."
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="code">Promo Code</Label>
                      <Input
                        id="code"
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        placeholder="DONUT20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="discountPercent">Discount %</Label>
                      <Input
                        id="discountPercent"
                        type="number"
                        min="1"
                        max="100"
                        value={discountPercent}
                        onChange={(e) => setDiscountPercent(e.target.value)}
                        placeholder="20"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expiresAt">Expires On</Label>
                    <Input
                      id="expiresAt"
                      type="date"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                    />
                  </div>
                  <Button type="submit" disabled={createDiscountMutation.isPending}>
                    {createDiscountMutation.isPending ? "Submitting..." : "Share Discount"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Discounts Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : discounts && discounts.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {discounts.map((discount: any) => (
              <Card key={discount.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{discount.title}</CardTitle>
                    {discount.discountPercent && (
                      <Badge className="bg-green-500 text-white shrink-0">
                        {discount.discountPercent}% OFF
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-4 line-clamp-3">
                    {discount.description}
                  </CardDescription>
                  
                  {discount.code && (
                    <div className="mb-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-between font-mono"
                        onClick={() => copyCode(discount.code!)}
                      >
                        <span className="flex items-center gap-2">
                          <Tag className="h-4 w-4" />
                          {discount.code}
                        </span>
                        {copiedCode === discount.code ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  )}
                  
                  {discount.expiresAt && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      Expires {format(new Date(discount.expiresAt), "MMM d, yyyy")}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Percent className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Discounts Yet</h3>
              <p className="text-muted-foreground mb-4">
                Be the first to share a deal with the community!
              </p>
              {isAuthenticated && (
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Share Discount
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
