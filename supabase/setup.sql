-- 合成小瑞瑞 · Supabase 初始化脚本
-- 用法：Supabase 后台 → SQL Editor → New query → 整段粘贴 → Run（只需要跑一次）

-- 1. 玩家资料表（昵称、头像、最高分）
create table if not exists public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  username    text unique not null check (username ~ '^[a-z0-9_]{3,16}$'),
  nickname    text not null check (char_length(nickname) between 1 and 12),
  avatar_url  text check (avatar_url is null or avatar_url ~ '^(https://[a-z0-9-]+\.supabase\.co|/sb)/storage/v1/object/public/avatars/'),
  best_score  int  not null default 0,
  best_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists profiles_best_idx on public.profiles (best_score desc, best_at asc);
-- 昵称不能和别人重复（不区分大小写）
create unique index if not exists profiles_nickname_key on public.profiles (lower(nickname));

alter table public.profiles enable row level security;

drop policy if exists "所有人可以看排行榜" on public.profiles;
create policy "所有人可以看排行榜" on public.profiles for select using (true);

drop policy if exists "只能改自己的资料" on public.profiles;
create policy "只能改自己的资料" on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

-- 玩家只能改昵称和头像，分数只能通过 submit_score 函数写入
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (nickname, avatar_url) on public.profiles to authenticated;

-- 2. 注册时自动建资料
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, nickname)
  values (
    new.id,
    lower(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))),
    left(coalesce(nullif(trim(new.raw_user_meta_data->>'nickname'), ''), '小瑞瑞粉'), 12)
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 注册前检查账号 / 昵称是否已被使用
create or replace function public.check_names(p_username text, p_nickname text)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'username_taken', exists (select 1 from public.profiles where username = lower(p_username)),
    'nickname_taken', exists (select 1 from public.profiles where lower(nickname) = lower(trim(p_nickname)))
  );
$$;
grant execute on function public.check_names(text, text) to anon, authenticated;

-- 3. 周榜：每周一 0 点（北京时间）开始新的一周
create table if not exists public.weekly_scores (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  week_start  date not null,
  score       int  not null default 0,
  at          timestamptz not null default now(),
  primary key (user_id, week_start)
);
create index if not exists weekly_rank_idx on public.weekly_scores (week_start, score desc, at asc);

alter table public.weekly_scores enable row level security;
drop policy if exists "所有人可以看周榜" on public.weekly_scores;
create policy "所有人可以看周榜" on public.weekly_scores for select using (true);
revoke insert, update, delete on public.weekly_scores from anon, authenticated;

create or replace function public.current_week()
returns date language sql stable as $$
  select ((now() at time zone 'Asia/Shanghai')::date
          - (extract(isodow from (now() at time zone 'Asia/Shanghai'))::int - 1));
$$;

-- 4. 提交分数：同时更新历史最高分和本周最高分，返回两个榜的名次
drop function if exists public.submit_score(int);
create or replace function public.submit_score(p_score int)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_week  date := public.current_week();
  v_best  int;
  v_rank  int;
  v_new   boolean := false;
  v_wbest int;
  v_wrank int;
  v_wnew  boolean := false;
begin
  if auth.uid() is null then raise exception 'not logged in'; end if;
  if p_score is null or p_score < 0 or p_score > 100000 then raise exception 'bad score'; end if;

  update public.profiles
     set best_score = p_score, best_at = now()
   where id = auth.uid() and best_score < p_score
  returning true into v_new;

  if p_score > 0 then
    insert into public.weekly_scores (user_id, week_start, score, at)
    values (auth.uid(), v_week, p_score, now())
    on conflict (user_id, week_start) do update
      set score = excluded.score, at = excluded.at
      where public.weekly_scores.score < excluded.score
    returning true into v_wnew;
  end if;

  select best_score into v_best from public.profiles where id = auth.uid();
  select count(*) + 1 into v_rank from public.profiles where best_score > v_best;

  select score into v_wbest from public.weekly_scores where user_id = auth.uid() and week_start = v_week;
  if v_wbest is not null then
    select count(*) + 1 into v_wrank from public.weekly_scores where week_start = v_week and score > v_wbest;
  end if;

  return json_build_object(
    'best', v_best, 'rank', v_rank, 'new_record', coalesce(v_new, false),
    'week_best', v_wbest, 'week_rank', v_wrank, 'week_new', coalesce(v_wnew, false)
  );
end $$;

revoke execute on function public.submit_score(int) from public, anon;
grant execute on function public.submit_score(int) to authenticated;

-- 5. 排行榜实时推送
do $$
begin
  alter publication supabase_realtime add table public.profiles;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.weekly_scores;
exception when duplicate_object then null;
end $$;

-- 6. 头像存储（公开读取，每人只能写自己的文件夹）
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/webp', 'image/png', 'image/jpeg'])
on conflict (id) do nothing;

drop policy if exists "头像公开可看" on storage.objects;
create policy "头像公开可看" on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "上传自己的头像" on storage.objects;
create policy "上传自己的头像" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "替换自己的头像" on storage.objects;
create policy "替换自己的头像" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- 7. 提速用的读取函数：一次请求拿齐需要的数据
-- 排行榜：榜单 + 总人数 + 我的分数和名次
create or replace function public.get_board(p_kind text, p_limit int default 5)
returns json language plpgsql stable security definer set search_path = public as $$
declare
  v_week  date := public.current_week();
  v_lim   int  := least(greatest(coalesce(p_limit, 5), 1), 500);
  v_rows  json;
  v_total int;
  v_score int;
  v_rank  int;
