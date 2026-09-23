alter view public.host_dashboard_stats
  set (security_invoker = true);

comment on view public.host_dashboard_stats is
  'Host dashboard aggregates evaluated with the requesting user permissions and RLS context.';
