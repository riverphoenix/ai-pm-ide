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
from framework_loader import get_framework

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


class FieldSuggestionRequest(BaseModel):
    project_id: str
    template_id: str
    field_id: str
    field_prompt: str
    current_values: Dict[str, any]
    api_key: str
    system: Optional[str] = None


class ContextDocument(BaseModel):
    id: str
    name: str
    type: str  # 'pdf', 'url', 'google_doc', 'text'
    content: str
    url: Optional[str] = None


class GenerateFrameworkRequest(BaseModel):
    project_id: str
    framework_id: str
    context_documents: List[ContextDocument]
    user_prompt: str
    api_key: str
    model: str = "gpt-5"


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


@app.post("/suggest-field")
async def suggest_field(request: FieldSuggestionRequest):
    """
    Generate AI suggestion for a single template field

    Uses project context + current field values + field-specific prompt
    to provide contextually relevant suggestions
    """
    try:
        client = OpenAIClient(api_key=request.api_key)

        # Build context message from current field values
        context_parts = []
        for key, value in request.current_values.items():
            if value and str(value).strip():
                # Format nicely for context
                field_label = key.replace('_', ' ').title()
                context_parts.append(f"{field_label}: {value}")

        context = "\n".join(context_parts) if context_parts else "No context available yet"

        # Build system prompt
        system_prompt = f"""You are helping a Product Manager fill out a {request.template_id.replace('-', ' ').title()} template.

Guidelines:
- Be concise and specific (1-3 sentences max)
- Provide only the suggested value, not explanations or meta-commentary
- Base your suggestion on the context provided
- Use professional PM language
- For numbers, provide just the number
- For text fields, provide clear, actionable text"""

        # Build user prompt with context and task
        user_prompt = f"""Current template values:
{context}

Task: {request.field_prompt}

Provide a concise, professional suggestion:"""

        # Call OpenAI with smaller, faster model for suggestions
        response = await client.chat(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            model="gpt-5-mini",  # Use cheaper, faster model
            max_tokens=200  # Keep responses short
        )

        suggestion = response["content"].strip()

        # Clean up common AI verbosity
        # Remove phrases like "Here's a suggestion:" or "I would suggest:"
        unwanted_prefixes = [
            "here's a suggestion:",
            "i would suggest:",
            "suggestion:",
            "my suggestion is:",
            "i suggest:",
            "how about:",
        ]
        suggestion_lower = suggestion.lower()
        for prefix in unwanted_prefixes:
            if suggestion_lower.startswith(prefix):
                suggestion = suggestion[len(prefix):].strip()
                break

        return {"suggestion": suggestion}

    except Exception as e:
        logger.error(f"Error in suggest_field: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate-framework")
