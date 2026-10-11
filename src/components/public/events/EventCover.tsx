import Image from "next/image";

/** Cover photo, or the template pattern when none was uploaded. */
export function EventCover({
  src,
  pattern,
  alt = "",
  priority = false,
  className = "",
}: {
  src: string | null;
  pattern: string;
  alt?: string;
  priority?: boolean;
  className?: string;
}) {
  if (src) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes="100vw"
        priority={priority}
        className={`object-cover ${className}`}
      />
    );
  }

  return (
    <div
      aria-hidden
      className={`absolute inset-0 ${className}`}
      style={{ background: pattern }}
    />
  );
}
