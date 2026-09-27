-- ============================================================
-- Migration 009 — AI assistant rate limiting
--
-- Every request to /api/assistant (OpenAI or guided) is recorded
-- in ai_requests. consume_ai_request() checks the signed-in user's
-- per-minute and per-day limits and records the request in one
-- step, serialized per user with an advisory lock so parallel
-- requests can't slip past the limit.
--
-- The table has RLS enabled and no policies: only the
-- SECURITY DEFINER function below reads or writes it.
-- ============================================================

create table ai_requests (
  id          bigint      generated always as identity primary key,
  user_id     uuid        not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);

comment on table ai_requests is
  'One row per AI assistant request, for rate limiting. Rows older than 2 days are pruned.';

create index idx_ai_requests_user_id_created_at
  on ai_requests (user_id, created_at desc);

alter table ai_requests enable row level security;

-- ─────────────────────────────────────────────────────────────
-- consume_ai_request(per_minute, per_day)
--
-- Returns allowed = true and records the request, or
-- allowed = false with how many seconds until the next request
-- would be allowed. Limits are capped (30/min, 500/day) so a
-- direct RPC call can't be used to flood the table.
-- ─────────────────────────────────────────────────────────────
create or replace function consume_ai_request(per_minute int, per_day int)
returns table (allowed boolean, retry_after_seconds int)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid          uuid := auth.uid();
  minute_limit int  := least(greatest(per_minute, 1), 30);
  day_limit    int  := least(greatest(per_day, 1), 500);
  oldest       timestamptz;
begin
  if uid is null then
    return query select false, 0;
    return;
  end if;

  -- One request at a time per user, for the rest of this transaction.
  perform pg_advisory_xact_lock(hashtext('ai_requests:' || uid::text));

  if (select count(*) from ai_requests
      where user_id = uid and created_at > now() - interval '1 minute') >= minute_limit then
    select min(created_at) into oldest from ai_requests
      where user_id = uid and created_at > now() - interval '1 minute';
    return query select false,
      greatest(1, ceil(extract(epoch from (oldest + interval '1 minute' - now()))))::int;
    return;
  end if;

  if (select count(*) from ai_requests
      where user_id = uid and created_at > now() - interval '1 day') >= day_limit then
    select min(created_at) into oldest from ai_requests
      where user_id = uid and created_at > now() - interval '1 day';
    return query select false,
      greatest(1, ceil(extract(epoch from (oldest + interval '1 day' - now()))))::int;
    return;
  end if;

  insert into ai_requests (user_id) values (uid);
  delete from ai_requests where user_id = uid and created_at < now() - interval '2 days';

  return query select true, 0;
end;
$$;

revoke execute on function consume_ai_request(int, int) from public, anon;
grant execute on function consume_ai_request(int, int) to authenticated, service_role;
