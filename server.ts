import express from "express";
import cors from "cors";
import path from "path";
import http from "http";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const Type = {
  STRING: "STRING",
  INTEGER: "INTEGER",
  NUMBER: "NUMBER",
  BOOLEAN: "BOOLEAN",
  ARRAY: "ARRAY",
  OBJECT: "OBJECT"
} as const;

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);

// Lazy-loaded Google GenAI client to prevent startup crashes if GEMINI_API_KEY is missing
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY environment variable is required for this operation.");
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

async function generateWithModelFallback(
  prompt: string,
  systemInstruction: string,
  responseSchema: any,
  modelCandidates: string[] = []
): Promise<{ text: string | null; error?: unknown }> {
  const candidates = modelCandidates.length > 0
    ? modelCandidates
    : [process.env.GEMINI_MODEL || "gemini-2.0-flash", "gemini-3.5-flash"];

  let lastError: unknown;

  for (const model of candidates) {
    try {
      const result = await getAI().models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema,
        },
      });
      return { text: result.text || null };
    } catch (err) {
      lastError = err;
      const message = err instanceof Error ? err.message : String(err);
      const shouldRetry = /429|503|500|overloaded|unavailable|rate limit/i.test(message);
      if (!shouldRetry) {
        throw err;
      }
    }
  }

  return { text: null, error: lastError };
}

// Support JSON and urlencoded request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure CORS
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Define PUBLIC_ROUTES list that bypasses auth token requirements
const PUBLIC_ROUTES = [
  "/health",
  "/api/health",
  "/api/tasks/urgent-tasks",
  "/api/tasks/urgent",
  "/api/safe-slots",
  "/api/analysis/task-impact",
  "/api/analysis/critical-tasks",
  "/api/analysis/risk-score",
  "/api/analysis/situation",
  "/api/analysis/situation/stream",
  "/api/analysis/situation-report",
  "/api/analysis/forecast",
  "/api/evacuation/plan",
  "/api/resources/inventory",
  "/api/resources/depots",
  "/api/resources/allocate",
  "/api/resources/deploy-approve",
  "/api/resources/reset",
  "/api/ai/chat",
  "/api/alerts/generate"
];

// Simple custom authentication middleware
app.use((req, res, next) => {
  const path = req.path;
  
  // Check if route is public
  const isPublic = PUBLIC_ROUTES.some(route => path === route || path.startsWith(route));
  if (isPublic) {
    return next();
  }

  // Basic check for protected API routes
  if (path.startsWith("/api/")) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized access: Token required" });
    }
  }

  next();
});

// ==========================================
// 1. IN-MEMORY STORES & CORE LOGIC
// ==========================================

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

interface Task {
  id: string;
  title: string;
  description: string;
  priority: string;
  duration: number;
  deadline: string;
  category: string;
  completed: boolean;
  created_at: string;
  subtasks: Subtask[];
}

let tasks: Task[] = [
  {
    id: "urgent-sample-1",
    title: "CRITICAL: Fix server memory leak in production",
    description: "Production container is crashing every 2 hours. Inspect heap logs immediately.",
    priority: "panic",
    duration: 45,
    deadline: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
    category: "DevOps",
    completed: false,
    created_at: new Date().toISOString(),
    subtasks: [
      { id: "sub-1", title: "Check container memory graphs", completed: false },
      { id: "sub-2", title: "Deploy node --max-old-space-size patch", completed: false }
    ]
  },
  {
    id: "urgent-sample-2",
    title: "URGENT: Submit draft budget to investors",
    description: "Pitch deck needs the final financial breakdown for Q3 projection.",
    priority: "high",
    duration: 60,
    deadline: new Date(Date.now() + 120 * 60 * 1000).toISOString(),
    category: "Finance",
    completed: false,
    created_at: new Date().toISOString(),
    subtasks: [
      { id: "sub-3", title: "Validate Q2 balance sheets", completed: true },
      { id: "sub-4", title: "Review cost of goods sold (COGS) model", completed: false }
    ]
  }
];

const INITIAL_INVENTORY = [
  { key: "ambulances", name: "Ambulance Units", category: "Medical", unit: "vehicles", total_qty: 55, available_qty: 55, deployed_qty: 0, status: "Optimal", description: "Trauma support and patient transport vehicles." },
  { key: "fire_trucks", name: "Fire Engines", category: "Rescue", unit: "vehicles", total_qty: 46, available_qty: 46, deployed_qty: 0, status: "Optimal", description: "Heavy pumpers and aerial ladders for suppression." },
  { key: "rescue_teams", name: "Heavy Rescue Teams", category: "Rescue", unit: "teams", total_qty: 24, available_qty: 24, deployed_qty: 0, status: "Optimal", description: "Personnel trained in search and debris clearing." },
  { key: "medical_kits", name: "First Aid & Trauma Kits", category: "Medical", unit: "kits", total_qty: 1800, available_qty: 1800, deployed_qty: 0, status: "Optimal", description: "Trauma dressings, splints, and field meds." },
  { key: "water_units", name: "Clean Water Units (100L)", category: "Supplies", unit: "units", total_qty: 1480, available_qty: 1480, deployed_qty: 0, status: "Optimal", description: "Purified water and portable filtration." },
  { key: "food_rations", name: "Emergency Food Pallets", category: "Supplies", unit: "pallets", total_qty: 1150, available_qty: 1150, deployed_qty: 0, status: "Optimal", description: "MREs and shelf-stable nutritional packages." },
  { key: "generators", name: "Mobile Heavy Power Generators", category: "Power", unit: "generators", total_qty: 39, available_qty: 39, deployed_qty: 0, status: "Optimal", description: "Diesel generators for critical medical sites." },
  { key: "helicopters", name: "Air Rescue Helicopters", category: "Air", unit: "helicopters", total_qty: 7, available_qty: 7, deployed_qty: 0, status: "Optimal", description: "Helicopters for medical evac and airlifts." },
  { key: "hazmat_units", name: "Hazardous Materials Teams", category: "Rescue", unit: "teams", total_qty: 15, available_qty: 15, deployed_qty: 0, status: "Optimal", description: "CBRN response specialists." },
  { key: "mobile_shelters", name: "Temporary Housing Kits", category: "Supplies", unit: "kits", total_qty: 850, available_qty: 850, deployed_qty: 0, status: "Optimal", description: "Weatherproof structures with solar blankets." }
];

