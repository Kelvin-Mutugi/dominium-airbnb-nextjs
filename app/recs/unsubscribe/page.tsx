import UnsubscribeForm from "./UnsubscribeForm";

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  const validToken =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      token,
    );

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8F7F4] px-5 py-12">
      <section className="w-full max-w-lg rounded-2xl border border-[#E9E6DD] bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-semibold text-[#1B1A2E]">
          Unsubscribe from alerts
        </h1>
        {validToken ? (
          <>
            <p className="mt-3 text-sm leading-6 text-[#3A3856]/75">
              Confirm to stop the alert associated with this link. You can
              unsubscribe from email and WhatsApp alerts here.
            </p>
            <UnsubscribeForm token={token} />
          </>
        ) : (
          <p role="alert" className="mt-3 text-sm text-red-700">
            This unsubscribe link is invalid or incomplete.
          </p>
        )}
      </section>
    </main>
  );
}
