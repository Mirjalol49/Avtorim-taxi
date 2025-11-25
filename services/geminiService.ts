import { GoogleGenAI } from "@google/genai";
import { Transaction, Driver } from "../types";

// Note: In a real production app, API keys should be handled via backend proxies.
// For this frontend-only demo, we assume process.env.API_KEY is available.
const apiKey = process.env.API_KEY || ''; 

const ai = new GoogleGenAI({ apiKey });

export const generateFleetInsights = async (
  drivers: Driver[], 
  transactions: Transaction[]
): Promise<string> => {
  if (!apiKey) {
    return "API Key is missing. Please provide a valid Google Gemini API Key to receive AI insights.";
  }

  const driverSummary = drivers.map(d => `${d.name} (${d.status})`).join(', ');
  
  const totalIncome = transactions
    .filter(t => t.type === 'INCOME')
    .reduce((sum, t) => sum + t.amount, 0);
    
  const totalExpense = transactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + t.amount, 0);

  const prompt = `
    You are a fleet manager assistant for a taxi company.
    Here is the current status:
    Drivers: ${driverSummary}
    Total Income Today: $${totalIncome}
    Total Expenses Today: $${totalExpense}
    Transaction Count: ${transactions.length}

    Please provide a brief, professional 3-bullet point analysis of the fleet's performance and 1 actionable recommendation to improve profitability.
    Keep it concise and business-oriented.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "No insights available.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Unable to generate insights at this time. Please try again later.";
  }
};