export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div className="rw-panel rw-spine w-full overflow-hidden rounded-[12px] p-6 pl-7 text-left">
        <p className="eyebrow" style={{ color: "var(--warn-text)" }}>
          Offline
        </p>
        <h1 className="mt-1 text-xl font-semibold">No network connection.</h1>
        <p className="mt-2 text-sm text-[color:var(--text-dim)]">
          Nothing you saved is lost. Reconnect to keep going.
        </p>
      </div>
      <a
        href="/"
        className="rw-pressable mt-6 inline-flex h-10 items-center justify-center rounded-[7px] bg-[color:var(--brand)] px-4 text-sm font-bold text-[color:var(--on-brand)]"
      >
        Try again
      </a>
    </main>
  );
}
