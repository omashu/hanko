-- Hanko — схема для «Друзья и чат».
-- Выполнить целиком один раз в Supabase: Dashboard → SQL Editor → New query →
-- вставить этот файл → Run. Безопасно перезапускать (использует IF NOT EXISTS
-- и CREATE OR REPLACE), но что-то может ругнуться "already exists" при повторном
-- запуске отдельных строк — это не страшно.
--
-- ПЕРЕД запуском (или сразу после) обязательно включи анонимные входы:
-- Dashboard → Authentication → Sign In / Providers → Anonymous Sign-Ins → On.
-- Без этого приложение не сможет создать даже "невидимого" пользователя для
-- каждого устройства, а значит не появится и код друга.

create extension if not exists pgcrypto;

-- ---------- таблицы ----------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  friend_code text unique not null,
  username text,
  display_name text,
  created_at timestamptz not null default now()
);

-- если этот файл уже когда-то выполнялся (до появления ника) — CREATE TABLE
-- выше пропустится как "уже существует", поэтому досоздаём колонку явно:
alter table public.profiles add column if not exists username text;

-- ник — то, по чему друзья теперь ищут друг друга (вместо кода). Его выбирает
-- сам пользователь, поэтому уникальность нужна отдельным индексом, а не NOT NULL —
-- пока не задан, профиль просто не находится поиском.
create unique index if not exists profiles_username_key on public.profiles (username) where username is not null;

-- био — публичное короткое описание в профиле, видно друзьям (см. rpc_get_profile)
alter table public.profiles add column if not exists bio text;
-- счётчик просмотров профиля (растёт, когда друг открывает твой профиль)
alter table public.profiles add column if not exists view_count bigint not null default 0;
-- ссылка на аватар в Storage (бакет avatars, публичный) — видно друзьям, см.
-- rpc_set_avatar_url / rpc_list_friends / rpc_get_profile
alter table public.profiles add column if not exists avatar_url text;

-- ---------- премиум ----------
-- premium_until — до какого момента активна подписка (null = никогда не было).
-- Оплаты пока нет — статус выставляется вручную одной строкой в SQL Editor,
-- когда решишь кому-то выдать (себе на тест, другу, или позже — по вебхуку
-- от платёжки, когда она появится):
--   update public.profiles set premium_until = now() + interval '1 month' where username = 'ник';
-- Забрать досрочно:
--   update public.profiles set premium_until = now() where username = 'ник';
alter table public.profiles add column if not exists premium_until timestamptz;
-- баннер профиля (Storage, бакет banners, публичный) — только для премиума,
-- см. rpc_set_banner ниже
alter table public.profiles add column if not exists banner_url text;
-- рамка аватара — id одного из готовых пресетов ('gold'/'neon'/'sakura'/'obsidian'
-- на клиенте), тоже только для премиума, см. rpc_set_avatar_frame
alter table public.profiles add column if not exists avatar_frame text;

-- ---------- модерация ----------
-- is_moderator — доверенный человек (не обязательно только ты), который через
-- приложение может редактировать ОБЩИЙ список категорий/источников новостей
-- (раздел "Новости"): изменения сразу видят все, потому что список теперь
-- общий (таблицы news_categories/news_sources ниже), а не локальный файл на
-- каждом отдельном компьютере по отдельности. Выдать/забрать право — так же
-- вручную одной строкой, как и premium_until выше:
--   update public.profiles set is_moderator = true where username = 'ник';
--   update public.profiles set is_moderator = false where username = 'ник';
alter table public.profiles add column if not exists is_moderator boolean not null default false;

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references public.profiles(id) on delete cascade,
  to_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now()
);

create unique index if not exists friend_requests_unique_pending
  on public.friend_requests (from_id, to_id)
  where status = 'pending';

create table if not exists public.friends (
  user_id uuid not null references public.profiles(id) on delete cascade,
  friend_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references public.profiles(id) on delete cascade,
  to_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

-- уже существующие базы (созданные до "прочитано") получат колонку через ALTER
alter table public.messages add column if not exists read_at timestamptz;

create index if not exists messages_pair_idx on public.messages (from_id, to_id, created_at);

-- закладки (синхронизированная копия локальной библиотеки — чтобы друзья
-- могли посмотреть, что человек читает, открыв его профиль)
create table if not exists public.bookmarks (
  user_id uuid not null references public.profiles(id) on delete cascade,
  manga_id text not null,
  title text not null,
  cover_url text,
  status text,
  added_at timestamptz not null default now(),
  primary key (user_id, manga_id)
);

-- комментарии под профилем (оставляют друзья, видит владелец профиля + друзья)
create table if not exists public.profile_comments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists profile_comments_profile_idx on public.profile_comments (profile_id, created_at);

-- лайки профиля (кто кому поставил лайк — по одному на пару)
create table if not exists public.profile_likes (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  liker_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, liker_id)
);

