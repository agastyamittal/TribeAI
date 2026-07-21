import os
import uuid
import json
from datetime import datetime
from typing import Optional

import anthropic
import chromadb
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

app = FastAPI(title="TribeAI")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Persistent state ─────────────────────────────────────────────────────────

DATA_FILE = os.path.join(os.path.dirname(__file__), "data.json")

experts: dict[str, dict] = {}
sessions: dict[str, dict] = {}
knowledge_entries: dict[str, dict] = {}
validated_knowledge: list[dict] = []


def save_state():
    payload = {
        "experts": experts,
        "sessions": sessions,
        "knowledge_entries": knowledge_entries,
        "validated_knowledge": validated_knowledge,
    }
    with open(DATA_FILE, "w") as f:
        json.dump(payload, f, indent=2)


def load_state():
    global experts, sessions, knowledge_entries, validated_knowledge
    if not os.path.exists(DATA_FILE):
        return
    with open(DATA_FILE) as f:
        data = json.load(f)
    experts = data.get("experts", {})
    sessions = data.get("sessions", {})
    knowledge_entries = data.get("knowledge_entries", {})
    validated_knowledge = data.get("validated_knowledge", [])

ROLES = {
    "cnc_machinist": {"title": "CNC Machinist"},
    "maintenance_tech": {"title": "Maintenance Technician"},
    "quality_inspector": {"title": "Quality Inspector"},
}

# ── API clients ─────────────────────────────────────────────────────────────

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

def get_claude_client():
    if not ANTHROPIC_API_KEY or ANTHROPIC_API_KEY == "your-api-key-here":
        raise HTTPException(
            503,
            "ANTHROPIC_API_KEY not configured. Set a valid key in backend/.env"
        )
    return anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

# ── ChromaDB ────────────────────────────────────────────────────────────────

CHROMA_DIR = os.path.join(os.path.dirname(__file__), "chroma_data")
chroma_client = chromadb.PersistentClient(path=CHROMA_DIR)
knowledge_collection = chroma_client.get_or_create_collection(
    name="tribe_knowledge",
    metadata={"hnsw:space": "cosine"},
)

load_state()

# ── System prompts ──────────────────────────────────────────────────────────

INTERVIEW_SYSTEM_PROMPT = """You are TribeAI, an expert knowledge capture interviewer specializing in manufacturing and industrial operations. Your job is to conduct a structured interview with an experienced manufacturing professional to extract their tacit knowledge the unwritten expertise that exists only in their heads.

Interview guidelines:
1. Be warm, respectful, and genuinely curious. These experts have decades of irreplaceable experience.
2. Ask open ended questions that elicit stories, procedures, and "tricks of the trade."
3. When the expert mentions something interesting, probe deeper. Ask "why" and "how", not just "what."
4. Focus on knowledge that is NOT in manuals: sensory cues (sounds, smells, feel), workarounds, personal heuristics, failure patterns, and rules of thumb.
5. Cover these knowledge categories when relevant:
   - Machine quirks and undocumented behaviors
   - Material behavior and batch to batch variation
   - Troubleshooting sequences (what to check first, second, third)
   - Techniques and workarounds
   - Safety practices beyond the manual
   - Quality checks and inspection tricks
6. Keep your responses concise (couple of sentences). Summarize what the expert just said to show you understood, then ask the next probing question.
7. After 5 to 7 exchanges, naturally wrap up the session by summarizing key insights and thanking the expert.
8. Never make up technical details. Reflect back what the expert tells you.
9. Never use markdown formatting in your responses. No asterisks, no bullet points, no numbered lists, no headers, no bold, no italics. Write in plain conversational English only.

You are interviewing: {expert_name}, a {role_title} with {years_experience} years of experience.
Interview trigger: {trigger}
{context_line}"""

EXTRACTION_SYSTEM_PROMPT = """You are a knowledge extraction engine for TribeAI, a manufacturing knowledge management system. Analyze the interview transcript and extract discrete, actionable knowledge entries.

For each piece of knowledge, output a JSON object with these fields:
- "type": one of "machine_quirk", "material_behavior", "troubleshooting", "technique", "safety", "quality_check"
- "machine": the specific machine, system, or general area (e.g., "CNC Lathe — Spindle Assembly")
- "symptom": what the operator would observe or the problem statement
- "diagnosis": the root cause or explanation
- "solution": step by step actionable guidance
- "confidence": "high" if the expert was specific and detailed, "medium" if somewhat general, "low" if vague
- "keywords": an array of lowercase search terms relevant to this entry

Rules:
1. Extract 3 to 8 entries from a typical interview. Do not over extract trivial statements.
2. Each entry should be self contained, meaning someone reading it with no other context should understand the full problem and solution.
3. Preserve the expert's specific numbers, measurements, and named products exactly as stated.
4. If the expert described a sequence (check A, then B, then C), preserve the order.
5. Do not invent information. Only extract what was explicitly stated in the transcript.

Return a JSON array of objects. Return ONLY the JSON array, no other text."""