const INITIAL_DEPOTS = [
  { id: "depot-1", name: "Central Logistics Hub (SF Center)", lat: 37.7749, lng: -122.4194, resources: { ambulances: 15, fire_trucks: 8, rescue_teams: 6, medical_kits: 500, water_units: 400, food_rations: 300, generators: 10, helicopters: 3, hazmat_units: 4, mobile_shelters: 250 } },
  { id: "depot-2", name: "North Bay Response Depot (San Rafael)", lat: 38.0560, lng: -122.5310, resources: { ambulances: 8, fire_trucks: 12, rescue_teams: 4, medical_kits: 200, water_units: 250, food_rations: 150, generators: 5, helicopters: 1, hazmat_units: 2, mobile_shelters: 120 } },
  { id: "depot-3", name: "East Bay Emergency Supply (Oakland)", lat: 37.8044, lng: -122.2711, resources: { ambulances: 12, fire_trucks: 10, rescue_teams: 5, medical_kits: 350, water_units: 300, food_rations: 250, generators: 8, helicopters: 2, hazmat_units: 3, mobile_shelters: 180 } },
  { id: "depot-4", name: "South Bay Tactical Depot (San Jose)", lat: 37.3382, lng: -121.8863, resources: { ambulances: 14, fire_trucks: 11, rescue_teams: 6, medical_kits: 400, water_units: 350, food_rations: 300, generators: 12, helicopters: 0, hazmat_units: 5, mobile_shelters: 220 } },
  { id: "depot-5", name: "West Peninsula Operations (San Mateo)", lat: 37.5630, lng: -122.3255, resources: { ambulances: 6, fire_trucks: 5, rescue_teams: 3, medical_kits: 150, water_units: 180, food_rations: 100, generators: 4, helicopters: 1, hazmat_units: 1, mobile_shelters: 80 } }
];

let inventory = JSON.parse(JSON.stringify(INITIAL_INVENTORY));
let depots = JSON.parse(JSON.stringify(INITIAL_DEPOTS));

const riskScoreCache: Record<string, any> = {};

// ==========================================
// 2. ENDPOINTS DEFINITIONS
// ==========================================

