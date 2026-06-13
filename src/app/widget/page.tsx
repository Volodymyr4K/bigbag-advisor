import AdviceForm from "../AdviceForm";

// Клієнтський віджет: те саме ядро, простіший інтерфейс для відвідувача сайту.
export default function WidgetPage() {
  return (
    <main className="wrap">
      <h1>Який біг-бег вам підійде?</h1>
      <p className="sub">
        Опишіть, що плануєте пакувати — підкажемо типову модель і з'єднаємо з потрібним
        відділом. Точні розміри шиємо під замовлення.
      </p>
      <AdviceForm variant="widget" />
      <p className="foot">Торгова Група «ВБА» · демо-віджет.</p>
    </main>
  );
}
