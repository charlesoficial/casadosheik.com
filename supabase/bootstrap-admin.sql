-- Cria ou atualiza o usuario admin padrao no Supabase Auth.
-- Rodar depois de importar schema.sql e seed.sql.

do $$
declare
  admin_email text := 'administrador@gmail.com';
  admin_password text := 'administrador';
  admin_user_id uuid;
begin
  select id
  into admin_user_id
  from auth.users
  where email = admin_email
  limit 1;

  if admin_user_id is null then
    admin_user_id := gen_random_uuid();

    insert into auth.users (
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      last_sign_in_at
    ) values (
      admin_user_id,
      'authenticated',
      'authenticated',
      admin_email,
      crypt(admin_password, gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', array['email'], 'role', 'admin'),
      jsonb_build_object('role', 'admin', 'display_name', 'Administrador'),
      now(),
      now(),
      now()
    );

    insert into auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) values (
      gen_random_uuid(),
      admin_user_id,
      jsonb_build_object('sub', admin_user_id::text, 'email', admin_email),
      'email',
      admin_user_id::text,
      now(),
      now(),
      now()
    );
  else
    update auth.users
    set
      encrypted_password = crypt(admin_password, gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      raw_app_meta_data = jsonb_build_object('provider', 'email', 'providers', array['email'], 'role', 'admin'),
      raw_user_meta_data = jsonb_build_object('role', 'admin', 'display_name', 'Administrador'),
      updated_at = now()
    where id = admin_user_id;

    if not exists (
      select 1
      from auth.identities
      where user_id = admin_user_id
        and provider = 'email'
    ) then
      insert into auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
      ) values (
        gen_random_uuid(),
        admin_user_id,
        jsonb_build_object('sub', admin_user_id::text, 'email', admin_email),
        'email',
        admin_user_id::text,
        now(),
        now(),
        now()
      );
    end if;
  end if;
end $$;
