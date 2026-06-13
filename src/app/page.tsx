import AdviceForm from "./AdviceForm";

// Внутрішній sales-desk: для менеджера/новачка ВБА.
export default function DeskPage() {
  return (
    <main className="wrap">
      <h1>Радник підбору біг-бегів · sales-desk</h1>
      <p className="sub">
        Внутрішній інструмент для менеджера/новачка. Вставте запит клієнта — отримаєте
        типову специфікацію, у який відділ передати і чернетку відповіді. Усе ґрунтується
        на реальному контенті сайту ВБА (не вигадане).
      </p>
      <AdviceForm variant="desk" />
      <p className="foot">
        Демо-конфіг під Торгову Групу «ВБА». Клієнтський віджет: <a href="/widget">/widget</a>.
        Методика і виміри: <a href="https://github.com/Volodymyr4K/bigbag-advisor">README на GitHub</a>.
      </p>
    </main>
  );
}
