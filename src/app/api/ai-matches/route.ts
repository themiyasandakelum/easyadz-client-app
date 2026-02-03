import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { sql } from "@/lib/db";
import { toSql } from "pgvector";
import { GoogleGenAI } from "@google/genai";

/** Build text for embedding from profile (bio + preferences) */
function buildEmbeddingText(profile: Record<string, unknown>): string {
  const parts: string[] = [];
  if (profile.bio && typeof profile.bio === "string") parts.push(profile.bio);
  if (profile.profession && typeof profile.profession === "string") parts.push(`Profession: ${profile.profession}`);
  if (profile.religion && typeof profile.religion === "string") parts.push(`Religion: ${profile.religion}`);
  if (profile.location && typeof profile.location === "string") parts.push(`Location: ${profile.location}`);
  if (profile.education_level && typeof profile.education_level === "string") parts.push(`Education: ${profile.education_level}`);
  const lifestyle = profile.lifestyle_preferences;
  if (Array.isArray(lifestyle) && lifestyle.length > 0) {
    parts.push("Lifestyle: " + lifestyle.filter((x): x is string => typeof x === "string").join(", "));
  }
  return parts.join(". ") || "No bio or preferences yet.";
}

/** GET: AI-matched profiles. Generates embedding from user bio+preferences, fetches top 10 matches. */
export async function GET(request: NextRequest) {
  if (!sql) {
    return NextResponse.json(
      { error: "Database not configured." },
      { status: 503 }
    );
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json(
      { error: "Authorization required." },
      { status: 401 }
    );
  }

  let userId: string;
  try {
    const decoded = await verifyFirebaseToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: "Invalid or expired token." },
        { status: 401 }
      );
    }
    userId = decoded.uid;
  } catch {
    return NextResponse.json(
      { error: "Invalid or expired token." },
      { status: 401 }
    );
  }

  const googleAiKey = process.env.GOOGLE_AI_API_KEY;
  if (!googleAiKey) {
    return NextResponse.json(
      { error: "AI matching not configured. Set GOOGLE_AI_API_KEY." },
      { status: 503 }
    );
  }

  try {
    const profileRows = await sql`
      SELECT id, user_id, bio, profession, religion, location, education_level, lifestyle_preferences, gender
      FROM profiles
      WHERE user_id = ${userId}
      LIMIT 1
    `;
    const profile = Array.isArray(profileRows) ? profileRows[0] : profileRows;
    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found.", matches: [], message: "Complete your profile first." },
        { status: 404 }
      );
    }

    const embeddingText = buildEmbeddingText(profile as Record<string, unknown>);
    if (!embeddingText || embeddingText === "No bio or preferences yet.") {
      return NextResponse.json({
        matches: [],
        message: "Update your bio to get better AI matches!",
      });
    }

    const ai = new GoogleGenAI({ apiKey: googleAiKey });
    const embeddingRes = await ai.models.embedContent({
      model: "gemini-embedding-001",
      contents: embeddingText,
      config: {
        outputDimensionality: 768,
        taskType: "SEMANTIC_SIMILARITY",
      },
    });
    const embedding = embeddingRes.embeddings?.[0]?.values;
    if (!embedding || embedding.length !== 768) {
      return NextResponse.json(
        { error: "Failed to generate embedding." },
        { status: 500 }
      );
    }

    // Update user's embedding in DB for future matches
    const embeddingStr = toSql(embedding);
    await sql.unsafe(
      `UPDATE profiles SET embedding = $1::vector, updated_at = now() WHERE user_id = $2`,
      [embeddingStr, userId]
    );

    const userGender = (profile as { gender?: string }).gender;
    const genderStr = typeof userGender === "string" ? userGender : "male";

    const rows = await sql.unsafe(
      `SELECT * FROM match_matrimonial_profiles($1::vector, 0.2, 10, $2, $3)`,
      [embeddingStr, genderStr, userId]
    );
    const list = Array.isArray(rows) ? rows : [rows].filter(Boolean);

    const withAge = list.map((row: Record<string, unknown>) => {
      const dob = row.dob;
      const age =
        dob != null
          ? Math.floor(
              (Date.now() - new Date(dob as string).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
            )
          : null;
      const similarity = (row.similarity as number) ?? 0;
      const compatibility = Math.round(Math.min(99, Math.max(50, similarity * 100)));
      const { similarity: _s, ...rest } = row;
      return { ...rest, age, compatibility };
    });

    return NextResponse.json({ matches: withAge });
  } catch (err) {
    console.error("AI matches error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI matching failed.", matches: [] },
      { status: 500 }
    );
  }
}
