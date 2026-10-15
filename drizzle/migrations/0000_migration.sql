-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Businesses
CREATE TABLE public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  business_type TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  phone TEXT,
  email TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.businesses TO authenticated;
GRANT ALL ON public.businesses TO service_role;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.business_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner','admin','member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, user_id)
);
CREATE INDEX idx_business_members_user ON public.business_members(user_id);
GRANT SELECT, INSERT, DELETE ON public.business_members TO authenticated;
GRANT ALL ON public.business_members TO service_role;
ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;

-- Membership helpers (security definer avoids recursive RLS)
CREATE OR REPLACE FUNCTION public.is_business_member(_business_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.business_members WHERE business_id = _business_id AND user_id = auth.uid())
$$;
CREATE OR REPLACE FUNCTION public.is_business_admin(_business_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.business_members WHERE business_id = _business_id AND user_id = auth.uid() AND role IN ('owner','admin'))
$$;

CREATE POLICY "members view business" ON public.businesses FOR SELECT TO authenticated USING (public.is_business_member(id));
CREATE POLICY "admins update business" ON public.businesses FOR UPDATE TO authenticated USING (public.is_business_admin(id));

CREATE POLICY "members view members" ON public.business_members FOR SELECT TO authenticated USING (public.is_business_member(business_id));
CREATE POLICY "admins add members" ON public.business_members FOR INSERT TO authenticated WITH CHECK (public.is_business_admin(business_id) AND role <> 'owner');
CREATE POLICY "admins remove members" ON public.business_members FOR DELETE TO authenticated USING (public.is_business_admin(business_id) AND role <> 'owner');

CREATE TABLE public.business_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
  ai_greeting TEXT,
  ai_tone TEXT DEFAULT 'professional',
  voice_type TEXT DEFAULT 'female-natural',
  booking_enabled BOOLEAN DEFAULT true,
  cancellation_enabled BOOLEAN DEFAULT true,
  min_advance_hours INTEGER DEFAULT 2,
  max_advance_days INTEGER DEFAULT 30,
  buffer_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.business_settings TO authenticated;
GRANT ALL ON public.business_settings TO service_role;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members view settings" ON public.business_settings FOR SELECT TO authenticated USING (public.is_business_member(business_id));
CREATE POLICY "admins insert settings" ON public.business_settings FOR INSERT TO authenticated WITH CHECK (public.is_business_admin(business_id));
CREATE POLICY "admins update settings" ON public.business_settings FOR UPDATE TO authenticated USING (public.is_business_admin(business_id));

CREATE TABLE public.business_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  is_open BOOLEAN DEFAULT true,
  open_time TIME,
  close_time TIME,
  UNIQUE (business_id, day_of_week)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_hours TO authenticated;
GRANT ALL ON public.business_hours TO service_role;
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members view hours" ON public.business_hours FOR SELECT TO authenticated USING (public.is_business_member(business_id));
CREATE POLICY "admins manage hours" ON public.business_hours FOR ALL TO authenticated USING (public.is_business_admin(business_id)) WITH CHECK (public.is_business_admin(business_id));

