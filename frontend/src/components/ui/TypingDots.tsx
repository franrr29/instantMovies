function Dot({ delay }: { delay?: string }) {
  return (
    <i
      className="inline-block h-1.5 w-1.5 animate-blink rounded-full bg-accent"
      style={delay ? { animationDelay: delay } : undefined}
    />
  );
}

export function TypingDots() {
  return (
    <span className="flex items-center gap-1" role="status" aria-label="Escribiendo…">
      <Dot />
      <Dot delay="0.2s" />
      <Dot delay="0.4s" />
    </span>
  );
}
