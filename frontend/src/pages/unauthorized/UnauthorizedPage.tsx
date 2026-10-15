import { Link } from "react-router-dom";

export function UnauthorizedPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-5 py-12">
      <section className="w-full max-w-lg rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-card sm:p-12">
        <p className="text-sm font-semibold tracking-wide text-amber-700">
          ACCESS DENIED
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
          You don’t have permission
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Your account doesn’t have access to this page. If you think you
          should, contact your workspace administrator.
        </p>
        <Link
          to="/app"
          className="btn-primary mt-7 inline-flex items-center justify-center"
        >
          Back to workspace
        </Link>
      </section>
    </main>
  );
}
