export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-md px-4">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Datamodel.ai</h1>
          <p className="text-sm text-muted-foreground mt-1">
            The data model your AI agents trust.
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
