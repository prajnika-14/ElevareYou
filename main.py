from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from backend.services.resume_parser import parse_resume
from backend.services.job_parser import parse_job_description
from backend.services.matcher import match_resume_to_job
from backend.services.learning import generate_learning_path
from backend.services.pdf_extractor import extract_text_from_pdf
import json, os
from datetime import datetime

app = FastAPI(title="ElevareYou API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "users.json")

def load_users():
    if not os.path.exists(DATA_PATH): return []
    with open(DATA_PATH, "r") as f: return json.load(f)

def save_users(data):
    os.makedirs(os.path.dirname(DATA_PATH), exist_ok=True)
    with open(DATA_PATH, "w") as f: json.dump(data, f, indent=2)

async def run_pipeline(resume_text: str, job_text: str, user_id: str = "anonymous"):
    resume_data = await parse_resume(resume_text)
    job_data = await parse_job_description(job_text)
    match_result = await match_resume_to_job(resume_data, job_data, resume_text, job_text)
    learning_path = await generate_learning_path(
        match_result.get("missing_skills", []),
        match_result.get("risk_areas", []),
        resume_data.get("experience_summary", "")
    )
    result = {
        "timestamp": datetime.utcnow().isoformat(),
        "user_id": user_id,
        "resume_analysis": resume_data,
        "job_analysis": job_data,
        "match_result": match_result,
        "learning_path": learning_path,
    }
    users = load_users()
    users.append(result)
    save_users(users)
    return result

async def pdf_or_text(pdf_file, text_str, field_name):
    if pdf_file and pdf_file.filename:
        if not pdf_file.filename.lower().endswith(".pdf"):
            raise HTTPException(400, f"{field_name} must be a PDF file.")
        raw = await pdf_file.read()
        if len(raw) > 5 * 1024 * 1024:
            raise HTTPException(400, f"{field_name} PDF too large. Max 5MB.")
        try:
            return extract_text_from_pdf(raw)
        except ValueError as e:
            raise HTTPException(422, str(e))
    elif text_str and text_str.strip():
        return text_str.strip()
    else:
        raise HTTPException(400, f"{field_name} is required — provide PDF or text.")

# ── Text endpoint ────────────────────────────────────────────────
class AnalyzeRequest(BaseModel):
    resume: str
    job_description: str
    user_id: str = "anonymous"

@app.post("/analyze")
async def analyze(req: AnalyzeRequest):
    if not req.resume.strip(): raise HTTPException(400, "Resume text is required.")
    if not req.job_description.strip(): raise HTTPException(400, "Job description is required.")
    return await run_pipeline(req.resume, req.job_description, req.user_id)

# ── PDF / mixed endpoint ─────────────────────────────────────────
@app.post("/analyze-pdf")
async def analyze_pdf(
    resume_pdf: Optional[UploadFile] = File(None),
    resume_text: Optional[str] = Form(None),
    job_pdf: Optional[UploadFile] = File(None),
    job_text: Optional[str] = Form(None),
    user_id: str = Form("anonymous")
):
    resume_str = await pdf_or_text(resume_pdf, resume_text, "Resume")
    job_str = await pdf_or_text(job_pdf, job_text, "Job description")
    return await run_pipeline(resume_str, job_str, user_id)

@app.get("/")
def root(): return {"status": "ElevareYou API v2 running"}

@app.get("/history/{user_id}")
def history(user_id: str):
    users = load_users()
    h = [u for u in users if u.get("user_id") == user_id]
    return {"user_id": user_id, "count": len(h), "history": h}