begin
  select count(*) into v_total from public.profiles;
  if p_kind = 'week' then
    select coalesce(json_agg(r), '[]'::json) into v_rows from (
      select w.user_id as id, p.nickname, p.avatar_url, w.score
        from public.weekly_scores w join public.profiles p on p.id = w.user_id
       where w.week_start = v_week
       order by w.score desc, w.at asc
       limit v_lim) r;
    if auth.uid() is not null then
      select score into v_score from public.weekly_scores where user_id = auth.uid() and week_start = v_week;
      if v_score is not null then
        select count(*) + 1 into v_rank from public.weekly_scores where week_start = v_week and score > v_score;
      end if;
    end if;
  else
    select coalesce(json_agg(r), '[]'::json) into v_rows from (
      select id, nickname, avatar_url, best_score as score
        from public.profiles
       where best_score > 0
       order by best_score desc, best_at asc
       limit v_lim) r;
    if auth.uid() is not null then
      select best_score into v_score from public.profiles where id = auth.uid();
      if coalesce(v_score, 0) > 0 then
        select count(*) + 1 into v_rank from public.profiles where best_score > v_score;
      end if;
    end if;
  end if;
  return json_build_object('rows', v_rows, 'total', v_total, 'my_score', coalesce(v_score, 0), 'my_rank', v_rank);
end $$;
grant execute on function public.get_board(text, int) to anon, authenticated;

-- 个人资料 + 总榜名次
create or replace function public.get_me()
returns json language plpgsql stable security definer set search_path = public as $$
declare
  v_best int;
  v_rank int;
  v      json;
begin
  if auth.uid() is null then return null; end if;
  select best_score into v_best from public.profiles where id = auth.uid();
  if v_best is null then return null; end if;
  if v_best > 0 then
    select count(*) + 1 into v_rank from public.profiles where best_score > v_best;
  end if;
  select json_build_object('id', id, 'username', username, 'nickname', nickname,
                           'avatar_url', avatar_url, 'best_score', best_score, 'rank', v_rank)
    into v from public.profiles where id = auth.uid();
  return v;
end $$;
revoke execute on function public.get_me() from public, anon;
grant execute on function public.get_me() to authenticated;

-- 8. 头像地址允许站内转发路径（/sb/...），国内访问不直连 supabase.co
alter table public.profiles drop constraint if exists profiles_avatar_url_check;
alter table public.profiles add constraint profiles_avatar_url_check
  check (avatar_url is null or avatar_url ~ '^(https://[a-z0-9-]+\.supabase\.co|/sb)/storage/v1/object/public/avatars/');

-- 9. 头像小图直接存在资料表里，跟着排行榜一起返回，不再单独请求图片
alter table public.profiles add column if not exists avatar_small text
  check (avatar_small is null or (length(avatar_small) < 12000 and avatar_small ~ '^data:image/(jpeg|png|webp);base64,'));
alter table public.profiles add column if not exists avatar_mid text
  check (avatar_mid is null or (length(avatar_mid) < 40000 and avatar_mid ~ '^data:image/(jpeg|png|webp);base64,'));
grant update (nickname, avatar_url, avatar_small, avatar_mid) on public.profiles to authenticated;

create or replace function public.get_board(p_kind text, p_limit int default 5)
returns json language plpgsql stable security definer set search_path = public as $$
declare
  v_week  date := public.current_week();
  v_lim   int  := least(greatest(coalesce(p_limit, 5), 1), 500);
  v_rows  json;
  v_total int;
  v_score int;
  v_rank  int;
begin
  select count(*) into v_total from public.profiles;
  if p_kind = 'week' then
    select coalesce(json_agg(r), '[]'::json) into v_rows from (
      select w.user_id as id, p.nickname, p.avatar_small,
             case when p.avatar_small is null then p.avatar_url end as avatar_url, w.score
        from public.weekly_scores w join public.profiles p on p.id = w.user_id
       where w.week_start = v_week
       order by w.score desc, w.at asc
       limit v_lim) r;
    if auth.uid() is not null then
      select score into v_score from public.weekly_scores where user_id = auth.uid() and week_start = v_week;
      if v_score is not null then
        select count(*) + 1 into v_rank from public.weekly_scores where week_start = v_week and score > v_score;
      end if;
    end if;
  else
    select coalesce(json_agg(r), '[]'::json) into v_rows from (
      select id, nickname, avatar_small,
             case when avatar_small is null then avatar_url end as avatar_url, best_score as score
        from public.profiles
       where best_score > 0
       order by best_score desc, best_at asc
       limit v_lim) r;
    if auth.uid() is not null then
      select best_score into v_score from public.profiles where id = auth.uid();
      if coalesce(v_score, 0) > 0 then
        select count(*) + 1 into v_rank from public.profiles where best_score > v_score;
      end if;
    end if;
  end if;
  return json_build_object('rows', v_rows, 'total', v_total, 'my_score', coalesce(v_score, 0), 'my_rank', v_rank);
end $$;
grant execute on function public.get_board(text, int) to anon, authenticated;

create or replace function public.get_me()
returns json language plpgsql stable security definer set search_path = public as $$
declare
  v_best int;
  v_rank int;
  v      json;
begin
  if auth.uid() is null then return null; end if;
  select best_score into v_best from public.profiles where id = auth.uid();
  if v_best is null then return null; end if;
  if v_best > 0 then
    select count(*) + 1 into v_rank from public.profiles where best_score > v_best;
  end if;
  select json_build_object('id', id, 'username', username, 'nickname', nickname,
                           'avatar_url', avatar_url, 'avatar_small', avatar_small, 'avatar_mid', avatar_mid,
                           'best_score', best_score, 'rank', v_rank)
    into v from public.profiles where id = auth.uid();
  return v;
end $$;
revoke execute on function public.get_me() from public, anon;
grant execute on function public.get_me() to authenticated;
