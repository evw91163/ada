import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { trpc } from "@/lib/trpc";

interface AuthGuardProps {
  children: React.ReactNode;
}

// Public routes that don't require authentication
const PUBLIC_ROUTES = ["/login", "/sign-up", "/signup"];

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, isAuthenticated, loading } = useAuth();
  const [location, navigate] = useLocation();
  
  // Check if user must change password
  const { data: mustChangeData, isLoading: checkingMustChange } = trpc.auth.mustChangePassword.useQuery(undefined, {
    enabled: isAuthenticated && location !== "/change-password",
  });
  
  const isPublicRoute = PUBLIC_ROUTES.some(route => 
    location === route || location.startsWith(route + "/")
  );
  
  useEffect(() => {
    // If not loading and not authenticated and not on a public route, redirect to login
    if (!loading && !isAuthenticated && !isPublicRoute) {
      navigate("/login");
    }
  }, [loading, isAuthenticated, isPublicRoute, navigate]);
  
  useEffect(() => {
    // If authenticated and must change password, redirect to change password page
    if (isAuthenticated && !checkingMustChange && mustChangeData?.mustChange && location !== "/change-password") {
      navigate("/change-password");
    }
  }, [isAuthenticated, checkingMustChange, mustChangeData, location, navigate]);
  
  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-orange-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  // If on public route, always render children
  if (isPublicRoute) {
    return <>{children}</>;
  }
  
  // If not authenticated, don't render anything (will redirect)
  if (!isAuthenticated) {
    return null;
  }
  
  // If must change password and not on change password page, don't render
  if (mustChangeData?.mustChange && location !== "/change-password") {
    return null;
  }
  
  return <>{children}</>;
}
