import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Link, useSearch } from "wouter";
import { Search as SearchIcon, MessageCircle, FileText, User } from "lucide-react";
import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";

export default function Search() {
  const searchParams = useSearch();
  const urlQuery = new URLSearchParams(searchParams).get("q") || "";
  const [query, setQuery] = useState(urlQuery);
  const [searchTerm, setSearchTerm] = useState(urlQuery);

  useEffect(() => {
    setQuery(urlQuery);
    setSearchTerm(urlQuery);
  }, [urlQuery]);

  const { data: threadResults, isLoading: threadsLoading } = trpc.threads.search.useQuery(
    { query: searchTerm, limit: 20 },
    { enabled: searchTerm.length >= 2 }
  );

  const postsLoading = false;
  const postResults: any[] = [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length >= 2) {
      setSearchTerm(query.trim());
      window.history.pushState({}, "", `/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const isLoading = threadsLoading || postsLoading;
  const hasResults = (threadResults && threadResults.length > 0) || (postResults && postResults.length > 0);

  return (
    <Layout>
      <div className="container py-8">
        <div className="max-w-3xl mx-auto">
          {/* Search Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-4">Search</h1>
            <form onSubmit={handleSearch}>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search threads and posts..."
                    className="pl-10"
                  />
                </div>
                <Button type="submit">Search</Button>
              </div>
            </form>
            {searchTerm && (
              <p className="text-sm text-muted-foreground mt-2">
                Showing results for "{searchTerm}"
              </p>
            )}
          </div>

          {/* Results */}
          {!searchTerm ? (
            <Card>
              <CardContent className="py-12 text-center">
                <SearchIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Search the Forum</h3>
                <p className="text-muted-foreground">
                  Enter at least 2 characters to search threads and posts
                </p>
              </CardContent>
            </Card>
          ) : isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : !hasResults ? (
            <Card>
              <CardContent className="py-12 text-center">
                <SearchIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Results Found</h3>
                <p className="text-muted-foreground">
                  Try different keywords or check your spelling
                </p>
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="threads">
              <TabsList className="mb-4">
                <TabsTrigger value="threads" className="gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Threads ({threadResults?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="posts" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Posts ({postResults?.length || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="threads">
                {threadResults && threadResults.length > 0 ? (
                  <div className="space-y-3">
                    {threadResults.map((thread: any) => (
                      <Card key={thread.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="py-4">
                          <Link href={`/forum/thread/${thread.id}`}>
                            <h3 className="font-semibold text-foreground hover:text-primary transition-colors">
                              {thread.title}
                            </h3>
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                              {thread.content}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {thread.authorName || "Anonymous"}
                              </span>
                              <span>
                                {formatDistanceToNow(new Date(thread.createdAt), { addSuffix: true })}
                              </span>
                              <span>{thread.replyCount} replies</span>
                            </div>
                          </Link>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      No threads found
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="posts">
                {postResults && postResults.length > 0 ? (
                  <div className="space-y-3">
                    {postResults.map((post: any) => (
                      <Card key={post.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="py-4">
                          <Link href={`/forum/thread/${post.threadId}`}>
                            <p className="text-sm text-foreground line-clamp-3">
                              {post.content}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {post.authorName || "Anonymous"}
                              </span>
                              <span>
                                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                              </span>
                            </div>
                          </Link>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      No posts found
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </Layout>
  );
}
