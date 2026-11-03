export function BrandMark({
  size = 28,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
    >
      <g transform="translate(16,16) scale(0.12)">
        <path fill="currentColor" d="M0,-100 L86,-50 L86,50 L0,100 L-86,50 L-86,-50 Z" />
        <path fill="#fff" d="M30,-50 L-15,10 H15 L-10,55 L40,0 H15 Z" />
      </g>
    </svg>
  );
}
