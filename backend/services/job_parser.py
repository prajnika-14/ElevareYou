import httpx
import json
import re

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
API_KEY = "your-groq-api-key-here"
MODEL = "llama-3.3-70b-versatile"

SYSTEM_PROMPT = """You are a professional job description analysis engine.
Extract structured requirements from job postings.
Always respond with ONLY valid JSON. No explanation, no markdown, no preamble, no ```json fences."""

EXTRACT_PROMPT = """Analyze the following job description and extract structured data.

Return ONLY this JSON format, nothing else:
{{
  "role_title": "the job title",
  "required_skills": ["must-have skills explicitly stated"],
  "preferred_skills": ["nice-to-have or bonus skills"],
  "required_technologies": ["specific tools, languages, frameworks required"],
  "experience_required": "e.g. '3+ years in backend development'",
  "education_required": "degree or qualification requirements",
  "role_expectations": ["3-5 key responsibilities or expectations"],
  "soft_skills": ["communication, leadership, etc."],
  "industry": "the domain/industry of the role",
  "seniority_level": "junior | mid | senior | lead | executive",
  "keywords": ["important keywords or themes from the JD"]
}}

Job Description:
{jd}
"""

async def parse_job_description(jd_text: str) -> dict:
    prompt = EXTRACT_PROMPT.format(jd=jd_text)

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            GROQ_API_URL,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {API_KEY}",
            },
            json={
                "model": MODEL,
                "temperature": 0.1,
                "max_tokens": 1500,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt}
                ]
            }
        )

    if response.status_code != 200:
        raise Exception(f"Groq API error (job parser): {response.status_code} - {response.text}")

    data = response.json()
    raw = data["choices"][0]["message"]["content"]
    raw = re.sub(r"```json|```", "", raw).strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"raw_response": raw, "parse_error": "Could not parse JSON from job analysis"}
