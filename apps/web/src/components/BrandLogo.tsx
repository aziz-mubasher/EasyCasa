import Image from 'next/image';

const SRC = {
  /** Full-color wordmark for light surfaces. */
  color: '/brand/easycasa-italia-color.png',
  /** White wordmark for the ink footer. */
  white: '/brand/easycasa-italia-white.png',
} as const;

type Props = {
  variant?: keyof typeof SRC;
  alt: string;
  className?: string;
  priority?: boolean;
  /** `next/image` sizes hint. Defaults to header / footer lockup width. */
  sizes?: string;
  /** Serve the source PNG so the wordmark stays sharp at hero scale. */
  crisp?: boolean;
};

/** Official EasyCasa Italia wordmark (1000×264). `alt` names the home link. */
export function BrandLogo({
  variant = 'color',
  alt,
  className,
  priority = false,
  sizes = '(max-width: 640px) 160px, 200px',
  crisp = false,
}: Props) {
  return (
    <Image
      src={SRC[variant]}
      alt={alt}
      width={1000}
      height={264}
      priority={priority}
      quality={100}
      sizes={sizes}
      unoptimized={crisp}
      className={className}
    />
  );
}
