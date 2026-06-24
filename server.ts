import express from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini API
const geminiApiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (geminiApiKey) {
  ai = new GoogleGenAI({ apiKey: geminiApiKey });
} else {
  console.warn('Warning: GEMINI_API_KEY is not defined in environment variables.');
}

// Helper to secure Gemini client
function getAIClient(): GoogleGenAI {
  if (!ai) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY is missing. Please configure it in the Secrets panel.');
    }
    ai = new GoogleGenAI({ apiKey: key });
  }
  return ai;
}

// Google Calendar Proxy Endpoint
app.get('/api/calendar/events', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Missing Authorization header' });
    }
    const { timeMin, timeMax } = req.query;
    if (!timeMin || !timeMax) {
      return res.status(400).json({ error: 'Missing timeMin or timeMax query parameters' });
    }

    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin as string)}&timeMax=${encodeURIComponent(timeMax as string)}&singleEvents=true&orderBy=startTime`;
    
    const response = await fetch(url, {
      headers: {
        Authorization: authHeader,
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: 'Google Calendar API error', details: errText });
    }

    const data = await response.json();
    const events = (data.items || []).map((item: any) => ({
      id: item.id,
      title: item.summary || 'Busy Slot',
      start: item.start?.dateTime || item.start?.date,
      end: item.end?.dateTime || item.end?.date,
    }));

    res.json({ events });
  } catch (error: any) {
    console.error('Calendar API proxy error:', error);
    res.status(500).json({ error: error.message });
  }
});

// AI Priority Plan generator
app.post('/api/gemini/plan', async (req, res) => {
  try {
    const { tasks, calendarEvents, currentLocalTime } = req.body;
    const client = getAIClient();

    const prompt = `
You are the brain of "Last-Minute Life Saver", a proactive, high-efficiency task schedule generator.
Given a list of tasks, current calendar events (which act as hard blocks), and the current local time, you must produce a realistic chronological schedule for today, detect conflicts/overload, calculate risk, and identify the single absolute best next action.

CONTEXT:
Current local time: ${currentLocalTime}
Calendar events (hard blocks): ${JSON.stringify(calendarEvents)}
User tasks: ${JSON.stringify(tasks)}

PLANNING RULES:
1. Do not schedule tasks during calendar events. Treat calendar event time slots as occupied (hard blocks).
2. Schedule remaining tasks in today's available free slots starting from the current local time.
3. Suggest realistic time blocks for each task based on its estimated effort.
4. If multiple tasks can fit, schedule them according to urgency (earliest deadline first) and importance (High first).
5. Ensure a realistic work pace. Do not schedule tasks back-to-back without breaks if the schedule exceeds 4 hours. You can insert "break" types if helpful.
6. Calculate an overall workload risk score from 0 to 100 based on:
   - Total effort requested vs available hours today before deadlines.
   - Any tasks that cannot fit before their deadlines (this drives risk score very high, e.g., >80%).
7. If total workload exceeds available hours, return a clear "warning" message warning the user.
8. Select the single absolute #1 "nextBestAction" task (must be one of the tasks with status 'Pending' or 'In Progress'). Provide a quick instruction ("action") and "explanation" why it is the top priority right now.

Response MUST be a valid JSON object matching this schema exactly (do not wrap in markdown quotes or code blocks unless requested, just return the JSON):
{
  "riskScore": number, // 0 to 100
  "warning": "string or null", // descriptive warning if overloaded, else null
  "nextBestAction": {
    "taskId": "string",
    "title": "string",
    "action": "string",
    "explanation": "string"
  } or null,
  "schedule": [
    {
      "id": "string", // unique or relatedId
      "title": "string",
      "start": "HH:mm", // e.g. "14:30"
      "end": "HH:mm", // e.g. "15:30"
      "type": "task" | "event" | "break",
      "relatedId": "string" // taskId if type is task, eventId if type is event, or empty
    }
  ]
}

Ensure all hours in start/end are 24h format (HH:mm) like "09:00", "13:45", "18:00".
If there are no tasks, return an empty schedule and null nextBestAction.
`;

    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error('Empty response from Gemini');
    }

    const plan = JSON.parse(text);
    res.json(plan);
  } catch (error: any) {
    console.error('Gemini plan error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Standout Feature: "I am overloaded" emergency replan
app.post('/api/gemini/replan', async (req, res) => {
  try {
    const { tasks, calendarEvents, currentLocalTime } = req.body;
    const client = getAIClient();

    const prompt = `
The user is completely OVERLOADED and stressed. They clicked the "I AM OVERLOADED" panic button.
You must perform an emergency triaging operation. 

CONTEXT:
Current local time: ${currentLocalTime}
Calendar events (hard blocks): ${JSON.stringify(calendarEvents)}
User tasks: ${JSON.stringify(tasks)}

TRIAGING RULES:
1. Identify which tasks are absolutely critical to finish TODAY (due soon, High Importance).
2. Proactively identify tasks that CAN be postponed to tomorrow or later. These tasks are typically Lower Importance, have later deadlines, or simply do not fit today.
3. Generate a revised, realistic, and spacious schedule for today focusing ONLY on the survivable subset of tasks.
4. Calculate a post-triage risk score (which should be lower than original risk since we successfully postponed non-essential items).
5. Provide a strong, supportive, comforting, yet highly practical "advice" message (e.g. "Take a deep breath. We've pushed the low-priority tasks to tomorrow, freeing up 3 hours. Focus purely on these 2 critical milestones today.").

