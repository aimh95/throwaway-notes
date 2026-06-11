-- posts
create table if not exists posts (
  id             uuid primary key default gen_random_uuid(),
  title          text,
  content        text not null,
  paper_color    text not null,
  x_position     numeric not null,
  y_position     numeric not null,
  rotation       numeric not null,
  crumple_style  text not null,
  anonymous_name text,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now(),
  is_hidden      boolean default false,
  constraint posts_crumple_style_check check (crumple_style in ('ball','flat','crane','boat')),
  constraint posts_paper_color_check check (paper_color in ('ivory','pale-peach','muted-yellow','dusty-pink','light-sage','warm-gray'))
);

-- comments
create table if not exists comments (
  id             uuid primary key default gen_random_uuid(),
  post_id        uuid references posts(id) on delete cascade,
  content        text not null,
  anonymous_name text,
  created_at     timestamptz default now(),
  is_hidden      boolean default false
);

-- reports
create table if not exists reports (
  id          uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('post','comment')),
  target_id   uuid not null,
  reason      text,
  created_at  timestamptz default now()
);

-- updated_at trigger
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists posts_updated_at on posts;
create trigger posts_updated_at
  before update on posts
  for each row execute function update_updated_at();

-- RLS (idempotent: enable is safe to re-run)
alter table posts    enable row level security;
alter table comments enable row level security;
alter table reports  enable row level security;

-- Policies (drop first so re-runs don't error)
drop policy if exists "public read posts"    on posts;
drop policy if exists "public insert posts"  on posts;
drop policy if exists "public read comments"    on comments;
drop policy if exists "public insert comments"  on comments;
drop policy if exists "public insert reports"   on reports;

create policy "public read posts"    on posts    for select using (is_hidden = false);
create policy "public insert posts"  on posts    for insert with check (true);
create policy "public read comments"   on comments for select using (is_hidden = false);
create policy "public insert comments" on comments for insert with check (true);
create policy "public insert reports"  on reports  for insert with check (true);

-- Indexes
create index if not exists posts_created_at_idx on posts (created_at desc);
create index if not exists comments_post_id_idx on comments (post_id);
