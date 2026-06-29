from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class PriorityEnum(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    PANIC = "panic"

class ScheduleTypeEnum(str, Enum):
    TASK = "task"
    FIXED = "fixed"
    BREAK = "break"

# ==========================================
# Subtask / Micro-step Schemas
# ==========================================
class SubtaskBase(BaseModel):
    title: str = Field(..., description="The actionable micro-step description")
    completed: bool = Field(default=False, description="Completion state of the subtask")

class SubtaskCreate(SubtaskBase):
    pass

class SubtaskUpdate(BaseModel):
    title: Optional[str] = None
    completed: Optional[bool] = None

class SubtaskResponse(SubtaskBase):
    id: str = Field(..., description="Unique subtask identifier (UUID or short ID)")
    
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# Task / Project Deliverable Schemas
# ==========================================
class TaskBase(BaseModel):
    title: str = Field(..., description="Main deliverable title")
    description: Optional[str] = Field(None, description="Brief action plan or detailed notes")
    priority: PriorityEnum = Field(default=PriorityEnum.HIGH, description="Urgency level")
    duration: int = Field(default=30, description="Estimated duration in minutes")
    deadline: str = Field(..., description="Deadline timestamp (ISO-8601 string or date-time)")
    category: str = Field(default="Work", description="Work context or category")

class TaskCreate(TaskBase):
    subtasks: Optional[List[SubtaskCreate]] = Field(default=[], description="Initial micro-steps to append")

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[PriorityEnum] = None
    duration: Optional[int] = None
    deadline: Optional[str] = None
    category: Optional[str] = None
    completed: Optional[bool] = None

class TaskResponse(TaskBase):
    id: str = Field(..., description="Unique task identifier")
    completed: bool = Field(default=False, description="Completion status")
    subtasks: List[SubtaskResponse] = Field(default=[], description="List of related micro-steps")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Timestamp when created")

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# Stress & Procrastination Insight Schemas
# ==========================================
class InsightBase(BaseModel):
    stress_level: int = Field(..., ge=1, le=10, description="Self-reported stress level (1 to 10)")

class InsightCreate(InsightBase):
    # Dynamic fields generated on request
    pass

class InsightResponse(InsightBase):
    zone: str = Field(..., description="Calculated anxiety zone (e.g. CALM, ALERT, CRITICAL)")
    stress_advice: str = Field(..., description="AI-generated stress-reduction advice or coping steps")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Time of diagnostics check")

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# Schedule / Timeline Block Schemas
# ==========================================
class ScheduleBase(BaseModel):
    title: str = Field(..., description="Activity name or Focus session title")
    start_time: str = Field(..., description="Chronological start time (HH:MM format)")
    end_time: str = Field(..., description="Chronological end time (HH:MM format)")
    type: ScheduleTypeEnum = Field(default=ScheduleTypeEnum.TASK, description="Timeline block category")
    task_id: Optional[str] = Field(None, description="Optional associated active Task ID")

class ScheduleCreate(ScheduleBase):
    pass

class ScheduleUpdate(BaseModel):
    title: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    type: Optional[ScheduleTypeEnum] = None
    task_id: Optional[str] = None
    completed: Optional[bool] = None

class ScheduleResponse(ScheduleBase):
    id: str = Field(..., description="Unique timeline block identifier")
    completed: bool = Field(default=False, description="Completion status of block")

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# AI Assistant API Payloads
# ==========================================
class AIBreakdownRequest(BaseModel):
    task_id: str = Field(..., description="Task ID to break down with AI")
    step_count: int = Field(default=3, ge=2, le=5, description="Number of actionable steps to generate")

class AIScheduleGenerationRequest(BaseModel):
    sleep_start: Optional[str] = Field(default="23:00", description="Typical sleep start time")
    sleep_end: Optional[str] = Field(default="07:00", description="Typical sleep wake time")


# ==========================================
# Safe Time Slots Schemas
# ==========================================
class SafeSlotsRequest(BaseModel):
    deadline: str = Field(..., description="The deadline for the task to analyze safe slots for")

class SafeSlot(BaseModel):
    start_time: str = Field(..., description="Start of the safe time slot")
    end_time: str = Field(..., description="End of the safe time slot")
    score: int = Field(..., description="Safety or cognitive productivity score from 1-100")
    label: str = Field(..., description="Descriptive label e.g. Optimal Focus Window")
    description: str = Field(..., description="Explanation of why this slot is safe")

class SafeSlotsResponse(BaseModel):
    deadline: str = Field(..., description="Analyzed deadline")
    slots: List[SafeSlot] = Field(..., description="List of suggested safe slots")


# ==========================================
# Task Impact Estimation Schemas
# ==========================================
class TaskImpactRequest(BaseModel):
    title: str = Field(..., description="Task title")
    deadline: str = Field(..., description="Task deadline ISO-8601 string")
    estimated_duration_hours: float = Field(..., description="Estimated task duration in hours")

class ZoneDetail(BaseModel):
    name: str = Field(..., description="Zone name (Critical, High, Medium, Low)")
    duration_hours: float = Field(..., description="Hours allocated or remaining in this zone")
    percentage: float = Field(..., description="Percentage of remaining time in this zone")
    description: str = Field(..., description="Explanation of what this zone means for the user")
    color: str = Field(..., description="Tailwind color hex or name")

class TaskImpactResponse(BaseModel):
    title: str = Field(..., description="Task title")
    deadline: str = Field(..., description="Task deadline")
    hours_remaining: float = Field(..., description="Total hours remaining until deadline")
    urgency_score: int = Field(..., description="Urgency index from 0 to 100")
    zones: List[ZoneDetail] = Field(..., description="Breakdown of impact zones")
    recommendations: List[str] = Field(..., description="Smart custom recommendations")


# ==========================================
# Critical Task and Resource Analysis Schemas
# ==========================================
class TaskInputForAnalysis(BaseModel):
    id: str = Field(..., description="Task ID")
    title: str = Field(..., description="Task title")
    priority: str = Field(..., description="Task priority (low, medium, high, panic)")
    duration: int = Field(..., description="Task duration in minutes")
    deadline: str = Field(..., description="Task deadline ISO string")
    category: str = Field(default="Work", description="Category")
    completed: bool = Field(default=False, description="Completion status")

class CriticalTaskAnalysisRequest(BaseModel):
    tasks: List[TaskInputForAnalysis] = Field(..., description="List of tasks to analyze")

class TaskAnalysisItem(BaseModel):
    id: str = Field(..., description="Task ID")
    title: str = Field(..., description="Task title")
    priority: str = Field(..., description="Original task priority")
    hours_left: float = Field(..., description="Hours remaining before the deadline")
    risk_level: str = Field(..., description="Calculated risk level (Critical, High, Medium, Low)")
    suggested_action: str = Field(..., description="Suggested action for this specific task")
    color_code: str = Field(..., description="Tailwind-friendly color code (red, orange, yellow, green)")

class CriticalTaskAnalysisResponse(BaseModel):
    critical_count: int = Field(..., description="Count of critical risk tasks")
    high_count: int = Field(..., description="Count of high risk tasks")
    medium_count: int = Field(..., description="Count of medium risk tasks")
    low_count: int = Field(..., description="Count of low risk tasks")
    analyzed_tasks: List[TaskAnalysisItem] = Field(..., description="Detailed reports of individual tasks")
    overall_recommendations: List[str] = Field(..., description="Comprehensive smart action steps")


# ==========================================
# Geospatial Risk Scoring Schemas
# ==========================================
class DisasterEventInput(BaseModel):
    id: Optional[str] = Field(None, description="Disaster event ID (for caching/lookup)")
    type: str = Field(..., description="Type of disaster, e.g., earthquake, hurricane, flood, wildfire")
    magnitude: float = Field(..., description="Magnitude of the event on a scale of 0 to 10")
    depth_km: Optional[float] = Field(None, description="Depth of the event (useful for earthquakes)")

class PopulationImpactInput(BaseModel):
    total_affected: int = Field(..., description="Total population in affected area")

class InfrastructureAnalysisInput(BaseModel):
    damaged_critical: int = Field(..., description="Number of damaged critical infrastructure facilities")
    total_critical: int = Field(..., description="Total number of critical infrastructure facilities in zone")

class RiskScoreRequest(BaseModel):
    disaster_event: DisasterEventInput
    population_impact: PopulationImpactInput
    infrastructure_analysis: InfrastructureAnalysisInput

class ScoreBreakdown(BaseModel):
    magnitude_score: float = Field(..., description="Magnitude score contribution (0-25)")
    population_score: float = Field(..., description="Population impact score contribution (0-35)")
    infrastructure_score: float = Field(..., description="Infrastructure damage score contribution (0-25)")
    depth_type_score: float = Field(..., description="Depth/disaster type score contribution (0-15)")

class RiskScoreResponse(BaseModel):
    disaster_id: str = Field(..., description="Disaster ID associated with this calculation")
    total_score: float = Field(..., description="Weighted composite risk score (0-100)")
    breakdown: ScoreBreakdown = Field(..., description="Breakdown of sub-scores contributing to total_score")
    severity_label: str = Field(..., description="Severity category: Low, Moderate, High, Critical, or Catastrophic")
    recommended_response_level: int = Field(..., description="Recommended response level on a scale of 1 to 5")


# ==========================================
# Emergency Alert Schemas
# ==========================================
class AlertSeverityEnum(str, Enum):
    INFO = "info"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"
    EMERGENCY = "emergency"

class AlertGenerateRequest(BaseModel):
    disaster_id: str = Field(..., description="The ID of the originating disaster event")
    disaster_title: str = Field(..., description="The title of the disaster event")
    risk_score: float = Field(..., description="The calculated weighted composite risk score (0-100)")
    disaster_type: str = Field(..., description="The type of disaster (e.g. earthquake, wildfire, flood, etc.)")
    affected_area: Optional[str] = Field(None, description="Affected area or sector description")
    custom_headline: Optional[str] = Field(None, description="Custom headline override")
    custom_summary: Optional[str] = Field(None, description="Custom summary override")
    custom_actions: Optional[List[str]] = Field(None, description="Custom recommended actions override")

class AlertResponse(BaseModel):
    id: str = Field(..., description="Unique alert UUID")
    disaster_id: str = Field(..., description="The associated disaster ID")
    disaster_title: str = Field(..., description="The title of the disaster")
    disaster_type: str = Field(..., description="The type of disaster")
    severity: AlertSeverityEnum = Field(..., description="Calculated or assigned severity level")
    headline: str = Field(..., description="Clear and urgent alert title/headline")
    summary: str = Field(..., description="Detailed description/summary of the threat")
    affected_area: str = Field(..., description="Defined scope or boundaries of the affected territory")
    recommended_actions: List[str] = Field(..., description="Bullet points of recommended safety actions")
    issued_at: datetime = Field(..., description="Timestamp when issued")
    expires_at: datetime = Field(..., description="Timestamp when alert expires")
    acknowledged: bool = Field(default=False, description="Whether this alert has been acknowledged")


# ==========================================
# Disaster Situation Analysis Schemas (AI)
# ==========================================
class ImmediateThreatItem(BaseModel):
    threat: str = Field(..., description="The threat description")
    severity: str = Field(..., description="Threat severity (Critical, High, Moderate)")
    impact_area: str = Field(..., description="The area or infrastructure impacted")

class PriorityActionItem(BaseModel):
    action: str = Field(..., description="Urgent step required")
    responsible_party: str = Field(..., description="Who needs to execute this step")
    time_criticality: str = Field(..., description="Time limit for action (e.g., immediate, within 1 hour)")

class ResourceGapItem(BaseModel):
    resource: str = Field(..., description="Resource name or category")
    needed: int = Field(..., description="Quantity needed")
    available: int = Field(..., description="Quantity currently available")
    gap: int = Field(..., description="Calculated shortfall")
    mitigation_plan: str = Field(..., description="Suggested workaround or sourcing strategy")

class SituationAnalysisResponse(BaseModel):
    executive_summary: str = Field(..., description="High-level narrative overview of the situation")
    immediate_threats: List[ImmediateThreatItem] = Field(..., description="Active, unfolding hazard vectors")
    priority_actions: List[PriorityActionItem] = Field(..., description="Chronological emergency steps required")
    resource_gaps: List[ResourceGapItem] = Field(..., description="Critical shortfalls in materials/teams")
    estimated_response_window: str = Field(..., description="Critical operational window details")
    confidence_level: str = Field(..., description="AI rating of prediction quality: High, Medium, Low")
    confidence_explanation: str = Field(..., description="Justification for confidence rating")
    updated_at: str = Field(..., description="Timestamp when analysis was generated")

class SituationAnalysisRequest(BaseModel):
    disaster_id: str = Field(..., description="The unique ID of the disaster event")
    disaster_title: str = Field(..., description="Title of the disaster event")
    disaster_type: str = Field(..., description="Type of disaster (earthquake, flood, hurricane, etc.)")
    magnitude: float = Field(..., description="Magnitude or level of event")
    affected_population: int = Field(..., description="Estimated population impacted")
    damaged_critical_facilities: int = Field(..., description="Damaged critical facilities")
    total_critical_facilities: int = Field(..., description="Total critical facilities in area")
    risk_score: float = Field(..., description="The geospatial composite risk score (0-100)")
    resources: Optional[List[Dict[str, Any]]] = Field(default=None, description="Available resources and supply quantities")


class SituationReportRequest(BaseModel):
    disaster_id: str = Field(..., description="The unique ID of the disaster event")
    disaster_title: str = Field(..., description="Title of the disaster event")
    disaster_type: str = Field(..., description="Type of disaster")
    magnitude: float = Field(..., description="Magnitude of disaster")
    affected_population: int = Field(..., description="Population affected")
    damaged_critical_facilities: int = Field(..., description="Number of damaged critical facilities")
    total_critical_facilities: int = Field(..., description="Total critical facilities")
    risk_score: float = Field(..., description="Geospatial risk score")
    resources: Optional[List[Dict[str, Any]]] = Field(default=None, description="Current resource list")
    situation_analysis: Optional[SituationAnalysisResponse] = Field(default=None, description="Optional AI situation analysis context")
    previous_reports: Optional[List['SituationReportResponse']] = Field(default=None, description="Optional list of previous reports for delta tracking")


class SituationReportResponse(BaseModel):
    report_content: str = Field(..., description="The generated Markdown situation report content")
    title: str = Field(..., description="Title of the situation report")
    created_at: str = Field(..., description="Generation ISO timestamp")

# model_rebuild is required here because SituationReportRequest has a forward reference 
# to SituationReportResponse in the `previous_reports` field.
SituationReportRequest.model_rebuild()

class ChatWithContextRequest(BaseModel):
    messages: List[Dict[str, str]] = Field(..., description="The chat messages history list")
    disaster_id: str = Field(..., description="The unique ID of the disaster event")
    disaster_context: Optional[Dict[str, Any]] = Field(default=None, description="The real-time context of the disaster")


class ChatWithContextResponse(BaseModel):
    response: str = Field(..., description="The AI response content in markdown")
    suggested_questions: List[str] = Field(..., description="Exactly three suggested follow-up questions")


class ForecastTimelineItem(BaseModel):
    hour: str
    risk_score: float
    uncertainty_low: float
    uncertainty_high: float

class EscalationTriggerItem(BaseModel):
    trigger: str
    impact: str
    severity: str

class ScenarioItem(BaseModel):
    type: str
    probability: str
    description: str
    key_indicators: str
    recommended_response: str

class RecommendedActionItem(BaseModel):
    action: str
    priority: str
    timeframe: str
    rationale: str

class RiskForecastResponse(BaseModel):
    forecast_timeline: List[ForecastTimelineItem]
    escalation_triggers: List[EscalationTriggerItem]
    scenarios: List[ScenarioItem]
    recommended_actions: List[RecommendedActionItem]

class RiskForecastRequest(BaseModel):
    disaster_id: str = Field(..., description="Unique ID of the disaster")
    disaster_title: str = Field(..., description="Title of the disaster")
    disaster_type: str = Field(..., description="Type of the disaster")
    magnitude: Optional[float] = Field(default=0.0, description="Magnitude or level of event")
    affected_population: Optional[int] = Field(default=0, description="Estimated population impacted")
    damaged_critical_facilities: Optional[int] = Field(default=0, description="Damaged critical facilities")
    total_critical_facilities: Optional[int] = Field(default=0, description="Total critical facilities")
    risk_score: Optional[float] = Field(default=50.0, description="Composite risk score")
    current_analysis: Optional[SituationAnalysisResponse] = Field(default=None, description="Optional active situation analysis context")
