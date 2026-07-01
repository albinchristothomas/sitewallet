export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div className="rounded-2xl border border-amber-300/40 bg-amber-50 p-6 dark:border-amber-900/50 dark:bg-amber-950/30">
        <p className="text-xs font-bold uppercase tracking-widest text-amber-700 dark:text-amber-300">
          No connection
        </p>
        <h1 className="mt-1 text-xl font-semibold">
          You're offline right now.
        </h1>
        <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
          RigWise needs a network connection for most actions. Your existing
          data is safe on the server.
        </p>
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          If you're at a gate and the network is down, use the paper backup
          form — then enter the workers as walk-ins once you're back online so
          the day's record stays complete.
        </p>
      </div>
      <a
        href="/"
        className="mt-6 rounded-md bg-zinc-900 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        Try again
      </a>
    </main>
  );
}
