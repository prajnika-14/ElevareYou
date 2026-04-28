import httpx
import json
import re

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
API_KEY = "your-groq-api-key-here"
MODEL = "llama-3.3-70b-versatile"

SYSTEM_PROMPT = """You are a professional resume analysis engine.
Extract structured information from raw resume text.
Always respond with ONLY valid JSON. No explanation, no markdown, no preamble, no ```json fences."""

EXTRACT_PROMPT = """Analyze the following resume and extract structured data.

Return ONLY this JSON format, nothing else:
{{
  "skills": ["list of technical and soft skills"],
  "technologies": ["programming languages, tools, frameworks, platforms"],
  "experience_summary": "2-3 sentence overview of the candidate's experience level and domain",
  "years_of_experience": "estimated total years (e.g. '3-5 years')",
  "education": "highest qualification or relevant education",
  "strengths": ["3-5 key strengths based on the resume"],
  "weaknesses": ["2-4 potential gaps or weak areas you can detect"],
  "roles_held": ["job titles they have held"],
  "industries": ["industries they have worked in"],
  "seniority_level": "junior | mid | senior | lead | executive"
}}

Resume:
{resume}
"""

async def parse_resume(resume_text: str) -> dict:
    prompt = EXTRACT_PROMPT.format(resume=resume_text)

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
        raise Exception(f"Groq API error (resume): {response.status_code} - {response.text}")

    data = response.json()
    raw = data["choices"][0]["message"]["content"]
    raw = re.sub(r"```json|```", "", raw).strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"raw_response": raw, "parse_error": "Could not parse JSON from resume analysis"}
