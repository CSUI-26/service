import { Link, useLocation } from 'react-router';
import { ChevronDown, LogOut, User } from 'lucide-react';
import { findNavItem, isNavItemActive, navItems, type NavItem } from '@/app/navigation';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/features/auth/useAuth';
import { cn } from '@/lib/utils';

type NavItemWithDescription = NavItem & { description?: string };

export function AppHeader() {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();

  const items = navItems as NavItemWithDescription[];
  const current = findNavItem(pathname) as NavItemWithDescription | undefined;
  const CurrentIcon = current?.icon ?? User;

  const memberItems = items.filter((item) => !item.requireAdmin);
  const adminItems = items.filter((item) => item.requireAdmin);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-card/85 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          to="/my-profile"
          aria-label="ZENITH"
          className="zenith-wordmark shrink-0 pr-1 text-xl tracking-tight select-none"
        >
          ZENITH
        </Link>

        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2 rounded-xl border-primary/40 bg-primary/15 px-3.5 text-xs font-semibold text-foreground hover:bg-primary/25 sm:text-sm"
              >
                <CurrentIcon className="size-4 text-primary" aria-hidden="true" />
                <span>{current?.label ?? 'Profilku'}</span>
                <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-64 rounded-2xl p-1.5">
              {user?.nama ? (
                <>
                  <DropdownMenuLabel className="px-3 py-2">
                    <span className="block truncate text-xs font-semibold text-foreground">
                      {user.nama}
                    </span>
                    <span className="block truncate font-mono text-[11px] font-normal text-muted-foreground">
                      {user.npm ?? user.email ?? ''}
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                </>
              ) : null}

              {memberItems.map((item) => {
                const active = isNavItemActive(pathname, item);
                const ItemIcon = item.icon;
                return (
                  <DropdownMenuItem
                    key={item.to}
                    asChild
                    className={cn(
                      'cursor-pointer rounded-xl px-3 py-2.5',
                      active && 'bg-primary text-primary-foreground focus:bg-primary focus:text-primary-foreground',
                    )}
                  >
                    <Link to={item.to} aria-current={active ? 'page' : undefined}>
                      <ItemIcon
                        className={cn('size-4 shrink-0', active ? 'text-primary-foreground' : 'text-primary')}
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <span className="block text-xs font-semibold leading-tight">{item.label}</span>
                        {item.description ? (
                          <span
                            className={cn(
                              'block truncate text-[11px]',
                              active ? 'text-primary-foreground/80' : 'text-muted-foreground',
                            )}
                          >
                            {item.description}
                          </span>
                        ) : null}
                      </div>
                    </Link>
                  </DropdownMenuItem>
                );
              })}

              {user?.isAdmin && adminItems.length > 0 ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Admin
                  </DropdownMenuLabel>
                  {adminItems.map((item) => {
                    const active = isNavItemActive(pathname, item);
                    const ItemIcon = item.icon;
                    return (
                      <DropdownMenuItem
                        key={item.to}
                        asChild
                        className={cn(
                          'cursor-pointer rounded-xl px-3 py-2',
                          active && 'bg-primary text-primary-foreground focus:bg-primary focus:text-primary-foreground',
                        )}
                      >
                        <Link to={item.to} aria-current={active ? 'page' : undefined}>
                          <ItemIcon
                            className={cn('size-4 shrink-0', active ? 'text-primary-foreground' : 'text-muted-foreground')}
                            aria-hidden="true"
                          />
                          <div className="min-w-0">
                            <span className="block text-xs font-medium leading-tight">{item.label}</span>
                            {item.description ? (
                              <span
                                className={cn(
                                  'block truncate text-[11px]',
                                  active ? 'text-primary-foreground/80' : 'text-muted-foreground',
                                )}
                              >
                                {item.description}
                              </span>
                            ) : null}
                          </div>
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </>
              ) : null}

              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => void logout()}
                className="cursor-pointer rounded-xl px-3 py-2 text-xs font-medium"
              >
                <LogOut className="size-4 shrink-0" aria-hidden="true" />
                <span>Keluar</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
