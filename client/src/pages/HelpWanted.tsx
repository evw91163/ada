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
import { Plus, Briefcase, MapPin, DollarSign, Clock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export default function HelpWanted() {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [salary, setSalary] = useState("");
  const [jobType, setJobType] = useState<"full_time" | "part_time" | "contract" | "temporary" | "volunteer">("full_time");
  const [contactEmail, setContactEmail] = useState("");

  const { data: jobs, isLoading } = trpc.jobs.listActive.useQuery({ limit: 50 });

  const createJobMutation = trpc.jobs.create.useMutation({
    onSuccess: () => {
      utils.jobs.listActive.invalidate();
      setDialogOpen(false);
      setTitle("");
      setDescription("");
      setCompany("");
      setLocation("");
      setSalary("");
      setJobType("full_time");
      setContactEmail("");
      toast.success("Job posting submitted! It will be reviewed shortly.");
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
    createJobMutation.mutate({
      title: title.trim(),
      description: description.trim(),
      company: company.trim() || undefined,
      location: location.trim() || undefined,
      salary: salary.trim() || undefined,
      jobType: jobType || undefined,
      contactEmail: contactEmail.trim() || undefined,
    });
  };

  const getJobTypeBadge = (type: string) => {
    const labels: Record<string, string> = {
      full_time: "Full Time",
      part_time: "Part Time",
      contract: "Contract",
      temporary: "Temporary",
      internship: "Internship",
    };
    return labels[type] || type;
  };

  return (
    <Layout>
      <div className="container py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Help Wanted</h1>
            <p className="text-muted-foreground mt-1">
              Job opportunities in the donut industry
            </p>
          </div>
          {isAuthenticated && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Post Job
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Post a Job</DialogTitle>
                  <DialogDescription>
                    Find talented people for your donut business
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Job Title *</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., Head Baker"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="Company name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe the role and requirements..."
                      rows={4}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
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
                      <Label htmlFor="jobType">Job Type</Label>
                      <Select value={jobType} onValueChange={(v) => setJobType(v as any)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full_time">Full Time</SelectItem>
                          <SelectItem value="part_time">Part Time</SelectItem>
                          <SelectItem value="contract">Contract</SelectItem>
                          <SelectItem value="temporary">Temporary</SelectItem>
                          <SelectItem value="internship">Internship</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="salary">Salary/Pay</Label>
                      <Input
                        id="salary"
                        value={salary}
                        onChange={(e) => setSalary(e.target.value)}
                        placeholder="e.g., $50k-$60k"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactEmail">Contact Email</Label>
                      <Input
                        id="contactEmail"
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="jobs@company.com"
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={createJobMutation.isPending}>
                    {createJobMutation.isPending ? "Posting..." : "Post Job"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Jobs Grid */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        ) : jobs && jobs.length > 0 ? (
          <div className="space-y-4">
            {jobs.map((job: any) => (
              <Card key={job.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg">{job.title}</CardTitle>
                      {job.company && (
                        <p className="text-sm text-muted-foreground">{job.company}</p>
                      )}
                    </div>
                    {job.jobType && (
                      <Badge variant="secondary">{getJobTypeBadge(job.jobType)}</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-4 line-clamp-3">
                    {job.description}
                  </CardDescription>
                  <div className="flex flex-wrap gap-4 text-sm">
                    {job.location && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {job.location}
                      </div>
                    )}
                    {job.salary && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <DollarSign className="h-4 w-4" />
                        {job.salary}
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      Posted {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                  {job.contactEmail && (
                    <div className="mt-4">
                      <Button size="sm" asChild>
                        <a href={`mailto:${job.contactEmail}`}>Apply Now</a>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Job Listings Yet</h3>
              <p className="text-muted-foreground mb-4">
                Be the first to post a job opportunity!
              </p>
              {isAuthenticated && (
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Post Job
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
