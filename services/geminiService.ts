import { GoogleGenAI, Type } from "@google/genai";
import { Message } from "../types";

// Initialize the API client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = 'gemini-3-flash-preview';

/**
 * Summarizes a list of messages using Gemini.
 */
export const summarizeChat = async (messages: Message[]): Promise<string> => {
  if (messages.length === 0) return "No messages to summarize.";

  const transcript = messages
    .map(m => `${m.senderId === 'me' ? 'Me' : 'Them'}: ${m.text}`)
    .join('\n');

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `You are a helpful assistant for a messaging app called Nexus. 
      Summarize the following chat conversation into a concise paragraph (max 3 sentences), highlighting key points and decisions.
      
      Transcript:
      ${transcript}`,
    });

    return response.text || "Could not generate summary.";
  } catch (error) {
    console.error("Gemini Summarize Error:", error);
    return "Unable to summarize at this time.";
  }
};

/**
 * Analyzes a message to see if it contains an action item (date/time/location/recurrence).
 */
export const detectActionItem = async (text: string): Promise<{ isAction: boolean; title?: string; dateTime?: string; recurrence?: string; location?: string }> => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Analyze the following message for action items. Look for intent to perform a task or attend an event.
      Extract the Date/Time, Recurrence (e.g., 'every week'), and Location if present.
      
      Examples:
      - "Meeting at Starbucks tomorrow at 9am" -> isAction: true, title: "Meeting", dateTime: "Tomorrow 9am", location: "Starbucks"
      - "Gym every Monday morning" -> isAction: true, title: "Gym", dateTime: "Monday morning", recurrence: "Weekly"
      
      Message: "${text}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isAction: { type: Type.BOOLEAN, description: "True if the message contains a scheduled task or reminder." },
            title: { type: Type.STRING, description: "A short title for the action item." },
            dateTime: { type: Type.STRING, description: "The extracted date/time string." },
            recurrence: { type: Type.STRING, description: "Any recurrence pattern (e.g. 'Daily', 'Weekly')." },
            location: { type: Type.STRING, description: "Physical location or link." }
          },
          required: ["isAction"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    return { isAction: false };
  } catch (error) {
    console.error("Gemini Action Detection Error:", error);
    return { isAction: false };
  }
};