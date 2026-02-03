import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { GoogleGenAI } from "@google/genai";
import { POST_AD_CATEGORIES } from "@/lib/listings-types";

/** Response shape for AI-suggested ad fields */
export interface SmartPostResponse {
  title: string;
  category: string;
  description: string;
  attributes?: Record<string, string>;
}

const VALID_CATEGORIES = POST_AD_CATEGORIES.map((c) => c.value);

const PROMPT = `You are analyzing a photo for a Sri Lankan marketplace ad (easyadz.lk). 
Detect what the item is and suggest ad fields.

Return ONLY valid JSON (no markdown, no code blocks) with this exact structure:
{
  "title": "Short catchy title (e.g. Toyota Aqua 2015 - Well Maintained)",
  "category": "vehicle" | "property" | "electronic",
  "description": "2-4 sentence professional ad description. Include key details: make/model, condition, notable features. For vehicles: mention mileage, fuel type if visible. For property: bedrooms, land size if visible. For electronics: brand, model, specs if visible.",
  "attributes": {}
}

For "attributes", fill only fields relevant to the category:
- vehicle: { "make": "Toyota", "model_year": "2015", "fuel_type": "Petrol|Diesel|Hybrid|Electric|Other", "mileage": "50000 km" }
- property: { "type": "Land|House|Apartment|Commercial|Other", "bed_rooms": "3", "land_perches": "10", "address": "" }
- electronic: { "brand": "Apple", "model": "iPhone 14", "warranty": "1 year" }

Use empty string "" for unknown values. Omit attributes entirely if you cannot determine the category.
Category MUST be one of: vehicle, property, electronic.`;

/** POST: Analyze image with Gemini Vision, return suggested Title, Category, Description, attributes */
export async function POST(request: NextRequest) {
  const googleAiKey = process.env.GOOGLE_AI_API_KEY;
  if (!googleAiKey) {
    return NextResponse.json(
      { error: "AI Smart Post not configured. Set GOOGLE_AI_API_KEY." },
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

  try {
    const decoded = await verifyFirebaseToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: "Invalid or expired token." },
        { status: 401 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Invalid or expired token." },
      { status: 401 }
    );
  }

  let imageBase64: string;
  let mimeType = "image/jpeg";

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("image") as File | null;
    if (!file || !file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Please upload an image file." },
        { status: 400 }
      );
    }
    const buf = Buffer.from(await file.arrayBuffer());
    imageBase64 = buf.toString("base64");
    mimeType = file.type || "image/jpeg";
  } else if (contentType.includes("application/json")) {
    const body = await request.json();
    const data = body.image ?? body.data;
    if (!data || typeof data !== "string") {
      return NextResponse.json(
        { error: "JSON body must include 'image' or 'data' as base64 string." },
        { status: 400 }
      );
    }
    imageBase64 = data.replace(/^data:image\/\w+;base64,/, "");
    if (body.mimeType) mimeType = body.mimeType;
  } else {
    return NextResponse.json(
      { error: "Send image as multipart/form-data (field: image) or JSON { image: base64 }." },
      { status: 400 }
    );
  }

  try {
    const ai = new GoogleGenAI({ apiKey: googleAiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType,
                data: imageBase64,
              },
            },
            { text: PROMPT },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text?.trim();
    if (!text) {
      return NextResponse.json(
        { error: "AI did not return a valid response." },
        { status: 500 }
      );
    }

    let parsed: SmartPostResponse;
    try {
      parsed = JSON.parse(text) as SmartPostResponse;
    } catch {
      return NextResponse.json(
        { error: "AI response was not valid JSON.", raw: text },
        { status: 500 }
      );
    }

    if (!parsed.title || typeof parsed.title !== "string") {
      parsed.title = "Untitled listing";
    }
    if (!parsed.category || !VALID_CATEGORIES.includes(parsed.category)) {
      parsed.category = "electronic";
    }
    if (!parsed.description || typeof parsed.description !== "string") {
      parsed.description = "";
    }
    if (!parsed.attributes || typeof parsed.attributes !== "object") {
      parsed.attributes = {};
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Smart Post error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "AI analysis failed.",
      },
      { status: 500 }
    );
  }
}
