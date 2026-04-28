import httpx
import json
import re

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
API_KEY = "your-groq-api-key-here"
MODEL = "llama-3.3-70b-versatile"

SYSTEM_PROMPT = """You are a senior technical recruiter and career intelligence engine.
Compare a candidate's resume against a job description and produce a rigorous, honest evaluation.
Always respond with ONLY valid JSON. No explanation, no markdown, no preamble, no ```json fences."""

MATCH_PROMPT = """Compare the resume and job description below and produce a detailed match report.

Resume Analysis:
{resume_data}

Job Description Analysis:
{job_data}

Original Resume Text (for context):
{resume_text}

Original Job Description (for context):
{job_text}

Return ONLY this JSON format, nothing else:
{{
  "match_score": <integer 0-100>,
  "score_breakdown": {{
    "skills_match": <0-40>,
    "experience_match": <0-25>,
    "technology_match": <0-20>,
    "seniority_match": <0-15>
  }},
  "strong_matches": ["skills or areas where the candidate excels for this role"],
  "missing_skills": [
    {{
      "skill": "name of missing skill",
      "criticality": "critical | important | optional",
      "reason": "why this skill matters for this role"
    }}
  ],
  "risk_areas": ["areas where the candidate might struggle or be questioned"],
  "transferable_skills": ["skills the candidate has that are relevant but not explicitly required"],
  "seniority_fit": "over-qualified | well-matched | under-qualified",
  "summary": "3-4 sentence honest, professional summary of the candidate's fit for this role",
  "explanation": {{
    "why_score": "clear explanation of why the score is what it is",
    "top_concern": "the single most important thing holding the candidate back",
    "biggest_strength": "the single strongest thing the candidate brings"
  }},
  "recommendation": "apply-confidently | apply-with-preparation | significant-gaps | not-recommended"
}}
"""

async def match_resume_to_job(resume_data: dict, job_data: dict, resume_text: str, job_text: str) -> dict:
    prompt = MATCH_PROMPT.format(
        resume_data=json.dumps(resume_data, indent=2),
        job_data=json.dumps(job_data, indent=2),
        resume_text=resume_text[:1500],
        job_text=job_text[:1500]
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
        raise Exception(f"Groq API error (matcher): {response.status_code} - {response.text}")

    data = response.json()
    raw = data["choices"][0]["message"]["content"]
    raw = re.sub(r"```json|```", "", raw).strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"raw_response": raw, "parse_error": "Could not parse JSON from match analysis"}
