-- Fix 1: Remove hardcoded admin email trigger and function
-- Drop the trigger first, then the function
DROP TRIGGER IF EXISTS on_profile_created_grant_admin ON public.profiles;
DROP FUNCTION IF EXISTS public.handle_admin_signup();

-- Fix 2: Remove email column from profiles table (it's redundant with auth.users)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email;

-- Update the handle_new_user function to not insert email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;