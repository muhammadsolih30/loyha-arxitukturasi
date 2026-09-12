-- Loyiha Arxitektor Supabase bazasi uchun SQL skript

-- 1. Loyihalar jadvali
create table if not exists projects (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  owner_id uuid references auth.users(id) on delete cascade not null,
  share_token text unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Rollar jadvali
create table if not exists roles (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  parent_id uuid references roles(id) on delete set null,
  name text not null,
  description text,
  permissions jsonb default '[]'::jsonb,
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS (Row Level Security) sozlamalari
alter table projects enable row level security;
alter table roles enable row level security;

-- Foydalanuvchi faqat o'zining loyihalarini ko'ra oladi va tahrirlay oladi
create policy "Foydalanuvchi o'z loyihasini o'qiy oladi"
  on projects for select
  using ( auth.uid() = owner_id or share_token is not null );

create policy "Foydalanuvchi o'z loyihasiga yoza oladi"
  on projects for all
  using ( auth.uid() = owner_id );

-- Rollarni o'qish (Loyihaga ruxsati bo'lganlarga)
create policy "Rollarni o'qish"
  on roles for select
  using ( 
    exists (
      select 1 from projects p 
      where p.id = roles.project_id 
      and (p.owner_id = auth.uid() or p.share_token is not null)
    )
  );

-- Rollarni tahrirlash (Faqat loyiha egasiga)
create policy "Rollarni tahrirlash"
  on roles for all
  using (
    exists (
      select 1 from projects p 
      where p.id = roles.project_id 
      and p.owner_id = auth.uid()
    )
  );

-- Storage (Rasmlar uchun)
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);

create policy "Hamma rasmlarni ko'ra oladi"
  on storage.objects for select
  using ( bucket_id = 'avatars' );

create policy "Foydalanuvchilar rasm yuklay oladi"
  on storage.objects for insert
  with check ( bucket_id = 'avatars' and auth.role() = 'authenticated' );