-- ---------- новости: общий список категорий/источников ----------
-- Раньше это был локальный JSON-файл на каждом компьютере отдельно — поэтому
-- "удалил у себя" не значило "удалил у всех" (сколько компьютеров, столько
-- независимых копий списка). Теперь это одна общая таблица: читают её все
-- (см. RLS ниже — публичное чтение), а редактируют только модераторы
-- (is_moderator на profiles, см. выше) — и только через rpc_admin_* функции
-- ниже, никогда прямой записью в таблицу.
create table if not exists public.news_categories (
  id text primary key,
  name text not null,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.news_sources (
  id text primary key,
  category_id text not null references public.news_categories(id) on delete cascade,
  type text not null check (type in ('rss', 'youtube')),
  -- rss: прямая ссылка на фид; youtube: уже резолвнутый channelId (UCxxxx…),
  -- резолвится на клиенте до вызова rpc_admin_add_news_source (см. main.js)
  value text not null,
  label text not null,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);

create index if not exists news_sources_category_idx on public.news_sources (category_id);

-- ---------- Storage: аватары ----------
-- Публичный бакет — сами картинки не секрет, а чтение публичного файла по
-- прямой ссылке не требует токена/сессии, поэтому такой URL можно просто
-- отдавать друзьям как обычную картинку (см. rpc_set_avatar_url). Заливать/
-- менять/удалять при этом можно только файлы в СВОЕЙ папке (папка = uid).
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatar public read" on storage.objects;
create policy "avatar public read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatar own write" on storage.objects;
create policy "avatar own write" on storage.objects
  for insert with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatar own update" on storage.objects;
create policy "avatar own update" on storage.objects
  for update using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatar own delete" on storage.objects;
create policy "avatar own delete" on storage.objects
  for delete using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- Storage: баннеры профиля (премиум) ----------
-- Та же логика, что и с аватарами: публичное чтение, писать может только
-- владелец в свою папку. Заливка на клиенте всё равно упирается в
-- rpc_set_banner (нужен активный premium_until), так что без подписки
-- сохранить ссылку в профиль не получится, даже если файл залить руками.
insert into storage.buckets (id, name, public)
values ('banners', 'banners', true)
on conflict (id) do nothing;

drop policy if exists "banner public read" on storage.objects;
create policy "banner public read" on storage.objects
  for select using (bucket_id = 'banners');

drop policy if exists "banner own write" on storage.objects;
create policy "banner own write" on storage.objects
  for insert with check (bucket_id = 'banners' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "banner own update" on storage.objects;
create policy "banner own update" on storage.objects
  for update using (bucket_id = 'banners' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "banner own delete" on storage.objects;
create policy "banner own delete" on storage.objects
  for delete using (bucket_id = 'banners' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- RLS ----------
-- Прямой доступ к таблицам закрыт почти полностью: всё чтение/запись идёт
-- через функции ниже (security definer), которые сами проверяют auth.uid().
-- Исключения — SELECT на friend_requests/messages (нужен для живых
-- уведомлений через Supabase Realtime, который сам применяет RLS) и на
-- news_categories/news_sources (список источников новостей публичный и
-- читается всеми, а не только своим владельцем — записывать в обход
-- rpc_admin_* всё равно нельзя, INSERT/UPDATE/DELETE политик для них нет).

alter table public.profiles enable row level security;
alter table public.friend_requests enable row level security;
alter table public.friends enable row level security;
alter table public.messages enable row level security;
alter table public.bookmarks enable row level security;
alter table public.profile_comments enable row level security;
alter table public.profile_likes enable row level security;
alter table public.news_categories enable row level security;
alter table public.news_sources enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for select using (id = auth.uid());

drop policy if exists "see own requests" on public.friend_requests;
create policy "see own requests" on public.friend_requests
  for select using (from_id = auth.uid() or to_id = auth.uid());

drop policy if exists "see own friendships" on public.friends;
create policy "see own friendships" on public.friends
  for select using (user_id = auth.uid());

drop policy if exists "see own messages" on public.messages;
create policy "see own messages" on public.messages
  for select using (from_id = auth.uid() or to_id = auth.uid());

drop policy if exists "see own bookmarks" on public.bookmarks;
create policy "see own bookmarks" on public.bookmarks
  for select using (user_id = auth.uid());

drop policy if exists "see own or authored comments" on public.profile_comments;
create policy "see own or authored comments" on public.profile_comments
  for select using (profile_id = auth.uid() or author_id = auth.uid());

drop policy if exists "see own or authored likes" on public.profile_likes;
create policy "see own or authored likes" on public.profile_likes
  for select using (profile_id = auth.uid() or liker_id = auth.uid());

drop policy if exists "news categories public read" on public.news_categories;
create policy "news categories public read" on public.news_categories
  for select using (true);

drop policy if exists "news sources public read" on public.news_sources;
create policy "news sources public read" on public.news_sources
  for select using (true);

-- ---------- автосоздание профиля при регистрации (анонимной) ----------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_attempts int := 0;
begin
  loop
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    begin
      insert into public.profiles (id, friend_code) values (new.id, v_code);
      exit;
    exception when unique_violation then
      v_attempts := v_attempts + 1;
      if v_attempts > 20 then
        raise exception 'could not generate unique friend code';
      end if;
    end;
  end loop;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- RPC: профиль ----------
-- DROP перед каждым CREATE OR REPLACE ниже — принципиально: Postgres не
-- разрешает менять форму возвращаемых столбцов у уже существующей функции
-- через одно только CREATE OR REPLACE (даже если тип по сути "тот же самый
-- плюс одна колонка"), поэтому пере-выполнение этого файла без DROP падает
-- с ошибкой "cannot change return type of existing function". Так — безопасно
-- пере-запускать файл сколько угодно раз, в том числе после будущих правок.

drop function if exists public.rpc_get_my_profile();
create or replace function public.rpc_get_my_profile()
returns table(
  id uuid, friend_code text, username text, display_name text,
  premium_until timestamptz, banner_url text, avatar_frame text, is_moderator boolean
)
language sql
security definer
set search_path = public
as $$
  select id, friend_code, username, display_name, premium_until, banner_url, avatar_frame, is_moderator
  from public.profiles where id = auth.uid();
$$;

drop function if exists public.rpc_set_display_name(text);
create or replace function public.rpc_set_display_name(p_name text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles set display_name = nullif(trim(p_name), '') where id = auth.uid();
$$;

-- ник: латиница/цифры/подчёркивание, 3–20 символов, регистр не важен (храним
-- в нижнем). Возвращает понятную ошибку вместо сырого текста Postgres.
drop function if exists public.rpc_set_username(text);
create or replace function public.rpc_set_username(p_username text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clean text;
begin
  v_clean := lower(trim(p_username));
  if v_clean !~ '^[a-z0-9_]{3,20}$' then
    raise exception 'invalid_username';
  end if;
  begin
    update public.profiles set username = v_clean where id = auth.uid();
  exception when unique_violation then
    raise exception 'username_taken';
  end;
end;
$$;

-- живой поиск по нику (для формы "Найти друзей") — префиксный, без себя самого,
-- не короче 2 символов и не больше 8 результатов за раз
drop function if exists public.rpc_search_usernames(text);
create or replace function public.rpc_search_usernames(p_query text)
returns table(id uuid, username text, display_name text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if length(trim(p_query)) < 2 then
    return;
  end if;
  return query
    select p.id, p.username, p.display_name
    from public.profiles p
    where p.username is not null
      and p.username ilike (lower(trim(p_query)) || '%')
      and p.id <> auth.uid()
    order by p.username
    limit 8;
end;
$$;

drop function if exists public.rpc_find_by_code(text);
create or replace function public.rpc_find_by_code(p_code text)
returns table(id uuid, display_name text)
language sql
security definer
set search_path = public
as $$
  select id, display_name from public.profiles where friend_code = upper(trim(p_code));
$$;

-- ---------- RPC: заявки в друзья (по коду — для попапа "Добавить друга") ----------
-- Отдельная функция вместо переиспользования rpc_send_friend_request, потому
-- что код (friend_code) ищется точным совпадением по своей колонке, а не как
-- username — так проще и безопаснее, чем угадывать формат внутри одной функции.

drop function if exists public.rpc_send_friend_request_by_code(text);
create or replace function public.rpc_send_friend_request_by_code(p_code text)
returns public.friend_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target uuid;
  v_row public.friend_requests;
begin
  select id into v_target from public.profiles where friend_code = upper(trim(p_code));
  if v_target is null then
    raise exception 'friend_code_not_found';
  end if;
  if v_target = auth.uid() then
    raise exception 'cannot_add_self';
  end if;
  if exists (select 1 from public.friends where user_id = auth.uid() and friend_id = v_target) then
    raise exception 'already_friends';
  end if;
  if exists (select 1 from public.friend_requests where from_id = auth.uid() and to_id = v_target and status = 'pending') then
    raise exception 'already_pending';
  end if;

  if exists (select 1 from public.friend_requests where from_id = v_target and to_id = auth.uid() and status = 'pending') then
    update public.friend_requests set status = 'accepted'
      where from_id = v_target and to_id = auth.uid() and status = 'pending'
      returning * into v_row;
    insert into public.friends (user_id, friend_id) values (auth.uid(), v_target) on conflict do nothing;
    insert into public.friends (user_id, friend_id) values (v_target, auth.uid()) on conflict do nothing;
    return v_row;
  end if;

  insert into public.friend_requests (from_id, to_id, status) values (auth.uid(), v_target, 'pending')
    returning * into v_row;
  return v_row;
end;
$$;

-- поиск для мини-превью в попапе "Добавить друга", когда введён именно код
-- (точное совпадение, а не префикс — код не предназначен для подбора вслепую)
drop function if exists public.rpc_find_by_code_preview(text);
create or replace function public.rpc_find_by_code_preview(p_code text)
returns table(id uuid, username text, display_name text, friend_code text)
language sql
security definer
set search_path = public
as $$
  select id, username, display_name, friend_code
  from public.profiles
  where friend_code = upper(trim(p_code)) and id <> auth.uid();
$$;

-- ---------- RPC: заявки в друзья ----------

drop function if exists public.rpc_send_friend_request(text);
create or replace function public.rpc_send_friend_request(p_username text)
returns public.friend_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target uuid;
  v_row public.friend_requests;
begin
  select id into v_target from public.profiles where username = lower(trim(p_username));
  if v_target is null then
    raise exception 'username_not_found';
  end if;
  if v_target = auth.uid() then
    raise exception 'cannot_add_self';
  end if;
  if exists (select 1 from public.friends where user_id = auth.uid() and friend_id = v_target) then
    raise exception 'already_friends';
  end if;
  if exists (select 1 from public.friend_requests where from_id = auth.uid() and to_id = v_target and status = 'pending') then
    raise exception 'already_pending';
  end if;

  -- если нам уже прислали заявку — сразу становимся друзьями вместо дубля
  if exists (select 1 from public.friend_requests where from_id = v_target and to_id = auth.uid() and status = 'pending') then
    update public.friend_requests set status = 'accepted'
      where from_id = v_target and to_id = auth.uid() and status = 'pending'
      returning * into v_row;
    insert into public.friends (user_id, friend_id) values (auth.uid(), v_target) on conflict do nothing;
    insert into public.friends (user_id, friend_id) values (v_target, auth.uid()) on conflict do nothing;
    return v_row;
  end if;

  insert into public.friend_requests (from_id, to_id, status) values (auth.uid(), v_target, 'pending')
    returning * into v_row;
  return v_row;
end;
$$;

drop function if exists public.rpc_cancel_friend_request(uuid);
create or replace function public.rpc_cancel_friend_request(p_request_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.friend_requests where id = p_request_id and from_id = auth.uid() and status = 'pending';
$$;

drop function if exists public.rpc_respond_friend_request(uuid, boolean);
create or replace function public.rpc_respond_friend_request(p_request_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from uuid;
  v_to uuid;
begin
  select from_id, to_id into v_from, v_to from public.friend_requests
    where id = p_request_id and to_id = auth.uid() and status = 'pending';
  if v_from is null then
    raise exception 'request_not_found';
  end if;

  update public.friend_requests set status = case when p_accept then 'accepted' else 'declined' end
    where id = p_request_id;

  if p_accept then
    insert into public.friends (user_id, friend_id) values (v_from, v_to) on conflict do nothing;
    insert into public.friends (user_id, friend_id) values (v_to, v_from) on conflict do nothing;
  end if;
end;
$$;

drop function if exists public.rpc_list_incoming_requests();
create or replace function public.rpc_list_incoming_requests()
returns table(id uuid, from_id uuid, from_name text, created_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select fr.id, fr.from_id, coalesce(p.display_name, 'Без имени'), fr.created_at
  from public.friend_requests fr
  join public.profiles p on p.id = fr.from_id
  where fr.to_id = auth.uid() and fr.status = 'pending'
  order by fr.created_at desc;
$$;

drop function if exists public.rpc_list_outgoing_requests();
create or replace function public.rpc_list_outgoing_requests()
returns table(id uuid, to_id uuid, to_name text, status text, created_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select fr.id, fr.to_id, coalesce(p.display_name, 'Без имени'), fr.status, fr.created_at
  from public.friend_requests fr
  join public.profiles p on p.id = fr.to_id
  where fr.from_id = auth.uid()
  order by fr.created_at desc;
$$;

-- ---------- RPC: друзья ----------

drop function if exists public.rpc_list_friends();
create or replace function public.rpc_list_friends()
returns table(friend_id uuid, display_name text, friend_code text, avatar_url text)
language sql
security definer
set search_path = public
as $$
  select f.friend_id, coalesce(p.display_name, 'Без имени'), p.friend_code, p.avatar_url
  from public.friends f
  join public.profiles p on p.id = f.friend_id
  where f.user_id = auth.uid()
  order by p.display_name;
$$;

drop function if exists public.rpc_unfriend(uuid);
create or replace function public.rpc_unfriend(p_friend_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.friends
  where (user_id = auth.uid() and friend_id = p_friend_id)
     or (user_id = p_friend_id and friend_id = auth.uid());
$$;

-- ---------- RPC: сообщения ----------

drop function if exists public.rpc_send_message(uuid, text);
create or replace function public.rpc_send_message(p_friend_id uuid, p_body text)
returns public.messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.messages;
  v_clean text;
begin
  v_clean := trim(p_body);
  if v_clean is null or v_clean = '' then
    raise exception 'empty_message';
  end if;
  if length(v_clean) > 2000 then
    v_clean := left(v_clean, 2000);
  end if;
  if not exists (select 1 from public.friends where user_id = auth.uid() and friend_id = p_friend_id) then
    raise exception 'not_friends';
  end if;

  insert into public.messages (from_id, to_id, body) values (auth.uid(), p_friend_id, v_clean)
    returning * into v_row;
  return v_row;
end;
$$;

-- ВАЖНО: раньше было "order by created_at asc limit N" — если в переписке
-- накопилось больше N сообщений, это отдавало N САМЫХ СТАРЫХ сообщений, а не
-- последние N. Новые сообщения (в т.ч. то, из-за которого только что пришло
-- уведомление) в такой переписке просто никогда не попадали в ответ — не
-- гонка запросов и не баг рендера в JS, а сама выборка отрезала свежее.
-- Теперь: берём последние N по времени (order by desc + limit), а затем уже
-- разворачиваем в правильный порядок (старые сверху, новые снизу) для показа.
drop function if exists public.rpc_list_messages(uuid, int);
create or replace function public.rpc_list_messages(p_friend_id uuid, p_limit int default 200)
returns setof public.messages
language sql
security definer
set search_path = public
as $$
  select * from (
    select * from public.messages
    where (from_id = auth.uid() and to_id = p_friend_id)
       or (from_id = p_friend_id and to_id = auth.uid())
    order by created_at desc
    limit greatest(1, least(p_limit, 500))
  ) sub
  order by created_at asc;
$$;

-- отмечает прочитанными все входящие от p_friend_id сообщения (только те, что
-- адресованы мне и ещё не прочитаны) — вызывается при открытии чата с другом
drop function if exists public.rpc_mark_messages_read(uuid);
create or replace function public.rpc_mark_messages_read(p_friend_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.messages
  set read_at = now()
  where from_id = p_friend_id and to_id = auth.uid() and read_at is null;
$$;

-- ---------- RPC: био ----------

drop function if exists public.rpc_set_bio(text);
create or replace function public.rpc_set_bio(p_bio text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles set bio = nullif(left(trim(p_bio), 300), '') where id = auth.uid();
$$;

-- ---------- RPC: аватар ----------
-- Саму заливку файла в Storage приложение делает отдельно (см. main.js) —
-- эта функция только сохраняет итоговую публичную ссылку в профиль.

drop function if exists public.rpc_set_avatar_url(text);
create or replace function public.rpc_set_avatar_url(p_url text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles set avatar_url = nullif(trim(p_url), '') where id = auth.uid();
$$;

-- ---------- RPC: премиум-кастомизация (баннер, рамка аватара) ----------
-- Обе функции требуют активной подписки — иначе понятная ошибка not_premium.
-- Если подписка позже истечёт, значения в базе не стираются (чтобы при
-- продлении всё вернулось как было) — просто клиент перестаёт их показывать,
-- ориентируясь на is_premium из rpc_get_profile.

drop function if exists public.rpc_set_banner(text);
create or replace function public.rpc_set_banner(p_url text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and premium_until > now()) then
    raise exception 'not_premium';
  end if;
  update public.profiles set banner_url = nullif(trim(p_url), '') where id = auth.uid();
end;
$$;

drop function if exists public.rpc_set_avatar_frame(text);
create or replace function public.rpc_set_avatar_frame(p_frame text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and premium_until > now()) then
    raise exception 'not_premium';
  end if;
  if p_frame is not null and p_frame not in ('gold', 'neon', 'sakura', 'obsidian') then
    raise exception 'invalid_frame';
  end if;
  update public.profiles set avatar_frame = p_frame where id = auth.uid();
end;
$$;

-- ---------- RPC: чужой профиль (сам себе тоже можно) ----------
-- Открыть можно только свой профиль или профиль друга — иначе понятная ошибка
-- (в интерфейсе профиль открывается только по клику на друга из списка друзей).

drop function if exists public.rpc_get_profile(uuid);
create or replace function public.rpc_get_profile(p_user_id uuid)
returns table(
  id uuid, username text, display_name text, bio text, friend_code text,
  view_count bigint, friends_count bigint, comments_count bigint, likes_count bigint, liked_by_me boolean,
  avatar_url text, banner_url text, avatar_frame text, is_premium boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id <> auth.uid() and not exists (
    select 1 from public.friends where user_id = auth.uid() and friend_id = p_user_id
  ) then
    raise exception 'not_friends';
  end if;

  -- считаем просмотр только когда смотрят чужой профиль (не свой собственный)
  if p_user_id <> auth.uid() then
    update public.profiles set view_count = profiles.view_count + 1 where profiles.id = p_user_id;
  end if;

  return query
    select
      p.id, p.username, p.display_name, p.bio, p.friend_code, p.view_count,
      (select count(*) from public.friends f where f.user_id = p.id),
      (select count(*) from public.profile_comments c where c.profile_id = p.id),
      (select count(*) from public.profile_likes l where l.profile_id = p.id),
      exists(select 1 from public.profile_likes l where l.profile_id = p.id and l.liker_id = auth.uid()),
      p.avatar_url,
      -- баннер/рамку отдаём только пока подписка реально активна — если
      -- истекла, для остальных они просто не показываются (но не стираются)
      case when p.premium_until > now() then p.banner_url else null end,
      case when p.premium_until > now() then p.avatar_frame else null end,
      (p.premium_until > now())
    from public.profiles p
    where p.id = p_user_id;
end;
$$;

-- ---------- RPC: лайк профиля (переключатель — поставить/убрать) ----------

drop function if exists public.rpc_toggle_profile_like(uuid);
create or replace function public.rpc_toggle_profile_like(p_profile_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_liked boolean;
begin
  if p_profile_id <> auth.uid() and not exists (
    select 1 from public.friends where user_id = auth.uid() and friend_id = p_profile_id
  ) then
    raise exception 'not_friends';
  end if;

  select exists(select 1 from public.profile_likes where profile_id = p_profile_id and liker_id = auth.uid()) into v_liked;
  if v_liked then
    delete from public.profile_likes where profile_id = p_profile_id and liker_id = auth.uid();
  else
    insert into public.profile_likes (profile_id, liker_id) values (p_profile_id, auth.uid());
  end if;
  return not v_liked;
end;
$$;

-- ---------- RPC: закладки ----------
-- upsert/remove вызываются локальным клиентом при каждом изменении своей
-- библиотеки (best-effort — если офлайн, просто не синхронизируется сейчас).

drop function if exists public.rpc_upsert_bookmark(text, text, text, text);
create or replace function public.rpc_upsert_bookmark(p_manga_id text, p_title text, p_cover_url text, p_status text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.bookmarks (user_id, manga_id, title, cover_url, status)
  values (auth.uid(), p_manga_id, p_title, p_cover_url, p_status)
  on conflict (user_id, manga_id) do update
    set title = excluded.title, cover_url = excluded.cover_url, status = excluded.status;
$$;

drop function if exists public.rpc_remove_bookmark(text);
create or replace function public.rpc_remove_bookmark(p_manga_id text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.bookmarks where user_id = auth.uid() and manga_id = p_manga_id;
$$;

drop function if exists public.rpc_list_bookmarks(uuid);
create or replace function public.rpc_list_bookmarks(p_user_id uuid)
returns table(manga_id text, title text, cover_url text, status text, added_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id <> auth.uid() and not exists (
    select 1 from public.friends where user_id = auth.uid() and friend_id = p_user_id
  ) then
    raise exception 'not_friends';
  end if;
  return query
    select b.manga_id, b.title, b.cover_url, b.status, b.added_at
    from public.bookmarks b
    where b.user_id = p_user_id
    order by b.added_at desc;
end;
$$;

-- ---------- RPC: комментарии под профилем ----------

drop function if exists public.rpc_list_profile_comments(uuid);
create or replace function public.rpc_list_profile_comments(p_profile_id uuid)
returns table(id uuid, author_id uuid, author_name text, body text, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_profile_id <> auth.uid() and not exists (
    select 1 from public.friends where user_id = auth.uid() and friend_id = p_profile_id
  ) then
    raise exception 'not_friends';
  end if;
  return query
    select c.id, c.author_id, coalesce(a.display_name, '@' || a.username, 'Без имени'), c.body, c.created_at
    from public.profile_comments c
    join public.profiles a on a.id = c.author_id
    where c.profile_id = p_profile_id
    order by c.created_at asc;
end;
$$;

drop function if exists public.rpc_add_profile_comment(uuid, text);
create or replace function public.rpc_add_profile_comment(p_profile_id uuid, p_body text)
returns table(id uuid, author_id uuid, author_name text, body text, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clean text;
  v_id uuid;
  v_created timestamptz;
begin
  v_clean := trim(p_body);
  if v_clean is null or v_clean = '' then
    raise exception 'empty_message';
  end if;
  if length(v_clean) > 500 then
    v_clean := left(v_clean, 500);
  end if;
  if p_profile_id <> auth.uid() and not exists (
    select 1 from public.friends where user_id = auth.uid() and friend_id = p_profile_id
  ) then
    raise exception 'not_friends';
  end if;

  insert into public.profile_comments (profile_id, author_id, body)
    values (p_profile_id, auth.uid(), v_clean)
    returning profile_comments.id, profile_comments.created_at into v_id, v_created;

  return query
    select v_id, auth.uid(), coalesce(p.display_name, '@' || p.username, 'Без имени'), v_clean, v_created
    from public.profiles p where p.id = auth.uid();
end;
$$;

drop function if exists public.rpc_delete_profile_comment(uuid);
create or replace function public.rpc_delete_profile_comment(p_comment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.profile_comments
  where id = p_comment_id and (author_id = auth.uid() or profile_id = auth.uid());
end;
$$;

-- ---------- личный бэкап библиотеки и истории ----------
-- Полностью отдельно от bookmarks выше: bookmarks — то, что видно друзьям
-- на профиле (только название/обложка/статус). Здесь — приватная копия для
-- восстановления на другом устройстве: заметки, свои комментарии к тайтлу и
-- прогресс чтения/просмотра. Друзьям не видно никогда — ни через какую RPC.
-- kind различает мангу и аниме (id тайтлов и так не пересекаются — у аниме
-- всегда префикс "al:" — но явная колонка проще для будущих запросов).
-- Скачанные главы сюда намеренно не входят — тяжёлые, проще перекачать заново.

create table if not exists public.library_items (
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('manga', 'anime')),
  item_id text not null,
  title text not null,
  cover_url text,
  status text,
  note text,
  comments jsonb not null default '[]'::jsonb,
  chapter_id text,
  chapter_label text,
  page int,
  added_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, kind, item_id)
);

-- история — отдельно от библиотеки: сюда попадает вообще всё открытое, даже
-- не добавленное в библиотеку (это и есть лента "Продолжить"). position_sec
-- используется только аниме (позиция в секундах), page — только мангой
-- (номер страницы); у другого вида соответствующее поле просто пустое.
create table if not exists public.history_items (
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('manga', 'anime')),
  item_id text not null,
  title text not null,
  cover_url text,
  chapter_id text,
  chapter_label text,
  page int,
  position_sec int,
  updated_at timestamptz not null default now(),
  primary key (user_id, kind, item_id)
);

alter table public.library_items enable row level security;
alter table public.history_items enable row level security;

drop policy if exists "see own library items" on public.library_items;
create policy "see own library items" on public.library_items
  for select using (user_id = auth.uid());

drop policy if exists "see own history items" on public.history_items;
create policy "see own history items" on public.history_items
  for select using (user_id = auth.uid());

drop function if exists public.rpc_upsert_library_item(text, text, text, text, text, text, jsonb, text, text, int);
create or replace function public.rpc_upsert_library_item(
  p_kind text, p_item_id text, p_title text, p_cover_url text, p_status text,
  p_note text, p_comments jsonb, p_chapter_id text, p_chapter_label text, p_page int
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.library_items
    (user_id, kind, item_id, title, cover_url, status, note, comments, chapter_id, chapter_label, page, updated_at)
  values
    (auth.uid(), p_kind, p_item_id, p_title, p_cover_url, p_status, p_note, coalesce(p_comments, '[]'::jsonb), p_chapter_id, p_chapter_label, p_page, now())
  on conflict (user_id, kind, item_id) do update
    set title = excluded.title, cover_url = excluded.cover_url, status = excluded.status,
        note = excluded.note, comments = excluded.comments, chapter_id = excluded.chapter_id,
        chapter_label = excluded.chapter_label, page = excluded.page, updated_at = now();
$$;

drop function if exists public.rpc_remove_library_item(text, text);
create or replace function public.rpc_remove_library_item(p_kind text, p_item_id text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.library_items where user_id = auth.uid() and kind = p_kind and item_id = p_item_id;
$$;

drop function if exists public.rpc_list_library_items();
create or replace function public.rpc_list_library_items()
returns setof public.library_items
language sql
security definer
set search_path = public
as $$
  select * from public.library_items where user_id = auth.uid() order by added_at desc;
$$;

drop function if exists public.rpc_upsert_history_item(text, text, text, text, text, text, int, int);
create or replace function public.rpc_upsert_history_item(
  p_kind text, p_item_id text, p_title text, p_cover_url text,
  p_chapter_id text, p_chapter_label text, p_page int, p_position_sec int
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.history_items
    (user_id, kind, item_id, title, cover_url, chapter_id, chapter_label, page, position_sec, updated_at)
  values
    (auth.uid(), p_kind, p_item_id, p_title, p_cover_url, p_chapter_id, p_chapter_label, p_page, p_position_sec, now())
  on conflict (user_id, kind, item_id) do update
    set title = excluded.title, cover_url = excluded.cover_url, chapter_id = excluded.chapter_id,
        chapter_label = excluded.chapter_label, page = excluded.page, position_sec = excluded.position_sec,
        updated_at = now();
$$;

drop function if exists public.rpc_remove_history_item(text, text);
create or replace function public.rpc_remove_history_item(p_kind text, p_item_id text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.history_items where user_id = auth.uid() and kind = p_kind and item_id = p_item_id;
$$;

drop function if exists public.rpc_clear_history_items(text);
create or replace function public.rpc_clear_history_items(p_kind text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.history_items where user_id = auth.uid() and kind = p_kind;
$$;

drop function if exists public.rpc_list_history_items();
create or replace function public.rpc_list_history_items()
returns setof public.history_items
language sql
security definer
set search_path = public
as $$
  select * from public.history_items where user_id = auth.uid() order by updated_at desc;
$$;

-- ---------- RPC: новости (общий список + модерация) ----------
-- Чтение (rpc_list_news_*) доступно всем — источники публичные, ничего
-- личного. Запись (rpc_admin_*) — только тем, у кого is_moderator = true на
-- profiles (см. колонку и как её выдать в начале файла); каждая admin-функция
-- сама это проверяет, так что даже прямой вызов из консоли DevTools в обход
-- интерфейса ничего не даст немодератору.

drop function if exists public.is_moderator();
create or replace function public.is_moderator()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce((select is_moderator from public.profiles where id = auth.uid()), false);
$$;

drop function if exists public.rpc_list_news_categories();
create or replace function public.rpc_list_news_categories()
returns table(id text, name text)
language sql
security definer
set search_path = public
as $$
  select id, name from public.news_categories order by created_at;
$$;

drop function if exists public.rpc_list_news_sources();
create or replace function public.rpc_list_news_sources()
returns table(id text, category_id text, type text, value text, label text)
language sql
security definer
set search_path = public
as $$
  select id, category_id, type, value, label from public.news_sources order by created_at;
$$;

drop function if exists public.rpc_admin_upsert_news_category(text, text);
create or replace function public.rpc_admin_upsert_news_category(p_id text, p_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then
    raise exception 'not_moderator';
  end if;
  if trim(coalesce(p_name, '')) = '' then
    raise exception 'empty_name';
  end if;
  insert into public.news_categories (id, name, created_by)
  values (p_id, trim(p_name), auth.uid())
  on conflict (id) do update set name = trim(p_name);
end;
$$;

drop function if exists public.rpc_admin_remove_news_category(text);
create or replace function public.rpc_admin_remove_news_category(p_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then
    raise exception 'not_moderator';
  end if;
  delete from public.news_categories where id = p_id;
end;
$$;

drop function if exists public.rpc_admin_add_news_source(text, text, text, text, text);
create or replace function public.rpc_admin_add_news_source(
  p_id text, p_category_id text, p_type text, p_value text, p_label text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then
    raise exception 'not_moderator';
  end if;
  if p_type not in ('rss', 'youtube') then
    raise exception 'invalid_type';
  end if;
  if not exists (select 1 from public.news_categories where id = p_category_id) then
    raise exception 'category_not_found';
  end if;
  insert into public.news_sources (id, category_id, type, value, label, created_by)
  values (p_id, p_category_id, p_type, p_value, p_label, auth.uid());
end;
$$;

drop function if exists public.rpc_admin_remove_news_source(text);
create or replace function public.rpc_admin_remove_news_source(p_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then
    raise exception 'not_moderator';
  end if;
  delete from public.news_sources where id = p_id;
end;
$$;

-- ---------- права на выполнение функций ----------
-- Анонимный вход в Supabase выдаёт роль authenticated (с флагом is_anonymous),
-- поэтому даём права именно ей — анонимным "без сессии" эти функции не нужны.

revoke all on function public.rpc_get_my_profile() from public;
revoke all on function public.rpc_set_display_name(text) from public;
revoke all on function public.rpc_set_username(text) from public;
revoke all on function public.rpc_search_usernames(text) from public;
revoke all on function public.rpc_find_by_code(text) from public;
revoke all on function public.rpc_send_friend_request_by_code(text) from public;
revoke all on function public.rpc_find_by_code_preview(text) from public;
revoke all on function public.rpc_send_friend_request(text) from public;
revoke all on function public.rpc_cancel_friend_request(uuid) from public;
revoke all on function public.rpc_respond_friend_request(uuid, boolean) from public;
revoke all on function public.rpc_list_incoming_requests() from public;
revoke all on function public.rpc_list_outgoing_requests() from public;
revoke all on function public.rpc_list_friends() from public;
revoke all on function public.rpc_unfriend(uuid) from public;
revoke all on function public.rpc_send_message(uuid, text) from public;
revoke all on function public.rpc_list_messages(uuid, int) from public;
revoke all on function public.rpc_mark_messages_read(uuid) from public;
revoke all on function public.rpc_set_bio(text) from public;
revoke all on function public.rpc_set_avatar_url(text) from public;
revoke all on function public.rpc_set_banner(text) from public;
revoke all on function public.rpc_set_avatar_frame(text) from public;
revoke all on function public.rpc_get_profile(uuid) from public;
revoke all on function public.rpc_toggle_profile_like(uuid) from public;
revoke all on function public.rpc_upsert_bookmark(text, text, text, text) from public;
revoke all on function public.rpc_remove_bookmark(text) from public;
revoke all on function public.rpc_list_bookmarks(uuid) from public;
revoke all on function public.rpc_list_profile_comments(uuid) from public;
revoke all on function public.rpc_add_profile_comment(uuid, text) from public;
revoke all on function public.rpc_delete_profile_comment(uuid) from public;
revoke all on function public.rpc_upsert_library_item(text, text, text, text, text, text, jsonb, text, text, int) from public;
revoke all on function public.rpc_remove_library_item(text, text) from public;
revoke all on function public.rpc_list_library_items() from public;
revoke all on function public.rpc_upsert_history_item(text, text, text, text, text, text, int, int) from public;
revoke all on function public.rpc_remove_history_item(text, text) from public;
revoke all on function public.rpc_clear_history_items(text) from public;
revoke all on function public.rpc_list_history_items() from public;
revoke all on function public.is_moderator() from public;
revoke all on function public.rpc_list_news_categories() from public;
revoke all on function public.rpc_list_news_sources() from public;
revoke all on function public.rpc_admin_upsert_news_category(text, text) from public;
revoke all on function public.rpc_admin_remove_news_category(text) from public;
revoke all on function public.rpc_admin_add_news_source(text, text, text, text, text) from public;
revoke all on function public.rpc_admin_remove_news_source(text) from public;

grant execute on function public.rpc_get_my_profile() to authenticated;
grant execute on function public.rpc_set_display_name(text) to authenticated;
grant execute on function public.rpc_set_username(text) to authenticated;
grant execute on function public.rpc_search_usernames(text) to authenticated;
grant execute on function public.rpc_find_by_code(text) to authenticated;
grant execute on function public.rpc_send_friend_request_by_code(text) to authenticated;
grant execute on function public.rpc_find_by_code_preview(text) to authenticated;
grant execute on function public.rpc_send_friend_request(text) to authenticated;
grant execute on function public.rpc_cancel_friend_request(uuid) to authenticated;
grant execute on function public.rpc_respond_friend_request(uuid, boolean) to authenticated;
grant execute on function public.rpc_list_incoming_requests() to authenticated;
grant execute on function public.rpc_list_outgoing_requests() to authenticated;
grant execute on function public.rpc_list_friends() to authenticated;
grant execute on function public.rpc_unfriend(uuid) to authenticated;
grant execute on function public.rpc_send_message(uuid, text) to authenticated;
grant execute on function public.rpc_list_messages(uuid, int) to authenticated;
grant execute on function public.rpc_mark_messages_read(uuid) to authenticated;
grant execute on function public.rpc_set_bio(text) to authenticated;
grant execute on function public.rpc_set_avatar_url(text) to authenticated;
grant execute on function public.rpc_set_banner(text) to authenticated;
grant execute on function public.rpc_set_avatar_frame(text) to authenticated;
grant execute on function public.rpc_get_profile(uuid) to authenticated;
grant execute on function public.rpc_toggle_profile_like(uuid) to authenticated;
grant execute on function public.rpc_upsert_bookmark(text, text, text, text) to authenticated;
grant execute on function public.rpc_remove_bookmark(text) to authenticated;
grant execute on function public.rpc_list_bookmarks(uuid) to authenticated;
grant execute on function public.rpc_list_profile_comments(uuid) to authenticated;
grant execute on function public.rpc_add_profile_comment(uuid, text) to authenticated;
grant execute on function public.rpc_delete_profile_comment(uuid) to authenticated;
grant execute on function public.rpc_upsert_library_item(text, text, text, text, text, text, jsonb, text, text, int) to authenticated;
grant execute on function public.rpc_remove_library_item(text, text) to authenticated;
grant execute on function public.rpc_list_library_items() to authenticated;
grant execute on function public.rpc_upsert_history_item(text, text, text, text, text, text, int, int) to authenticated;
grant execute on function public.rpc_remove_history_item(text, text) to authenticated;
grant execute on function public.rpc_clear_history_items(text) to authenticated;
grant execute on function public.rpc_list_history_items() to authenticated;
grant execute on function public.is_moderator() to authenticated;
grant execute on function public.rpc_list_news_categories() to authenticated;
grant execute on function public.rpc_list_news_sources() to authenticated;
grant execute on function public.rpc_admin_upsert_news_category(text, text) to authenticated;
grant execute on function public.rpc_admin_remove_news_category(text) to authenticated;
grant execute on function public.rpc_admin_add_news_source(text, text, text, text, text) to authenticated;
grant execute on function public.rpc_admin_remove_news_source(text) to authenticated;

-- ---------- реалтайм ----------
-- Без этого живые уведомления (новая заявка / принятая заявка / новое
-- сообщение) не будут приходить сами — придётся руками обновлять вкладку.

do $$
begin
  alter publication supabase_realtime add table public.friend_requests;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null;
end $$;