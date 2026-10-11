import { BookOpen } from 'lucide-react';

interface NavbarProps {
  // Optional action shown on the right — used by ChatPage for a "back" button
  rightSlot?: React.ReactNode;
}

// A compact top navigation bar shared across pages.
export default function Navbar({ rightSlot }: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-[#E8E9ED]">
      <nav
        className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between"
        aria-label="Main navigation"
      >
        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-[10px] bg-[#635BFF] flex items-center justify-center flex-shrink-0">
            <BookOpen size={16} color="white" strokeWidth={2} aria-hidden="true" />
          </div>
          <span className="font-semibold text-[#22233A] text-[15px] tracking-[-0.2px]">
            DocuMind
          </span>
        </div>

        {/* Right slot — context-dependent content */}
        {rightSlot && (
          <div className="flex items-center gap-3">
            {rightSlot}
          </div>
        )}

        {/* Default right: workspace indicator */}
        {!rightSlot && (
          <div className="flex items-center gap-2 text-[13px] text-[#737384]">
            <div
              className="w-7 h-7 rounded-full bg-[#E8E5FC] flex items-center justify-center text-[11px] font-semibold text-[#635BFF]"
              aria-label="Workspace"
            >
              WS
            </div>
            <span className="hidden sm:inline">My Workspace</span>
          </div>
        )}
      </nav>
    </header>
  );
}