Response MUST be a valid JSON object matching this schema exactly:
{
  "advice": "string",
  "riskScore": number, // post-triage risk score
  "postponedTasks": [
    {
      "taskId": "string",
      "title": "string",
      "reason": "string" // e.g., "Postponed because deadline is in 3 days and today is packed"
    }
  ],
  "schedule": [
    {
      "id": "string",
      "title": "string",
      "start": "HH:mm",
      "end": "HH:mm",
      "type": "task" | "event" | "break",
      "relatedId": "string"
    }
  ]
}

Ensure all hours in start/end are 24h format (HH:mm). Return JSON only.
`;

    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error('Empty response from Gemini');
    }

    const replan = JSON.parse(text);
    res.json(replan);
  } catch (error: any) {
    console.error('Gemini replan error:', error);
    res.status(500).json({ error: error.message });
  }
});

// AI Productivity Coach Daily Briefing generator
app.post('/api/gemini/coach', async (req, res) => {
  try {
    const { tasks, calendarEvents, currentLocalTime } = req.body;
    const client = getAIClient();

    const prompt = `
You are the "AI Productivity Coach", an expert, hyper-proactive coach who helps stressed users manage their time, avoid clashes, and execute under pressure.
Given a list of the user's tasks, current calendar events, and current local time, you must perform a swift analysis.

CONTEXT:
Current local time: ${currentLocalTime}
Calendar events: ${JSON.stringify(calendarEvents)}
User tasks: ${JSON.stringify(tasks)}

TASKS TO PERFORM:
1. Analyze all tasks. Identify the SINGLE most important/urgent task that MUST be done first today. Explain why.
2. Formulate exactly 3 progressive next actionable steps (e.g., "1. Clear distractions and review draft (30m)", "2. Execute coding (60m)").
3. Identify and warn about any deadlines that are severely at risk (due very soon, or effort exceeds remaining time).
4. Provide a premium, encouraging, yet urgent coaching message (maximum 3 sentences) to ignite their productivity.

Response MUST be a valid JSON object matching this schema exactly (do NOT wrap in markdown or markdown quotes, just return raw JSON):
{
  "mostImportantTask": {
    "taskId": "string",
    "title": "string",
    "explanation": "string"
  } | null,
  "nextThreeActions": [
    {
      "title": "string",
      "description": "string"
    }
  ],
  "riskyDeadlines": [
    {
      "taskId": "string",
      "title": "string",
      "warning": "string"
    }
  ],
  "coachingMessage": "string"
}

Ensure the response is extremely clean JSON. If there are no tasks, return null fields.
`;

    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error('Empty response from Gemini');
    }

    const briefing = JSON.parse(text);
    res.json(briefing);
  } catch (error: any) {
    console.error('Gemini coach briefing error:', error);
    res.status(500).json({ error: error.message });
  }
});

// AI Task Decomposition Endpoint
app.post('/api/gemini/decompose-task', async (req, res) => {
  try {
    const { task } = req.body;
    const client = getAIClient();

    const prompt = `
You are the AI Chief of Staff. Break down the following major user task into exactly 3 to 5 highly actionable, atomic micro-subtasks.
Each subtask should represent a concrete, bite-sized step that can be completed in a single setting.

TASK DETAILS:
Title: ${task.title}
Importance: ${task.importance}
Estimated Total Effort: ${task.effort} minutes
Deadline: ${task.deadline}

Response MUST be a valid JSON array matching this schema exactly (do NOT wrap in markdown or markdown quotes, just return raw JSON):
[
  {
    "id": "string (unique random string)",
    "title": "string (clear actionable name)",
    "completed": false,
    "estimatedMinutes": number
  }
]
`;

    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error('Empty response from Gemini');
    }

    const subtasks = JSON.parse(text);
    res.json({ subtasks });
  } catch (error: any) {
    console.error('Gemini task decomposition error:', error);
    res.status(500).json({ error: error.message });
  }
});

// AI Quick Messy Add (Triage Inbox) Endpoint
app.post('/api/gemini/quick-add', async (req, res) => {
  try {
    const { messyText } = req.body;
    const client = getAIClient();

    const prompt = `
You are the "Last-Minute Life Saver" Triage Assistant.
The user is overwhelmed, sick, or busy, and has dumped a messy, unstructured stream of consciousness about tasks they need to do.
Extract all individual tasks mentioned, identify realistic deadlines (relative to today, which is ${new Date().toLocaleDateString()}), estimate the effort required in minutes, and assess high/medium/low importance.

MESSY INPUT:
"${messyText}"

Response MUST be a valid JSON array matching this schema exactly (do NOT wrap in markdown or markdown quotes, just return raw JSON):
[
  {
    "title": "string (action-oriented title)",
    "deadline": "string (ISO Date string or datetime-local compatible, e.g. YYYY-MM-DDThh:mm)",
    "effort": number (estimated minutes, e.g. 30, 45, 60),
    "importance": "High" | "Medium" | "Low",
    "status": "Pending"
  }
]
`;

    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error('Empty response from Gemini');
    }

    const tasks = JSON.parse(text);
    res.json({ tasks });
  } catch (error: any) {
    console.error('Gemini quick add error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Serve frontend assets
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
