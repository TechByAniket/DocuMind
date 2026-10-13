import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function LoginPage() {
    const [isloading, setIsloading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleGoogleSignIn(){
        setIsloading(true);
        setError(null);

        const {error} = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin,
            },
        });

        if(error){
            setError(error.message);
            setIsloading(false);
        }
    }

    return (
    <div className="min-h-screen bg-[#F7F6F2] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-[#E8E9ED] bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-[#22233A]">
            DocuMind<span className="text-[#635BFF]">.</span>
          </h1>

          <p className="mt-3 text-sm text-[#737384]">
            Your documents, understood.
          </p>

          <p className="mt-2 text-sm text-[#737384]">
            Sign in to upload PDFs and chat with your documents.
          </p>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isloading}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#E8E9ED] bg-white px-4 py-3 text-sm font-medium text-[#22233A] transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isloading ? 'Redirecting to Google...' : 'Continue with Google'}
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