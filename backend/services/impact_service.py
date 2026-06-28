import os
from datetime import datetime, timedelta
from typing import List, Dict, Any

def estimate_task_impact(deadline_str: str, estimated_duration_hours: float) -> Dict[str, Any]:
    """
    Calculates task impact zones based on the deadline and estimated duration.
    
    The safety timeline is divided into 4 zones based on how much time is left until the deadline
    relative to the estimated task duration:
    - Critical Zone (Red): 0 to 1x the task duration before the deadline. Zero buffer remaining.
    - High Zone (Orange): 1.0x to 1.5x the task duration. Extremely tight, delays will overflow.
    - Medium Zone (Yellow): 1.5x to 3.0x the task duration. Reasonable safety buffer.
    - Low Zone (Green): Greater than 3.0x the task duration. Completely safe starting window.
    
    Returns a dictionary containing hours remaining, urgency score, zone details, and custom suggestions.
    """
    try:
        # Standard ISO string parsing
        cleaned = deadline_str.replace("Z", "")
        if "T" in cleaned:
            if "." in cleaned:
                cleaned = cleaned.split(".")[0]
            deadline_dt = datetime.strptime(cleaned, "%Y-%m-%dT%H:%M:%S")
        else:
            deadline_dt = datetime.fromisoformat(cleaned)
    except Exception:
        # Default safety fallback if string parsing fails (e.g. 6 hours from now)
        deadline_dt = datetime.now() + timedelta(hours=6)

    now = datetime.now()
    diff_seconds = (deadline_dt - now).total_seconds()
    hours_remaining = max(0.1, diff_seconds / 3600.0)

    # 1. Critical time: the immediate time before deadline that is needed to do the work.
    critical_time = min(hours_remaining, estimated_duration_hours)
    
    # 2. High time: the buffer from 1.0x to 1.5x duration
    high_buffer_limit = estimated_duration_hours * 0.5
    high_time = min(max(0.0, hours_remaining - critical_time), high_buffer_limit)
    
    # 3. Medium time: the buffer from 1.5x to 3.0x duration
    medium_buffer_limit = estimated_duration_hours * 1.5
    medium_time = min(max(0.0, hours_remaining - critical_time - high_time), medium_buffer_limit)
    
    # 4. Low time: everything beyond 3.0x duration
    low_time = max(0.0, hours_remaining - critical_time - high_time - medium_time)

    # Compute percentages relative to total remaining hours
    crit_pct = (critical_time / hours_remaining) * 100.0
    high_pct = (high_time / hours_remaining) * 100.0
    med_pct = (medium_time / hours_remaining) * 100.0
    low_pct = (low_time / hours_remaining) * 100.0

    zones = [
        {
            "name": "Critical Zone",
            "duration_hours": round(critical_time, 2),
            "percentage": round(crit_pct, 1),
            "description": "Zero buffer. Starting in this window means non-stop pressure to finish on time with no errors.",
            "color": "red"
        },
        {
            "name": "High Zone",
            "duration_hours": round(high_time, 2),
            "percentage": round(high_pct, 1),
            "description": "High friction. Any unexpected disruption (bug, call, fatigue) will slide you into overdue.",
            "color": "orange"
        },
        {
            "name": "Medium Zone",
            "duration_hours": round(medium_time, 2),
            "percentage": round(med_pct, 1),
            "description": "Healthy buffer. Provides room for brief breaks, debugging, and light proofreading.",
            "color": "yellow"
        },
        {
            "name": "Low Zone",
            "duration_hours": round(low_time, 2),
            "percentage": round(low_pct, 1),
            "description": "Premium comfort. Completely relaxed window with maximum strategic flexibility.",
            "color": "green"
        }
    ]

    # Calculate Urgency Score (0 to 100)
    ratio = estimated_duration_hours / hours_remaining
    if ratio >= 1.0:
        urgency_score = 100
    else:
        # Linear/proportional mapping with lower bound at 0
        urgency_score = int(max(0, min(99, ratio * 100)))

    # Smart context-aware suggestions
    recommendations = []
    if urgency_score >= 90:
        recommendations.append("🚨 PANIC LEVEL DANGER: You have zero safety margin left. Stop studying calendars, disable notifications, and execute the core task immediately.")
        recommendations.append("⚡ DESCOPE ARCHITECTURE: Do not build nice-to-haves. Focus strictly on completing the essential core requirements.")
        recommendations.append("💬 SIGNAL LATE RISK: Inform any partner or supervisor of a potential micro-delay, showing a clear roadmap of your progress.")
    elif urgency_score >= 75:
        recommendations.append("⚠️ EXTREME RUSH RISK: You are on the precipice of entering the Critical Zone. Every 10 minutes of delay removes 5% of your stress-coping buffer.")
        recommendations.append("⏱️ POMODORO SPRINT: Run two back-to-back 25-minute sprints without touching your phone or switching tabs.")
        recommendations.append("📝 MICRO-GOAL LIST: Write down exactly 3 simple deliverables on a sticky note and do not look at anything else.")
    elif urgency_score >= 50:
        recommendations.append("🛡️ PROACTIVE INTERVENTION: You have a healthy buffer, but procrastinating now will escalate anxiety. Start early to work with an ease-of-mind state.")
        recommendations.append("📅 BLOCK INTEGRATION: Lock a dedicated 60-minute window in your timeline right now.")
        recommendations.append("🔍 FRICTION REMOVAL: Open all necessary IDEs, API documentation, or templates now so that starting tomorrow is effortless.")
    else:
        recommendations.append("✅ PREMIUM SAFE WINDOW: You are in the green zone. Take advantage of your early start to design a clean, modular solution.")
        recommendations.append("🛌 COGNITIVE HYGIENE: Prioritize deep sleep tonight; study shows a well-rested brain performs 40% faster on complex tasks.")
        recommendations.append("📝 INITIAL SKETCH: Draft a quick bulleted outline for 10 minutes, making the hard start much easier later on.")

    return {
        "hours_remaining": round(hours_remaining, 2),
        "urgency_score": urgency_score,
        "zones": zones,
        "recommendations": recommendations
    }