async def generate_framework(request: GenerateFrameworkRequest):
    """
    Generate a complete PM framework output using AI

    This endpoint:
    1. Loads the framework definition (system prompt, example, questions)
    2. Assembles context from provided documents
    3. Calls OpenAI with framework-specific instructions
    4. Returns the generated framework output in markdown format

    Returns a JSON response (non-streaming for now)
    """
    try:
        logger.info(f"Generate framework request: {request.framework_id} for project {request.project_id}")

        # Load framework definition
        framework = get_framework(request.framework_id)
        if not framework:
            raise HTTPException(
                status_code=404,
                detail=f"Framework '{request.framework_id}' not found"
            )

        # Initialize OpenAI client
        client = OpenAIClient(api_key=request.api_key)

        # Assemble context from documents
        context_sections = []
        for doc in request.context_documents:
            doc_header = f"## Document: {doc.name}"
            if doc.type == 'url' and doc.url:
                doc_header += f"\nSource: {doc.url}"
            elif doc.type == 'pdf':
                doc_header += f"\n(PDF document)"

            context_sections.append(f"{doc_header}\n\n{doc.content}")

        # Build full context
        assembled_context = "\n\n---\n\n".join(context_sections) if context_sections else "No context documents provided."

        # Build system prompt from framework definition
        system_prompt = framework.get("system_prompt", "")

        # Add example output to system prompt for reference
        if framework.get("example_output"):
            system_prompt += f"\n\n## Example Output Format:\n\n{framework['example_output']}"

        # Build user prompt with context and user's specific request
        user_prompt_parts = [
            "# Context Documents",
            assembled_context,
            "",
            "# Task",
            request.user_prompt or f"Generate a {framework['name']} based on the context provided above.",
        ]

        # Add guiding questions if user prompt is minimal
        if len(request.user_prompt) < 50 and framework.get("guiding_questions"):
            user_prompt_parts.append("\n## Consider These Questions:")
            for question in framework["guiding_questions"]:
                user_prompt_parts.append(f"- {question}")

        user_prompt = "\n".join(user_prompt_parts)

        logger.info(f"Calling OpenAI with model {request.model}")
        logger.info(f"Context size: {len(assembled_context)} chars, User prompt: {len(request.user_prompt)} chars")

        # Call OpenAI API (non-streaming for now)
        response = await client.chat(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            model=request.model,
            max_tokens=4096  # Generous limit for comprehensive frameworks
        )

        # Calculate cost
        cost = client.calculate_cost(
            input_tokens=response["usage"]["input_tokens"],
            output_tokens=response["usage"]["output_tokens"],
            model=response["model"]
        )

        logger.info(f"Framework generated successfully. Tokens: {response['usage']['total_tokens']}, Cost: ${cost:.4f}")

        return {
            "framework_id": request.framework_id,
            "generated_content": response["content"],
            "usage": response["usage"],
            "cost": cost,
            "model": response["model"]
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in generate_framework: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate-framework/stream")
async def generate_framework_stream(request: GenerateFrameworkRequest):
    """
    Generate a complete PM framework output using AI (streaming version)

    Same as /generate-framework but streams the response token-by-token
    using Server-Sent Events (SSE)
    """
    async def generate():
        try:
            logger.info(f"Stream generate framework: {request.framework_id} for project {request.project_id}")

            # Load framework definition
            framework = get_framework(request.framework_id)
            if not framework:
                yield f"data: {json.dumps({'type': 'error', 'error': f'Framework {request.framework_id} not found'})}\n\n"
                return

            # Initialize OpenAI client
            client = OpenAIClient(api_key=request.api_key)

            # Assemble context from documents
            context_sections = []
            for doc in request.context_documents:
                doc_header = f"## Document: {doc.name}"
                if doc.type == 'url' and doc.url:
                    doc_header += f"\nSource: {doc.url}"
                elif doc.type == 'pdf':
                    doc_header += f"\n(PDF document)"

                context_sections.append(f"{doc_header}\n\n{doc.content}")

            assembled_context = "\n\n---\n\n".join(context_sections) if context_sections else "No context documents provided."

            # Build system prompt
            system_prompt = framework.get("system_prompt", "")
            if framework.get("example_output"):
                system_prompt += f"\n\n## Example Output Format:\n\n{framework['example_output']}"

            # Build user prompt
            user_prompt_parts = [
                "# Context Documents",
                assembled_context,
                "",
                "# Task",
                request.user_prompt or f"Generate a {framework['name']} based on the context provided above.",
            ]

            if len(request.user_prompt) < 50 and framework.get("guiding_questions"):
                user_prompt_parts.append("\n## Consider These Questions:")
                for question in framework["guiding_questions"]:
                    user_prompt_parts.append(f"- {question}")

            user_prompt = "\n".join(user_prompt_parts)

            logger.info(f"Streaming from OpenAI with model {request.model}")

            # Stream from OpenAI
            async for chunk in client.chat_stream(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                model=request.model,
                max_tokens=4096
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
            logger.error(f"Error in generate_framework_stream: {e}")
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
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
