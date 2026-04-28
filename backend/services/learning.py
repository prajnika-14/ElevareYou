import httpx
import json
import re

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
API_KEY = "your-groq-api-key-here"
MODEL = "llama-3.3-70b-versatile"

SYSTEM_PROMPT = """You are a senior career development coach and technical educator.
Create practical, ordered learning paths for professionals targeting specific roles.
Always respond with ONLY valid JSON. No explanation, no markdown, no preamble, no ```json fences."""

LEARNING_PROMPT = """Based on the missing skills, risk areas, and candidate background, create a structured learning path.

Missing Skills:
{missing_skills}

Risk Areas:
{risk_areas}

Candidate Background:
{experience_summary}

Return ONLY this JSON format, nothing else:
{{
  "immediate_actions": [
    {{
      "action": "what to do this week",
      "reason": "why this matters most right now",
      "time_estimate": "e.g. 2-3 days"
    }}
  ],
  "learning_phases": [
    {{
      "phase": 1,
      "level": "beginner | intermediate | advanced",
      "title": "phase title",
      "duration": "estimated time e.g. 2 weeks",
      "skills_to_learn": ["skill1", "skill2"],
      "resources": [
        {{
          "type": "course | book | project | documentation | tutorial",
          "title": "resource name",
          "why": "why this specific resource"
        }}
      ],
      "milestone": "what you can do after completing this phase"
    }}
  ],
  "portfolio_projects": [
    {{
      "project_title": "name of the project",
      "description": "what to build",
      "skills_demonstrated": ["skill1", "skill2"],
      "impact": "why this project impresses hiring managers"
    }}
  ],
  "interview_prep": [
    "specific advice on what to prepare for interviews for this type of role"
  ],
  "timeline_to_job_ready": "realistic estimate e.g. 6-8 weeks"
}}
"""

async def generate_learning_path(missing_skills: list, risk_areas: list, experience_summary: str) -> dict:
    skills_text = []
    for s in missing_skills:
        if isinstance(s, dict):
            skills_text.append(f"- {s.get('skill', '')} ({s.get('criticality', 'unknown')}): {s.get('reason', '')}")
        else:
            skills_text.append(f"- {s}")

    prompt = LEARNING_PROMPT.format(
        missing_skills="\n".join(skills_text) if skills_text else "None identified",
        risk_areas="\n".join(f"- {r}" for r in risk_areas) if risk_areas else "None identified",
        experience_summary=experience_summary or "Not provided"
    )

    async with httpx.AsyncClient(timeout=90.0) as client:
        response = await client.post(
            GROQ_API_URL,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {API_KEY}",
            },
            json={
                "model": MODEL,
                "temperature": 0.1,
                "max_tokens": 2000,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt}
                ]
            }
        )

    if response.status_code != 200:
        raise Exception(f"Groq API error (learning): {response.status_code} - {response.text}")

    data = response.json()
    raw = data["choices"][0]["message"]["content"]
    raw = re.sub(r"```json|```", "", raw).strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"raw_response": raw, "parse_error": "Could not parse JSON from learning path"}
