import os
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class GeminiService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.client = None
        
        # Try to initialize the modern Google GenAI SDK
        if self.api_key:
            try:
                from google import genai
                from google.genai import types
                self.client = genai.Client(api_key=self.api_key)
                print("Gemini Client initialized successfully using google-genai.")
            except ImportError:
                print("google-genai package not installed or legacy environment. Falling back to stub engine.")
            except Exception as e:
                print(f"Failed to initialize Gemini client: {e}")
        else:
            print("GEMINI_API_KEY is missing. AI features will run in sandbox fallback mode.")

    def _generate_content(self, prompt: str, config: Optional[Any] = None) -> Any:
        """
        Robust helper that queries gemini-2.5-flash first, and falls back to gemini-1.5-flash.
        """
        models = ["gemini-2.5-flash", "gemini-1.5-flash"]
        last_error = None
        for model in models:
            try:
                response = self.client.models.generate_content(
                    model=model,
                    contents=prompt,
                    config=config
                )
                return response
            except Exception as e:
                print(f"Error calling Gemini with model {model}: {e}")
                last_error = e
        if last_error:
            raise last_error
        raise Exception("Failed to generate content with all configured models.")

    async def breakdown_task(self, title: str, description: Optional[str], step_count: int = 3) -> List[str]:
        """
        AI Micro-Breakdown Tool: Splits an overwhelming task into actionable 15-minute micro-steps.
        """
        if not self.client:
            # Fallback mock response for sandbox mode or missing API keys
            return [
                f"Identify the immediate 5-minute starting action for: {title}",
                f"Draft initial outline or template focusing only on the primary criteria",
                f"Eliminate noise & distractions, then execute a 15-minute focused sprint to complete drafting"
            ][:step_count]

        prompt = f"""
        You are an expert Productivity Coach helping a user who is procrastinating and feeling overwhelmed.
        Break down the following task into exactly {step_count} progressive, ultra-actionable, low-barrier micro-steps.
        Each step must take 15 minutes or less, designed to break panic/freeze state and build momentum.

        TASK TITLE: {title}
        TASK DESCRIPTION: {description or 'None provided'}
        
        Provide only a JSON list of strings representing the micro-steps. No extra text or markdown formatting outside of JSON.
        """

        try:
            from google.genai import types
            response = self._generate_content(
                prompt=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema={
                        "type": "ARRAY",
                        "items": {"type": "STRING"},
                        "description": "List of ultra-actionable 15-minute steps to conquer procrastination"
                    }
                )
            )
            # Parse the response text
            import json
            steps = json.loads(response.text)
            if isinstance(steps, list):
                return steps
            return [step.strip() for step in response.text.split("\n") if step.strip()][:step_count]
        except Exception as e:
            print(f"Error during Gemini task breakdown: {e}")
            # Safe recovery fallback
            return [
                f"Step 1: Open the work file and look at it for 2 minutes.",
                f"Step 2: Do 15 minutes of uninterrupted, low-stakes drafting.",
                f"Step 3: Review progress, take a deep breath, and log completed actions."
            ][:step_count]

    async def generate_stress_advice(self, stress_level: int) -> Dict[str, Any]:
        """
        Generates therapeutic stress-reduction coping mechanics based on anxiety input.
        """
        zones = {
            1: ("CALM", "🟢 Zone: Calm Focus. You are in control. Break your tasks into 45-minute cycles (Pomodoro) and reward yourself with quick walks."),
            2: ("CALM", "🟢 Zone: Calm Focus. Low distraction state. Maintain this flow."),
            3: ("CALM", "🟢 Zone: Calm Focus. Healthy tension. Focus on high priority items."),
            4: ("ALERT", "🟡 Zone: Accelerated Pressure. Alert but capable. Complete a small, quick win immediately to trigger dopamine (such as cleaning your workspace) to release pressure."),
            5: ("ALERT", "🟡 Zone: Accelerated Pressure. Cognitive load rising. Limit multitasking immediately."),
            6: ("ALERT", "🟡 Zone: Accelerated Pressure. Heart rate elevated. Close all secondary browser tabs."),
            7: ("CRITICAL", "🟠 Zone: Elevated Anxiety. Danger of freeze response. Hide all unessential tasks. Activate Panic Mode in the Dashboard. Work in simple 15-minute bursts."),
            8: ("CRITICAL", "🟠 Zone: Elevated Anxiety. Impending panic block. Walk away from the screen for 2 minutes."),
            9: ("PANIC", "🚨 Zone: Panic Freeze! Cognitive load exceeded. Stop typing. Engage the 1-minute Box Breathing exercise. Your brain needs oxygen to process calculations."),
            10: ("PANIC", "🚨 Zone: Panic Freeze! Absolute system overload. Do not touch your phone, follow the box breathing defuser loop immediately.")
        }

        zone_name, default_advice = zones.get(stress_level, ("ALERT", "Take a 5-minute deep breathing break."))

        if not self.client:
            return {
                "zone": zone_name,
                "stress_advice": default_advice
            }

        prompt = f"""
        The user is self-reporting an anxiety/stress level of {stress_level} out of 10.
        Provide a customized, encouraging, single-sentence response with practical productivity actions or psychological relief (such as CBT techniques, physical movement, or box breathing triggers).
        Keep it direct, humble, and supportive.
        """

        try:
            response = self._generate_content(
                prompt=prompt
            )
            return {
                "zone": zone_name,
                "stress_advice": f"[{zone_name} FOCUS] {response.text.strip()}"
            }
        except Exception as e:
            print(f"Error during Gemini advice generation: {e}")
            return {
                "zone": zone_name,
                "stress_advice": default_advice
            }

    async def analyze_disaster_situation(self, disaster_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyzes a disaster situation and returns a structured emergency intelligence report.
        """
        fallback = self.generate_fallback_analysis(disaster_data)
        if not self.client:
            return fallback

        system_instruction = (
            "You are DIEP-AI, a highly precise, hyper-analytical virtual emergency command center intelligence specialist. "
            "Your core mandate is to analyze structured disaster information, population impacts, damaged infrastructure, risk matrices, and logistics resources, "
            "then convert them into actionable, safety-first emergency intelligence. You never speculate, exaggerate, or invent facts outside the physical plausibility of the disaster context. "
            "You prioritize human safety above all else. Your output must strictly conform to the expected JSON schema. "
            "Never include any markdown framing or extra text outside of the JSON object."
        )

        prompt = self.build_disaster_prompt(disaster_data)

        try:
            from google.genai import types
            response = self._generate_content(
                prompt=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    response_mime_type="application/json",
                    response_schema={
                        "type": "OBJECT",
                        "properties": {
                            "executive_summary": {"type": "STRING", "description": "High-level overview of posture and status"},
                            "immediate_threats": {
                                "type": "ARRAY",
                                "items": {
                                    "type": "OBJECT",
                                    "properties": {
                                        "threat": {"type": "STRING"},
                                        "severity": {"type": "STRING", "description": "Critical, High, Moderate"},
                                        "impact_area": {"type": "STRING"}
                                    },
                                    "required": ["threat", "severity", "impact_area"]
                                }
                            },
                            "priority_actions": {
                                "type": "ARRAY",
                                "items": {
                                    "type": "OBJECT",
                                    "properties": {
                                        "action": {"type": "STRING"},
                                        "responsible_party": {"type": "STRING"},
                                        "time_criticality": {"type": "STRING"}
                                    },
                                    "required": ["action", "responsible_party", "time_criticality"]
                                }
                            },
                            "resource_gaps": {
                                "type": "ARRAY",
                                "items": {
                                    "type": "OBJECT",
                                    "properties": {
                                        "resource": {"type": "STRING"},
                                        "needed": {"type": "INTEGER"},
                                        "available": {"type": "INTEGER"},
                                        "gap": {"type": "INTEGER"},
                                        "mitigation_plan": {"type": "STRING"}
                                    },
                                    "required": ["resource", "needed", "available", "gap", "mitigation_plan"]
                                }
                            },
                            "estimated_response_window": {"type": "STRING", "description": "Critical rescue window info"},
                            "confidence_level": {"type": "STRING", "description": "High, Medium, or Low"},
                            "confidence_explanation": {"type": "STRING", "description": "Explanation of confidence level"}
                        },
                        "required": [
                            "executive_summary",
                            "immediate_threats",
                            "priority_actions",
                            "resource_gaps",
                            "estimated_response_window",
                            "confidence_level",
                            "confidence_explanation"
                        ]
                    }
                )
            )

            import json
            from datetime import datetime
            data = json.loads(response.text)
            data["updated_at"] = datetime.utcnow().isoformat() + "Z"
            return data

        except Exception as e:
            print(f"Error calling Gemini for disaster analysis: {e}")
            return fallback

    def build_disaster_prompt(self, disaster_data: Dict[str, Any]) -> str:
        resources = disaster_data.get("resources") or []
        res_summary = ""
        if resources:
            res_summary = "\n".join([
                f"- {r.get('name', r.get('resource_name', 'Unknown'))}: {r.get('available_qty', r.get('available', 0))} / {r.get('total_qty', r.get('needed', 0))} {r.get('unit', '')} (Status: {r.get('status', 'Unknown')})"
                for r in resources
            ])
        else:
            res_summary = "No detailed logistics data available."

        return f"""
        Disaster Event Analysis request for DIEP-AI:
        
        DISASTER TITLE: {disaster_data.get('disaster_title', 'Unknown Event')}
        DISASTER TYPE: {disaster_data.get('disaster_type', 'Unknown')}
        MAGNITUDE / SCALE: {disaster_data.get('magnitude', 0.0)}
        AFFECTED POPULATION: {disaster_data.get('affected_population', 0)}
        CRITICAL INFRASTRUCTURE: {disaster_data.get('damaged_critical_facilities', 0)} damaged / {disaster_data.get('total_critical_facilities', 0)} total
        COMPOSITE RISK SCORE: {disaster_data.get('risk_score', 0.0)} out of 100
        
        LOGISTICS & RESOURCES:
        {res_summary}
        
        Please conduct a rigorous, safety-focused situation analysis. Provide immediate threats, chronologically ordered priority actions, resource shortfalls with mitigation alternatives, the response window, and your reasoning-based confidence rating.
        """

    def generate_fallback_analysis(self, d: Dict[str, Any]) -> Dict[str, Any]:
        from datetime import datetime
        d_type = d.get('disaster_type', 'disaster').lower()
        title = d.get('disaster_title', 'Unknown Event')
        risk = d.get('risk_score', 50.0)
        pop = d.get('affected_population', 0)
        damaged = d.get('damaged_critical_facilities', 0)
        total_crit = d.get('total_critical_facilities', 0)

        severity = "Moderate" if risk <= 40 else "High" if risk <= 75 else "Critical"

        # Construct highly context-aware defaults for fallback
        summary = (
            f"DIEP-AI Sandbox Analysis: A {severity} severity posture is declared for '{title}' (Type: {d_type}). "
            f"With {pop:,} citizens within the impacted zone and {damaged}/{total_crit} critical services offline, "
            f"immediate tactical emergency response and resource reinforcement are required."
        )

        threats = [
            {
                "threat": f"Secondary impacts from {d_type} (utility grids offline, structural destabilization)",
                "severity": "Critical" if severity == "Critical" else "High",
                "impact_area": "Main Grid Infrastructure and Transport Corridors"
            },
            {
                "threat": "Disruption to local medical and survival supply chains",
                "severity": "High" if severity != "Moderate" else "Moderate",
                "impact_area": "Emergency Medical Services"
            }
        ]

        actions = [
            {
                "action": "Establish joint unified command post and deploy communication beacons.",
                "responsible_party": "Emergency Management Agency",
                "time_criticality": "Within 30 minutes"
            },
            {
                "action": "Route emergency medical support and search and rescue (SAR) teams to peak damage zones.",
                "responsible_party": "Civil Defense Units",
                "time_criticality": "Within 1 hour"
            }
        ]

        gaps = [
            {
                "resource": "Emergency Power Generators",
                "needed": 15 if severity == "Critical" else 5,
                "available": 2 if severity == "Critical" else 1,
                "gap": 13 if severity == "Critical" else 4,
                "mitigation_plan": "Re-route mobile trailer generators from unaffected northern depots."
            },
            {
                "resource": "Rescue & Heavy Extraction Teams",
                "needed": 8 if severity == "Critical" else 3,
                "available": 3 if severity == "Critical" else 1,
                "gap": 5 if severity == "Critical" else 2,
                "mitigation_plan": "Request mutual aid from nearby regional municipal units."
            }
        ]

        return {
            "executive_summary": summary,
            "immediate_threats": threats,
            "priority_actions": actions,
            "resource_gaps": gaps,
            "estimated_response_window": "First golden 4 hours for active life-saving search operations.",
            "confidence_level": "Medium" if self.client else "Low (Sandbox)",
            "confidence_explanation": "Operating in local backup or sandbox mode without live Generative AI connections.",
            "updated_at": datetime.utcnow().isoformat() + "Z"
        }

    async def generate_situation_report(
        self,
        disaster_data: Dict[str, Any],
        situation_analysis: Optional[Dict[str, Any]] = None,
        previous_reports: Optional[List[Dict[str, Any]]] = None
    ) -> str:
        """
        Generates a professional emergency management Situation Report (SitRep) in structured Markdown format.
        """
        fallback = self.generate_fallback_situation_report(disaster_data, situation_analysis, previous_reports)
        if not self.client:
            return fallback

        system_instruction = (
            "You are DIEP-AI, an expert Disaster Intelligence & Emergency Posture analyst. "
            "Your objective is to generate highly professional, structured, and action-oriented Situation Reports (SitReps) "
            "following official emergency management and FEMA reporting standards. "
            "Your output MUST be in structured, valid Markdown format. "
            "Be extremely factual, analytical, and safety-focused. Avoid exclamation marks, promotional fluff, and speculative statements. "
            "Ensure the markdown includes all requested sections: Incident Summary, Current Status, Life Safety, Infrastructure, Response Actions, Resource Status, Forecast, and Next Update."
        )

        prompt = self.build_sitrep_prompt(disaster_data, situation_analysis, previous_reports)

        try:
            from google.genai import types
            response = self._generate_content(
                prompt=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction
                )
            )
            if response.text:
                return response.text.strip()
            return fallback
        except Exception as e:
            print(f"Error during Gemini SitRep generation: {e}")
            return fallback

    def build_sitrep_prompt(
        self,
        disaster_data: Dict[str, Any],
        situation_analysis: Optional[Dict[str, Any]] = None,
        previous_reports: Optional[List[Dict[str, Any]]] = None
    ) -> str:
        title = disaster_data.get('disaster_title', 'Unknown Disaster')
        d_type = disaster_data.get('disaster_type', 'unknown')
        magnitude = disaster_data.get('magnitude', 0.0)
        pop = disaster_data.get('affected_population', 0)
        damaged = disaster_data.get('damaged_critical_facilities', 0)
        total_crit = disaster_data.get('total_critical_facilities', 0)
        risk = disaster_data.get('risk_score', 0.0)
        
        resources_summary = ""
        resources = disaster_data.get('resources') or []
        for r in resources:
            resources_summary += f"- {r.get('name', r.get('resource', 'Unknown'))}: Available={r.get('available', 0)}, Needed={r.get('needed', 0)}, Shortfall={r.get('gap', 0)}, Status={r.get('status', 'Unknown')}, Plan={r.get('mitigation_plan', 'None')}\n"

        analysis_summary = "None provided."
        if situation_analysis:
            analysis_summary = f"""
            Executive Summary: {situation_analysis.get('executive_summary')}
            Immediate Threats: {situation_analysis.get('immediate_threats')}
            Priority Actions: {situation_analysis.get('priority_actions')}
            Resource Gaps: {situation_analysis.get('resource_gaps')}
            Confidence: {situation_analysis.get('confidence_level')} - {situation_analysis.get('confidence_explanation')}
            """

        prev_reports_summary = "None available."
        if previous_reports:
            prev_reports_summary = f"There are {len(previous_reports)} previous reports. The latest report content was:\n"
            latest_report = previous_reports[-1]
            prev_reports_summary += f"Title: {latest_report.get('title')}\nContent Snippet:\n{latest_report.get('content')[:1000]}"

        return f"""
        Generate a professional Emergency Management Situation Report (SitRep) for the following incident:
        
        INCIDENT DATA:
        - Incident Title: {title}
        - Event Type: {d_type}
        - Magnitude / Intensity: {magnitude}
        - Affected Population: {pop:,} citizens
        - Damaged Infrastructure: {damaged} damaged facilities / {total_crit} total critical infrastructure
        - Composite Risk Score: {risk}/100
        
        LOGISTICS & RESOURCES REPORTED:
        {resources_summary or "No logistics detail reported."}
        
        PREVIOUS REPORTS & HISTORY (for delta tracking):
        {prev_reports_summary}
        
        AI SITUATION ANALYSIS CONTEXT:
        {analysis_summary}
        
        Please format the report cleanly using professional, technical emergency management formatting.
        The report must follow FEMA/Incident Command standards and MUST contain these exact sections:
        
        1. # EMERGENCY SITUATION REPORT (with incident title and meta)
        2. ## 📋 1. Incident Summary (Narrative overview of current situation)
        3. ## ⚡ 2. Current Status (Postures, active lifelines, and changes/deltas if previous reports exist)
        4. ## 🦺 3. Life Safety (Statistical summaries, Active Threat Vectors in bullet points)
        5. ## 🏢 4. Infrastructure Impact (Damage ratio, offline utility grids details)
        6. ## 🚀 5. Response Actions (Completed actions list and Active Checklist of tasks with markdown checkboxes: - [ ] Task name)
        7. ## 📦 6. Resource Status & Gaps (Provide a clean Markdown table with Resource, Needed, Available, Shortfall, and Sourcing Strategy)
        8. ## 🔮 7. Forecast & Cascading Risks (Next hazards, deterioration trends, modeling confidence level)
        9. ## 📅 8. Next Update (Scheduled update time)
        
        Keep your output in structured Markdown. Do not include external wrapper markings other than standard Markdown.
        """

    def generate_fallback_situation_report(
        self,
        disaster_data: Dict[str, Any],
        situation_analysis: Optional[Dict[str, Any]] = None,
        previous_reports: Optional[List[Dict[str, Any]]] = None
    ) -> str:
        from datetime import datetime
        title = disaster_data.get('disaster_title', 'Unknown Disaster')
        d_type = disaster_data.get('disaster_type', 'unknown').upper()
        risk = disaster_data.get('risk_score', 50.0)
        pop = disaster_data.get('affected_population', 0)
        damaged = disaster_data.get('damaged_critical_facilities', 0)
        total_crit = disaster_data.get('total_critical_facilities', 0)
        magnitude = disaster_data.get('magnitude', 0.0)
        
        now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
        
        report_num = len(previous_reports) + 1 if previous_reports else 1
        
        exec_summary = "An incident Command Center posture has been initiated."
        threats_md = ""
        actions_md = ""
        gaps_md = ""
        window_str = "Next 4 hours are critical for life safety search operations."
        confidence_str = "Sandbox Posture Assessment"
        
        if situation_analysis:
            exec_summary = situation_analysis.get('executive_summary', exec_summary)
            window_str = situation_analysis.get('estimated_response_window', window_str)
            confidence_str = f"{situation_analysis.get('confidence_level', 'Medium')} - {situation_analysis.get('confidence_explanation', '')}"
            
            threats = situation_analysis.get('immediate_threats', [])
            for t in threats:
                threats_md += f"- **{t.get('threat', '')}** (Severity: `{t.get('severity', 'High')}`) | Area: {t.get('impact_area', 'General Zone')}\n"
                
            actions = situation_analysis.get('priority_actions', [])
            for a in actions:
                actions_md += f"- [ ] **{a.get('action', '')}** (Owner: `{a.get('responsible_party', 'Joint Command')}`, Target: *{a.get('time_criticality', 'ASAP')}*)\n"
                
            gaps = situation_analysis.get('resource_gaps', [])
            for g in gaps:
                gaps_md += f"| {g.get('resource', '')} | {g.get('needed', 0)} | {g.get('available', 0)} | {g.get('gap', 0)} | {g.get('mitigation_plan', '')} |\n"
        else:
            threats_md = (
                f"- **Secondary cascading hazards (utilities offline, physical destabilization)** (Severity: `Critical`) | Area: Main Grid and Corridors\n"
                f"- **Disruptions to regional emergency supply chain networks** (Severity: `High`) | Area: Emergency Medical Hubs\n"
            )
            actions_md = (
                f"- [ ] **Establish unified emergency operations command center & communication post.** (Owner: `Emergency Management`, Target: *Within 30 mins*)\n"
                f"- [ ] **Deploy search-and-rescue units to highest damage cells immediately.** (Owner: `Civil Defense`, Target: *Within 1 hour*)\n"
            )
            gaps_md = (
                f"| Emergency Power Generators | 10 | 2 | 8 | Request mutual aid from adjacent regional depots. |\n"
                f"| Heavy Extraction Rescue Teams | 5 | 1 | 4 | Re-route civil defense units from district offices. |\n"
            )
            
        if not gaps_md.strip():
            gaps_table = "No critical gaps identified at this timestamp."
        else:
            gaps_table = (
                "| Resource | Needed | Available | Shortfall | Mitigation / Sourcing Strategy |\n"
                "| :--- | :--- | :--- | :--- | :--- |\n" + gaps_md
            )

        delta_md = ""
        if previous_reports:
            delta_md = "\n### 🔄 Operational Changes Since Last Report\n"
            prev = previous_reports[-1]
            delta_md += f"- **Previous Report**: {prev.get('title', 'Report')}\n"
            delta_md += f"- **Delta Analysis**: Incident risk remains at `{risk}/100`. Transitioning focus toward localized tactical field updates and resource deployments.\n"

        markdown_sitrep = f"""# EMERGENCY SITUATION REPORT (SitRep #{report_num})

**INCIDENT NAME:** {title}
**DISASTER TYPE:** {d_type} (Magnitude: `{magnitude}`)
**RISK ASSESSMENT:** Composite Score `{risk}/100` (POSTURE: `{"CRITICAL" if risk > 75 else "HIGH" if risk > 50 else "MODERATE"}`)
**TIMESTAMP:** {now_str}
**OPERATIONAL PERIOD:** First 12 Hours Post-Impact

---

## 📋 1. Incident Summary
This official Situation Report outlines the tactical intelligence, current damage postures, and operational response strategies deployed in response to the **{title}** incident.

{exec_summary}

---

## ⚡ 2. Current Status
The incident footprint spans regional grids and localized populated zones. Risk assessments indicate active threats of cascading failures across critical lifelines. Unified Command has moved to a high-alert posture.
{delta_md}

---

## 🦺 3. Life Safety
* **Estimated Population Impacted:** {pop:,} citizens within immediate hazard footprint.
* **Response Window Constraints:** {window_str}
* **Evacuation Posture:** Active routing to designated Safe Havens.

### Immediate Threat Vectors
{threats_md}

---

## 🏢 4. Infrastructure Impact
* **Critical Facilities offline:** `{damaged}` of `{total_crit}` total services in zone.
* **Footprint Damage Assessment:** {round((damaged/total_crit)*100, 1) if total_crit > 0 else 0}% critical services offline.
* **Utility Grids:** Water, power, and telecom facilities are heavily affected. Local backup systems online where available.

---

## 🚀 5. Response Actions
### Completed Strategic Moves
- Established local Incident Command Post (ICP) coordinates.
- Synced real-time emergency telemetry with first response field teams.

### Active/Pending Tactical Actions (operations checklist)
{actions_md}

---

## 📦 6. Resource Status & Gaps
Unified logistics reporting indicates critical resource shortfalls. The table below represents current resource deficits and active mitigations:

{gaps_table}

---

## 🔮 7. Forecast & Cascading Risks
Modeling suggests potential secondary aftershocks, flood level rising, or weather deterioration.
* **Risk Trend:** Stable but highly contingent on local power grid restoration and transport route clearance.
* **Operational Confidence:** `{confidence_str}`

---

## 📅 8. Next Update
The next official situation report (SitRep #{report_num + 1}) will be generated in **4 hours** or immediately upon significant changes in emergency metrics.

---
*Report compiled by DIEP-AI Command Assistant (Local Posture Mode).*
"""
        return markdown_sitrep

    async def chat_with_context(
        self,
        messages: List[Dict[str, str]],
        disaster_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Supports multi-turn conversations and outputs structured responses with suggested follow-up questions.
        """
        fallback_reply = "I am currently running in offline backup mode. Please verify your Generative AI configuration."
        fallback_questions = [
            "How can we optimize evacuation routes?",
            "What resources are currently in critical shortfall?",
            "What secondary hazards should we monitor?"
        ]
        
        if not self.client:
            return {
                "reply": fallback_reply,
                "suggested_questions": fallback_questions
            }

        # Build context representation
        ctx_str = "No active disaster context is loaded."
        if disaster_context:
            title = disaster_context.get("title", "Unknown")
            dtype = disaster_context.get("type", "Unknown")
            mag = disaster_context.get("magnitude", 0.0)
            score = disaster_context.get("risk_score", 50.0)
            pop = disaster_context.get("affected_population", 0)
            damaged = disaster_context.get("damaged_critical", 0)
            total = disaster_context.get("total_critical", 0)
            
            ctx_str = f"""
            Active Disaster: {title}
            Type: {dtype}
            Magnitude: {mag}
            Geospatial Risk Score: {score}/100
            Affected Population: {pop:,}
            Critical Facilities Damage: {damaged} damaged / {total} total
            """
            
            # Resources
            resources = disaster_context.get("resources", [])
            if resources:
                ctx_str += "\nResource Gaps:\n"
                for r in resources:
                    ctx_str += f"- {r.get('name', 'Unknown')}: Available={r.get('available', 0)}, Needed={r.get('needed', 0)}, Gap={r.get('gap', 0)}, Status={r.get('status', 'Unknown')}\n"
            
            # Evacuation Routes
            routes = disaster_context.get("evacuation_routes", [])
            if routes:
                ctx_str += "\nEvacuation Routes:\n"
                for route in routes:
                    ctx_str += f"- {route.get('name', 'Unknown Route')}: Status={route.get('status', 'Unknown')}, Danger Level={route.get('danger_level', 'Unknown')}, Safe Haven={route.get('safe_haven_name', 'Unknown')}\n"
                    
            # Alerts
            alerts = disaster_context.get("alerts", [])
            if alerts:
                ctx_str += "\nActive Emergency Alerts:\n"
                for alert in alerts:
                    ctx_str += f"- [{alert.get('severity', 'Info').upper()}] {alert.get('message', '')} (Time: {alert.get('timestamp', '')})\n"

        # Format chat history
        history_str = ""
        for msg in messages[:-1]:
            role = "User" if msg.get("role") == "user" else "Assistant"
            history_str += f"{role}: {msg.get('content')}\n"
            
        latest_user_message = messages[-1].get("content", "") if messages else ""

        system_instruction = (
            "You are DIEP-AI Command Assistant, the central intelligence brain of the Disaster Intelligence Platform. "
            "Your role is to assist emergency command center personnel in real-time response, tactical coordination, and hazard mitigation. "
            "You have direct access to real-time telemetry, risk scores, logistical resource inventories, emergency alerts, and evacuation statuses. "
            "Analyze queries objectively and generate safety-focused, highly structured responses in clean Markdown. "
            "You MUST output your response in JSON format containing the 'reply' (markdown text) and exactly three relevant, short, action-oriented 'suggested_questions' for the user."
        )

        prompt = f"""
        REAL-TIME DISASTER SITUATION CONTEXT:
        {ctx_str}
        
        CONVERSATION HISTORY:
        {history_str}
        
        CURRENT USER QUERY:
        "{latest_user_message}"
        
        Please generate your response answering the user's current query using the provided context.
        Provide your response as a JSON object with:
        - "reply": Markdown text answering the query professionally and factually.
        - "suggested_questions": A list of exactly three follow-up questions the user can ask next to deepen the investigation or response planning.
        """

        try:
            from google.genai import types
            import json
            response = self._generate_content(
                prompt=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    response_mime_type="application/json",
                    response_schema={
                        "type": "OBJECT",
                        "properties": {
                            "reply": {"type": "STRING", "description": "Markdown response"},
                            "suggested_questions": {
                                "type": "ARRAY",
                                "items": {"type": "STRING"},
                                "description": "Exactly 3 short follow-up questions"
                            }
                        },
                        "required": ["reply", "suggested_questions"]
                    }
                )
            )
            if response.text:
                result = json.loads(response.text.strip())
                return {
                    "reply": result.get("reply", fallback_reply),
                    "suggested_questions": result.get("suggested_questions", fallback_questions)
                }
            return {
                "reply": fallback_reply,
                "suggested_questions": fallback_questions
            }
        except Exception as e:
            print(f"Error during Gemini chat context session: {e}")
            return {
                "reply": f"An error occurred: {str(e)}. Deployed backup safe posture protocol.",
                "suggested_questions": fallback_questions
            }

    async def generate_risk_forecast(
        self,
        disaster_event: Dict[str, Any],
        current_analysis: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Generates 6-hour, 12-hour, and 24-hour risk forecasts, predicts risk score progression,
        identifies escalation triggers, compares scenarios, and recommends preemptive actions.
        """
        # Default structured backup forecast JSON in case Gemini fails
        fallback_forecast = {
            "forecast_timeline": [
                {"hour": "Current", "risk_score": float(disaster_event.get("total_score", 50.0)), "uncertainty_low": float(disaster_event.get("total_score", 50.0)) - 2.0, "uncertainty_high": float(disaster_event.get("total_score", 50.0)) + 2.0},
                {"hour": "+6 Hours", "risk_score": float(disaster_event.get("total_score", 50.0)) + 5.0, "uncertainty_low": float(disaster_event.get("total_score", 50.0)) + 1.0, "uncertainty_high": float(disaster_event.get("total_score", 50.0)) + 9.0},
                {"hour": "+12 Hours", "risk_score": float(disaster_event.get("total_score", 50.0)) + 10.0, "uncertainty_low": float(disaster_event.get("total_score", 50.0)) + 4.0, "uncertainty_high": float(disaster_event.get("total_score", 50.0)) + 16.0},
                {"hour": "+24 Hours", "risk_score": float(disaster_event.get("total_score", 50.0)) + 15.0, "uncertainty_low": float(disaster_event.get("total_score", 50.0)) + 6.0, "uncertainty_high": float(disaster_event.get("total_score", 50.0)) + 24.0}
            ],
            "escalation_triggers": [
                {"trigger": "Sustained high wind gusts exceeding 45 mph", "impact": "Accelerates propagation rate and expands the perimeter rapidly", "severity": "High"},
                {"trigger": "Failure of backup generators at critical shelter stations", "impact": "Loss of air conditioning and medical facilities inside safety havens", "severity": "Critical"}
            ],
            "scenarios": [
                {
                  "type": "Most Likely",
                  "probability": "65%",
                  "description": "Gradual containment progression with minor spot fire breakouts handled by active logistical crews.",
                  "key_indicators": "Favorable humidity level, moderate localized gusts.",
                  "recommended_response": "Deploy backup crews to boundary line sectors; maintain voluntary alert levels."
                },
                {
                  "type": "Worst Case",
                  "probability": "25%",
                  "description": "Sudden wind shear forces active containment lines to fail, putting secondary residential sectors in path.",
                  "key_indicators": "Humidity dipping below 12%, winds shifting towards West/Northwest.",
                  "recommended_response": "Trigger active warning systems and execute full mandatory evacuations."
                }
            ],
            "recommended_actions": [
                {"action": "Stage additional response equipment in nearby secure sectors", "priority": "High", "timeframe": "Within 6 hours", "rationale": "Ensures prompt deployment if containment lines shift."},
                {"action": "Pre-position medical supplies in safe havens", "priority": "Critical", "timeframe": "Immediate", "rationale": "High stress and dust particles from wildfires may strain respiratory reserves."}
            ]
        }

        if not self.client:
            return fallback_forecast

        title = disaster_event.get("title", "Unknown")
        dtype = disaster_event.get("type", "Unknown")
        mag = disaster_event.get("magnitude", 0.0)
        score = disaster_event.get("total_score", 50.0)
        pop = disaster_event.get("population_affected", 0)
        damaged = disaster_event.get("damaged_critical", 0)
        total = disaster_event.get("total_critical", 0)

        situation_context = f"""
        Disaster Profile:
        - Title: {title}
        - Type: {dtype}
        - Magnitude / Impact Scale: {mag}
        - Current Composite Risk Score: {score}/100
        - Impacted Population: {pop:,}
        - Critical Infrastructure Damage: {damaged} facilities damaged / {total} total
        """

        if current_analysis:
            situation_context += f"\nActive Operational Analysis Context:\n{json.dumps(current_analysis, indent=2)}"

        system_instruction = (
            "You are DIEP-AI Predictive Analyst, a leading emergency meteorology and geospatial risk forecaster. "
            "Your objective is to model hazard progression across 6, 12, and 24-hour timeframes based on active disaster indicators. "
            "You must output your complete response in structured JSON conforming strictly to the provided response_schema, with no extra text or placeholders."
        )

        prompt = f"""
        ACTUAL DISASTER REAL-TIME STATUS:
        {situation_context}

        Please analyze this disaster configuration and project the following:
        1. "forecast_timeline": Predict risk scores for Current, +6 Hours, +12 Hours, and +24 Hours, including custom uncertainty margins (uncertainty_low and uncertainty_high limits) based on typical exponential risk patterns.
        2. "escalation_triggers": Identify at least two highly specific meteorological, hydrological, or logistical triggers that would compound the disaster severity.
        3. "scenarios": Create a comparative risk modeling breakdown for "Most Likely" and "Worst Case" scenarios. Include realistic probability estimations, indicators, and exact recommended preemptive maneuvers.
        4. "recommended_actions": Provide at least two immediately actionable preemptive moves, prioritizing them with precise rationale.

        Return the forecast analysis output in structured JSON.
        """

        try:
            from google.genai import types
            import json
            response = self._generate_content(
                prompt=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    response_mime_type="application/json",
                    response_schema={
                        "type": "OBJECT",
                        "properties": {
                            "forecast_timeline": {
                                "type": "ARRAY",
                                "items": {
                                    "type": "OBJECT",
                                    "properties": {
                                        "hour": {"type": "STRING", "description": "Time interval, e.g. 'Current', '+6 Hours'"},
                                        "risk_score": {"type": "NUMBER"},
                                        "uncertainty_low": {"type": "NUMBER"},
                                        "uncertainty_high": {"type": "NUMBER"}
                                    },
                                    "required": ["hour", "risk_score", "uncertainty_low", "uncertainty_high"]
                                }
                            },
                            "escalation_triggers": {
                                "type": "ARRAY",
                                "items": {
                                    "type": "OBJECT",
                                    "properties": {
                                        "trigger": {"type": "STRING"},
                                        "impact": {"type": "STRING"},
                                        "severity": {"type": "STRING"}
                                    },
                                    "required": ["trigger", "impact", "severity"]
                                }
                            },
                            "scenarios": {
                                "type": "ARRAY",
                                "items": {
                                    "type": "OBJECT",
                                    "properties": {
                                        "type": {"type": "STRING", "description": "'Most Likely' or 'Worst Case'"},
                                        "probability": {"type": "STRING"},
                                        "description": {"type": "STRING"},
                                        "key_indicators": {"type": "STRING"},
                                        "recommended_response": {"type": "STRING"}
                                    },
                                    "required": ["type", "probability", "description", "key_indicators", "recommended_response"]
                                }
                            },
                            "recommended_actions": {
                                "type": "ARRAY",
                                "items": {
                                    "type": "OBJECT",
                                    "properties": {
                                        "action": {"type": "STRING"},
                                        "priority": {"type": "STRING"},
                                        "timeframe": {"type": "STRING"},
                                        "rationale": {"type": "STRING"}
                                    },
                                    "required": ["action", "priority", "timeframe", "rationale"]
                                }
                            }
                        },
                        "required": ["forecast_timeline", "escalation_triggers", "scenarios", "recommended_actions"]
                    }
                )
            )

            if response.text:
                return json.loads(response.text.strip())
            return fallback_forecast
        except Exception as e:
            print(f"Error executing Gemini Predictive Risk Forecast: {e}")
            return fallback_forecast

