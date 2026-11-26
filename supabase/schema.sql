create extension if not exists pgcrypto with schema extensions;

create type public.group_kind as enum ('Trip', 'Home', 'Couple', 'Friends', 'Other');
create type public.expense_category as enum ('Food', 'Stay', 'Transport', 'Shopping', 'Activities', 'Bills', 'Other');
create type public.split_method as enum ('equal', 'custom', 'percentage');

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 100),
  description text not null default '',
  kind public.group_kind not null default 'Trip',
  currency char(3) not null default 'USD',
  start_date date,
  end_date date,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (start_date is null or end_date is null or end_date >= start_date)
);

create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  display_name text not null check (length(trim(display_name)) between 1 and 80),
  joined_at timestamptz not null default now(),
  unique (group_id, user_id),
  unique (group_id, id)
);
create index group_members_user_group_idx on public.group_members (user_id, group_id);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  description text not null check (length(trim(description)) between 1 and 160),
  amount numeric(12, 2) not null check (amount > 0),
  currency char(3) not null,
  category public.expense_category not null default 'Other',
  split_method public.split_method not null default 'equal',
  split_values jsonb not null default '{}'::jsonb check (jsonb_typeof(split_values) = 'object'),
  paid_by_member_id uuid not null,
  expense_date date not null default current_date,
  notes text not null default '',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, id),
  foreign key (group_id, paid_by_member_id) references public.group_members(group_id, id) on delete restrict
);
create index expenses_group_date_idx on public.expenses (group_id, expense_date desc);

create table public.expense_splits (
  group_id uuid not null,
  expense_id uuid not null references public.expenses(id) on delete cascade,
  member_id uuid not null,
  amount numeric(12, 2) not null check (amount >= 0),
  primary key (expense_id, member_id),
  foreign key (group_id, expense_id) references public.expenses(group_id, id) on delete cascade,
  foreign key (group_id, member_id) references public.group_members(group_id, id) on delete restrict
);

create table public.settlements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  from_member_id uuid not null,
  to_member_id uuid not null,
  amount numeric(12, 2) not null check (amount > 0),
  completed_by uuid not null references auth.users(id) on delete restrict,
  completed_at timestamptz not null default now(),
  check (from_member_id <> to_member_id),
  foreign key (group_id, from_member_id) references public.group_members(group_id, id) on delete restrict,
  foreign key (group_id, to_member_id) references public.group_members(group_id, id) on delete restrict
);
create index settlements_group_completed_idx on public.settlements (group_id, completed_at desc);

create table public.group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  token_hash text not null unique check (length(token_hash) = 64),
  created_by uuid not null references auth.users(id) on delete restrict,
  expires_at timestamptz not null,
  max_uses integer not null default 10 check (max_uses between 1 and 100),
  use_count integer not null default 0 check (use_count between 0 and max_uses),
  created_at timestamptz not null default now()
);

create or replace function public.is_group_member(target_group uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = target_group and gm.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_group_owner(target_group uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.groups g
    where g.id = target_group and g.created_by = (select auth.uid())
  );
$$;

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_splits enable row level security;
alter table public.settlements enable row level security;
alter table public.group_invites enable row level security;

create policy "Members can read their groups"
  on public.groups for select to authenticated
  using (public.is_group_member(id) or created_by = (select auth.uid()));
create policy "Signed-in users can create groups"
  on public.groups for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy "Owners can update their groups"
  on public.groups for update to authenticated
  using (public.is_group_owner(id))
  with check (public.is_group_owner(id));
create policy "Owners can delete their groups"
  on public.groups for delete to authenticated
  using (public.is_group_owner(id));

create policy "Members can read group members"
  on public.group_members for select to authenticated
  using (public.is_group_member(group_id) or public.is_group_owner(group_id));
create policy "Owners can add group members"
  on public.group_members for insert to authenticated
  with check (public.is_group_owner(group_id));
create policy "Owners can update group members"
  on public.group_members for update to authenticated
  using (public.is_group_owner(group_id))
  with check (public.is_group_owner(group_id));
create policy "Owners can remove group members"
  on public.group_members for delete to authenticated
  using (public.is_group_owner(group_id));

create policy "Group members can read expenses"
  on public.expenses for select to authenticated
  using (public.is_group_member(group_id) or public.is_group_owner(group_id));
create policy "Group members can add expenses"
  on public.expenses for insert to authenticated
  with check (
    (public.is_group_member(group_id) or public.is_group_owner(group_id))
    and created_by = (select auth.uid())
  );
create policy "Group members can update expenses"
  on public.expenses for update to authenticated
  using (public.is_group_member(group_id) or public.is_group_owner(group_id))
  with check (public.is_group_member(group_id) or public.is_group_owner(group_id));
create policy "Group members can delete expenses"
  on public.expenses for delete to authenticated
  using (public.is_group_member(group_id) or public.is_group_owner(group_id));

create policy "Group members can read expense splits"
  on public.expense_splits for select to authenticated
  using (exists (
    select 1 from public.expenses e
    where e.id = expense_id and (public.is_group_member(e.group_id) or public.is_group_owner(e.group_id))
  ));
create policy "Group members can write expense splits"
  on public.expense_splits for all to authenticated
  using (exists (
    select 1 from public.expenses e
    where e.id = expense_id and (public.is_group_member(e.group_id) or public.is_group_owner(e.group_id))
  ))
  with check (exists (
    select 1 from public.expenses e
    where e.id = expense_id and (public.is_group_member(e.group_id) or public.is_group_owner(e.group_id))
  ));

create policy "Group members can read settlements"
  on public.settlements for select to authenticated
  using (public.is_group_member(group_id) or public.is_group_owner(group_id));
create policy "Group members can record settlements"
  on public.settlements for insert to authenticated
  with check (
    (public.is_group_member(group_id) or public.is_group_owner(group_id))
    and completed_by = (select auth.uid())
  );

create policy "Owners can manage group invites"
  on public.group_invites for all to authenticated
  using (public.is_group_owner(group_id))
  with check (public.is_group_owner(group_id) and created_by = (select auth.uid()));
