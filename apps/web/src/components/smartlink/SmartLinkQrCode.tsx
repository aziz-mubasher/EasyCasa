import QRCode from 'qrcode';

type Props = {
  url: string;
  /** Accessible name for the QR (URL duplicated in visible text). */
  label: string;
};

/** Server-rendered QR for the canonical SmartLink URL — does not block client hydration. */
export async function SmartLinkQrCode({ url, label }: Props) {
  const src = await QRCode.toDataURL(url, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 132,
    color: { dark: '#16233b', light: '#ffffff' },
  });

  return (
    <figure className="flex flex-col items-end gap-1 text-right">
      {/* QR is a data URL; next/image does not apply. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} width={132} height={132} alt={label} className="rounded-md border border-line bg-white" />
      <figcaption className="max-w-[11rem] text-[10px] leading-snug text-muted break-all">{url}</figcaption>
    </figure>
  );
}
