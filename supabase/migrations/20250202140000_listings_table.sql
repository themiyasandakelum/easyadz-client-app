-- Hybrid listings table: common columns + category-specific data in JSONB
CREATE TABLE IF NOT EXISTS listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('vehicle', 'property', 'electronic', 'matrimonial')),
  title text NOT NULL,
  price decimal(12, 2),
  location varchar(100),
  attributes jsonb,
  images text[] DEFAULT '{}',
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listings_seller_id ON listings (seller_id);
CREATE INDEX IF NOT EXISTS idx_listings_category ON listings (category);
CREATE INDEX IF NOT EXISTS idx_listings_attributes ON listings USING GIN (attributes);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON listings (created_at DESC);

COMMENT ON TABLE listings IS 'Marketplace: Vehicle, Property, Electronics, Matrimonial. attributes = category-specific JSON.';
COMMENT ON COLUMN listings.attributes IS 'Vehicle: {make, model_year, fuel_type, mileage}. Property: {bed_rooms, land_perches, type, address}. Electronic: {brand, warranty}. Matrimonial: {profession, age}';
