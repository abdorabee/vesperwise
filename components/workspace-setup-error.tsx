export function WorkspaceSetupError() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#08090a] px-6 text-center">
      <div className="text-[15px] font-semibold tracking-[-0.03em] text-white">
        VESPERWISE<span className="text-[#dfff00]">.</span>
      </div>
      <h1 className="mt-8 text-xl font-medium text-white">Couldn&apos;t set up your workspace</h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-[#a0a0a0]">
        You&apos;re signed in, but we couldn&apos;t create the workspace record needed to save
        onboarding or open the product. Reload this page. If it happens again, contact support.
      </p>
      <a
        href="."
        className="mt-8 text-sm font-medium text-[#dfff00] hover:text-[#e8ff40]"
      >
        Reload
      </a>
    </main>
  );
}
