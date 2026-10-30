from fastapi import APIRouter
from app.models.common import Envelope
from app.models.rag import AskRequest, RagAnswer
from app.rag.retrieve import answer_question

router = APIRouter(prefix="/api", tags=["RAG"])

@router.post("/ask", response_model=Envelope[RagAnswer])
async def ask(request: AskRequest):
    return Envelope.ok_response(RagAnswer(**await answer_question(request.question)))
