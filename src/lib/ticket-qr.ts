import { ticketPublicUrl } from "@/lib/ticket-code";

export async function ticketQrPng(code: string): Promise<Buffer> {
  const QRCode = (await import("qrcode")).default;
  const payload = ticketPublicUrl(code);
  return QRCode.toBuffer(payload, {
    errorCorrectionLevel: "M",
    margin: 4,
    width: 406,
    color: { dark: "#000000", light: "#FFFFFF" },
  });
}

export async function ticketQrSrc(code: string) {
  const payload = ticketPublicUrl(code);
  try {
    const QRCode = (await import("qrcode")).default;
    return await QRCode.toDataURL(payload, {
      width: 344,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#14161a", light: "#ffffff" },
    });
  } catch {
    return `https://api.qrserver.com/v1/create-qr-code/?size=344x344&ecc=M&data=${encodeURIComponent(payload)}`;
  }
}
