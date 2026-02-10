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
import { Plus, Calendar, MapPin, Clock, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format, isFuture, isPast } from "date-fns";

export default function Events() {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");

  const { data: events, isLoading } = trpc.events.listAll.useQuery({ limit: 50 });

  const createEventMutation = trpc.events.create.useMutation({
    onSuccess: () => {
      utils.events.listAll.invalidate();
      utils.events.listUpcoming.invalidate();
      setDialogOpen(false);
      setTitle("");
      setDescription("");
      setLocation("");
      setEventDate("");
      setEventTime("");
      toast.success("Event submitted! It will be reviewed shortly.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !eventDate) {
      toast.error("Please fill in required fields");
      return;
    }
    
    const dateTime = eventTime 
      ? new Date(`${eventDate}T${eventTime}`)
      : new Date(eventDate);

    createEventMutation.mutate({
      title: title.trim(),
      description: description.trim(),
      location: location.trim() || undefined,
      eventDate: dateTime,
    });
  };

  // Separate upcoming and past events
  const upcomingEvents = events?.filter((e: any) => isFuture(new Date(e.eventDate))) || [];
  const pastEvents = events?.filter((e: any) => isPast(new Date(e.eventDate))) || [];

  return (
    <Layout>
      <div className="container py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Events</h1>
            <p className="text-muted-foreground mt-1">
              Donut festivals, meetups, and tastings
            </p>
          </div>
          {isAuthenticated && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Submit Event
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Submit an Event</DialogTitle>
                  <DialogDescription>
                    Share a donut event with the community
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Event Title *</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., Annual Donut Festival"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe the event..."
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="City, State or Venue"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="eventDate">Date *</Label>
                      <Input
                        id="eventDate"
                        type="date"
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="eventTime">Time</Label>
                      <Input
                        id="eventTime"
                        type="time"
                        value={eventTime}
                        onChange={(e) => setEventTime(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={createEventMutation.isPending}>
                    {createEventMutation.isPending ? "Submitting..." : "Submit Event"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Events Content */}
        {isLoading ? (
          <div className="space-y-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : (
          <div className="space-y-10">
            {/* Upcoming Events */}
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Upcoming Events
              </h2>
              {upcomingEvents.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-6">
                  {upcomingEvents.map((event: any) => (
                    <Card key={event.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-lg">{event.title}</CardTitle>
                          <Badge className="bg-green-500 text-white shrink-0">Upcoming</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="mb-4 line-clamp-3">
                          {event.description}
                        </CardDescription>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-primary font-medium">
                            <Clock className="h-4 w-4" />
                            {format(new Date(event.eventDate), "EEEE, MMMM d, yyyy")}
                            {event.eventDate && format(new Date(event.eventDate), " 'at' h:mm a")}
                          </div>
                          {event.location && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <MapPin className="h-4 w-4" />
                              {event.location}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No upcoming events. Check back soon or submit your own!
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Past Events */}
            {pastEvents.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-5 w-5" />
                  Past Events
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pastEvents.slice(0, 6).map((event: any) => (
                    <Card key={event.id} className="opacity-75">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">{event.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(event.eventDate), "MMMM d, yyyy")}
                          {event.location && ` • ${event.location}`}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {events?.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Events Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Be the first to share a donut event!
                  </p>
                  {isAuthenticated && (
                    <Button onClick={() => setDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Submit Event
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
