/**
 * Marketplace listing categories and dynamic attribute shapes for Post Ad form.
 * Stored in listings.attributes JSONB.
 */

export const LISTING_CATEGORIES = [
  { value: "vehicle", label: "Vehicle", icon: "🚗", monetization: "High fee for Featured car ads" },
  { value: "property", label: "Property", icon: "🏠", monetization: "Subscription for Real Estate Agents" },
  { value: "electronic", label: "Electronics", icon: "💻", monetization: "Small Bump Up fees for fast sales" },
  { value: "matrimonial", label: "Matrimonial", icon: "💍", monetization: "Credit for Contact model" },
] as const;

export type ListingCategory = (typeof LISTING_CATEGORIES)[number]["value"];

/** Categories available in Post Ad; Matrimonial is managed via Profile Edit only. */
export const POST_AD_CATEGORIES = LISTING_CATEGORIES.filter((c) => c.value !== "matrimonial");

/** Vehicle attributes (attributes JSONB when category = vehicle) */
export interface VehicleAttributes {
  make?: string;
  model_year?: string;
  fuel_type?: string;
  mileage?: string;
}

/** Property attributes */
export interface PropertyAttributes {
  bed_rooms?: string;
  land_perches?: string;
  type?: string;
  address?: string;
}

/** Electronic attributes */
export interface ElectronicAttributes {
  brand?: string;
  model?: string;
  warranty?: string;
}

/** Matrimonial attributes (optional for marketplace ad) */
export interface MatrimonialAttributes {
  profession?: string;
  age?: string;
}

export type ListingAttributes = VehicleAttributes | PropertyAttributes | ElectronicAttributes | MatrimonialAttributes;

export const FUEL_TYPES = ["Petrol", "Diesel", "Hybrid", "Electric", "Other"] as const;
export const PROPERTY_TYPES = ["Land", "House", "Apartment", "Commercial", "Other"] as const;
