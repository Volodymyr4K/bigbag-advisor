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
      {!embed && <p className="foot">Торгова Група «ВБА» · демо-віджет.</p>}
    </main>
  );
}
