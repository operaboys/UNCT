/**
 * UNCT Logo (07-UI_UX_SYSTEM §2, Liquid Glass identity) — a reusable
 * Preact/SVG component, not a static image asset, so it always renders
 * crisp at any size and its gradient can be restyled from one place.
 *
 * Shape: the letter U built from two straight vertical strokes (the
 * conversion path's two endpoints) capped with a solid "knot" circle at
 * the top of each stroke, joined at the bottom by a DASHED arc — the
 * dashed arc is deliberately not a solid stroke: it reads as the
 * in-progress conversion path connecting the two endpoints/knots, the
 * project's actual core function (parsing one config format into another).
 * Background: a rounded square (13px corner radius at the reference 44px
 * size) filled with the brand purple-to-pink gradient.
 *
 * The U's own strokes/knots are white for contrast against the gradient
 * square — the identity spec (doc 07 §2) only fixes the SQUARE's gradient
 * colors, so white was the uncontroversial default for the foreground
 * shape rather than a further named token.
 */

export function Logo({ size = 44 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="UNCT"
    >
      <defs>
        <linearGradient id="unct-logo-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="var(--unct-purple, #7c5cfc)" />
          <stop offset="100%" stop-color="var(--unct-pink, #ff6b9d)" />
        </linearGradient>
      </defs>

      <rect width="44" height="44" rx="13" fill="url(#unct-logo-bg)" />

      {/* Two vertical strokes — the U's arms / the two conversion endpoints. */}
      <line x1="15" y1="12" x2="15" y2="26" stroke="#ffffff" stroke-width="3" stroke-linecap="round" />
      <line x1="29" y1="12" x2="29" y2="26" stroke="#ffffff" stroke-width="3" stroke-linecap="round" />

      {/* Dashed arc — the in-progress conversion path joining the two endpoints. */}
      <path
        d="M15,26 Q22,38 29,26"
        fill="none"
        stroke="#ffffff"
        stroke-width="3"
        stroke-linecap="round"
        stroke-dasharray="4 4"
      />

      {/* Knot circles — one endpoint marker at the top of each stroke. */}
      <circle cx="15" cy="10" r="2.75" fill="#ffffff" />
      <circle cx="29" cy="10" r="2.75" fill="#ffffff" />
    </svg>
  );
}
