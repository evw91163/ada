import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import {
  MessageCircle,
  Users,
  FileText,
  Calendar,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

export default function Home() {
  const { data: stats } = trpc.stats.overview.useQuery();
  const { data: recentThreads } = trpc.threads.list.useQuery({ limit: 5 });
  const { data: upcomingEvents } = trpc.events.listUpcoming.useQuery({ limit: 3 });

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/10 py-20 lg:py-32">
        <div className="container relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl lg:text-6xl font-bold tracking-tight text-foreground mb-6">
                Welcome to the{" "}
                <span className="text-primary">American Donut Association</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl">
                Join thousands of donut enthusiasts in the ultimate community for sharing recipes,
                discovering new flavors, and connecting with fellow donut lovers across America.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button size="lg" asChild>
                  <Link href="/sign-up">
                    Join Free Today
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/forum">Browse Forum</Link>
                </Button>
              </div>
            </div>
            <div className="hidden lg:flex justify-center">
              <div className="relative">
                <div className="w-80 h-80 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center">
                  <span className="text-[200px]">🍩</span>
                </div>
                <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-5xl">🎉</span>
                </div>
                <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center">
                  <span className="text-4xl">☕</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-card border-y">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl lg:text-4xl font-bold text-primary mb-2">
                {stats?.userCount || 0}+
              </div>
              <div className="text-sm text-muted-foreground">Members</div>
            </div>
            <div className="text-center">
              <div className="text-3xl lg:text-4xl font-bold text-primary mb-2">
                {stats?.threadCount || 0}+
              </div>
              <div className="text-sm text-muted-foreground">Discussions</div>
            </div>
            <div className="text-center">
              <div className="text-3xl lg:text-4xl font-bold text-primary mb-2">
                {stats?.postCount || 0}+
              </div>
              <div className="text-sm text-muted-foreground">Posts</div>
            </div>
            <div className="text-center">
              <div className="text-3xl lg:text-4xl font-bold text-primary mb-2">50+</div>
              <div className="text-sm text-muted-foreground">States Represented</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 lg:py-24">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Everything for Donut Lovers
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              From lively discussions to exclusive deals, we have everything you need to fuel your
              donut passion.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="group hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <MessageCircle className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Active Forum</CardTitle>
                <CardDescription>
                  Engage in discussions about recipes, techniques, and donut culture.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/forum">
                  <Button variant="ghost" className="p-0 h-auto text-primary">
                    Visit Forum <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Events</CardTitle>
                <CardDescription>
                  Find donut festivals, tastings, and meetups near you.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/events">
                  <Button variant="ghost" className="p-0 h-auto text-primary">
                    View Events <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Articles</CardTitle>
                <CardDescription>
                  Read expert articles on donut history, trends, and reviews.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/articles">
                  <Button variant="ghost" className="p-0 h-auto text-primary">
                    Read Articles <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Community</CardTitle>
                <CardDescription>
                  Connect with fellow donut enthusiasts from across the nation.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/sign-up">
                  <Button variant="ghost" className="p-0 h-auto text-primary">
                    Join Now <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Recent Discussions */}
      <section className="py-16 bg-muted/50">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">
                Recent Discussions
              </h2>
              <p className="text-muted-foreground">Join the conversation</p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/forum">View All</Link>
            </Button>
          </div>

          <div className="space-y-4">
            {recentThreads && recentThreads.length > 0 ? (
              recentThreads.map((thread) => (
                <Card key={thread.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="py-4">
                    <Link href={`/forum/thread/${thread.id}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground hover:text-primary transition-colors truncate">
                            {thread.title}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {thread.content.substring(0, 150)}...
                          </p>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground shrink-0">
                          <div className="flex items-center gap-1">
                            <MessageCircle className="h-4 w-4" />
                            {thread.replyCount}
                          </div>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-4 w-4" />
                            {thread.viewCount}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No discussions yet. Be the first to start a conversation!
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>

      {/* Upcoming Events */}
      {upcomingEvents && upcomingEvents.length > 0 && (
        <section className="py-16">
          <div className="container">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">
                  Upcoming Events
                </h2>
                <p className="text-muted-foreground">Don't miss out on these donut gatherings</p>
              </div>
              <Button variant="outline" asChild>
                <Link href="/events">View All</Link>
              </Button>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {upcomingEvents.map((event) => (
                <Card key={event.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">{event.title}</CardTitle>
                    <CardDescription>
                      {event.location && <span>{event.location} • </span>}
                      {new Date(event.eventDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {event.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-16 lg:py-24 bg-primary text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">Ready to Join the Community?</h2>
          <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
            Sign up today and connect with thousands of donut enthusiasts. It's completely free!
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/sign-up">
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>
    </Layout>
  );
}
