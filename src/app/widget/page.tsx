import AdviceForm from "../AdviceForm";

// Клієнтський віджет: те саме ядро, простіший інтерфейс для відвідувача сайту.
// ?embed=1 — компактний режим для вбудови через <iframe> (без зайвого «хрому»).
export default function WidgetPage({
  searchParams,
}: {
  searchParams: { embed?: string };
}) {
  const embed = searchParams.embed === "1";
  return (
    <main className="wrap" style={embed ? { paddingTop: 16, paddingBottom: 24 } : undefined}>
      {!embed && <h1>Який біг-бег вам підійде?</h1>}
      {!embed && (
        <p className="sub">
          Опишіть, що плануєте пакувати — підкажемо типову модель і з'єднаємо з потрібним
          відділом. Точні розміри шиємо під замовлення.
        </p>
      )}
      <AdviceForm variant="widget" />
      {!embed && (
        <p className="foot">
          Торгова Група «ВБА» · Відділ біг-бегів:{" "}
          <a href="tel:+380672316223">+380 67 231 62 23</a> ·{" "}
          <a href="mailto:bigbag@vba.com.ua">bigbag@vba.com.ua</a> ·{" "}
          <a href="https://vba.com.ua/uk/" target="_blank" rel="noopener noreferrer">vba.com.ua</a>
        </p>
      )}
    </main>
  );
}
