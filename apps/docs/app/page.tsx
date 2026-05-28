import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center text-center px-6">
      <h1 className="mb-4 text-5xl font-bold tracking-tight">LangSync</h1>
      <p className="text-fd-muted-foreground max-w-xl mb-8">
        Modern localization workflow tooling for TypeScript applications.
      </p>
      <Link
        href="/docs"
        className="inline-flex items-center rounded-md bg-fd-primary px-5 py-2.5 text-sm font-medium text-fd-primary-foreground hover:opacity-90"
      >
        Read the docs →
      </Link>
    </main>
  );
}
