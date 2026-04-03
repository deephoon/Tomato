// ==========================================
// AI SERVICE — Gemini 1.5 Flash Task Slicing
// ==========================================
import { appState, t } from './state.js';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

/**
 * Slice a large task into 3-4 smaller sub-tasks using Gemini AI.
 * @param {string} taskTitle - The big task description to decompose
 * @returns {Promise<Array<{title: string, focusMinutes: number}>>}
 */
export async function sliceTask(taskTitle) {
  const apiKey = appState.prefs.geminiApiKey;
  if (!apiKey) {
    throw new Error(t('aiKeyNeeded'));
  }

  const prompt = `You are a productivity assistant. Break down this task into 3-4 smaller, actionable sub-tasks that can each be completed in a single 25-minute Pomodoro focus session.

Task: "${taskTitle}"

Return ONLY a JSON array with this exact format:
[
  { "title": "Sub-task name", "focusMinutes": 25 },
  { "title": "Sub-task name", "focusMinutes": 25 }
]

Rules:
- Each sub-task should be specific and actionable
- focusMinutes should be 15-30 range
- Return 3-4 items
- Respond in the same language as the task title`;

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        response_mime_type: 'application/json',
        temperature: 0.7
      }
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `API Error: ${response.status}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('Empty response from Gemini API');
  }

  try {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) throw new Error('Not an array');
    return parsed.map(item => ({
      title: String(item.title || 'Sub-task'),
      focusMinutes: Math.min(60, Math.max(5, parseInt(item.focusMinutes) || 25))
    }));
  } catch (e) {
    throw new Error('Failed to parse AI response as JSON');
  }
}
