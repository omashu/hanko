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
  created_at timestamptz not null default now()
);

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

-- ---------- RLS ----------
-- Прямой доступ к таблицам закрыт почти полностью: всё чтение/запись идёт
-- через функции ниже (security definer), которые сами проверяют auth.uid().
-- Единственное исключение — SELECT на friend_requests/messages: он нужен,
-- чтобы работали живые уведомления (Supabase Realtime применяет RLS и не
-- пришлёт ничего без разрешающей политики SELECT).

alter table public.profiles enable row level security;
alter table public.friend_requests enable row level security;
alter table public.friends enable row level security;
alter table public.messages enable row level security;
alter table public.bookmarks enable row level security;
alter table public.profile_comments enable row level security;

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
returns table(id uuid, friend_code text, username text, display_name text)
language sql
security definer
set search_path = public
as $$
  select id, friend_code, username, display_name from public.profiles where id = auth.uid();
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
returns table(friend_id uuid, display_name text, friend_code text)
language sql
security definer
set search_path = public
as $$
  select f.friend_id, coalesce(p.display_name, 'Без имени'), p.friend_code
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

drop function if exists public.rpc_list_messages(uuid, int);
create or replace function public.rpc_list_messages(p_friend_id uuid, p_limit int default 200)
returns setof public.messages
language sql
security definer
set search_path = public
as $$
  select * from public.messages
  where (from_id = auth.uid() and to_id = p_friend_id)
     or (from_id = p_friend_id and to_id = auth.uid())
  order by created_at asc
  limit greatest(1, least(p_limit, 500));
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

-- ---------- RPC: чужой профиль (сам себе тоже можно) ----------
-- Открыть можно только свой профиль или профиль друга — иначе понятная ошибка
-- (в интерфейсе профиль открывается только по клику на друга из списка друзей).

drop function if exists public.rpc_get_profile(uuid);
create or replace function public.rpc_get_profile(p_user_id uuid)
returns table(id uuid, username text, display_name text, bio text, friend_code text)
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
    select p.id, p.username, p.display_name, p.bio, p.friend_code
    from public.profiles p
    where p.id = p_user_id;
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
revoke all on function public.rpc_set_bio(text) from public;
revoke all on function public.rpc_get_profile(uuid) from public;
revoke all on function public.rpc_upsert_bookmark(text, text, text, text) from public;
revoke all on function public.rpc_remove_bookmark(text) from public;
revoke all on function public.rpc_list_bookmarks(uuid) from public;
revoke all on function public.rpc_list_profile_comments(uuid) from public;
revoke all on function public.rpc_add_profile_comment(uuid, text) from public;
revoke all on function public.rpc_delete_profile_comment(uuid) from public;

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
grant execute on function public.rpc_set_bio(text) to authenticated;
grant execute on function public.rpc_get_profile(uuid) to authenticated;
grant execute on function public.rpc_upsert_bookmark(text, text, text, text) to authenticated;
grant execute on function public.rpc_remove_bookmark(text) to authenticated;
grant execute on function public.rpc_list_bookmarks(uuid) to authenticated;
grant execute on function public.rpc_list_profile_comments(uuid) to authenticated;
grant execute on function public.rpc_add_profile_comment(uuid, text) to authenticated;
grant execute on function public.rpc_delete_profile_comment(uuid) to authenticated;

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