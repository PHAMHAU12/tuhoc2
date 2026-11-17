import { BookOpen } from "lucide-react";
import { useState } from "react";

interface MediaImageProps {
  src: string;
  alt: string;
  fallbackTitle: string;
  className?: string;
}

export function MediaImage({
  src,
  alt,
  fallbackTitle,
  className = "h-full w-full object-cover",
}: MediaImageProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <div
        role="img"
        aria-label={alt}
        className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-blue-900 via-indigo-900 to-sky-600 p-6 text-center text-white"
      >
        <BookOpen className="h-7 w-7 opacity-80" aria-hidden="true" />
        <span className="font-display text-sm font-semibold tracking-tight">
          {fallbackTitle}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
}
