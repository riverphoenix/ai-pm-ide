"""
OpenAI API Client
Handles communication with OpenAI's GPT API
"""

from openai import AsyncOpenAI
from typing import AsyncIterator, Optional, List, Dict
import json
import logging

logger = logging.getLogger(__name__)


class OpenAIClient:
    """Client for interacting with OpenAI API"""

    def __init__(self, api_key: str):
        """
        Initialize OpenAI client

        Args:
            api_key: OpenAI API key
        """
        logger.info("Initializing OpenAI client")
        self.async_client = AsyncOpenAI(api_key=api_key)

    async def chat_stream(
        self,
        messages: List[Dict[str, str]],
        model: str = "gpt-5",
        max_tokens: int = 4096,
        system: Optional[str] = None,
    ) -> AsyncIterator[Dict]:
        """
        Stream chat responses from OpenAI

        Args:
            messages: List of message dictionaries with 'role' and 'content'
            model: OpenAI model to use
            max_tokens: Maximum tokens in response
            system: Optional system prompt

        Yields:
            Dictionary with event type and content
        """
        try:
            # Add system message if provided
            full_messages = []
            if system:
                full_messages.append({"role": "system", "content": system})
            full_messages.extend(messages)

            logger.info(f"Calling OpenAI API with model: {model}, messages: {len(full_messages)}")

            # Stream the response
            # GPT-5 models use max_completion_tokens instead of max_tokens
            stream = await self.async_client.chat.completions.create(
                model=model,
                messages=full_messages,
                max_completion_tokens=max_tokens,
                stream=True,
            )

            total_content = ""
            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    total_content += content
                    yield {
                        "type": "content_block_delta",
                        "delta": {"text": content}
                    }

            # Note: OpenAI streaming doesn't provide token usage in real-time
            # We'll estimate or use a follow-up call if needed
            # For now, return approximate values
            input_tokens = sum(len(msg.get("content", "").split()) * 1.3 for msg in full_messages)
            output_tokens = len(total_content.split()) * 1.3

            yield {
                "type": "message_stop",
                "usage": {
                    "input_tokens": int(input_tokens),
                    "output_tokens": int(output_tokens),
                }
            }

        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            logger.error(f"Error in OpenAI stream: {e}\n{error_details}")
            yield {
                "type": "error",
                "error": f"{type(e).__name__}: {str(e)}"
            }

    async def chat(
        self,
        messages: List[Dict[str, str]],
        model: str = "gpt-5",
        max_tokens: int = 4096,
        system: Optional[str] = None,
    ) -> Dict:
        """
        Send a chat request to OpenAI (non-streaming)

        Args:
            messages: List of message dictionaries with 'role' and 'content'
            model: OpenAI model to use
            max_tokens: Maximum tokens in response
            system: Optional system prompt

        Returns:
            Dictionary with response and usage information
        """
        try:
            # Add system message if provided
            full_messages = []
            if system:
                full_messages.append({"role": "system", "content": system})
            full_messages.extend(messages)

            # GPT-5 models use max_completion_tokens instead of max_tokens
            response = await self.async_client.chat.completions.create(
                model=model,
                messages=full_messages,
                max_completion_tokens=max_tokens,
            )

            return {
                "content": response.choices[0].message.content,
                "usage": {
                    "input_tokens": response.usage.prompt_tokens,
                    "output_tokens": response.usage.completion_tokens,
                },
                "model": response.model,
                "stop_reason": response.choices[0].finish_reason,
            }

        except Exception as e:
            logger.error(f"Error in OpenAI chat: {e}")
            raise

    async def list_models(self) -> List[str]:
        """
        List available OpenAI Frontier models only

        Returns:
            List of Frontier model IDs (latest generation - GPT-5)
        """
        try:
            logger.info("Fetching available OpenAI Frontier models")
            models_response = await self.async_client.models.list()

            # Frontier models only (GPT-5 generation - 2026)
            frontier_models = [
                "gpt-5",               # Main flagship model
                "gpt-5-mini",          # Faster, cost-efficient version
                "gpt-5-nano",          # Fastest, cheapest version
            ]

            # Get available models from API
            available_model_ids = {model.id for model in models_response.data}

            # Filter to only Frontier models that are actually available
            filtered_models = []
            for frontier_model in frontier_models:
                if frontier_model in available_model_ids:
                    filtered_models.append(frontier_model)
                else:
                    # Check for dated versions (e.g., gpt-4o-2024-05-13)
                    for available_id in available_model_ids:
                        if available_id.startswith(frontier_model) and available_id not in filtered_models:
                            filtered_models.append(available_id)
                            break

            # If we found Frontier models, return them
            if filtered_models:
                logger.info(f"Found {len(filtered_models)} Frontier models: {filtered_models}")
                return filtered_models

            # Fallback to default if nothing found
            logger.warning("No Frontier models found, using defaults")
            return frontier_models

        except Exception as e:
            logger.error(f"Error fetching models: {e}")
            # Return Frontier models as fallback
            return [
                "gpt-5",
                "gpt-5-mini",
                "gpt-5-nano",
            ]

    def calculate_cost(self, input_tokens: int, output_tokens: int, model: str) -> float:
        """
        Calculate the cost of an OpenAI API call

        Args:
            input_tokens: Number of input tokens
            output_tokens: Number of output tokens
            model: Model used

        Returns:
            Cost in USD
        """
        # Pricing as of 2026 for GPT models
        pricing = {
            # GPT-5 Frontier Models (2026)
            "gpt-5": {
                "input": 1.25 / 1_000_000,   # $1.25 per million input tokens
                "output": 10.0 / 1_000_000,  # $10 per million output tokens
            },
            "gpt-5-mini": {
                "input": 0.25 / 1_000_000,   # $0.25 per million input tokens (estimate)
                "output": 1.0 / 1_000_000,   # $1 per million output tokens (estimate)
            },
            "gpt-5-nano": {
                "input": 0.05 / 1_000_000,   # $0.05 per million input tokens
                "output": 0.40 / 1_000_000,  # $0.40 per million output tokens
            },
            # Legacy GPT-4 Models
            "gpt-4-turbo-preview": {
                "input": 10.0 / 1_000_000,  # $10 per million input tokens
                "output": 30.0 / 1_000_000,  # $30 per million output tokens
            },
            "gpt-4-turbo": {
                "input": 10.0 / 1_000_000,
                "output": 30.0 / 1_000_000,
            },
            "gpt-4": {
                "input": 30.0 / 1_000_000,
                "output": 60.0 / 1_000_000,
            },
            "gpt-3.5-turbo": {
                "input": 0.5 / 1_000_000,
                "output": 1.5 / 1_000_000,
            },
            "gpt-4o": {
                "input": 5.0 / 1_000_000,
                "output": 15.0 / 1_000_000,
            },
            "gpt-4o-mini": {
                "input": 0.15 / 1_000_000,
                "output": 0.6 / 1_000_000,
            },
        }

        # Default to GPT-5 pricing if model not found
        model_pricing = pricing.get(model, pricing["gpt-5"])
        input_cost = input_tokens * model_pricing["input"]
        output_cost = output_tokens * model_pricing["output"]

        return input_cost + output_cost
