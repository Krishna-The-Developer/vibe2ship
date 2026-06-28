import os
from datetime import datetime, timedelta
from typing import List, Dict, Any

def analyze_critical_tasks(tasks_list: List[Dict[str, Any]], current_time: datetime = None) -> Dict[str, Any]:
    """
    Analyzes active tasks relative to their deadlines, durations, and priorities.
    Categorizes tasks into Critical, High, Medium, and Low risk zones based on available time buffers,
    accounting for user-specified priority states (e.g. panic or high priority).
    
    Returns structured analysis with aggregate counts, individual item breakdowns, and overall list recommendations.
    """
    if current_time is None:
        current_time = datetime.now()

    analyzed_tasks = []
    critical_count = 0
    high_count = 0
    medium_count = 0
    low_count = 0

    for task in tasks_list:
        task_id = task.get("id", "")
        title = task.get("title", "Untitled Task")
        priority = task.get("priority", "medium").lower()
        duration_mins = task.get("duration", 30)
        duration_hours = max(0.1, duration_mins / 60.0)
        deadline_str = task.get("deadline", "")
        completed = task.get("completed", False)

        # Parse deadline
        try:
            cleaned = deadline_str.replace("Z", "")
            if "T" in cleaned:
                if "." in cleaned:
                    cleaned = cleaned.split(".")[0]
                deadline_dt = datetime.strptime(cleaned, "%Y-%m-%dT%H:%M:%S")
            else:
                deadline_dt = datetime.fromisoformat(cleaned)
        except Exception:
            deadline_dt = current_time + timedelta(hours=6)

        # Calculate chronological remaining hours
        diff_seconds = (deadline_dt - current_time).total_seconds()
        hours_left = round(diff_seconds / 3600.0, 2)

        # Base Risk level calculation based on safety ratio (time left / duration needed)
        if completed:
            base_risk = "Low"
        elif hours_left <= 0:
            base_risk = "Critical"
        else:
            ratio = hours_left / duration_hours
            if ratio <= 1.0:
                base_risk = "Critical"
            elif ratio <= 1.8:
                base_risk = "High"
            elif ratio <= 3.5:
                base_risk = "Medium"
            else:
                base_risk = "Low"

        # Apply Priority Escalation adjustments
        # If the user marked the task as 'panic' or 'high', elevate the cognitive risk level
        final_risk = base_risk
        if not completed:
            if priority == "panic":
                if base_risk == "Low":
                    final_risk = "High"
                elif base_risk == "Medium":
                    final_risk = "Critical"
                elif base_risk == "High":
                    final_risk = "Critical"
            elif priority == "high":
                if base_risk == "Low":
                    final_risk = "Medium"
                elif base_risk == "Medium":
                    final_risk = "High"
                elif base_risk == "High":
                    final_risk = "Critical"

        # Map risk categories to color codes
        color_code = "green"
        if final_risk == "Critical":
            color_code = "red"
            critical_count += 1
        elif final_risk == "High":
            color_code = "orange"
            high_count += 1
        elif final_risk == "Medium":
            color_code = "yellow"
            medium_count += 1
        else:
            low_count += 1

        # Tailor specific suggested action based on risk level and priority
        if completed:
            suggested_action = "🎉 TASK COMPLETED: Excellent job! This slot is fully unlocked as a guilt-free buffer zone."
        elif final_risk == "Critical":
            if priority == "panic":
                suggested_action = "🚨 EMERGENCY OVERDRIVE: Shut down email, phone, and Slack. Execute the MVP immediately. No formatting, just core logic."
            else:
                suggested_action = "🛑 CORE CRITICAL: You have zero time buffer. Start immediate execution. Break into 3 immediate micro-actions and run a sprint."
        elif final_risk == "High":
            suggested_action = "⚠️ LOCK IT IN: Buffer is extremely tight. Formally block a dedicated focus period in your calendar today to clear this before panic sets in."
        elif final_risk == "Medium":
            suggested_action = "🛡️ SCHEDULE COGNITIVE BUFFER: Healthy safety margin. Target this task during your next scheduled focus interval to keep stress low."
        else:
            suggested_action = "✅ PROACTIVE STABILITY: Fully safe. Spend 10 minutes drafting an outline to make the eventual kickoff seamless."

        analyzed_tasks.append({
            "id": task_id,
            "title": title,
            "priority": priority,
            "hours_left": max(0.0, hours_left),
            "risk_level": final_risk,
            "suggested_action": suggested_action,
            "color_code": color_code
        })

    # Sort analyzed tasks: Critical -> High -> Medium -> Low
    risk_rank = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}
    analyzed_tasks.sort(key=lambda x: risk_rank.get(x["risk_level"], 4))

    # Compile overall high-level recommendations
    overall_recommendations = []
    total_active = critical_count + high_count + medium_count

    if total_active == 0:
        overall_recommendations.append("🌟 COGNITIVE CALM ACHIEVED: You have zero pending high-risk tasks. Enjoy a guilt-free break to restore cognitive reserves!")
    else:
        if critical_count > 0:
            overall_recommendations.append(f"🚨 IMMEDIATE ACTION REQUIRED: You have {critical_count} Critical-risk task(s). Postpone non-essential events and resolve these first.")
        if high_count > 0:
            overall_recommendations.append(f"⚠️ CALENDAR LOCK: Formally map your {high_count} High-risk task(s) into your afternoon/tomorrow's schedule to prevent panic mode.")
        if critical_count == 0 and high_count == 0:
            overall_recommendations.append("📈 SECURE STEADY PACE: All active tasks are in Medium or Low risk zones. Preserve this buffer by chipping away at deliverables early.")
        
        # Add a resource/time allocation advice
        overall_recommendations.append("🛡️ SHIELD YOUR SPRINT: When working on high-risk tasks, run 25/5 Pomodoro intervals and use our Panic Breathing Defuser to regulate heart rate variability.")

    return {
        "critical_count": critical_count,
        "high_count": high_count,
        "medium_count": medium_count,
        "low_count": low_count,
        "analyzed_tasks": analyzed_tasks,
        "overall_recommendations": overall_recommendations
    }
