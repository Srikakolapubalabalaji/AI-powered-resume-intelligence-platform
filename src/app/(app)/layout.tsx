// This route group layout is intentionally left as a passthrough.
// All pages in this group use AppWrapper directly for the shell layout.
// The route group exists only for organizational purposes.
export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
