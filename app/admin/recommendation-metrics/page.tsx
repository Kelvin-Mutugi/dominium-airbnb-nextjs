import { z } from "zod";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";

const periodSchema = z.enum(["7d", "30d"]);
const surfaceSchema = z.enum(["home", "listing", "search"]);
const ctrRowsSchema = z.array(
  z.object({
    period: periodSchema,
    surface: surfaceSchema,
    impressions: z.coerce.number().finite().min(0),
    clicks: z.coerce.number().finite().min(0),
    ctr: z.coerce.number().finite().min(0).max(1),
  }),
);
const saveRateRowsSchema = z.array(
  z.object({
    period: periodSchema,
    surface: surfaceSchema,
    impressions: z.coerce.number().finite().min(0),
    saves: z.coerce.number().finite().min(0),
    save_rate: z.coerce.number().finite().min(0).max(1),
  }),
);
const returnVisitRowsSchema = z.array(
  z.object({
    period: periodSchema,
    visitors: z.coerce.number().finite().min(0),
    returning_visitors: z.coerce.number().finite().min(0),
    return_visit_rate: z.coerce.number().finite().min(0).max(1),
  }),
);
const bookingRowsSchema = z.array(
  z.object({
    period: periodSchema,
    clicked_recommendation: z.boolean(),
    sessions: z.coerce.number().finite().min(0),
    booking_sessions: z.coerce.number().finite().min(0),
    booking_start_rate: z.coerce.number().finite().min(0).max(1),
  }),
);

type Period = z.infer<typeof periodSchema>;
type Surface = z.infer<typeof surfaceSchema>;

const PERIODS: readonly Period[] = ["7d", "30d"];
const SURFACES: readonly Surface[] = ["home", "listing", "search"];

function percentage(value: number) {
  return `${(value * 100).toLocaleString("en-KE", {
    maximumFractionDigits: 2,
  })}%`;
}

function MetricsUnavailable() {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
      Recommendation metrics are temporarily unavailable. Confirm the
      measurement migration has been applied, then try again.
    </div>
  );
}

