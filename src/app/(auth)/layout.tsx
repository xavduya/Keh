export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="flex items-center justify-center gap-2 mb-6 font-heading text-[26px] font-extrabold tracking-[-0.04em] text-brand-dark">
          <span className="w-9 h-9 rounded-[10px] bg-brand flex items-center justify-center text-white text-[20px]">
            k
          </span>
          keh<span className="text-brand">.</span>
        </div>
        <div className="bg-white rounded-xl border border-brand-line p-6 sm:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
