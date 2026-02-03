-- Notifications: when User A sends interest to User B, a row is added so User B sees it.
-- user_id = receiver (profile id), sender_id = sender (profile id)
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text,
  body text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications (user_id);
CREATE INDEX IF NOT EXISTS notifications_user_id_is_read_idx ON notifications (user_id, is_read);

COMMENT ON TABLE notifications IS 'Interest and other alerts for the receiver. Mark is_read when viewed.';
