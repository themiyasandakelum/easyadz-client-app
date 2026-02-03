/**
 * Profession category ENUM values (must match PostgreSQL profession_category type).
 * Used for profile edit dropdown and Smart-Match search.
 */
export const PROFESSION_CATEGORIES = [
  "Engineering/Tech",
  "Medical/Healthcare",
  "Education/Academic",
  "Finance/Banking",
  "Legal",
  "Government/Public Sector",
  "Business/Entrepreneur",
  "Other",
] as const;

export type ProfessionCategory = (typeof PROFESSION_CATEGORIES)[number];

/** Examples for job_title by category (Sri Lanka). Shown as placeholder/suggestions. */
export const JOB_TITLE_EXAMPLES: Record<ProfessionCategory, string[]> = {
  "Engineering/Tech": [
    "Software Engineer",
    "Civil Engineer",
    "Architect",
    "Data Scientist",
    "DevOps Engineer",
  ],
  "Medical/Healthcare": [
    "Doctor (MBBS)",
    "Nurse",
    "Pharmacist",
    "Specialist",
  ],
  "Education/Academic": [
    "School Teacher",
    "University Lecturer",
    "Researcher",
  ],
  "Finance/Banking": [
    "Accountant (CA/CIMA)",
    "Banker",
    "Auditor",
    "Stock Broker",
  ],
  "Legal": [
    "Lawyer",
    "Attorney-at-Law",
    "Notary Public",
  ],
  "Government/Public Sector": [
    "Executive Officer",
    "Clerical",
    "Forces/Police",
  ],
  "Business/Entrepreneur": [
    "Business Owner",
    "Entrepreneur",
    "Manager",
  ],
  "Other": ["Other"],
};
