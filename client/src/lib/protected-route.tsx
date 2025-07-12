import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading } = useAuth();

  return (
    <Route path={path}>
      {() => {
        console.log('ProtectedRoute - path:', path, 'user:', user?.username, 'loading:', isLoading);
        
        if (isLoading) {
          return (
            <div className="flex items-center justify-center min-h-screen">
              <Loader2 className="h-8 w-8 animate-spin text-border" />
            </div>
          );
        }

        if (!user) {
          console.log('No user, redirecting to auth');
          return <Redirect to="/auth" />;
        }

        console.log('User authenticated, rendering component');
        return <Component />;
      }}
    </Route>
  );
}