// Health checks
app.get(["/health", "/api/health"], (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// GET tasks list
app.get(["/api/tasks", "/api/tasks/urgent-tasks", "/api/tasks/urgent"], (req, res) => {
  const completed = req.query.completed === "true" ? true : req.query.completed === "false" ? false : null;
  let filtered = tasks;
  if (completed !== null) {
    filtered = tasks.filter(t => t.completed === completed);
  }
  res.json(filtered);
});

// GET task details
app.get("/api/tasks/:id", (req, res) => {
  const task = tasks.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  res.json(task);
});

// POST task creation
app.post("/api/tasks", (req, res) => {
  const newTask: Task = {
    id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    title: req.body.title || "Untitled Task",
    description: req.body.description || "",
    priority: req.body.priority || "moderate",
    duration: Number(req.body.duration || 30),
    deadline: req.body.deadline || new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    category: req.body.category || "General",
    completed: false,
    created_at: new Date().toISOString(),
    subtasks: req.body.subtasks || []
  };
  tasks.push(newTask);
  res.status(201).json(newTask);
});

// PUT task update
app.put("/api/tasks/:id", (req, res) => {
  const index = tasks.findIndex(t => t.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Task not found" });
  tasks[index] = {
    ...tasks[index],
    ...req.body
  };
  res.json(tasks[index]);
});

// DELETE task
app.delete("/api/tasks/:id", (req, res) => {
  const index = tasks.findIndex(t => t.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Task not found" });
  tasks.splice(index, 1);
  res.status(204).send();
});

// POST subtask
app.post("/api/tasks/:id/subtasks", (req, res) => {
  const task = tasks.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  const newSub = {
    id: `sub-${Date.now()}`,
    title: req.body.title || req.query.title || "New Subtask",
    completed: false
  };
  task.subtasks.push(newSub);
  res.status(201).json(newSub);
});

// POST AI subtasks breakdown
app.post("/api/tasks/ai-breakdown", async (req, res) => {
  const { task_id, step_count = 3 } = req.body;
  const task = tasks.find(t => t.id === task_id);
  if (!task) return res.status(404).json({ error: "Task not found" });

  let steps: string[] = [];
  if (process.env.GEMINI_API_KEY) {
    try {
      const response = await getAI().models.generateContent({
        model: "gemini-2.5-flash",
        contents: `You are an expert Productivity Coach helping a user who is procrastinating and feeling overwhelmed.
Break down the following task into exactly ${step_count} progressive, ultra-actionable, low-barrier micro-steps.
Each step must take 15 minutes or less, designed to break panic/freeze state and build momentum.

TASK TITLE: ${task.title}
TASK DESCRIPTION: ${task.description || 'None provided'}

Provide only a JSON list of strings representing the micro-steps. No extra text or markdown formatting outside of JSON.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "List of ultra-actionable 15-minute steps to conquer procrastination"
          }
        }
      });
      if (response.text) {
        steps = JSON.parse(response.text.trim());
      }
    } catch (err) {
      console.error("Gemini breakdown error:", err);
    }
  }

  if (!steps || steps.length === 0) {
    steps = [
      `Identify the immediate 5-minute starting action for: ${task.title}`,
      `Draft initial outline or template focusing only on the primary criteria`,
      `Eliminate noise & distractions, then execute a 15-minute focused sprint to complete drafting`
    ].slice(0, step_count);
  }

  steps.forEach((step, idx) => {
    task.subtasks.push({
      id: `sub-ai-${Date.now()}-${idx}`,
      title: step,
      completed: false
    });
  });

  res.json(task);
});

// POST Safe Slots Calculation
app.post("/api/safe-slots", (req, res) => {
  const { deadline, duration } = req.body;
  if (!deadline) return res.status(400).json({ error: "deadline is required" });
  
  const deadlineDate = new Date(deadline);
  const now = new Date();
  const diffMs = deadlineDate.getTime() - now.getTime();
  const hoursRemaining = Math.max(0, diffMs / (1000 * 60 * 60));
  
  const durationHours = (duration || 30) / 60;
  const safetyRatio = hoursRemaining > 0 ? durationHours / hoursRemaining : 1.0;
  let safetyScore = Math.max(0, Math.min(100, Math.round((1 - safetyRatio) * 100)));
  if (hoursRemaining <= 0) safetyScore = 0;

  const slots = [];
  const baseTime = now.getTime();
  const slotInterval = Math.max(30 * 60 * 1000, diffMs / 4);

  for (let i = 1; i <= 3; i++) {
    const slotStart = new Date(baseTime + i * slotInterval);
    const slotEnd = new Date(slotStart.getTime() + (duration || 30) * 60 * 1000);
    
    if (slotEnd.getTime() < deadlineDate.getTime()) {
      slots.push({
        id: `slot-${i}`,
        start: slotStart.toISOString(),
        end: slotEnd.toISOString(),
        quality: i === 1 ? "Peak Focus" : i === 2 ? "High Alert" : "Steady Flow",
        confidence: Math.round(safetyScore * (1 - (i - 1) * 0.15)),
        status: "available"
      });
    }
  }

  res.json({
    hours_remaining: hoursRemaining,
    safety_score: safetyScore,
    slots: slots.length > 0 ? slots : [
      {
        id: "panic-slot",
        start: new Date(baseTime + 5 * 60 * 1000).toISOString(),
        end: new Date(baseTime + (5 + (duration || 30)) * 60 * 1000).toISOString(),
        quality: "CRITICAL PANIC MODE",
        confidence: 10,
        status: "critical"
      }
    ]
  });
});

// POST Task Impact Analysis
app.post("/api/analysis/task-impact", (req, res) => {
  const { title, deadline, estimated_duration_hours = 1 } = req.body;
  const deadlineDate = new Date(deadline);
  const now = new Date();
  const diffMs = deadlineDate.getTime() - now.getTime();
  const hoursRemaining = Math.max(0, diffMs / (1000 * 60 * 60));
  
  const urgencyScore = Math.min(100, Math.round(Math.max(0, (estimated_duration_hours / (hoursRemaining || 1)) * 100)));
  
  const zones = [
    {
      name: "Safe/Green Zone",
      duration_hours: Math.max(0, hoursRemaining * 0.5),
      percentage: 50,
      description: "Ample buffer window. Best time to complete initial sketches without pressure.",
      color: "green"
    },
    {
      name: "Caution/Orange Zone",
      duration_hours: Math.max(0, hoursRemaining * 0.3),
      percentage: 30,
      description: "Cognitive pressure rises. Limit secondary browser tabs and multitasking.",
      color: "orange"
    },
    {
      name: "Panic/Red Zone",
      duration_hours: Math.max(0, hoursRemaining * 0.2),
      percentage: 20,
      description: "Active fight-or-flight triggered. High chance of freeze response. Focus strictly on simple micro-steps.",
      color: "red"
    }
  ];

  res.json({
    title,
    deadline,
    hours_remaining: hoursRemaining,
    urgency_score: urgencyScore,
    zones,
    recommendations: [
      "Avoid multitasking and close non-essential communication tools.",
      "Activate Pomodoro timers (45m/15m) to maintain steady cognitive output.",
      "Log your progress continuously to trigger helpful dopamine releases."
    ]
  });
});

// POST Critical Tasks Analysis
app.post("/api/analysis/critical-tasks", (req, res) => {
  const { tasks = [] } = req.body;
  
  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;

  const analyzedTasks = tasks.map((t: any) => {
    const deadlineDate = new Date(t.deadline);
    const now = new Date();
    const diffMs = deadlineDate.getTime() - now.getTime();
    const hoursLeft = Math.max(0, diffMs / (1000 * 60 * 60));
    
    let riskLevel = "low";
    let colorCode = "#10B981";
    let suggestedAction = "Maintain standard tracking.";

    if (hoursLeft < 2) {
      riskLevel = "critical";
      colorCode = "#EF4444";
      criticalCount++;
      suggestedAction = "Activate PANIC MODE. Break down into 10-minute micro-steps.";
    } else if (hoursLeft < 12) {
      riskLevel = "high";
      colorCode = "#F59E0B";
      highCount++;
      suggestedAction = "Close Slack/Discord. Focus strictly on completing current subtasks.";
    } else if (hoursLeft < 24) {
      riskLevel = "medium";
      colorCode = "#3B82F6";
      mediumCount++;
      suggestedAction = "Prepare final draft. Schedule review session.";
    } else {
      lowCount++;
    }

    return {
      id: t.id,
      title: t.title,
      priority: t.priority,
      hours_left: hoursLeft,
      risk_level: riskLevel,
      suggested_action: suggestedAction,
      color_code: colorCode
    };
  });

  res.json({
    critical_count: criticalCount,
    high_count: highCount,
    medium_count: mediumCount,
    low_count: lowCount,
    analyzed_tasks: analyzedTasks,
    overall_recommendations: [
      "Consolidate urgent deliverables into a single morning focus slot.",
      "Delegate or defer non-essential low-risk items beyond the 24-hour window."
    ]
  });
});

// GET Risk Score
app.get("/api/analysis/risk-score/:disasterId", (req, res) => {
  const disasterId = req.params.disasterId;
  if (riskScoreCache[disasterId]) {
    return res.json(riskScoreCache[disasterId]);
  }

  let seedVal = 0;
  for (let i = 0; i < disasterId.length; i++) {
    seedVal += disasterId.charCodeAt(i);
  }

  const magnitude = 4.5 + (seedVal % 50) / 10.0;
  const affected = 5000 + (seedVal * 123) % 950000;
  const totalCrit = 10 + (seedVal % 40);
  const damagedCrit = (seedVal * 7) % (totalCrit + 1);

  const magnitudeScore = (magnitude / 10.0) * 25.0;
  const populationScore = Math.min(35.0, (Math.log10(Math.max(1, affected)) / 6.0) * 35.0);
  const infrastructureScore = totalCrit > 0 ? (damagedCrit / totalCrit) * 25.0 : 0;
  const depthTypeScore = seedVal % 2 === 0 ? 14.0 : 12.5;

  const totalScore = Math.max(0, Math.min(100, Math.round((magnitudeScore + populationScore + infrastructureScore + depthTypeScore) * 100) / 100));

  let severityLabel = "Low";
  let recommendedResponseLevel = 1;

  if (totalScore <= 25.0) {
    severityLabel = "Low";
    recommendedResponseLevel = 1;
  } else if (totalScore <= 50.0) {
    severityLabel = "Moderate";
    recommendedResponseLevel = 2;
  } else if (totalScore <= 75.0) {
    severityLabel = "High";
    recommendedResponseLevel = 3;
  } else if (totalScore <= 90.0) {
    severityLabel = "Critical";
    recommendedResponseLevel = 4;
  } else {
    severityLabel = "Catastrophic";
    recommendedResponseLevel = 5;
  }

  const responseData = {
    disaster_id: disasterId,
    total_score: totalScore,
    breakdown: {
      magnitude_score: Math.round(magnitudeScore * 100) / 100,
      population_score: Math.round(populationScore * 100) / 100,
      infrastructure_score: Math.round(infrastructureScore * 100) / 100,
      depth_type_score: Math.round(depthTypeScore * 100) / 100
    },
    severity_label: severityLabel,
    recommended_response_level: recommendedResponseLevel
  };

  riskScoreCache[disasterId] = responseData;
  res.json(responseData);
});

// POST Risk Score
app.post("/api/analysis/risk-score", (req, res) => {
  const payload = req.body;
  const disaster_event = payload.disaster_event || {};
  const population_impact = payload.population_impact || {};
  const infrastructure_analysis = payload.infrastructure_analysis || {};

  const magnitude = Number(disaster_event.magnitude || 0.0);
  const affected = Number(population_impact.total_affected || 0);
  const totalCrit = Number(infrastructure_analysis.total_critical || 0);
  const damagedCrit = Number(infrastructure_analysis.damaged_critical || 0);
  const depth_km = disaster_event.depth_km;

  const magnitudeScore = (Math.max(0.0, Math.min(10.0, magnitude)) / 10.0) * 25.0;
  const populationScore = Math.min(35.0, (Math.log10(Math.max(1, affected)) / 6.0) * 35.0);
  const infrastructureScore = totalCrit > 0 ? (Math.max(0, Math.min(totalCrit, damagedCrit)) / totalCrit) * 25.0 : 0;
  
  let depthTypeScore = 8.0;
  const dType = String(disaster_event.type || 'earthquake').toLowerCase();
  if (dType.includes("earthquake")) {
    const depthVal = depth_km !== null ? Math.max(0.0, Number(depth_km)) : 15.0;
    depthTypeScore = (1.0 - Math.max(0.0, Math.min(1.0, depthVal / 150.0))) * 15.0;
  } else if (dType.includes("hurricane") || dType.includes("typhoon")) {
    depthTypeScore = 13.5;
  } else if (dType.includes("flood")) {
    depthTypeScore = 11.0;
  } else if (dType.includes("wildfire")) {
    depthTypeScore = 12.5;
  } else if (dType.includes("tsunami")) {
    depthTypeScore = 14.0;
  }

  const totalScore = Math.max(0, Math.min(100, Math.round((magnitudeScore + populationScore + infrastructureScore + depthTypeScore) * 100) / 100));

  let severityLabel = "Low";
  let recommendedResponseLevel = 1;

  if (totalScore <= 25.0) {
    severityLabel = "Low";
    recommendedResponseLevel = 1;
  } else if (totalScore <= 50.0) {
    severityLabel = "Moderate";
    recommendedResponseLevel = 2;
  } else if (totalScore <= 75.0) {
    severityLabel = "High";
    recommendedResponseLevel = 3;
  } else if (totalScore <= 90.0) {
    severityLabel = "Critical";
    recommendedResponseLevel = 4;
  } else {
    severityLabel = "Catastrophic";
    recommendedResponseLevel = 5;
  }

  const disaster_id = disaster_event.id || `disaster-${Date.now()}`;
  const responseData = {
    disaster_id,
    total_score: totalScore,
    breakdown: {
      magnitude_score: Math.round(magnitudeScore * 100) / 100,
      population_score: Math.round(populationScore * 100) / 100,
      infrastructure_score: Math.round(infrastructureScore * 100) / 100,
      depth_type_score: Math.round(depthTypeScore * 100) / 100
    },
    severity_label: severityLabel,
    recommended_response_level: recommendedResponseLevel
  };

  riskScoreCache[disaster_id] = responseData;
  res.json(responseData);
});

// Helper for situation analysis simulation
function generateFallbackAnalysis(d: any) {
  const d_type = (d.disaster_type || 'disaster').toLowerCase();
  const title = d.disaster_title || 'Unknown Event';
  const risk = d.risk_score || 50.0;
  const pop = d.affected_population || 0;
  const damaged = d.damaged_critical_facilities || 0;
  const total_crit = d.total_critical_facilities || 0;

  const severity = risk <= 40 ? "Moderate" : risk <= 75 ? "High" : "Critical";

  const summary = `DIEP-AI Sandbox Analysis: A ${severity} severity posture is declared for '${title}' (Type: ${d_type}). With ${pop.toLocaleString()} citizens within the impacted zone and ${damaged}/${total_crit} critical services offline, immediate tactical emergency response and resource reinforcement are required.`;

  const threats = [
    {
      threat: `Secondary impacts from ${d_type} (utility grids offline, structural destabilization)`,
      severity: severity === "Critical" ? "Critical" : "High",
      impact_area: "Main Grid Infrastructure and Transport Corridors"
    },
    {
      threat: "Disruption to local medical and survival supply chains",
      severity: severity !== "Moderate" ? "High" : "Moderate",
      impact_area: "Emergency Medical Services"
    }
  ];

  const actions = [
    {
      action: "Establish joint unified command post and deploy communication beacons.",
      responsible_party: "Emergency Management Agency",
      time_criticality: "Within 30 minutes"
    },
    {
      action: "Route emergency medical support and search and rescue (SAR) teams to peak damage zones.",
      responsible_party: "Civil Defense Units",
      time_criticality: "Within 1 hour"
    }
  ];

  const gaps = [
    {
      resource: "Emergency Power Generators",
      needed: severity === "Critical" ? 15 : 5,
      available: severity === "Critical" ? 2 : 1,
      gap: severity === "Critical" ? 13 : 4,
      mitigation_plan: "Re-route mobile trailer generators from unaffected northern depots."
    },
    {
      resource: "Rescue & Heavy Extraction Teams",
      needed: severity === "Critical" ? 8 : 3,
      available: severity === "Critical" ? 3 : 1,
      gap: severity === "Critical" ? 5 : 2,
      mitigation_plan: "Request mutual aid from nearby regional municipal units."
    }
  ];

  return {
    executive_summary: summary,
    immediate_threats: threats,
    priority_actions: actions,
    resource_gaps: gaps,
    estimated_response_window: "First golden 4 hours for active life-saving search operations.",
    confidence_level: process.env.GEMINI_API_KEY ? "High" : "Low (Sandbox)",
    confidence_explanation: process.env.GEMINI_API_KEY ? "Operating with live Generative AI connections." : "Operating in local backup or sandbox mode without live Generative AI connections.",
    updated_at: new Date().toISOString()
  };
}

// POST Situation Analysis
app.post("/api/analysis/situation", async (req, res) => {
  const payload = req.body;
  const fallback = generateFallbackAnalysis(payload);

  if (process.env.GEMINI_API_KEY) {
    try {
      const prompt = `
Disaster Event Analysis request for DIEP-AI:

DISASTER TITLE: ${payload.disaster_title || 'Unknown Event'}
DISASTER TYPE: ${payload.disaster_type || 'Unknown'}
MAGNITUDE / SCALE: ${payload.magnitude || 0.0}
AFFECTED POPULATION: ${payload.affected_population || 0}
CRITICAL INFRASTRUCTURE: ${payload.damaged_critical_facilities || 0} damaged / ${payload.total_critical_facilities || 0} total
COMPOSITE RISK SCORE: ${payload.risk_score || 0.0} out of 100

Please conduct a rigorous, safety-focused situation analysis. Provide immediate threats, chronologically ordered priority actions, resource shortfalls with mitigation alternatives, the response window, and your reasoning-based confidence rating.`;

      const result = await getAI().models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are DIEP-AI, a highly precise, hyper-analytical virtual emergency command center intelligence specialist. Your core mandate is to analyze structured disaster information, population impacts, damaged infrastructure, risk matrices, and logistics resources, then convert them into actionable, safety-first emergency intelligence. You never speculate, exaggerate, or invent facts outside the physical plausibility of the disaster context. You prioritize human safety above all else. Your output must strictly conform to the expected JSON schema. Never include any markdown framing or extra text outside of the JSON object.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              executive_summary: { type: Type.STRING },
              immediate_threats: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    threat: { type: Type.STRING },
                    severity: { type: Type.STRING },
                    impact_area: { type: Type.STRING }
                  },
                  required: ["threat", "severity", "impact_area"]
                }
              },
              priority_actions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    action: { type: Type.STRING },
                    responsible_party: { type: Type.STRING },
                    time_criticality: { type: Type.STRING }
                  },
                  required: ["action", "responsible_party", "time_criticality"]
                }
              },
              resource_gaps: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    resource: { type: Type.STRING },
                    needed: { type: Type.INTEGER },
                    available: { type: Type.INTEGER },
                    gap: { type: Type.INTEGER },
                    mitigation_plan: { type: Type.STRING }
                  },
                  required: ["resource", "needed", "available", "gap", "mitigation_plan"]
                }
              },
              estimated_response_window: { type: Type.STRING },
              confidence_level: { type: Type.STRING },
              confidence_explanation: { type: Type.STRING }
            },
            required: [
              "executive_summary",
              "immediate_threats",
              "priority_actions",
              "resource_gaps",
              "estimated_response_window",
              "confidence_level",
              "confidence_explanation"
            ]
          }
        }
      });

      if (result.text) {
        return res.json(JSON.parse(result.text.trim()));
      }
    } catch (err) {
      console.error("Gemini situation analysis error:", err);
    }
  }

  res.json(fallback);
});

// POST Situation Analysis stream
app.post("/api/analysis/situation/stream", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const payload = req.body;
  const fallback = generateFallbackAnalysis(payload);

  if (process.env.GEMINI_API_KEY) {
    try {
      const prompt = `
Disaster Event Analysis request for DIEP-AI:

DISASTER TITLE: ${payload.disaster_title || 'Unknown Event'}
DISASTER TYPE: ${payload.disaster_type || 'Unknown'}
MAGNITUDE / SCALE: ${payload.magnitude || 0.0}
AFFECTED POPULATION: ${payload.affected_population || 0}
CRITICAL INFRASTRUCTURE: ${payload.damaged_critical_facilities || 0} damaged / ${payload.total_critical_facilities || 0} total
COMPOSITE RISK SCORE: ${payload.risk_score || 0.0} out of 100

Please conduct a rigorous, safety-focused situation analysis. Provide immediate threats, chronologically ordered priority actions, resource shortfalls with mitigation alternatives, the response window, and your reasoning-based confidence rating.`;

      const responseStream = await getAI().models.generateContentStream({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are DIEP-AI, a highly precise, hyper-analytical virtual emergency command center intelligence specialist. Your core mandate is to analyze structured disaster information, population impacts, damaged infrastructure, risk matrices, and logistics resources, then convert them into actionable, safety-first emergency intelligence. You never speculate, exaggerate, or invent facts outside the physical plausibility of the disaster context. You prioritize human safety above all else. Your output must strictly conform to the expected JSON schema. Never include any markdown framing or extra text outside of the JSON object.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              executive_summary: { type: Type.STRING },
              immediate_threats: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    threat: { type: Type.STRING },
                    severity: { type: Type.STRING },
                    impact_area: { type: Type.STRING }
                  },
                  required: ["threat", "severity", "impact_area"]
                }
              },
              priority_actions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    action: { type: Type.STRING },
                    responsible_party: { type: Type.STRING },
                    time_criticality: { type: Type.STRING }
                  },
                  required: ["action", "responsible_party", "time_criticality"]
                }
              },
              resource_gaps: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    resource: { type: Type.STRING },
                    needed: { type: Type.INTEGER },
                    available: { type: Type.INTEGER },
                    gap: { type: Type.INTEGER },
                    mitigation_plan: { type: Type.STRING }
                  },
                  required: ["resource", "needed", "available", "gap", "mitigation_plan"]
                }
              },
              estimated_response_window: { type: Type.STRING },
              confidence_level: { type: Type.STRING },
              confidence_explanation: { type: Type.STRING }
            },
            required: [
              "executive_summary",
              "immediate_threats",
              "priority_actions",
              "resource_gaps",
              "estimated_response_window",
              "confidence_level",
              "confidence_explanation"
            ]
          }
        }
      });

      for await (const chunk of responseStream) {
        if (chunk.text) {
          res.write(`data: ${chunk.text}\n\n`);
        }
      }
      res.end();
      return;
    } catch (err) {
      console.error("Gemini streaming error:", err);
    }
  }

  // Fallback streaming simulation
  const jsonStr = JSON.stringify(fallback);
  const chunkSize = 50;
  let idx = 0;
  const interval = setInterval(() => {
    if (idx < jsonStr.length) {
      const chunk = jsonStr.substring(idx, idx + chunkSize);
      res.write(`data: ${chunk}\n\n`);
      idx += chunkSize;
    } else {
      clearInterval(interval);
      res.end();
    }
  }, 20);
});

// POST Situation Report
app.post("/api/analysis/situation-report", async (req, res) => {
  const payload = req.body;
  const report_num = (payload.previous_reports || []).length + 1;
  const title = `Situation Report #${report_num} - ${payload.disaster_title || 'Unknown'}`;

  let markdown_content = "";
  if (process.env.GEMINI_API_KEY) {
    try {
      const response = await getAI().models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Generate a professional Emergency Management Situation Report (SitRep) for the following incident:
Incident Title: ${payload.disaster_title}
Event Type: ${payload.disaster_type}
Magnitude / Intensity: ${payload.magnitude}
Affected Population: ${payload.affected_population}
Damaged Infrastructure: ${payload.damaged_critical_facilities} damaged / ${payload.total_critical_facilities} total
Composite Risk Score: ${payload.risk_score}

Please format the report cleanly using professional, technical emergency management formatting following FEMA/Incident Command standards.`,
        config: {
          systemInstruction: "You are DIEP-AI, an expert Disaster Intelligence & Emergency Posture analyst. Your output MUST be in structured, valid Markdown format. Be extremely factual, analytical, and safety-focused. Ensure the markdown includes Incident Summary, Current Status, Life Safety, Infrastructure, Response Actions, Resource Status, Forecast, and Next Update."
        }
      });
      if (response.text) {
        markdown_content = response.text.trim();
      }
    } catch (err) {
      console.error("Gemini report generation error:", err);
    }
  }

  if (!markdown_content) {
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    markdown_content = `# EMERGENCY SITUATION REPORT (SitRep #${report_num})

**INCIDENT NAME:** ${payload.disaster_title}
**DISASTER TYPE:** ${(payload.disaster_type || 'Unknown').toUpperCase()} (Magnitude: \`${payload.magnitude || 0}\`)
**RISK ASSESSMENT:** Composite Score \`${payload.risk_score || 0}/100\`
**TIMESTAMP:** ${nowStr}
**OPERATIONAL PERIOD:** First 12 Hours Post-Impact

---

## 📋 1. Incident Summary
This official Situation Report outlines the tactical intelligence, current damage postures, and operational response strategies deployed.

## ⚡ 2. Current Status
The incident footprint spans regional grids and localized populated zones. Risk assessments indicate active threats of cascading failures across critical lifelines.

## 🦺 3. Life Safety
* **Estimated Population Impacted:** ${(payload.affected_population || 0).toLocaleString()} citizens.
* **Evacuation Posture:** Active routing to designated Safe Havens.

## 🏢 4. Infrastructure Impact
* **Critical Facilities offline:** \`${payload.damaged_critical_facilities || 0}\` of \`${payload.total_critical_facilities || 0}\`.

## 🚀 5. Response Actions
- Established local Incident Command Post (ICP) coordinates.
- Synced real-time emergency telemetry with first response field teams.

## 📦 6. Resource Status & Gaps
| Resource | Needed | Available | Shortfall | Sourcing Strategy |
| :--- | :--- | :--- | :--- | :--- |
| Emergency Power Generators | 10 | 2 | 8 | Request mutual aid. |

## 🔮 7. Forecast & Cascading Risks
Modeling suggests potential secondary aftershocks or weather deterioration.

## 📅 8. Next Update
The next official situation report (SitRep #${report_num + 1}) will be generated in **4 hours**.`;
  }

  res.json({
    report_content: markdown_content,
    title,
    created_at: new Date().toISOString()
  });
});

// POST Risk Forecast
app.post("/api/analysis/forecast", async (req, res) => {
  const payload = req.body;
  const score = payload.risk_score || 50;

  let forecastData: any = null;
  if (process.env.GEMINI_API_KEY) {
    try {
      const response = await getAI().models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Generate 6-hour, 12-hour, and 24-hour risk forecasts, predict risk score progression, identify escalation triggers, compare scenarios, and recommend preemptive actions for:
Title: ${payload.disaster_title}
Type: ${payload.disaster_type}
Current Composite Risk Score: ${score}/100`,
        config: {
          systemInstruction: "You are DIEP-AI Predictive Analyst, a leading emergency meteorology and geospatial risk forecaster. Output your complete response in structured JSON conforming strictly to the expected properties.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              forecast_timeline: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    hour: { type: Type.STRING },
                    risk_score: { type: Type.NUMBER },
                    uncertainty_low: { type: Type.NUMBER },
                    uncertainty_high: { type: Type.NUMBER }
                  },
                  required: ["hour", "risk_score", "uncertainty_low", "uncertainty_high"]
                }
              },
              escalation_triggers: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    trigger: { type: Type.STRING },
                    impact: { type: Type.STRING },
                    severity: { type: Type.STRING }
                  },
                  required: ["trigger", "impact", "severity"]
                }
              },
              scenarios: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING },
                    probability: { type: Type.STRING },
                    description: { type: Type.STRING },
                    key_indicators: { type: Type.STRING },
                    recommended_response: { type: Type.STRING }
                  },
                  required: ["type", "probability", "description", "key_indicators", "recommended_response"]
                }
              },
              recommended_actions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    action: { type: Type.STRING },
                    priority: { type: Type.STRING },
                    timeframe: { type: Type.STRING },
                    rationale: { type: Type.STRING }
                  },
                  required: ["action", "priority", "timeframe", "rationale"]
                }
              }
            },
            required: ["forecast_timeline", "escalation_triggers", "scenarios", "recommended_actions"]
          }
        }
      });
      if (response.text) {
        forecastData = JSON.parse(response.text.trim());
      }
    } catch (err) {
      console.error("Gemini forecast generation error:", err);
    }
  }

  if (!forecastData) {
    forecastData = {
      forecast_timeline: [
        { hour: "Current", risk_score: score, uncertainty_low: score - 2.0, uncertainty_high: score + 2.0 },
        { hour: "+6 Hours", risk_score: score + 5.0, uncertainty_low: score + 1.0, uncertainty_high: score + 9.0 },
        { hour: "+12 Hours", risk_score: score + 10.0, uncertainty_low: score + 4.0, uncertainty_high: score + 16.0 },
        { hour: "+24 Hours", risk_score: score + 15.0, uncertainty_low: score + 6.0, uncertainty_high: score + 24.0 }
      ],
      escalation_triggers: [
        { trigger: "Sustained high wind gusts exceeding 45 mph", impact: "Accelerates propagation rate and expands the perimeter rapidly", severity: "High" },
        { trigger: "Failure of backup generators at critical shelter stations", impact: "Loss of air conditioning and medical facilities inside safety havens", severity: "Critical" }
      ],
      scenarios: [
        {
          type: "Most Likely",
          probability: "65%",
          description: "Gradual containment progression with minor spot fire breakouts handled by active logistical crews.",
          key_indicators: "Favorable humidity level, moderate localized gusts.",
          recommended_response: "Deploy backup crews to boundary line sectors; maintain voluntary alert levels."
        },
        {
          type: "Worst Case",
          probability: "25%",
          description: "Sudden wind shear forces active containment lines to fail, putting secondary residential sectors in path.",
          key_indicators: "Humidity dipping below 12%, winds shifting towards West/Northwest.",
          recommended_response: "Trigger active warning systems and execute full mandatory evacuations."
        }
      ],
      recommended_actions: [
        { action: "Stage additional response equipment in nearby secure sectors", priority: "High", timeframe: "Within 6 hours", rationale: "Ensures prompt deployment if containment lines shift." },
        { action: "Pre-position medical supplies in safe havens", priority: "Critical", timeframe: "Immediate", rationale: "High stress and dust particles from wildfires may strain respiratory reserves." }
      ]
    };
  }

  res.json(forecastData);
});

// POST Evacuation Plan
app.post("/api/evacuation/plan", (req, res) => {
  const { start_lat, start_lng, safe_zones = [] } = req.body;
  
  const routes = safe_zones.map((sz: any, idx: number) => {
    const distanceKm = Math.sqrt(Math.pow(sz.lat - start_lat, 2) + Math.pow(sz.lng - start_lng, 2)) * 111;
    const durationMins = Math.round((distanceKm / 45) * 60);

    const steps = 5;
    const coordinates = [];
    for (let i = 0; i <= steps; i++) {
      const ratio = i / steps;
      const bend = Math.sin(ratio * Math.PI) * 0.01 * (idx === 0 ? 1 : -1);
      coordinates.push([
        start_lat + (sz.lat - start_lat) * ratio + bend,
        start_lng + (sz.lng - start_lng) * ratio + bend
      ]);
    }

    return {
      id: `route-${sz.id}`,
      safe_zone_id: sz.id,
      safe_zone_name: sz.name,
      duration_mins: Math.max(5, durationMins),
      distance_km: Math.round(distanceKm * 10) / 10,
      road_type: idx === 0 ? "Highway" : idx === 1 ? "Secondary Expressway" : "Main Evacuation Corridor",
      coordinates: coordinates,
      is_fallback: false,
      rank: idx + 1
    };
  });

  routes.sort((a: any, b: any) => a.duration_mins - b.duration_mins);

  res.json({
    routes: routes,
    used_fallback: false
  });
});

// GET Resource Inventory & Depots
app.get("/api/resources/inventory", (req, res) => {
  res.json(inventory);
});

app.get("/api/resources/depots", (req, res) => {
  res.json(depots);
});

// POST Allocate Resources
app.post("/api/resources/allocate", (req, res) => {
  const payload = req.body;
  const risk = (payload.risk_level || "High").toLowerCase();
  const pop = payload.affected_population || 10000;
  const dmg = payload.infrastructure_damage || 3;
  const mult = risk === "critical" || risk === "panic" ? 2.5 : (risk === "high" ? 1.8 : 1.2);

  const recs = [
    {
      resource_type: "ambulances",
      resource_name: "Ambulance Units",
      unit: "vehicles",
      recommended_qty: Math.max(2, Math.floor((pop / 3000) * mult)),
      depot_allocations: [{ depot_id: "depot-1", depot_name: "Central Logistics Hub (SF Center)", qty_allocated: Math.max(2, Math.floor((pop / 3000) * mult)), distance_km: 12.5 }],
      total_allocated: Math.max(2, Math.floor((pop / 3000) * mult)),
      shortfall: 0,
      justification: `Assigned vehicles based on ${pop.toLocaleString()} affected population under ${risk} risk.`
    },
    {
      resource_type: "fire_trucks",
      resource_name: "Fire Engines",
      unit: "vehicles",
      recommended_qty: Math.max(1, Math.floor((pop / 6000) * mult)),
      depot_allocations: [{ depot_id: "depot-2", depot_name: "North Bay Response Depot (San Rafael)", qty_allocated: Math.max(1, Math.floor((pop / 6000) * mult)), distance_km: 18.2 }],
      total_allocated: Math.max(1, Math.floor((pop / 6000) * mult)),
      shortfall: 0,
      justification: `Securing response corridors and suppressing hazards.`
    },
    {
      resource_type: "rescue_teams",
      resource_name: "Heavy Rescue Teams",
      unit: "teams",
      recommended_qty: Math.max(1, Math.floor((pop / 8000) * mult) + Math.floor(dmg / 2)),
      depot_allocations: [{ depot_id: "depot-3", depot_name: "East Bay Emergency Supply (Oakland)", qty_allocated: Math.max(1, Math.floor((pop / 8000) * mult) + Math.floor(dmg / 2)), distance_km: 15.0 }],
      total_allocated: Math.max(1, Math.floor((pop / 8000) * mult) + Math.floor(dmg / 2)),
      shortfall: 0,
      justification: `Assigned teams for structural rescue given ${dmg} damaged facilities.`
    },
    {
      resource_type: "medical_kits",
      resource_name: "First Aid & Trauma Kits",
      unit: "kits",
      recommended_qty: Math.max(10, Math.floor((pop / 150) * mult)),
      depot_allocations: [{ depot_id: "depot-4", depot_name: "South Bay Tactical Depot (San Jose)", qty_allocated: Math.max(10, Math.floor((pop / 150) * mult)), distance_km: 25.1 }],
      total_allocated: Math.max(10, Math.floor((pop / 150) * mult)),
      shortfall: 0,
      justification: `Dispatched trauma dressings to support local triage points.`
    }
  ];

  res.json({
    disaster_id: payload.disaster_id,
    disaster_title: payload.disaster_title,
    recommendations: recs,
    routes: [
      {
        depot_id: "depot-1",
        depot_name: "Central Logistics Hub (SF Center)",
        start_lat: 37.7749,
        start_lng: -122.4194,
        end_lat: payload.disaster_lat || 37.7749,
        end_lng: payload.disaster_lng || -122.4194,
        distance_km: 12.5,
        duration_mins: 25.0,
        coordinates: [
          [37.7749, -122.4194],
          [payload.disaster_lat || 37.7749, payload.disaster_lng || -122.4194]
        ]
      }
    ],
    total_shortfalls: 0,
    has_shortfalls: false
  });
});

// POST Deploy Approve
app.post("/api/resources/deploy-approve", (req, res) => {
  const { recommendations = [] } = req.body;
  recommendations.forEach((rec: any) => {
    const item = inventory.find(i => i.key === rec.resource_type);
    if (item) {
      const allocatedQty = rec.total_allocated || rec.qty_allocated || 0;
      item.available_qty = Math.max(0, item.available_qty - allocatedQty);
      item.deployed_qty += allocatedQty;
      if (item.available_qty <= 0) {
        item.status = "Low";
      }
    }
    const depotAllocs = rec.depot_allocations || [];
    depotAllocs.forEach((da: any) => {
      const depot = depots.find(d => d.id === da.depot_id);
      if (depot && (depot.resources as any)[rec.resource_type] !== undefined) {
        (depot.resources as any)[rec.resource_type] = Math.max(0, (depot.resources as any)[rec.resource_type] - da.qty_allocated);
      }
    });
  });
  res.json({ status: "success" });
});

// POST Reset Deployments
app.post("/api/resources/reset", (req, res) => {
  inventory = JSON.parse(JSON.stringify(INITIAL_INVENTORY));
  depots = JSON.parse(JSON.stringify(INITIAL_DEPOTS));
  res.json({ status: "success" });
});

// POST AI Chat
app.post("/api/ai/chat", async (req, res) => {
  const { messages = [], disaster_context } = req.body;
  const lastMessage = messages[messages.length - 1]?.content || "";

  let reply = "";
  let suggestedQuestions = [
    "What are the immediate priorities for safety havens?",
    "How can we speed up resource deployments?",
    "What is the status of active evacuation routes?"
  ];

  if (process.env.GEMINI_API_KEY) {
    try {
      const historyStr = messages.slice(0, -1).map((m: any) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join("\n");
      const ctxStr = disaster_context ? JSON.stringify(disaster_context, null, 2) : "No context available";

      const prompt = `
Active disaster context:
${ctxStr}

Conversation history:
${historyStr}

Current user query:
"${lastMessage}"

Analyse the query objectively and generate a safety-focused response in clean Markdown.
Output a JSON object with:
- "response": Markdown text answering the query professionally and factually.
- "suggested_questions": A list of exactly three short, follow-up questions for the user.`;

      const result = await getAI().models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are DIEP-AI Command Assistant, the central intelligence brain of the Disaster Intelligence Platform. Your role is to assist emergency command center personnel in real-time response, tactical coordination, and hazard mitigation. You have access to real-time telemetry, risk scores, logistical resource inventories, emergency alerts, and evacuation statuses. Analyze queries objectively and generate safety-focused, highly structured responses in clean Markdown. You MUST output your response in JSON format conforming strictly to the expected properties.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              response: { type: Type.STRING },
              suggested_questions: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["response", "suggested_questions"]
          }
        }
      });

      if (result.text) {
        const parsed = JSON.parse(result.text.trim());
        reply = parsed.response || "";
        suggestedQuestions = parsed.suggested_questions || suggestedQuestions;
      }
    } catch (err) {
      console.error("Gemini chat error:", err);
    }
  }

  if (!reply) {
    reply = `Command Center Assistant (Sandbox Mode): I am here to assist with operations for "${disaster_context?.title || 'Tactical Site'}". 

Based on current metrics:
- Impacted citizens: **${(disaster_context?.affected_population || 0).toLocaleString()}**
- Critical services offline: **${disaster_context?.damaged_critical || 0}** of **${disaster_context?.total_critical || 0}**

Please pre-position clean water units and diesel generators immediately to secure primary shelter operations.`;
  }

  res.json({
    response: reply,
    suggested_questions: suggestedQuestions
  });
});

// POST Generate Alerts
app.post("/api/alerts/generate", async (req, res) => {
  const payload = req.body;
  const score = payload.risk_score || 50;
  const severity = score <= 40 ? "Moderate" : score <= 75 ? "High" : "Critical";
  const disaster_type = payload.disaster_type || "earthquake";
  const disaster_title = payload.disaster_title || "Disaster Event";

  let alertData: any = null;
  if (process.env.GEMINI_API_KEY) {
    try {
      const response = await getAI().models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Generate a structured public safety emergency alert warning with appropriate severity ("Moderate", "High", or "Critical"), a compelling headline, a scannable summary, affected area description, and recommended actions list for:
Disaster Event: ${disaster_title}
Type: ${disaster_type}
Risk Score: ${score}/100
Custom Headline Override: ${payload.custom_headline || 'None'}
Custom Summary Override: ${payload.custom_summary || 'None'}
Custom Actions Overrides: ${payload.custom_actions ? JSON.stringify(payload.custom_actions) : 'None'}`,
        config: {
          systemInstruction: "You are DIEP-AI Warning Coordinator, authorized to issue official public alerts. Your output MUST be a JSON object containing the properties specified.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              severity: { type: Type.STRING },
              headline: { type: Type.STRING },
              summary: { type: Type.STRING },
              affected_area: { type: Type.STRING },
              recommended_actions: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["severity", "headline", "summary", "affected_area", "recommended_actions"]
          }
        }
      });
      if (response.text) {
        alertData = JSON.parse(response.text.trim());
      }
    } catch (err) {
      console.error("Gemini alert generation error:", err);
    }
  }

  if (!alertData) {
    const area = payload.affected_area || "Sectors B-G / Coastal Bay Area Core";
    const headline = payload.custom_headline || `⚠️ OFFICIAL EMERGENCY ALERT: ${disaster_title} Declared ${severity}`;
    const summary = payload.custom_summary || `Public alert initiated due to high-risk cascading telemetry reports. The risk index is evaluated at ${score}/100. Secure structural perimeters and log status updates.`;
    const actions = payload.custom_actions || [
      "Avoid traveling through high-hazard transport lines.",
      "Check in with your nearest disaster outpost to register current status.",
      "Consolidate local backup energy cells and auxiliary water reserves."
    ];

    alertData = {
      severity,
      headline,
      summary,
      affected_area: area,
      recommended_actions: actions
    };
  }

  res.json({
    disaster_id: payload.disaster_id || "custom-disaster-id",
    disaster_title,
    disaster_type,
    severity: alertData.severity,
    headline: alertData.headline,
    summary: alertData.summary,
    affected_area: alertData.affected_area,
    recommended_actions: alertData.recommended_actions,
    issued_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
  });
});

// ==========================================
// 3. VITE INTEGRATION & STATIC FILE SERVING
// ==========================================

async function startServer() {
  const server = http.createServer(app);

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: {
          port: 24678,
        },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
