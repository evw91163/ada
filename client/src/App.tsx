import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AuthGuard from "./components/AuthGuard";
import Home from "./pages/Home";
import Forum from "./pages/Forum";
import ForumCategory from "./pages/ForumCategory";
import Thread from "./pages/Thread";
import NewThread from "./pages/NewThread";
import Links from "./pages/Links";
import ForSale from "./pages/ForSale";
import Articles from "./pages/Articles";
import Advertisements from "./pages/Advertisements";
import Discounts from "./pages/Discounts";
import SignUp from "./pages/SignUp";
import Events from "./pages/Events";
import HelpWanted from "./pages/HelpWanted";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import Search from "./pages/Search";
import Login from "./pages/Login";
import Backup from "./pages/Backup";
import ChangePassword from "./pages/ChangePassword";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/forum" component={Forum} />
      <Route path="/forum/category/:slug" component={ForumCategory} />
      <Route path="/forum/thread/:id" component={Thread} />
      <Route path="/forum/new" component={NewThread} />
      <Route path="/links" component={Links} />
      <Route path="/for-sale" component={ForSale} />
      <Route path="/articles" component={Articles} />
      <Route path="/advertisements" component={Advertisements} />
      <Route path="/discounts" component={Discounts} />
      <Route path="/sign-up" component={SignUp} />
      <Route path="/signup" component={SignUp} />
      <Route path="/login" component={Login} />
      <Route path="/events" component={Events} />
      <Route path="/help-wanted" component={HelpWanted} />
      <Route path="/profile/:id" component={Profile} />
      <Route path="/settings" component={Settings} />
      <Route path="/admin" component={Admin} />
      <Route path="/admin/backup" component={Backup} />
      <Route path="/search" component={Search} />
      <Route path="/change-password" component={ChangePassword} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <AuthGuard>
            <Router />
          </AuthGuard>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
