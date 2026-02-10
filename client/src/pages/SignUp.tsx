import Layout from "@/components/Layout";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, useLocation } from "wouter";
import { Check, UserPlus, MessageCircle, Percent, Calendar, FileText, Users, Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const benefits = [
  {
    icon: MessageCircle,
    title: "Forum Access",
    description: "Participate in discussions and share your donut knowledge",
  },
  {
    icon: Percent,
    title: "Exclusive Discounts",
    description: "Access member-only deals and promotions",
  },
  {
    icon: Calendar,
    title: "Event Updates",
    description: "Stay informed about donut festivals and meetups",
  },
  {
    icon: FileText,
    title: "Articles & Recipes",
    description: "Read expert articles and discover new recipes",
  },
  {
    icon: Users,
    title: "Community",
    description: "Connect with donut enthusiasts across America",
  },
];

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
  "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
  "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
  "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
  "Wisconsin", "Wyoming"
];

export default function SignUp() {
  const { isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("account");
  
  // Form state
  const [formData, setFormData] = useState({
    // Required fields
    username: "",
    password: "",
    confirmPassword: "",
    // Optional personal fields
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    email: "",
    // Optional business fields
    donutShopName: "",
    yearsInBusiness: "",
    numberOfStores: "",
    grossMonthlyIncome: "",
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      toast.success("Registration successful! Please log in with your credentials.");
      setLocation("/login");
    },
    onError: (error) => {
      toast.error(error.message || "Registration failed. Please try again.");
    },
  });
  
  const checkUsernameMutation = trpc.auth.checkUsername.useQuery(
    { username: formData.username },
    { enabled: formData.username.length >= 3 }
  );
  
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };
  
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    // Required field validation
    if (!formData.username) {
      newErrors.username = "Username is required";
    } else if (formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = "Username can only contain letters, numbers, and underscores";
    } else if (checkUsernameMutation.data && !checkUsernameMutation.data.available) {
      newErrors.username = "Username is already taken";
    }
    
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    
    // Optional field validation
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    
    if (formData.phone && !/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
      newErrors.phone = "Please enter a valid phone number";
    }
    
    if (formData.zipCode && !/^\d{5}(-\d{4})?$/.test(formData.zipCode)) {
      newErrors.zipCode = "Please enter a valid ZIP code (e.g., 12345 or 12345-6789)";
    }
    
    if (formData.yearsInBusiness && (isNaN(Number(formData.yearsInBusiness)) || Number(formData.yearsInBusiness) < 0)) {
      newErrors.yearsInBusiness = "Please enter a valid number";
    }
    
    if (formData.numberOfStores && (isNaN(Number(formData.numberOfStores)) || Number(formData.numberOfStores) < 0)) {
      newErrors.numberOfStores = "Please enter a valid number";
    }
    
    if (formData.grossMonthlyIncome && (isNaN(Number(formData.grossMonthlyIncome)) || Number(formData.grossMonthlyIncome) < 0)) {
      newErrors.grossMonthlyIncome = "Please enter a valid amount";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      // Switch to the tab with errors
      if (errors.username || errors.password || errors.confirmPassword) {
        setActiveTab("account");
      } else if (errors.firstName || errors.lastName || errors.phone || errors.address || errors.city || errors.state || errors.zipCode || errors.email) {
        setActiveTab("personal");
      } else {
        setActiveTab("business");
      }
      return;
    }
    
    registerMutation.mutate({
      username: formData.username,
      password: formData.password,
      firstName: formData.firstName || undefined,
      lastName: formData.lastName || undefined,
      phone: formData.phone || undefined,
      address: formData.address || undefined,
      city: formData.city || undefined,
      state: formData.state || undefined,
      zipCode: formData.zipCode || undefined,
      email: formData.email || undefined,
      donutShopName: formData.donutShopName || undefined,
      yearsInBusiness: formData.yearsInBusiness ? Number(formData.yearsInBusiness) : undefined,
      numberOfStores: formData.numberOfStores ? Number(formData.numberOfStores) : undefined,
      grossMonthlyIncome: formData.grossMonthlyIncome ? Number(formData.grossMonthlyIncome) : undefined,
    });
  };

  if (isAuthenticated) {
    return (
      <Layout>
        <div className="container py-16 max-w-2xl">
          <Card>
            <CardContent className="py-12 text-center">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                <Check className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2">You're Already a Member!</h2>
              <p className="text-muted-foreground mb-6">
                Welcome back, {user?.name || "donut lover"}! You have full access to all member benefits.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button asChild>
                  <Link href="/forum">Visit Forum</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href={`/profile/${user?.id}`}>View Profile</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-16">
        <div className="grid lg:grid-cols-2 gap-12 items-start max-w-6xl mx-auto">
          {/* Left side - Benefits */}
          <div className="lg:sticky lg:top-24">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Join the American Donut Association
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Become part of the nation's premier community for donut enthusiasts. 
              Membership is completely free!
            </p>
            
            <div className="space-y-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <benefit.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{benefit.title}</h3>
                    <p className="text-sm text-muted-foreground">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-8 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="text-primary hover:underline font-medium">
                  Log in here
                </Link>
              </p>
            </div>
          </div>

          {/* Right side - Registration form */}
          <Card className="shadow-lg">
            <CardHeader className="text-center pb-2">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <UserPlus className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Create Your Account</CardTitle>
              <CardDescription>
                Fill in the required fields to get started. Optional fields help us serve you better.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit}>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-3 mb-6">
                    <TabsTrigger value="account">Account *</TabsTrigger>
                    <TabsTrigger value="personal">Personal</TabsTrigger>
                    <TabsTrigger value="business">Business</TabsTrigger>
                  </TabsList>
                  
                  {/* Account Tab - Required Fields */}
                  <TabsContent value="account" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">
                        Username <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="username"
                        placeholder="Choose a username"
                        value={formData.username}
                        onChange={(e) => handleInputChange("username", e.target.value)}
                        className={errors.username ? "border-destructive" : ""}
                      />
                      {formData.username.length >= 3 && checkUsernameMutation.data && (
                        <p className={`text-xs ${checkUsernameMutation.data.available ? "text-green-600" : "text-destructive"}`}>
                          {checkUsernameMutation.data.available ? "✓ Username is available" : "✗ Username is taken"}
                        </p>
                      )}
                      {errors.username && <p className="text-xs text-destructive">{errors.username}</p>}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="password">
                        Password <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Create a password (min 8 characters)"
                          value={formData.password}
                          onChange={(e) => handleInputChange("password", e.target.value)}
                          className={errors.password ? "border-destructive pr-10" : "pr-10"}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">
                        Confirm Password <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm your password"
                          value={formData.confirmPassword}
                          onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                          className={errors.confirmPassword ? "border-destructive pr-10" : "pr-10"}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
                    </div>
                    
                    <p className="text-xs text-muted-foreground pt-2">
                      <span className="text-destructive">*</span> Required fields
                    </p>
                  </TabsContent>
                  
                  {/* Personal Tab - Optional Fields */}
                  <TabsContent value="personal" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          placeholder="John"
                          value={formData.firstName}
                          onChange={(e) => handleInputChange("firstName", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          placeholder="Doe"
                          value={formData.lastName}
                          onChange={(e) => handleInputChange("lastName", e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="john@example.com"
                        value={formData.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                        className={errors.email ? "border-destructive" : ""}
                      />
                      {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="(555) 123-4567"
                        value={formData.phone}
                        onChange={(e) => handleInputChange("phone", e.target.value)}
                        className={errors.phone ? "border-destructive" : ""}
                      />
                      {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="address">Street Address</Label>
                      <Textarea
                        id="address"
                        placeholder="123 Main Street, Suite 100"
                        value={formData.address}
                        onChange={(e) => handleInputChange("address", e.target.value)}
                        rows={2}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          placeholder="New York"
                          value={formData.city}
                          onChange={(e) => handleInputChange("city", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">State</Label>
                        <Select value={formData.state} onValueChange={(value) => handleInputChange("state", value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                          <SelectContent>
                            {US_STATES.map((state) => (
                              <SelectItem key={state} value={state}>{state}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="zipCode">ZIP Code</Label>
                      <Input
                        id="zipCode"
                        placeholder="10001"
                        value={formData.zipCode}
                        onChange={(e) => handleInputChange("zipCode", e.target.value)}
                        className={errors.zipCode ? "border-destructive" : ""}
                      />
                      {errors.zipCode && <p className="text-xs text-destructive">{errors.zipCode}</p>}
                    </div>
                    
                    <p className="text-xs text-muted-foreground pt-2">
                      All fields on this tab are optional
                    </p>
                  </TabsContent>
                  
                  {/* Business Tab - Optional Fields */}
                  <TabsContent value="business" className="space-y-4">
                    <div className="p-4 bg-muted/50 rounded-lg mb-4">
                      <p className="text-sm text-muted-foreground">
                        Are you a donut shop owner or industry professional? Share your business details to connect with other professionals and access exclusive resources.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="donutShopName">Donut Shop Name</Label>
                      <Input
                        id="donutShopName"
                        placeholder="The Golden Donut"
                        value={formData.donutShopName}
                        onChange={(e) => handleInputChange("donutShopName", e.target.value)}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="yearsInBusiness">Years in Business</Label>
                        <Input
                          id="yearsInBusiness"
                          type="number"
                          min="0"
                          placeholder="5"
                          value={formData.yearsInBusiness}
                          onChange={(e) => handleInputChange("yearsInBusiness", e.target.value)}
                          className={errors.yearsInBusiness ? "border-destructive" : ""}
                        />
                        {errors.yearsInBusiness && <p className="text-xs text-destructive">{errors.yearsInBusiness}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="numberOfStores">Number of Stores</Label>
                        <Input
                          id="numberOfStores"
                          type="number"
                          min="0"
                          placeholder="3"
                          value={formData.numberOfStores}
                          onChange={(e) => handleInputChange("numberOfStores", e.target.value)}
                          className={errors.numberOfStores ? "border-destructive" : ""}
                        />
                        {errors.numberOfStores && <p className="text-xs text-destructive">{errors.numberOfStores}</p>}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="grossMonthlyIncome">Gross Monthly Income (All Stores)</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <Input
                          id="grossMonthlyIncome"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="50000"
                          value={formData.grossMonthlyIncome}
                          onChange={(e) => handleInputChange("grossMonthlyIncome", e.target.value)}
                          className={`pl-7 ${errors.grossMonthlyIncome ? "border-destructive" : ""}`}
                        />
                      </div>
                      {errors.grossMonthlyIncome && <p className="text-xs text-destructive">{errors.grossMonthlyIncome}</p>}
                      <p className="text-xs text-muted-foreground">This information is kept confidential</p>
                    </div>
                    
                    <p className="text-xs text-muted-foreground pt-2">
                      All fields on this tab are optional
                    </p>
                  </TabsContent>
                </Tabs>
                
                <div className="mt-6 space-y-4">
                  <Button 
                    type="submit" 
                    size="lg" 
                    className="w-full"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-5 w-5 mr-2" />
                        Create Free Account
                      </>
                    )}
                  </Button>
                  

                  <p className="text-xs text-center text-muted-foreground">
                    By signing up, you agree to our community guidelines and terms of service.
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Testimonials/Stats Section */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold mb-8 text-foreground">Join Thousands of Donut Lovers</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
            <div>
              <div className="text-3xl font-bold text-primary mb-1">1000+</div>
              <div className="text-sm text-muted-foreground">Members</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-1">500+</div>
              <div className="text-sm text-muted-foreground">Discussions</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-1">50+</div>
              <div className="text-sm text-muted-foreground">Events</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-1">100%</div>
              <div className="text-sm text-muted-foreground">Free</div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
