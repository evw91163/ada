import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { FileText, Calendar, Eye, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function Articles() {
  const { data: articles, isLoading } = trpc.articles.list.useQuery({ limit: 50 });

  return (
    <Layout>
      <div className="container py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Articles</h1>
          <p className="text-muted-foreground mt-1">
            Expert insights, recipes, and donut culture
          </p>
        </div>

        {/* Articles Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        ) : articles && articles.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
              <Card key={article.id} className="hover:shadow-lg transition-shadow group">
                {article.featuredImageUrl && (
                  <div className="aspect-video overflow-hidden rounded-t-lg">
                    <img
                      src={article.featuredImageUrl}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                <CardHeader className={article.featuredImageUrl ? "pt-4" : ""}>
                  <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
                    {article.title}
                  </CardTitle>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {article.publishedAt && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {article.viewCount} views
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  {article.excerpt && (
                    <CardDescription className="mb-4 line-clamp-3">
                      {article.excerpt}
                    </CardDescription>
                  )}
                  <Link href={`/articles/${article.slug}`}>
                    <Button variant="ghost" className="p-0 h-auto text-primary">
                      Read More <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Articles Yet</h3>
              <p className="text-muted-foreground">
                Check back soon for expert articles and insights!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
