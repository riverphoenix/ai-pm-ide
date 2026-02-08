"""
AI PM IDE - Python Sidecar Server
FastAPI server for OpenAI integration and document processing
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Dict
import uvicorn
import os
import json
import logging

from openai_client import OpenAIClient

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="AI PM IDE Sidecar", version="0.1.0")

# CORS middleware to allow Tauri frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tauri app origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global OpenAI client instance (can be updated with new API key)
openai_client: Optional[OpenAIClient] = None


# Request/Response Models
class ChatMessage(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str


class ChatRequest(BaseModel):
    project_id: str
    messages: List[ChatMessage]
    conversation_id: Optional[str] = None
    api_key: str
    model: str = "gpt-5"
    max_tokens: int = 4096
    system: Optional[str] = None


class ChatResponse(BaseModel):
    conversation_id: str
    content: str
    usage: Dict[str, int]
    cost: float
    model: str


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "AI PM IDE Sidecar",
        "version": "0.1.0"
    }


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy"}


@app.get("/models")
async def list_models(api_key: str):
    """
    Get list of available OpenAI models

    Returns list of model IDs that the API key has access to
    """
    try:
        client = OpenAIClient(api_key=api_key)
        models = await client.list_models()
        logger.info(f"Returning {len(models)} available models")
        return {"models": models}
    except Exception as e:
        logger.error(f"Error listing models: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/chat")
async def chat(request: ChatRequest):
    """
    Chat with OpenAI (non-streaming)

    Returns complete response with usage and cost information
    """
    try:
        # Initialize OpenAI client with provided API key
        client = OpenAIClient(api_key=request.api_key)

        logger.info(f"Chat request for project {request.project_id} with {len(request.messages)} messages")

        # Convert messages to dict format
        messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]

        # Call OpenAI API
        response = await client.chat(
            messages=messages,
            model=request.model,
            max_tokens=request.max_tokens,
            system=request.system
        )

        # Calculate cost
        cost = client.calculate_cost(
            input_tokens=response["usage"]["input_tokens"],
            output_tokens=response["usage"]["output_tokens"],
            model=response["model"]
        )

        # Generate conversation ID if not provided
        conversation_id = request.conversation_id or f"conv-{os.urandom(8).hex()}"

        return ChatResponse(
            conversation_id=conversation_id,
            content=response["content"],
            usage=response["usage"],
            cost=cost,
            model=response["model"]
        )

    except Exception as e:
        logger.error(f"Error in chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    """
    Stream chat responses from OpenAI

    Returns a Server-Sent Events (SSE) stream of tokens as they are generated
    """
    async def generate():
        try:
            # Initialize OpenAI client with provided API key
            client = OpenAIClient(api_key=request.api_key)

            logger.info(f"Stream request for project {request.project_id} with {len(request.messages)} messages")

            # Convert messages to dict format
            messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]

            # Generate conversation ID if not provided
            conversation_id = request.conversation_id or f"conv-{os.urandom(8).hex()}"

            # Send conversation ID first
            yield f"data: {json.dumps({'type': 'conversation_id', 'conversation_id': conversation_id})}\n\n"

            # Stream from OpenAI API
            async for chunk in client.chat_stream(
                messages=messages,
                model=request.model,
                max_tokens=request.max_tokens,
                system=request.system
            ):
                # Add cost calculation to message_stop events
                if chunk.get("type") == "message_stop" and "usage" in chunk:
                    cost = client.calculate_cost(
                        input_tokens=chunk["usage"]["input_tokens"],
                        output_tokens=chunk["usage"]["output_tokens"],
                        model=request.model
                    )
                    chunk["cost"] = cost

                yield f"data: {json.dumps(chunk)}\n\n"

        except Exception as e:
            logger.error(f"Error in stream: {e}")
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable buffering in nginx
        }
    )


if __name__ == "__main__":
    # Run the server
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=port,
        reload=True,
        log_level="info"
    )
