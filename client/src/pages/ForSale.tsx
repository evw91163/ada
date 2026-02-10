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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Plus, MapPin, DollarSign, ShoppingBag, Tag, Gift } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export default function ForSale() {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [listingType, setListingType] = useState<"for_sale" | "wanted" | "free">("for_sale");

  const { data: listings, isLoading } = trpc.listings.list.useQuery({ limit: 100 });

  const createListingMutation = trpc.listings.create.useMutation({
    onSuccess: () => {
      utils.listings.list.invalidate();
      setDialogOpen(false);
      setTitle("");
      setDescription("");
      setPrice("");
      setLocation("");
      setContactInfo("");
      setListingType("for_sale");
      toast.success("Listing created successfully!");
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
    createListingMutation.mutate({
      title: title.trim(),
      description: description.trim(),
      price: price.trim() || undefined,
      location: location.trim() || undefined,
      contactInfo: contactInfo.trim() || undefined,
      listingType,
    });
  };

  const getListingIcon = (type: string) => {
    switch (type) {
      case "wanted":
        return <Tag className="h-4 w-4" />;
      case "free":
        return <Gift className="h-4 w-4" />;
      default:
        return <ShoppingBag className="h-4 w-4" />;
    }
  };

  const getListingBadge = (type: string) => {
    switch (type) {
      case "wanted":
        return <Badge variant="secondary">Wanted</Badge>;
      case "free":
        return <Badge className="bg-green-500 text-white">Free</Badge>;
      default:
        return <Badge>For Sale</Badge>;
    }
  };

  return (
    <Layout>
      <div className="container py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">For Sale</h1>
            <p className="text-muted-foreground mt-1">
              Buy, sell, and trade donut-related items
            </p>
          </div>
          {isAuthenticated && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Listing
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create Listing</DialogTitle>
                  <DialogDescription>
                    Post an item for sale, wanted, or free
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="listingType">Listing Type</Label>
                    <Select value={listingType} onValueChange={(v: any) => setListingType(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="for_sale">For Sale</SelectItem>
                        <SelectItem value="wanted">Wanted</SelectItem>
                        <SelectItem value="free">Free</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="What are you selling?"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe the item..."
                      rows={4}
                    />
                  </div>
                  {listingType !== "free" && (
                    <div className="space-y-2">
                      <Label htmlFor="price">Price</Label>
                      <Input
                        id="price"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="$0.00 or Best Offer"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="City, State"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactInfo">Contact Info</Label>
                    <Input
                      id="contactInfo"
                      value={contactInfo}
                      onChange={(e) => setContactInfo(e.target.value)}
                      placeholder="Email or phone"
                    />
                  </div>
                  <Button type="submit" disabled={createListingMutation.isPending}>
                    {createListingMutation.isPending ? "Creating..." : "Create Listing"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Listings Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : listings && listings.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <Card key={listing.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base line-clamp-2">{listing.title}</CardTitle>
                    {getListingBadge(listing.listingType)}
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-3 line-clamp-3">
                    {listing.description}
                  </CardDescription>
                  <div className="space-y-2 text-sm">
                    {listing.price && (
                      <div className="flex items-center gap-2 text-primary font-semibold">
                        <DollarSign className="h-4 w-4" />
                        {listing.price}
                      </div>
                    )}
                    {listing.location && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {listing.location}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Posted {formatDistanceToNow(new Date(listing.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Listings Yet</h3>
              <p className="text-muted-foreground mb-4">
                Be the first to post something for sale!
              </p>
              {isAuthenticated && (
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Listing
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
