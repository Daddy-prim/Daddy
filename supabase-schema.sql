-- Run this in your Supabase SQL Editor

-- 1. Create custom users table that extends auth.users
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  phone TEXT,
  full_name TEXT,
  avatar TEXT,
  status TEXT DEFAULT 'offline',
  status_message TEXT,
  preferences JSONB DEFAULT '{"dmSound": "default", "groupSound": "default", "mediaAutoDownload": "wifi", "imageQuality": "standard"}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create chats table
CREATE TABLE public.chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  is_group BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create chat participants table
CREATE TABLE public.chat_participants (
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  is_pinned BOOLEAN DEFAULT false,
  notification_sound TEXT DEFAULT 'default',
  PRIMARY KEY (chat_id, user_id)
);

-- 4. Create messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT,
  media JSONB,
  reply_to JSONB,
  reactions JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'sent',
  scheduled_for TIMESTAMP WITH TIME ZONE,
  is_action_item BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  edited_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Enable Realtime for messages
alter publication supabase_realtime add table messages;

-- 6. Set up Row Level Security (RLS)
-- For testing/development, we'll use permissive policies.
-- IN PRODUCTION, you should restrict these to only allow users to read/write their own chats.

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all authenticated users to read users" ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow users to update their own profile" ON public.users FOR UPDATE TO authenticated USING (auth.uid() = id);

ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all authenticated users to access chats" ON public.chats FOR ALL TO authenticated USING (true);

ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all authenticated users to access participants" ON public.chat_participants FOR ALL TO authenticated USING (true);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all authenticated users to access messages" ON public.messages FOR ALL TO authenticated USING (true);

-- 7. Trigger to automatically create a user profile when a new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, phone)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', new.phone);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
