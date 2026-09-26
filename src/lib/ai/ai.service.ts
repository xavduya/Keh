/**
 * AI Service stub
 *
 * Abstraction layer for all AI-powered functionality.
 * Client components must NEVER call OpenAI directly.
 * All AI requests should go through server-side API routes which call this service.
 *
 * NOTE: This is a stub. Implement in Phase 6.
 *
 * Conceptual structure:
 *   generateCampaign()       — produces platform-specific captions from business + product + goal
 *   generatePlatformContent()— refines content for a specific platform
 *   explainPerformance()     — converts structured analytics findings into plain language
 *   generateRecommendations()— produces AIRecommendation[] from analytics findings
 */

// Phase 6 implementation will look like:
//
// import OpenAI from "openai";
//
// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
//
// export async function generateCampaign(input: GenerateCampaignInput): Promise<GenerateCampaignOutput> { ... }
// export async function explainPerformance(findings: AnalyticsFindings): Promise<string> { ... }
// export async function generateRecommendations(findings: AnalyticsFindings): Promise<AIRecommendation[]> { ... }

export {}; // Placeholder — remove when implementing