export default async function RecommendationMetricsPage() {
  const admin = getSupabaseAdmin();
  const [ctrResult, saveResult, returnResult, bookingResult] = await Promise.all([
    admin
      .from("rec_metrics_ctr_by_surface")
      .select("period, surface, impressions, clicks, ctr"),
    admin
      .from("rec_metrics_save_rate_by_surface")
      .select("period, surface, impressions, saves, save_rate"),
    admin
      .from("rec_metrics_return_visit_rate")
      .select("period, visitors, returning_visitors, return_visit_rate"),
    admin
      .from("rec_metrics_booking_start_rate")
      .select(
        "period, clicked_recommendation, sessions, booking_sessions, booking_start_rate",
      ),
  ]);

  if (
    ctrResult.error ||
    saveResult.error ||
    returnResult.error ||
    bookingResult.error
  ) {
    console.error("Recommendation metrics query failed:", {
      ctrError: ctrResult.error,
      saveError: saveResult.error,
      returnError: returnResult.error,
      bookingError: bookingResult.error,
    });
    return <MetricsUnavailable />;
  }

  const ctrRows = ctrRowsSchema.safeParse(ctrResult.data);
  const saveRows = saveRateRowsSchema.safeParse(saveResult.data);
  const returnRows = returnVisitRowsSchema.safeParse(returnResult.data);
  const bookingRows = bookingRowsSchema.safeParse(bookingResult.data);
  if (
    !ctrRows.success ||
    !saveRows.success ||
    !returnRows.success ||
    !bookingRows.success
  ) {
    console.error("Recommendation metrics returned an invalid shape.");
    return <MetricsUnavailable />;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-[#E23E85]">
          Recommendation metrics
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Engagement and return-visit measures for BnB recommendation surfaces.
        </p>
      </header>

      {PERIODS.map((period) => {
        const periodCtr = ctrRows.data.filter((row) => row.period === period);
        const periodSaves = saveRows.data.filter(
          (row) => row.period === period,
        );
        const returnMetric = returnRows.data.find(
          (row) => row.period === period,
        );
        const periodBookings = bookingRows.data.filter(
          (row) => row.period === period,
        );

        return (
          <section
            key={period}
            className="space-y-4 rounded-xl border border-[#E8DCE2] bg-white p-4 shadow-sm sm:p-6"
          >
            <h2 className="text-lg font-semibold text-[#9C2454]">
              Last {period === "7d" ? "7" : "30"} days
            </h2>

            <div className="grid gap-3 sm:grid-cols-3">
              <article className="rounded-lg border border-[#DDE9F5] bg-[#F3F8FD] p-4">
                <p className="text-sm text-gray-600">Unique visitors</p>
                <p className="mt-1 text-2xl font-semibold text-[#2563A6]">
                  {returnMetric?.visitors ?? 0}
                </p>
              </article>
              <article className="rounded-lg border border-[#DDEDE4] bg-[#F1F8F3] p-4">
                <p className="text-sm text-gray-600">Return-visit rate</p>
                <p className="mt-1 text-2xl font-semibold text-[#287A4B]">
                  {percentage(returnMetric?.return_visit_rate ?? 0)}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Visitors with events on at least two UTC dates.
                </p>
              </article>
              <article className="rounded-lg border border-[#F1E1CB] bg-[#FCF6EC] p-4">
                <p className="text-sm text-gray-600">Returning visitors</p>
                <p className="mt-1 text-2xl font-semibold text-[#A86516]">
                  {returnMetric?.returning_visitors ?? 0}
                </p>
              </article>
            </div>

            <div className="overflow-x-auto rounded-lg border border-[#E8DCE2]">
              <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="bg-[#FBF5F8] text-xs font-medium uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Surface</th>
                    <th className="px-4 py-3 text-right">Impressions</th>
                    <th className="px-4 py-3 text-right">Clicks</th>
                    <th className="px-4 py-3 text-right">CTR</th>
                    <th className="px-4 py-3 text-right">Saves</th>
                    <th className="px-4 py-3 text-right">Save rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {SURFACES.map((surface) => {
                    const ctr = periodCtr.find(
                      (row) => row.surface === surface,
                    );
                    const saves = periodSaves.find(
                      (row) => row.surface === surface,
                    );
                    return (
                      <tr key={surface}>
                        <th className="px-4 py-3 font-medium capitalize text-[#9C2454]">
                          {surface}
                        </th>
                        <td className="px-4 py-3 text-right text-[#2563A6]">
                          {ctr?.impressions ?? 0}
                        </td>
                        <td className="px-4 py-3 text-right text-[#2563A6]">
                          {ctr?.clicks ?? 0}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-[#287A4B]">
                          {percentage(ctr?.ctr ?? 0)}
                        </td>
                        <td className="px-4 py-3 text-right text-[#A86516]">
                          {saves?.saves ?? 0}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-[#9C2454]">
                          {percentage(saves?.save_rate ?? 0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500">
              Save rate is the share of visible recommendation cards followed
              by a matching save within seven days, attributed to the latest
              prior impression.
            </p>

            <div className="space-y-2">
              <h3 className="font-semibold text-[#1B1A2E]">
                Booking-start rate by recommendation click
              </h3>
              <p className="text-xs text-gray-500">
                Sessions are approximated as anonymous visitor-days in UTC;
                no device fingerprinting or additional session identifier is
                stored.
              </p>
              <div className="overflow-x-auto rounded-lg border border-[#DDE9F5]">
                <table className="w-full min-w-[460px] text-left text-sm">
                  <thead className="bg-[#F3F8FD] text-xs font-medium uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Visitor-day group</th>
                      <th className="px-4 py-3 text-right">Sessions</th>
                      <th className="px-4 py-3 text-right">Booking starts</th>
                      <th className="px-4 py-3 text-right">Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {[true, false].map((clicked) => {
                      const metric = periodBookings.find(
                        (row) =>
                          row.clicked_recommendation === clicked,
                      );
                      return (
                        <tr key={String(clicked)}>
                          <th className="px-4 py-3 font-medium text-[#2563A6]">
                            {clicked
                              ? "Clicked a recommendation"
                              : "No recommendation click"}
                          </th>
                          <td className="px-4 py-3 text-right text-[#2563A6]">
                            {metric?.sessions ?? 0}
                          </td>
                          <td className="px-4 py-3 text-right text-[#A86516]">
                            {metric?.booking_sessions ?? 0}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-[#287A4B]">
                            {percentage(metric?.booking_start_rate ?? 0)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
