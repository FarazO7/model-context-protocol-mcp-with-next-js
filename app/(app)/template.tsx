// Remounts on every navigation, so each page fades in. Reduced motion turns it off.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="motion-safe:animate-fade-in">{children}</div>;
}
