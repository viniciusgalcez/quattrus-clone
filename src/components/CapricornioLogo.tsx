import Image from "next/image";

type CapricornioLogoProps = {
  size?: number;
  className?: string;
  priority?: boolean;
};

/**
 * Displays the untouched institutional navy artwork inside a circular frame.
 * The scale and clipping only remove the source canvas whitespace at render
 * time; the original brand pixels remain unchanged in the public asset.
 */
export function CapricornioLogo({
  size = 40,
  className = "",
  priority = false,
}: CapricornioLogoProps) {
  return (
    <span
      aria-hidden="true"
      className={`relative block shrink-0 overflow-hidden rounded-full bg-transparent ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src="/brand/capricornio/capricornio-symbol-navy-original.png"
        alt=""
        fill
        sizes={`${size * 5}px`}
        priority={priority}
        className="pointer-events-none object-contain scale-[4.25]"
      />
    </span>
  );
}
