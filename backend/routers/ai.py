from fastapi import APIRouter, HTTPException, status
from models.schemas import ChatWithContextRequest, ChatWithContextResponse
from services.gemini_service import GeminiService

router = APIRouter(tags=["AI Chat"])
gemini_service = GeminiService()

@router.post("/ai/chat", response_model=ChatWithContextResponse, status_code=status.HTTP_200_OK)
async def chat_endpoint(payload: ChatWithContextRequest):
    """
    POST /api/ai/chat
    Supports multi-turn conversations and outputs structured responses with suggested follow-up questions.
    """
    try:
        result = await gemini_service.chat_with_context(
            messages=payload.messages,
            disaster_context=payload.disaster_context
        )
        return ChatWithContextResponse(
            response=result.get("reply", "No response generated."),
            suggested_questions=result.get("suggested_questions", [])
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Gemini chat session failed: {str(e)}"
        )
