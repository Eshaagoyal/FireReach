import os
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import asyncio

load_dotenv()

from agent import run_outreach_flow
from tools.sender import tool_send_email

app = FastAPI(title="FireReach Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "https://fire-reach-pearl.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class OutreachRequest(BaseModel):
    company_name: str
    icp: str
    recipient: str = "test@example.com"

class SendEmailRequest(BaseModel):
    subject: str
    body: str
    recipient: str
    sender: str = None

@app.get("/api/status")
async def get_api_status():
    keys = {
        "groq": bool(os.environ.get("GROQ_API_KEY", "").strip('"')),
        "tavily": bool(os.environ.get("TAVILY_API_KEY", "").strip('"')),
        "gmail": bool(os.environ.get("GMAIL_USER", "").strip('"') and os.environ.get("GMAIL_PASS", "").strip('"')) and os.environ.get("GMAIL_USER", "").strip('"') != "yourgmail@gmail.com"
    }
    return keys

async def generate_outreach(company_name: str, icp: str, recipient: str):
    """Async generator wrapper for streaming response"""
    try:
        async for message in run_outreach_flow(company_name, icp, recipient):
            yield message
    except Exception as e:
        yield f"data: {{'log': 'Error: {str(e)}', 'type': 'error'}}\n\n"

@app.post("/api/run-outreach")
async def run_outreach(request: OutreachRequest):
    return StreamingResponse(
        generate_outreach(request.company_name, request.icp, request.recipient),
        media_type="text/event-stream"
    )

@app.post("/api/send-email")
async def send_email(request: SendEmailRequest):
    """
    Sends an email with the provided subject, body, and recipient.
    Used to send edited emails after the agent generates them.
    """
    result = tool_send_email(
        subject=request.subject,
        body=request.body,
        recipient=request.recipient,
        sender=request.sender
    )
    return result

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
