# ElevareYou — Career Intelligence Platform

> AI-powered resume vs job description analysis, skill gap detection, match scoring, and personalized learning roadmaps.

---

## What It Does

ElevareYou is a decision-support tool, not a resume generator. It answers:
- **"Do I actually match this job?"** — with a scored, explained breakdown
- **"What's holding me back?"** — with categorized skill gaps and risk areas
- **"What should I do next?"** — with a prioritized, phased learning path

---

## Architecture

```
Frontend (HTML/CSS/JS)
    └── fetch POST /analyze
            └── FastAPI (main.py)
                    ├── resume_parser.py   → Claude API → structured resume JSON
                    ├── job_parser.py      → Claude API → structured JD JSON
                    ├── matcher.py         → Claude API → match score + explanation
                    └── learning.py        → Claude API → learning path + projects
                            └── result persisted to data/users.json
```

---

## Folder Structure

```
elevareyou/
├── backend/
│   ├── main.py                  # FastAPI app, /analyze endpoint
│   ├── requirements.txt
│   ├── services/
│   │   ├── resume_parser.py     # Extract skills, experience, strengths
│   │   ├── job_parser.py        # Extract requirements, expectations
│   │   ├── matcher.py           # Score, gaps, explanation engine
│   │   └── learning.py          # Learning path + portfolio projects
│   └── data/
│       └── users.json           # Persisted analysis results
└── frontend/
    ├── index.html               # Single-page app
    ├── style.css                # Dark editorial design system
    └── script.js                # fetch() logic + result rendering
```

---

## Setup & Running Locally

### Prerequisites
- Python 3.10+
- An Anthropic API key (get one at https://console.anthropic.com)

### 1. Install backend dependencies

```bash
cd elevareyou/backend
pip install -r requirements.txt
```

### 2. Set your Anthropic API key

The services call the Anthropic API directly. Set your key as an environment variable:

```bash
# Mac/Linux
export ANTHROPIC_API_KEY=sk-ant-...

# Windows
set ANTHROPIC_API_KEY=sk-ant-...
```

Then update each service file to pass the key in the request header:

In `resume_parser.py`, `job_parser.py`, `matcher.py`, `learning.py` — update the headers in the `httpx.AsyncClient` call:

```python
headers={
    "Content-Type": "application/json",
    "x-api-key": os.environ.get("ANTHROPIC_API_KEY", ""),
    "anthropic-version": "2023-06-01"
},
```

Also add `import os` at the top of each service file.

### 3. Start the FastAPI server

```bash
cd elevareyou/backend
uvicorn main:app --reload --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
```

### 4. Open the frontend

Simply open `frontend/index.html` in a browser:
```bash
open elevareyou/frontend/index.html
# or just double-click the file
```

The frontend calls `http://localhost:8000` — make sure the backend is running first.

---

## API Reference

### POST /analyze

**Request:**
```json
{
  "resume": "John Smith\nSoftware Engineer with 4 years...",
  "job_description": "We're looking for a Senior Python Developer...",
  "user_id": "optional-user-id"
}
```

**Response:**
```json
{
  "timestamp": "2025-01-15T14:30:00",
  "user_id": "optional-user-id",
  "resume_analysis": {
    "skills": ["Python", "Django", "REST APIs", "PostgreSQL"],
    "technologies": ["Python", "Django", "Docker", "Git"],
    "experience_summary": "4 years of backend development...",
    "years_of_experience": "3-5 years",
    "strengths": ["Strong Python fundamentals", "API design"],
    "weaknesses": ["Limited cloud experience", "No Kubernetes"],
    "seniority_level": "mid"
  },
  "job_analysis": {
    "role_title": "Senior Python Engineer",
    "required_skills": ["Python", "FastAPI", "AWS", "Kubernetes"],
    "preferred_skills": ["Terraform", "GraphQL"],
    "seniority_level": "senior"
  },
  "match_result": {
    "match_score": 68,
    "score_breakdown": {
      "skills_match": 26,
      "experience_match": 18,
      "technology_match": 14,
      "seniority_match": 10
    },
    "strong_matches": ["Python", "REST APIs", "PostgreSQL"],
    "missing_skills": [
      {
        "skill": "AWS",
        "criticality": "critical",
        "reason": "Core infrastructure requirement for this team"
      },
      {
        "skill": "Kubernetes",
        "criticality": "critical",
        "reason": "All services are containerized and orchestrated on K8s"
      }
    ],
    "risk_areas": ["No cloud infrastructure experience evident", "May lack senior-level system design exposure"],
    "transferable_skills": ["Docker familiarity will ease Kubernetes learning"],
    "seniority_fit": "under-qualified",
    "summary": "Strong Python developer with solid fundamentals...",
    "explanation": {
      "why_score": "Core Python skills match well but cloud infrastructure gaps are significant for this senior role",
      "biggest_strength": "Solid Python and API development background",
      "top_concern": "Zero AWS or cloud infrastructure experience for a cloud-native team"
    },
    "recommendation": "apply-with-preparation"
  },
  "learning_path": {
    "immediate_actions": [
      {
        "action": "Complete AWS Cloud Practitioner certification",
        "reason": "AWS is listed as a critical requirement — this shows intent",
        "time_estimate": "2-3 weeks"
      }
    ],
    "learning_phases": [
      {
        "phase": 1,
        "level": "beginner",
        "title": "AWS Foundations",
        "duration": "3 weeks",
        "skills_to_learn": ["EC2", "S3", "IAM", "RDS"],
        "resources": [
          {
            "type": "course",
            "title": "AWS Cloud Practitioner Essentials",
            "why": "Official AWS training, respected by employers"
          }
        ],
        "milestone": "Can describe and use core AWS services confidently in interviews"
      }
    ],
    "portfolio_projects": [
      {
        "project_title": "Deploy Django App on AWS ECS",
        "description": "Take your existing Django project, containerize it, push to ECR, deploy on ECS",
        "skills_demonstrated": ["Docker", "AWS ECS", "ECR", "IAM"],
        "impact": "Proves hands-on cloud deployment capability — directly addresses the top gap"
      }
    ],
    "interview_prep": [
      "Prepare to answer: 'Tell me about a time you designed a scalable system'",
      "Know the difference between microservices and monolith — this team is likely microservices"
    ],
    "timeline_to_job_ready": "6-8 weeks with focused effort"
  }
}
```

### GET /history/{user_id}

Returns all previous analyses for a given user ID.

---

## Extending ElevareYou

| What to add | Where |
|---|---|
| PDF resume upload | Add `python-multipart` + extract text with `pdfminer.six` in `main.py` |
| User auth | Add JWT middleware to `main.py`, replace `users.json` with SQLite |
| Frontend framework | Port `script.js` logic to React for component reuse |
| Multiple JD comparison | Add `POST /compare` endpoint that runs analysis against multiple JDs |
| Score history chart | Read `/history/{user_id}` and render a progress chart in JS |

---

## Design Decisions

- **Structured prompting**: Every Claude call uses a strict system prompt + explicit JSON schema — not open-ended chat. This makes outputs predictable and parseable.
- **4-layer pipeline**: Each service does one job (parse, match, learn) — easy to debug, test, or swap.
- **No framework lock-in**: Frontend is plain HTML/JS — zero build step, easy to understand.
- **Explainability first**: The `explanation` block is mandatory in every match response — the system must justify its score.
