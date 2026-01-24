export function formatDate(date: Date | string, language: string): string {
  return new Intl.DateTimeFormat(
    language === "en" ? "en-US" : language === "fr" ? "fr-FR" : "pt-BR",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(new Date(date));
}
