import { BookOpen, LogOut } from "lucide-react";

interface NavbarProps {
  // Custom right-side content (e.g. "Back" button in ChatPage). Overrides default right side.
  rightSlot?: React.ReactNode;
  // Currently signed-in user's email address
  userEmail?: string;
  // Callback when user clicks "Sign out"
  onSignOut?: () => void;
  // Use wide max-width for split view pages (e.g. ChatPage)
  fluid?: boolean;
}

export default function Navbar({
  rightSlot,
  userEmail,
  onSignOut,
  fluid = false,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-[#E8E9ED]">
      <nav
        className={`${
          fluid ? 'max-w-[1600px]' : 'max-w-5xl'
        } mx-auto px-4 sm:px-6 h-14 flex items-center justify-between`}
        aria-label="Main navigation"
      >
        {/* Left side: Brand logo & name */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-[10px] bg-[#635BFF] flex items-center justify-center flex-shrink-0">
            <BookOpen size={16} color="white" strokeWidth={2} aria-hidden="true" />
          </div>
          <span className="font-semibold text-[#22233A] text-[15px] tracking-[-0.2px]">
            DocuMind
          </span>
        </div>

        {/* Custom right side: shown if passed by page (e.g. ChatPage back button) */}
        {rightSlot && (
          <div className="flex items-center gap-3">{rightSlot}</div>
        )}

        {/* Default right side: user email and sign-out button */}
        {!rightSlot && (
          <div className="flex items-center gap-3">
            {userEmail && (
              <span
                className="hidden sm:block max-w-[180px] truncate text-[13px] text-[#737384]"
                title={userEmail}
              >
                {userEmail}
              </span>
            )}

            <button
              type="button"
              onClick={onSignOut}
              className="flex items-center gap-2 rounded-[10px] border border-[#E8E9ED] px-3 py-2 text-[13px] font-medium text-[#22233A] hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <LogOut size={15} aria-hidden="true" />
              <span>Sign out</span>
            </button>
          </div>
        )}
      </nav>
    </header>
  );
}