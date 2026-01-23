export function formatPrice(price: number | null, language: string): string {
  if (!price) return "-";
  const locale = language === "en" ? "en-US" : language === "fr" ? "fr-FR" : "pt-BR";
  const currency = language === "en" ? "USD" : language === "fr" ? "EUR" : "BRL";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
  }).format(price);
}
