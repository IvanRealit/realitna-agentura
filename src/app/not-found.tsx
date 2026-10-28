import Link from "next/link";
export default function NotFound() {
  return (
    <main className="container not-found">
      <span>404</span>
      <h1>Toto miesto sme nenašli.</h1>
      <p>Сторінку не знайдено. / Page not found.</p>
      <div className="button-row">
        <Link className="button" href="/sk">
          Domov
        </Link>
        <Link className="button outline" href="/uk">
          Головна
        </Link>
        <Link className="button outline" href="/en">
          Home
        </Link>
      </div>
    </main>
  );
}
