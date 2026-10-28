"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="container not-found">
      <h1>Služba je dočasne nedostupná.</h1>
      <p>Сервіс тимчасово недоступний. / Service temporarily unavailable.</p>
      <button className="button" onClick={reset}>
        Skúsiť znova / Retry
      </button>
    </main>
  );
}