DIGITAL_EXPERT_SYSTEM_PROMPT = """You are the TribeAI Digital Expert, an AI assistant that answers manufacturing questions using a knowledge base of validated expertise from experienced professionals.

Rules:
1. ONLY use the provided knowledge entries to answer. Do not use your general training knowledge about manufacturing.
2. If the provided entries don't contain relevant information, say so honestly. Do not guess.
3. Cite which expert and which knowledge entry type your answer draws from.
4. Be specific and actionable. Include exact numbers, sequences, and techniques from the knowledge base.
5. Start your answer with "Based on validated knowledge from our experts:" when you have relevant entries.
6. If multiple entries are relevant, synthesize them into a coherent answer.
7. Keep answers concise but complete, around 1 to 3 paragraphs.
8. Never use markdown formatting in your responses. No asterisks, no bullet points, no numbered lists, no headers, no bold, no italics. Write in plain
  conversational English only."""

# ── Pydantic models ──────────────────────────────────────────────────────────

class ExpertCreate(BaseModel):
    name: str
    role: str
    years_experience: int
    retirement_date: str

class InterviewMessage(BaseModel):
    session_id: str
    message: str

class ValidationAction(BaseModel):
    entry_id: str
    approved: bool

class DigitalExpertQuery(BaseModel):
    question: str
    expert_id: Optional[str] = None

# ── Expert endpoints ─────────────────────────────────────────────────────────

@app.get("/api/experts")
def list_experts():
    return list(experts.values())

@app.post("/api/experts")
def create_expert(data: ExpertCreate):
    if data.role not in ROLES:
        raise HTTPException(400, f"Invalid role. Choose from: {list(ROLES.keys())}")
    expert_id = str(uuid.uuid4())[:8]
    expert = {
        "id": expert_id,
        "name": data.name,
        "role": data.role,
        "role_title": ROLES[data.role]["title"],
        "years_experience": data.years_experience,
        "retirement_date": data.retirement_date,
        "sessions_completed": 0,
        "knowledge_entries": 0,
        "created_at": datetime.now().isoformat(),
    }
    experts[expert_id] = expert
    save_state()
    return expert

# ── Interview endpoints ──────────────────────────────────────────────────────

@app.post("/api/interviews/start")
def start_interview(expert_id: str, trigger: str = "retirement", context: str = ""):
    if expert_id not in experts:
        raise HTTPException(404, "Expert not found")

    client = get_claude_client()
    expert = experts[expert_id]

    context_line = f"Additional context: {context}" if context.strip() else ""
    system_prompt = INTERVIEW_SYSTEM_PROMPT.format(
        expert_name=expert["name"],
        role_title=expert["role_title"],
        years_experience=expert["years_experience"],
        trigger=trigger,
        context_line=context_line,
    )

    opening_user_msg = {
        "retirement": "The expert is ready to begin a general knowledge transfer session before retirement.",
        "incident": f"The expert just resolved a critical incident. {context_line}",
        "topic": f"This session focuses on a specific topic. {context_line}",
        "gap": f"This session addresses a knowledge gap identified by the system. {context_line}",
    }.get(trigger, "The expert is ready to begin.")

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=system_prompt,
        messages=[{"role": "user", "content": opening_user_msg}],
    )
    ai_text = response.content[0].text

    session_id = str(uuid.uuid4())[:8]
    sessions[session_id] = {
        "id": session_id,
        "expert_id": expert_id,
        "trigger": trigger,
        "context": context,
        "system_prompt": system_prompt,
        "messages": [
            {"role": "user", "content": opening_user_msg},
            {"role": "assistant", "content": ai_text},
        ],
        "started_at": datetime.now().isoformat(),
    }

    save_state()
    return {"session_id": session_id, "message": ai_text}

@app.post("/api/interviews/message")
def send_interview_message(data: InterviewMessage):
    if data.session_id not in sessions:
        raise HTTPException(404, "Session not found")

    client = get_claude_client()
    session = sessions[data.session_id]

    session["messages"].append({"role": "user", "content": data.message})

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=session["system_prompt"],
        messages=session["messages"],
    )
    ai_text = response.content[0].text

    session["messages"].append({"role": "assistant", "content": ai_text})

    save_state()
    return {"message": ai_text}

@app.get("/api/interviews/{session_id}")
def get_interview(session_id: str):
    if session_id not in sessions:
        raise HTTPException(404, "Session not found")
    return sessions[session_id]

# ── Knowledge extraction ─────────────────────────────────────────────────────

