import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ArrowRight, Loader2 } from 'lucide-react';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/features/auth/useAuth';

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [redirecting, setRedirecting] = useState(false);
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  useEffect(() => {
    if (!loading && user) navigate(from, { replace: true });
  }, [loading, user, navigate, from]);

  const handleLogin = () => {
    setRedirecting(true);
    login();
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div className="zenith-aura" aria-hidden="true" />
      <div className="zenith-auth-grid pointer-events-none fixed inset-0 -z-10 opacity-45" aria-hidden="true" />
      <div
        className="zenith-orb-cobalt pointer-events-none fixed -top-32 -right-24 -z-10 size-[28rem] rounded-full blur-3xl"
        aria-hidden="true"
      />
      <div
        className="zenith-orb-crimson pointer-events-none fixed -bottom-32 -left-24 -z-10 size-[26rem] rounded-full blur-3xl"
        aria-hidden="true"
      />

      <div className="fixed top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <Card className="surface-card zenith-fade-up w-full max-w-sm shadow-2xl">
        <CardHeader className="space-y-2 pb-4">
          <p className="zenith-fade-up zenith-stagger-1 font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            CSUI · Studio
          </p>
          <CardTitle className="zenith-fade-up zenith-stagger-2">
            <span className="zenith-wordmark zenith-wordmark-animated inline-block pr-1 text-3xl tracking-tight">
              ZENITH
            </span>
          </CardTitle>
          <CardDescription className="zenith-fade-up zenith-stagger-3 text-sm leading-relaxed">
            Sign in with your SSO-UI account to manage your Zenith profile, showcase your work, and explore the community.
          </CardDescription>
        </CardHeader>

        <CardContent className="zenith-fade-up zenith-stagger-4 space-y-3 pt-1">
          <Button
            type="button"
            size="lg"
            className="zenith-btn-shimmer group h-11 w-full cursor-pointer font-semibold"
            disabled={redirecting}
            onClick={handleLogin}
          >
            {redirecting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                <span>Redirecting to SSO-UI...</span>
              </>
            ) : (
              <>
                <span>Sign in with SSO-UI</span>
                <ArrowRight
                  className="size-4 transition-transform duration-200 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            Only registered Zenith accounts can access this panel.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