-- Business data
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, phone)
);
CREATE TABLE public.calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_phone TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('completed','missed','voicemail','in-progress')),
  outcome TEXT CHECK (outcome IN ('appointment_booked','question_answered','callback_requested','voicemail','missed')),
  duration INTEGER DEFAULT 0,
  transcript TEXT,
  summary TEXT,
  recording_url TEXT,
  twilio_call_sid TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  service TEXT NOT NULL,
  date_time TIMESTAMPTZ NOT NULL,
  duration INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('confirmed','pending','cancelled','completed')),
  notes TEXT,
  call_id UUID REFERENCES public.calls(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  call_id UUID REFERENCES public.calls(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread','read','resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.knowledge_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT,
  usage_count INTEGER DEFAULT 0,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  duration INTEGER NOT NULL,
  price_range TEXT,
  description TEXT,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  call_sid TEXT UNIQUE NOT NULL,
  parent_call_sid TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('inbound','outbound')),
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'initiated',
  started_at TIMESTAMPTZ,
  answered_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration INTEGER,
  recording_url TEXT,
  recording_duration INTEGER,
  transcription TEXT,
  conversation JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_handled BOOLEAN DEFAULT false,
  tools_used TEXT[],
  conversation_summary TEXT,
  appointment_created BOOLEAN DEFAULT false,
  callback_requested BOOLEAN DEFAULT false,
  transferred_to_human BOOLEAN DEFAULT false,
  caller_name TEXT,
  caller_email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contacts_business ON public.contacts(business_id);
CREATE INDEX idx_calls_business ON public.calls(business_id, created_at DESC);
CREATE INDEX idx_appointments_business ON public.appointments(business_id, date_time);
CREATE INDEX idx_messages_business ON public.messages(business_id, status);
CREATE INDEX idx_knowledge_business ON public.knowledge_entries(business_id);
CREATE INDEX idx_services_business ON public.services(business_id);
CREATE INDEX idx_call_logs_business ON public.call_logs(business_id, created_at DESC);

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['contacts','calls','appointments','messages','knowledge_entries','services','call_logs'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "members select" ON public.%I FOR SELECT TO authenticated USING (public.is_business_member(business_id))', t);
    EXECUTE format('CREATE POLICY "members insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_business_member(business_id))', t);
    EXECUTE format('CREATE POLICY "members update" ON public.%I FOR UPDATE TO authenticated USING (public.is_business_member(business_id)) WITH CHECK (public.is_business_member(business_id))', t);
    EXECUTE format('CREATE POLICY "members delete" ON public.%I FOR DELETE TO authenticated USING (public.is_business_member(business_id))', t);
  END LOOP;
END $$;

-- updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['profiles','businesses','business_settings','contacts','appointments','messages','knowledge_entries','services','call_logs'] LOOP
    EXECUTE format('CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t, t);
  END LOOP;
END $$;

-- Onboarding: create business + owner + settings + hours atomically
CREATE OR REPLACE FUNCTION public.create_business(
  _name TEXT, _business_type TEXT, _timezone TEXT, _phone TEXT, _email TEXT, _address TEXT, _hours JSONB
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id UUID; _h JSONB;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF coalesce(trim(_name),'') = '' THEN RAISE EXCEPTION 'Business name is required'; END IF;
  INSERT INTO public.businesses (name, business_type, timezone, phone, email, address)
  VALUES (trim(_name), nullif(_business_type,''), coalesce(nullif(_timezone,''),'UTC'), nullif(_phone,''), nullif(_email,''), nullif(_address,''))
  RETURNING id INTO _id;
  INSERT INTO public.business_members (business_id, user_id, role) VALUES (_id, auth.uid(), 'owner');
  INSERT INTO public.business_settings (business_id, ai_greeting)
  VALUES (_id, 'Hello! Thank you for calling ' || trim(_name) || '. I''m the AI assistant. How can I help you today?');
  FOR _h IN SELECT * FROM jsonb_array_elements(coalesce(_hours,'[]'::jsonb)) LOOP
    INSERT INTO public.business_hours (business_id, day_of_week, is_open, open_time, close_time)
    VALUES (_id, (_h->>'day')::int, (_h->>'is_open')::boolean,
      CASE WHEN (_h->>'is_open')::boolean THEN (_h->>'open_time')::time END,
      CASE WHEN (_h->>'is_open')::boolean THEN (_h->>'close_time')::time END);
  END LOOP;
  RETURN _id;
END; $$;
REVOKE ALL ON FUNCTION public.create_business(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_business(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,JSONB) TO authenticated;

-- Imported-user linking: memberships from the old system, claimed after verified email
CREATE TABLE public.legacy_user_map (
  original_user_id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  auth_user_id UUID,
  linked_at TIMESTAMPTZ
);
CREATE INDEX idx_legacy_user_map_email ON public.legacy_user_map(lower(email));
CREATE TABLE public.legacy_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_user_id UUID NOT NULL REFERENCES public.legacy_user_map(original_user_id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner','admin','member'))
);
GRANT ALL ON public.legacy_user_map TO service_role;
GRANT ALL ON public.legacy_memberships TO service_role;
ALTER TABLE public.legacy_user_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legacy_memberships ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.link_legacy_user(_auth_id UUID, _email TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _m RECORD; _cnt INT;
BEGIN
  SELECT count(*) INTO _cnt FROM public.legacy_user_map WHERE lower(email) = lower(_email) AND auth_user_id IS NULL;
  IF _cnt <> 1 THEN RETURN; END IF; -- only unambiguous matches
  FOR _m IN SELECT lm.business_id, lm.role, lu.original_user_id FROM public.legacy_user_map lu
    JOIN public.legacy_memberships lm ON lm.original_user_id = lu.original_user_id
    WHERE lower(lu.email) = lower(_email) AND lu.auth_user_id IS NULL LOOP
    INSERT INTO public.business_members (business_id, user_id, role) VALUES (_m.business_id, _auth_id, _m.role)
    ON CONFLICT (business_id, user_id) DO NOTHING;
  END LOOP;
  UPDATE public.legacy_user_map SET auth_user_id = _auth_id, linked_at = now()
  WHERE lower(email) = lower(_email) AND auth_user_id IS NULL;
END; $$;
REVOKE ALL ON FUNCTION public.link_legacy_user(UUID, TEXT) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  IF NEW.email_confirmed_at IS NOT NULL THEN
    PERFORM public.link_legacy_user(NEW.id, NEW.email);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_user_confirmed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    PERFORM public.link_legacy_user(NEW.id, NEW.email);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_confirmed AFTER UPDATE OF email_confirmed_at ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_user_confirmed();