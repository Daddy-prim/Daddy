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
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- 4.5 Create indexes for foreign keys to improve performance
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON public.chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON public.messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);

-- 5. Enable Realtime for messages
alter publication supabase_realtime add table messages;

-- 6. Set up Row Level Security (RLS)
-- Secure policies to only allow users to read/write their own chats.

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all authenticated users to read users" ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow users to update their own profile" ON public.users FOR UPDATE TO authenticated USING (auth.uid() = id);

ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow users to access their chats" ON public.chats FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE chat_id = id AND user_id = auth.uid()
  )
);

ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow users to access their participations" ON public.chat_participants FOR ALL TO authenticated USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.chat_participants cp
    WHERE cp.chat_id = chat_id AND cp.user_id = auth.uid()
  )
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow users to access messages in their chats" ON public.messages FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE chat_id = messages.chat_id AND user_id = auth.uid()
  )
);

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
