import type { ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { isAdminSubRoute } from '@/app/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/useAuth';
import { RouteFallback } from '@/app/RouteFallback';

export function AdminRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <RouteFallback label="Checking session" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!user.isWhitelisted) return <Navigate to="/access-denied" replace />;
  if (!user.isAdmin) return <Navigate to="/my-profile" replace />;

  if (!isAdminSubRoute(location.pathname)) {
    return <>{children}</>;
  }

  return (
    <>
      <nav aria-label="Admin navigation" className="mb-4">
        <Button asChild variant="outline" size="sm" className="min-h-10 gap-1.5 rounded-lg text-xs">
          <Link to="/admin">
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            <span>Back to Admin Hub</span>
          </Link>
        </Button>
      </nav>
      {children}
    </>
  );
}