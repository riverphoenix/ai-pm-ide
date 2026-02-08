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
        model: str = "gpt-4-turbo-preview",
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
            stream = await self.async_client.chat.completions.create(
                model=model,
                messages=full_messages,
                max_tokens=max_tokens,
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
        model: str = "gpt-4-turbo-preview",
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

            response = await self.async_client.chat.completions.create(
                model=model,
                messages=full_messages,
                max_tokens=max_tokens,
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
        List available OpenAI models (key models only)

        Returns:
            List of main model IDs, filtering out dated versions
        """
        try:
            logger.info("Fetching available OpenAI models")
            models_response = await self.async_client.models.list()

            # Key models to look for (in priority order)
            key_models = [
                "gpt-4o",              # Latest GPT-4 Omni
                "gpt-4o-mini",         # Affordable GPT-4
                "gpt-4-turbo",         # GPT-4 Turbo
                "gpt-4-turbo-preview", # GPT-4 Turbo Preview
                "gpt-4",               # Standard GPT-4
                "gpt-3.5-turbo",       # GPT-3.5 Turbo
            ]

            # Get available models from API
            available_model_ids = {model.id for model in models_response.data}

            # Filter to only key models that are actually available
            filtered_models = []
            for key_model in key_models:
                if key_model in available_model_ids:
                    filtered_models.append(key_model)
                else:
                    # Check for similar models (e.g., gpt-4o-2024-05-13)
                    for available_id in available_model_ids:
                        if available_id.startswith(key_model) and available_id not in filtered_models:
                            filtered_models.append(available_id)
                            break

            # If we found key models, return them
            if filtered_models:
                logger.info(f"Found {len(filtered_models)} key models: {filtered_models}")
                return filtered_models

            # Fallback to default if nothing found
            logger.warning("No models found, using defaults")
            return key_models

        except Exception as e:
            logger.error(f"Error fetching models: {e}")
            # Return default models as fallback
            return [
                "gpt-4o",
                "gpt-4o-mini",
                "gpt-4-turbo",
                "gpt-3.5-turbo",
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
        # Pricing as of 2025 for GPT models
        pricing = {
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

        # Default to GPT-4-turbo pricing if model not found
        model_pricing = pricing.get(model, pricing["gpt-4-turbo-preview"])
        input_cost = input_tokens * model_pricing["input"]
        output_cost = output_tokens * model_pricing["output"]

        return input_cost + output_cost
