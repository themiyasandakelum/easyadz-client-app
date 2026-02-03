-- Context-aware chat: one room per buyer-seller-listing combination
CREATE TABLE IF NOT EXISTS chat_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_message text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(listing_id, buyer_id, seller_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_rooms_buyer ON chat_rooms (buyer_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_seller ON chat_rooms (seller_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_updated ON chat_rooms (updated_at DESC);

COMMENT ON TABLE chat_rooms IS 'One room per unique buyer-seller-listing. Prevents duplicate conversations.';

-- Individual messages
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_room ON messages (room_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages (room_id, created_at);

COMMENT ON TABLE messages IS 'Chat messages. Use Supabase Realtime or poll for instant updates.';
