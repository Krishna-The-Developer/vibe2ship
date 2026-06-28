import { db } from '../services/firebase';
import { writeBatch, doc } from 'firebase/firestore';

/**
 * Seed high-fidelity, highly realistic disaster event data for the currently logged-in user.
 * This populates tasks, disasters, insights, analysis results, alerts, and situation reports.
 */
export async function seedDemoDataForUser(userId: string): Promise<void> {
  if (!userId) throw new Error("User ID is required to seed user-specific data.");

  const batch = writeBatch(db);

  // --- 1. Disasters ---
  const disasters = [
    {
      id: "disaster_cascadia_quake_" + userId,
      title: "Cascadia Subduction Zone Mega-Thrust",
      type: "earthquake",
      magnitude: 8.2,
      depth_km: 18.5,
      population_affected: 345000,
      damaged_critical: 42,
      total_critical: 120,
      status: "active",
      total_score: 88.4,
      severity_label: "Catastrophic Alert",
      recommended_response_level: 5,
      userId: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "disaster_california_wildfire_" + userId,
      title: "Santa Ana Canyon Pyro-Convective Firestorm",
      type: "wildfire",
      magnitude: 7.4,
      depth_km: 0.0,
      population_affected: 120000,
      damaged_critical: 18,
      total_critical: 75,
      status: "active",
      total_score: 72.1,
      severity_label: "Critical Hazard",
      recommended_response_level: 4,
      userId: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "disaster_gulf_hurricane_" + userId,
      title: "Category 4 Hurricane Helena Coastal Inundation",
      type: "hurricane",
      magnitude: 9.1,
      depth_km: 0.0,
      population_affected: 780000,
      damaged_critical: 89,
      total_critical: 240,
      status: "active",
      total_score: 94.6,
      severity_label: "Severe Threat",
      recommended_response_level: 5,
      userId: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "disaster_mississippi_flood_" + userId,
      title: "Mississippi Basin Levee Fracture Event",
      type: "flood",
      magnitude: 6.8,
      depth_km: 0.0,
      population_affected: 85000,
      damaged_critical: 11,
      total_critical: 40,
      status: "monitored",
      total_score: 48.5,
      severity_label: "Moderate Alert",
      recommended_response_level: 3,
      userId: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  disasters.forEach(d => {
    const { id, ...data } = d;
    batch.set(doc(db, "disasters", id), data);
  });

  // --- 2. Alerts ---
  const alerts = [
    {
      id: "alert_quake_red_" + userId,
      disasterId: "disaster_cascadia_quake_" + userId,
      disasterTitle: "Cascadia Subduction Zone Mega-Thrust",
      disasterType: "earthquake",
      severity: "critical",
      headline: "TSUNAMI WARNING & REGIONAL CRITICAL OVER-SHAKE",
      summary: "8.2 magnitude rupture registered 40 miles off coastal Oregon. Coastal tsunami evacuation routes are active. Prepare for prolonged structural shakes and loss of communication grids.",
      affectedArea: "Oregon Coast & Puget Sound Metropolitan Grid",
      recommendedActions: [
        "Immediate high-ground evacuation for areas under 100ft elevation",
        "Secure backup generators and power down high-voltage industrial assets",
        "Deploy first responder units to primary transit bottlenecks"
      ],
      userId: userId,
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
      acknowledged: false
    },
    {
      id: "alert_wildfire_amber_" + userId,
      disasterId: "disaster_california_wildfire_" + userId,
      disasterTitle: "Santa Ana Canyon Pyro-Convective Firestorm",
      disasterType: "wildfire",
      severity: "high",
      headline: "IMMEDIATE EVACUATION FOR CANYON SECTOR A & B",
      summary: "Wind-driven firestorm crossing Highway 241. Smoke plume has triggered microclimates, making aerial suppression impossible. Wind gusts up to 55mph expected to fuel advance.",
      affectedArea: "Canyon Heights & Foothill Ranch",
      recommendedActions: [
        "Commence tactical retreat of ground crews to anchor line C",
        "Enforce mandatory residential evacuations for Sector B",
        "Establish smoke filtration shelter in North Anaheim Community Center"
      ],
      userId: userId,
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
      acknowledged: false
    }
  ];

  alerts.forEach(a => {
    const { id, ...data } = a;
    batch.set(doc(db, "alerts", id), data);
  });

  // --- 3. Tasks ---
  const tasks = [
    {
      id: "task_cascadia_hospitals_" + userId,
      title: "Activate Portland Backup Water Line & Power Reserves",
      description: "Direct hospital networks to activate localized water purification units and auxiliary diesel microgrids to protect surgical payloads.",
      deadline: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
      priority: "panic",
      duration: 30,
      completed: false,
      userId: userId,
      createdAt: new Date().toISOString()
    },
    {
      id: "task_cascadia_bridges_" + userId,
      title: "Deploy Structural Inspectors to Interstate Bridges",
      description: "Perform rapid visual and sensor checks on major river crossings to verify seismic join status before allowing evacuation supply caravans.",
      deadline: new Date(Date.now() + 90 * 60 * 1000).toISOString(),
      priority: "high",
      duration: 60,
      completed: false,
      userId: userId,
      createdAt: new Date().toISOString()
    },
    {
      id: "task_wildfire_crews_" + userId,
      title: "Redirect Task Force Alpha to Canyon Firebreak Line",
      description: "Reposition three heavy bulldozer teams to clear scrub and reinforce the anchor trench line along eastern Sector A ridge.",
      deadline: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      priority: "medium",
      duration: 45,
      completed: false,
      userId: userId,
      createdAt: new Date().toISOString()
    },
    {
      id: "task_regular_comms_" + userId,
      title: "Broadcast Community Radio Emergency Band Frequency",
      description: "Issue localized warning updates via AM 1620 and high-frequency civil channels.",
      deadline: new Date(Date.now() + 180 * 60 * 1000).toISOString(),
      priority: "low",
      duration: 15,
      completed: true,
      userId: userId,
      createdAt: new Date().toISOString()
    }
  ];

  tasks.forEach(t => {
    const { id, ...data } = t;
    batch.set(doc(db, "tasks", id), data);
  });

  // --- 4. Analysis Results ---
  const analysis_results = [
    {
      id: "analysis_cascadia_001_" + userId,
      disasterId: "disaster_cascadia_quake_" + userId,
      total_score: 88.4,
      severity_label: "Catastrophic Risk Profile",
      recommended_response_level: 5,
      breakdown: {
        seismic_intensity_g: 0.85,
        liquefaction_susceptibility: "High (Sandy coastal delta sectors)",
        power_grid_failure_probability: 95,
        hospital_surge_capacity_demand: 140,
        potable_water_days_reserve: 1.2
      },
      userId: userId,
      createdAt: new Date().toISOString()
    },
    {
      id: "analysis_wildfire_001_" + userId,
      disasterId: "disaster_california_wildfire_" + userId,
      total_score: 72.1,
      severity_label: "Critical Fire-Plume Threat",
      recommended_response_level: 4,
      breakdown: {
        ember_propagation_index: 8.9,
        fuel_moisture_percentage: 4.2,
        grid_interconnection_hazard: "High (Major 500kV lines in path)",
        evacuation_route_choke_points: "3 major freeway offramps"
      },
      userId: userId,
      createdAt: new Date().toISOString()
    }
  ];

  analysis_results.forEach(ar => {
    const { id, ...data } = ar;
    batch.set(doc(db, "analysis_results", id), data);
  });

  // --- 5. Situation Reports ---
  const situation_reports = [
    {
      id: "sitrep_cascadia_01_" + userId,
      disasterId: "disaster_cascadia_quake_" + userId,
      disasterTitle: "Cascadia Subduction Zone Mega-Thrust",
      title: "SITREP #01 - POST-INCIDENT SECTOR STATUS REPORT",
      riskScore: 88.4,
      affectedPopulation: 345000,
      damagedFacilities: 42,
      totalFacilities: 120,
      content: `# Cascadia Subduction Zone Mega-Thrust - Situation Report #01
**Lead Coordinator**: COMMANDER JOINT TACTICAL RESPONSE  
**Operational Status**: Phase 2 Red Alert Active

## 1. Executive Summary
An 8.2 magnitude mega-thrust earthquake ruptured the Cascadia coastal shelf segment at 02:44 Local Time. Severe ground oscillation lasting 140 seconds has resulted in substantial structural compromises in coastal Oregon counties. High-resolution satellite analytics indicate immediate tsunami propagation risks.

## 2. Vital Infrastructure Status
* **Transportation Grid**: Major bridges on Highway 101 are currently impassable due to join displacement. Initial emergency traffic rerouted inland.
* **Energy Infrastructure**: 4 major substations down. Regional grid operators report grid separation. Approximately 210,000 meters lack telemetry.
* **Hospitals**: Acting under auxiliary generator power. Surge capacity is extremely strained.

## 3. Urgent Tactical Action Plan
1. Enforce high-elevation evacuation along all Oregon coastal sectors.
2. Complete structural validation checks for the primary interior supply highways.
3. Deploy localized drone teams to assess structural collapse in the coastal geofence.`,
      userId: userId,
      createdAt: new Date().toISOString()
    }
  ];

  situation_reports.forEach(sr => {
    const { id, ...data } = sr;
    batch.set(doc(db, "situation_reports", id), data);
  });

  // --- 6. Insights ---
  const insights = [
    {
      id: "insight_decision_1_" + userId,
      text: "🚨 HOSPITAL POWER RESILIENCE ALERT: Cascade General Hospital diesel reserve is down to 24 hours. Prioritize Task 'Activate Portland Backup Water Line & Power Reserves' immediately to coordinate regional tank fuel deliveries.",
      userId: userId,
      createdAt: new Date().toISOString()
    },
    {
      id: "insight_decision_2_" + userId,
      text: "⚡ CRITICAL INFRASTRUCTURE BOTTLENECK: High wind velocities of 55mph are forcing ember flight paths directly toward the primary power substation on sector Alpha, risking localized blackouts for 35,000 households.",
      userId: userId,
      createdAt: new Date().toISOString()
    }
  ];

  insights.forEach(ins => {
    const { id, ...data } = ins;
    batch.set(doc(db, "insights", id), data);
  });

  // Commit the Batch
  await batch.commit();
}
