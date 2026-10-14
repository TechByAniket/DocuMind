import { useState } from "react";
import { supabase } from "../lib/supabase";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleGoogleSignIn() {
        setIsLoading(true);
        setError(null);

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin,
            },
        });

        if (error) {
            setError(error.message);
            setIsLoading(false);
        }
    }

    return (
    <div className="min-h-screen bg-[#F7F6F2] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-[#E8E9ED] bg-white p-8
                      shadow-[0_4px_24px_rgba(99,91,255,0.08),0_1px_4px_rgba(34,35,58,0.06)]">
        <div className="mb-8 text-center">
          {/* Brand logo mark */}
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#635BFF]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M9 12h6M9 8h6M9 16h4M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"
                stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <h1 className="text-3xl font-semibold tracking-tight text-[#22233A]">
            Docu<span className="text-[#635BFF]">Mind.</span>
          </h1>

          <p className="mt-3 text-sm text-[#737384]">
            Your documents, understood.
          </p>

          <p className="mt-1.5 text-sm text-[#737384]">
            Sign in to upload PDFs and chat with your documents.
          </p>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#E8E9ED] bg-white
                     px-4 py-3 text-sm font-medium text-[#22233A] cursor-pointer
                     transition-all duration-150
                     hover:border-[#D0D1D9] hover:shadow-[0_2px_8px_rgba(34,35,58,0.08)] hover:-translate-y-px
                     active:translate-y-0 active:shadow-none
                     disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? (
            <>
              <Loader2 size={18} className="animate-spin text-[#737384]" aria-hidden="true" />
              Redirecting to Google...
            </>
          ) : (
            <>
              {/* Google G icon */}
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </>
          )}
        </button>

        {error && (
          <p role="alert" className="mt-4 text-center text-sm text-red-600">
            {error}
          </p>
        )}

        <p className="mt-6 text-center text-xs text-[#737384]">
          Your documents are private to your account.
        </p>
      </div>
    </div>
  );
}