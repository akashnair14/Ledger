-- Function to check if an email exists in auth.users
-- This allows the Forgot Password page to give specific feedback ("User not found")
-- SECURITY WARNING: This exposes whether an email is registered or not (email enumeration).

create or replace function check_email_exists(email_arg text)
returns boolean
language plpgsql
security definer -- Runs with privileges of the creator (supabase_admin), allowing access to auth.users
as $$
begin
  return exists (select 1 from auth.users where email = email_arg);
end;
$$;

-- Grant access to public (anon) users so the ID check works before login
grant execute on function check_email_exists(text) to anon;
grant execute on function check_email_exists(text) to authenticated;
grant execute on function check_email_exists(text) to service_role;