@app.post("/api/extract/{session_id}")
def extract_knowledge(session_id: str):
    if session_id not in sessions:
        raise HTTPException(404, "Session not found")

    client = get_claude_client()
    session = sessions[session_id]
    expert = experts[session["expert_id"]]

    transcript_lines = []
    for msg in session["messages"]:
        speaker = "Interviewer" if msg["role"] == "assistant" else expert["name"]
        transcript_lines.append(f"{speaker}: {msg['content']}")
    transcript = "\n\n".join(transcript_lines)

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        system=EXTRACTION_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": f"Interview transcript:\n\n{transcript}"}],
    )

    raw_text = response.content[0].text.strip()
    if raw_text.startswith("```"):
        raw_text = raw_text.split("\n", 1)[1] if "\n" in raw_text else raw_text[3:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]
        raw_text = raw_text.strip()

    try:
        extracted_items = json.loads(raw_text)
    except json.JSONDecodeError:
        raise HTTPException(500, "Failed to parse knowledge extraction. Please try again.")

    created = []
    for entry_data in extracted_items:
        entry_id = str(uuid.uuid4())[:8]
        knowledge = {
            "id": entry_id,
            "expert_id": session["expert_id"],
            "expert_name": expert["name"],
            "session_id": session_id,
            "type": entry_data.get("type", "technique"),
            "machine": entry_data.get("machine", "Unknown"),
            "symptom": entry_data.get("symptom", ""),
            "diagnosis": entry_data.get("diagnosis", ""),
            "solution": entry_data.get("solution", ""),
            "confidence": entry_data.get("confidence", "medium"),
            "status": "pending",
            "created_at": datetime.now().isoformat(),
            "_keywords": entry_data.get("keywords", []),
        }
        knowledge_entries[entry_id] = knowledge
        created.append(knowledge)

    experts[session["expert_id"]]["sessions_completed"] += 1
    save_state()
    return created

# ── Validation endpoints ─────────────────────────────────────────────────────

@app.get("/api/knowledge")
def list_knowledge(expert_id: Optional[str] = None, status: Optional[str] = None):
    entries = list(knowledge_entries.values())
    if expert_id:
        entries = [e for e in entries if e["expert_id"] == expert_id]
    if status:
        entries = [e for e in entries if e["status"] == status]
    return entries

@app.post("/api/knowledge/validate")
def validate_entry(data: ValidationAction):
    if data.entry_id not in knowledge_entries:
        raise HTTPException(404, "Entry not found")
    entry = knowledge_entries[data.entry_id]

    if data.approved:
        entry["status"] = "validated"
        validated_knowledge.append(entry)

        embed_text = f"{entry['type']}: {entry['machine']}. Symptom: {entry['symptom']}. Diagnosis: {entry['diagnosis']}. Solution: {entry['solution']}"
        keywords = entry.get("_keywords", [])
        if keywords:
            embed_text += f". Keywords: {', '.join(keywords)}"

        knowledge_collection.upsert(
            ids=[entry["id"]],
            documents=[embed_text],
            metadatas=[{
                "expert_name": entry["expert_name"],
                "type": entry["type"],
                "machine": entry["machine"],
                "confidence": entry["confidence"],
            }],
        )

        experts[entry["expert_id"]]["knowledge_entries"] = len([
            e for e in knowledge_entries.values()
            if e["expert_id"] == entry["expert_id"] and e["status"] == "validated"
        ])
    else:
        entry["status"] = "rejected"

    save_state()
    return entry

# ── Digital Expert (RAG) ─────────────────────────────────────────────────────

@app.post("/api/ask")
def ask_digital_expert(data: DigitalExpertQuery):
    if not validated_knowledge:
        return {
            "answer": "No validated knowledge entries yet. Complete an interview and validate the extracted knowledge first.",
            "sources": [],
        }

    client = get_claude_client()

    results = knowledge_collection.query(
        query_texts=[data.question],
        n_results=min(5, knowledge_collection.count()),
    )

    if not results["documents"] or not results["documents"][0]:
        return {
            "answer": "I couldn't find any relevant knowledge entries for your question. Try rephrasing or asking about a different topic.",
            "sources": [],
        }

    context_entries = []
    sources = []
    for i, (doc, meta) in enumerate(zip(results["documents"][0], results["metadatas"][0])):
        context_entries.append(f"Entry {i+1} (from {meta['expert_name']}, {meta['type']}, {meta['machine']}):\n{doc}")
        sources.append({
            "expert_name": meta["expert_name"],
            "type": meta["type"],
            "machine": meta["machine"],
            "confidence": meta["confidence"],
            "text": f"[{meta['type']}] {doc[:100]}...",
        })

    context_block = "\n\n".join(context_entries)

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=DIGITAL_EXPERT_SYSTEM_PROMPT,
        messages=[{
            "role": "user",
            "content": f"Knowledge base entries:\n\n{context_block}\n\n---\n\nQuestion: {data.question}",
        }],
    )

    return {
        "answer": response.content[0].text,
        "sources": sources[:3],
    }

# ── Deepgram key endpoint ────────────────────────────────────────────────────

@app.get("/api/deepgram-key")
def get_deepgram_key():
    key = os.getenv("DEEPGRAM_API_KEY")
    if not key or key == "your-deepgram-key-here":
        raise HTTPException(500, "DEEPGRAM_API_KEY not configured")
    return {"key": key}

# ── Health check ─────────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    return {"status": "ok", "knowledge_count": len(validated_knowledge)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
