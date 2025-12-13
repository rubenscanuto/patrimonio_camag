import { GoogleGenerativeAI } from "@google/generative-ai";
import { AIProvider } from "../types";

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIServiceConfig {
  provider: AIProvider;
  apiKey: string;
  modelName: string;
}

async function callOpenAI(apiKey: string, modelName: string, messages: AIMessage[]): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: modelName,
      messages: messages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : msg.role === 'system' ? 'system' : 'user',
        content: msg.content
      })),
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API Error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

async function callAnthropic(apiKey: string, modelName: string, messages: AIMessage[]): Promise<string> {
  const systemMessage = messages.find(m => m.role === 'system');
  const userMessages = messages.filter(m => m.role !== 'system');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: modelName,
      max_tokens: 4096,
      system: systemMessage?.content,
      messages: userMessages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      }))
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API Error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.content[0]?.text || '';
}

async function callGemini(apiKey: string, modelName: string, messages: AIMessage[]): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  const systemInstructions = messages.filter(m => m.role === 'system').map(m => m.content).join('\n\n');
  const conversationHistory = messages.filter(m => m.role !== 'system');

  const prompt = conversationHistory.map(m => {
    if (m.role === 'user') return `User: ${m.content}`;
    if (m.role === 'assistant') return `Assistant: ${m.content}`;
    return m.content;
  }).join('\n\n');

  const fullPrompt = systemInstructions
    ? `${systemInstructions}\n\n${prompt}`
    : prompt;

  const result = await model.generateContent(fullPrompt);
  const response = result.response;
  return response.text();
}

export async function callAI(config: AIServiceConfig, messages: AIMessage[]): Promise<string> {
  try {
    switch (config.provider) {
      case 'OpenAI':
        return await callOpenAI(config.apiKey, config.modelName, messages);

      case 'Anthropic':
        return await callAnthropic(config.apiKey, config.modelName, messages);

      case 'Google Gemini':
      default:
        return await callGemini(config.apiKey, config.modelName, messages);
    }
  } catch (error) {
    console.error(`AI Service Error (${config.provider}):`, error);
    throw error;
  }
}

export async function generateText(config: AIServiceConfig, prompt: string, systemPrompt?: string): Promise<string> {
  const messages: AIMessage[] = [];

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }

  messages.push({ role: 'user', content: prompt });

  return await callAI(config, messages);
}
