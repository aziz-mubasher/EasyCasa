/** Brand credit — exact English wording on every locale (do not i18n). */
export const MUNDIDA_DEV_CREDIT_PREFIX = 'Made with ❤️ in Italy by ';
export const MUNDIDA_DEV_CREDIT_URL = 'https://www.mundida.com/';

type Props = {
  className?: string;
  /** When true, prefix with a middot for same-bar placement after copyright/legal text. */
  leadingMiddot?: boolean;
  /** Render as span so it can sit on the same line as copyright. */
  inline?: boolean;
};

export function MundidaDevCredit({ className, leadingMiddot = false, inline = false }: Props) {
  const body = (
    <>
      {leadingMiddot ? ' · ' : null}
      {MUNDIDA_DEV_CREDIT_PREFIX}
      <a href={MUNDIDA_DEV_CREDIT_URL}>MUNDIDA</a>
    </>
  );
  if (inline) {
    return <span className={className}>{body}</span>;
  }
  return <p className={className}>{body}</p>;
}
