-- 家计记账 · Supabase 架构
-- 在 Supabase 控制台 → SQL Editor 里整段执行一次即可。
-- 所有表都按 user_id 做行级安全（RLS），每个账号只能看到自己的数据。

-- ── 设置 ────────────────────────────────────────────────────────────
create table if not exists public.settings (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  currency      text        not null default 'JPY ¥',
  monthly_budget numeric(14,2) not null default 265000,
  theme         text        not null default 'paper',
  start_day     smallint    not null default 1,
  updated_at    timestamptz not null default now()
);

-- ── 分类 ────────────────────────────────────────────────────────────
create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  short      text not null,
  glyph      text not null default '他',
  kind       text not null default 'expense' check (kind in ('expense', 'income')),
  budget     numeric(14,2) not null default 0,
  color      text not null default 'neutral-400',
  sort       int  not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists categories_user_idx on public.categories (user_id, sort);

-- ── 流水 ────────────────────────────────────────────────────────────
create table if not exists public.entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  occurred_on date not null,
  occurred_at time not null default '00:00',
  kind        text not null default 'expense' check (kind in ('expense', 'income')),
  amount      numeric(14,2) not null check (amount >= 0),
  category_id uuid references public.categories (id) on delete set null,
  note        text not null default '',
  pay_method  text not null default '现金',
  created_at  timestamptz not null default now()
);
create index if not exists entries_user_date_idx on public.entries (user_id, occurred_on desc);

-- ── 资产账户 ────────────────────────────────────────────────────────
create table if not exists public.accounts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  sub        text not null default '',
  glyph      text not null default '現',
  balance    numeric(14,2) not null default 0,
  sort       int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists accounts_user_idx on public.accounts (user_id, sort);

-- ── 行级安全 ────────────────────────────────────────────────────────
alter table public.settings   enable row level security;
alter table public.categories enable row level security;
alter table public.entries    enable row level security;
alter table public.accounts   enable row level security;

do $$
declare t text;
begin
  foreach t in array array['settings', 'categories', 'entries', 'accounts'] loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I
         for all to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

-- ── 新账号自动初始化（默认分类 + 设置 + 账户） ──────────────────────
create or replace function public.seed_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.settings (user_id) values (new.id)
    on conflict (user_id) do nothing;

  insert into public.categories (user_id, name, short, glyph, kind, budget, color, sort) values
    (new.id, '居住（房租/房贷）', '居住', '居', 'expense', 98000, 'accent-800', 1),
    (new.id, '餐饮',             '餐饮', '食', 'expense', 60000, 'accent-700', 2),
    (new.id, '生活用品',         '日用', '品', 'expense', 35000, 'accent-600', 3),
    (new.id, '水电燃气通讯',     '水电', '公', 'expense', 25000, 'accent-500', 4),
    (new.id, '交通',             '交通', '交', 'expense', 20000, 'accent-400', 5),
    (new.id, '娱乐订阅',         '娱乐', '娱', 'expense', 12000, 'accent-300', 6),
    (new.id, '医疗',             '医疗', '医', 'expense', 15000, 'neutral-400', 7),
    (new.id, '其他',             '其他', '他', 'expense', 0,     'neutral-300', 8),
    (new.id, '工资',             '工资', '给', 'income',  0,     'accent-700', 9),
    (new.id, '其他收入',         '其他', '入', 'income',  0,     'accent-500', 10);

  insert into public.accounts (user_id, name, sub, glyph, balance, sort) values
    (new.id, '现金',     '钱包 + 家用信封',      '現', 0, 1),
    (new.id, '银行口座', '给与振込 · 自动引落',  '銀', 0, 2),
    (new.id, '投资账户', 'つみたてNISA',         '投', 0, 3);

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.seed_new_user();
