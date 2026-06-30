import { GoogleGenerativeAI } from "@google/generative-ai";
import { AIAnalysis, AIInsight, Issue, IssueCategory } from "@/types";
import { DEPARTMENT_BY_CATEGORY } from "@/lib/gamification";

const genAI = new GoogleGenerativeAI(
  process.env.NEXT_PUBLIC_GEMINI_API_KEY || ""
);

// ==================== ANALYZE IMAGE ====================
export async function analyzeIssueImage(
  base64Image: string,
  mimeType: string,
  userDescription?: string
): Promise<AIAnalysis> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const prompt = `You are an AI assistant for a community issue reporting platform called CivicPulse. 
    Analyze this image of a community/infrastructure issue and provide a structured analysis.
    
    User description (if any): "${userDescription || "No description provided"}"
    
    Respond ONLY with a valid JSON object in this exact format:
    {
      "category": one of ["pothole", "water_leakage", "streetlight", "waste_management", "road_damage", "drainage", "public_property", "other"],
      "severity": a number from 1 to 5 (1=very minor, 5=critical/dangerous),
      "description": "A clear 1-2 sentence description of the issue visible in the image",
      "tags": ["tag1", "tag2", "tag3"] (3-5 relevant tags),
      "suggestedDepartment": one of ["PWD", "Municipal Corporation", "Electricity Board", "Water Supply Board", "Sanitation Department", "Traffic Police", "General Administration"],
      "confidence": a number from 0 to 1 representing your confidence in this analysis
    }`;

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Image,
          mimeType: mimeType,
        },
      },
      prompt,
    ]);

    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      category: parsed.category as IssueCategory,
      severity: Math.min(5, Math.max(1, parseInt(parsed.severity))) as
        | 1
        | 2
        | 3
        | 4
        | 5,
      description: parsed.description,
      tags: parsed.tags || [],
      suggestedDepartment:
        parsed.suggestedDepartment ||
        DEPARTMENT_BY_CATEGORY[parsed.category as IssueCategory],
      confidence: parseFloat(parsed.confidence) || 0.8,
    };
  } catch (error) {
    throw error;
  }
}

// ==================== GENERATE PREDICTIVE INSIGHTS ====================
export async function generateInsights(issues: Issue[]): Promise<AIInsight> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const issuesSummary = issues.slice(0, 50).map((i) => ({
      category: i.category,
      severity: i.severity,
      status: i.status,
      ward: i.location.ward,
      lat: i.location.lat,
      lng: i.location.lng,
      createdAt: new Date(i.createdAt).toISOString().split("T")[0],
    }));

    const prompt = `You are an AI analyst for CivicPulse, a community issue tracking platform in India.
    
    Analyze this issue data and provide predictive insights:
    ${JSON.stringify(issuesSummary, null, 2)}
    
    Respond ONLY with a valid JSON object:
    {
      "hotspots": [
        {
          "location": {"lat": number, "lng": number, "address": "area name", "ward": "ward name"},
          "predictedCategory": "category_name",
          "probability": 0.0 to 1.0,
          "reasoning": "brief explanation"
        }
      ],
      "trendAnalysis": "2-3 sentence analysis of current trends",
      "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"]
    }
    
    Provide 2-3 hotspot predictions and 3 actionable recommendations.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      hotspots: parsed.hotspots || [],
      trendAnalysis: parsed.trendAnalysis || "Analysis unavailable",
      recommendations: parsed.recommendations || [],
      generatedAt: Date.now(),
    };
  } catch (error) {
    console.error("Gemini insights error:", error);
    return {
      hotspots: [],
      trendAnalysis:
        "AI insights are being generated. Please check back shortly.",
      recommendations: [
        "Increase community participation by sharing the platform",
        "Focus on high-severity unresolved issues",
        "Regular follow-ups on in-progress issues",
      ],
      generatedAt: Date.now(),
    };
  }
}

// ==================== AI CHAT ASSISTANT ====================
function getLocalChatFallback(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("report") || lower.includes("issue")) {
    return "You can report a community issue from the Report page by adding a photo or video, selecting the location, and filling the details. I can help you with the next steps if you want.";
  }

  if (lower.includes("verify") || lower.includes("verification")) {
    return "Issues become stronger when more citizens verify them. You can check the dashboard to see which issues are pending, verified, or resolved.";
  }

  if (lower.includes("point") || lower.includes("badge")) {
    return "You earn points by reporting and verifying issues. The more active and helpful you are, the higher your level and badges become.";
  }

  if (lower.includes("hello") || lower.includes("hi")) {
    return "Hi! I can help with reporting issues, checking status, verification, and points. What would you like to do?";
  }

  return "I’m here to help with reporting issues, tracking progress, verification, and CivicPulse points. Please try again in a moment if the AI service is busy.";
}

export async function chatWithAssistant(
  message: string,
  conversationHistory: { role: "user" | "model"; text: string }[]
): Promise<string> {
  try {
    if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
      return getLocalChatFallback(message);
    }

    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const systemContext = `You are CivicBot, a friendly AI assistant for CivicPulse — a community issue reporting platform in India. 
    You help citizens:
    - Report infrastructure issues (potholes, water leakage, streetlights, waste, road damage, drainage)
    - Understand how to track their reported issues
    - Learn about the verification and resolution process
    - Earn points and badges through community participation
    - Understand the impact dashboard
    
    Be concise, friendly, and helpful. Use emojis sparingly. Always encourage civic participation.
    If asked about specific issue status, tell them to use the Dashboard to check real-time status.`;

    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: systemContext }],
        },
        {
          role: "model",
          parts: [
            {
              text: "I understand! I'm CivicBot, ready to help citizens of our community.",
            },
          ],
        },
        ...conversationHistory.map((h) => ({
          role: h.role,
          parts: [{ text: h.text }],
        })),
      ],
    });

    const result = await chat.sendMessage(message);
    return result.response.text();
  } catch (error) {
    console.error("Chat error:", error);
    return getLocalChatFallback(message);
  }
}

// ==================== CATEGORIZE TEXT ====================
export async function categorizeByText(description: string): Promise<Partial<AIAnalysis>> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const prompt = `Categorize this community issue description: "${description}"
    
    Respond ONLY with valid JSON:
    {
      "category": one of ["pothole", "water_leakage", "streetlight", "waste_management", "road_damage", "drainage", "public_property", "other"],
      "severity": 1-5,
      "tags": ["tag1", "tag2"],
      "suggestedDepartment": "department name"
    }`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return {};

    return JSON.parse(jsonMatch[0]);
  } catch {
    return {};
  }
}
