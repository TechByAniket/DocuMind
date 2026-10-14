
export default function TypingIndicator() {
  return (
    <div
      className="flex items-center gap-1 px-4 py-3"
      aria-label="AI is generating a response"
    >
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="w-2 h-2 rounded-full bg-[#635BFF] opacity-60"
          style={{
            animation: `pulse-soft 1.2s ease-in-out ${index * 0.2}s infinite`,
          }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}
