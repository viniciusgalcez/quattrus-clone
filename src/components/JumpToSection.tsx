"use client";

/**
 * Anchor link that always gives visible feedback on click — even when the
 * target is already on screen (nothing to scroll to) or the same link is
 * clicked twice in a row (the URL hash doesn't change, so plain `:target`
 * CSS never re-fires). Restarting the flash animation via JS sidesteps both.
 */
export function JumpToSection({
  targetId,
  className,
  "aria-label": ariaLabel,
  children,
}: {
  targetId: string;
  className?: string;
  "aria-label"?: string;
  children: React.ReactNode;
}) {
  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    const el = document.getElementById(targetId);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.classList.remove("flash-target");
    // Force a reflow so removing+re-adding the class restarts the animation.
    void el.offsetWidth;
    el.classList.add("flash-target");
  }

  return (
    <a href={`#${targetId}`} onClick={handleClick} className={className} aria-label={ariaLabel}>
      {children}
    </a>
  );
}
