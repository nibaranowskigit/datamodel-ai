/** Full-bleed shell only. Narrow pages (forgot-password, etc.) center themselves; sign-in/sign-up use a full-width grid. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-background">{children}</div>;
}
