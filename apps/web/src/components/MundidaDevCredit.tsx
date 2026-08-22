/** Brand credit — keep English wording on every locale. */
export const MUNDIDA_DEV_CREDIT_PREFIX = 'System developed by ';
export const MUNDIDA_DEV_CREDIT_URL = 'https://www.mundida.com/';

type Props = {
  className?: string;
};

export function MundidaDevCredit({ className }: Props) {
  return (
    <p className={className}>
      {MUNDIDA_DEV_CREDIT_PREFIX}
      <a href={MUNDIDA_DEV_CREDIT_URL}>MUNDIDA</a>
    </p>
  );
}
