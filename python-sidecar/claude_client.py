"""
Claude API Client
Handles communication with Anthropic's Claude API
"""

from anthropic import Anthropic, AsyncAnthropic
from typing import AsyncIterator, Optional, List, Dict
import json
import logging
import ssl
import certifi
import httpx

logger = logging.getLogger(__name__)


class ClaudeClient:
    """Client for interacting with Claude API"""

    def __init__(self, api_key: str):
        """
        Initialize Claude client with proper SSL certificate verification

        Args:
            api_key: Anthropic API key
        """
        # Create SSL context with certifi CA bundle to fix certificate verification
        ssl_context = ssl.create_default_context(cafile=certifi.where())

        # Create httpx client with proper SSL verification
        http_client = httpx.AsyncClient(
            verify=ssl_context,
            timeout=60.0
        )

        logger.info(f"Initializing Anthropic client with SSL context from: {certifi.where()}")

        self.client = Anthropic(api_key=api_key)
        self.async_client = AsyncAnthropic(
            api_key=api_key,
            http_client=http_client
        )

    async def chat_stream(
        self,
        messages: List[Dict[str, str]],
        model: str = "claude-sonnet-4",
        max_tokens: int = 4096,
        system: Optional[str] = None,
    ) -> AsyncIterator[Dict]:
        """
        Stream chat responses from Claude

        Args:
            messages: List of message dictionaries with 'role' and 'content'
            model: Claude model to use
            max_tokens: Maximum tokens in response
            system: Optional system prompt

        Yields:
            Dictionary with event type and content
        """
        try:
            # Create streaming request
            kwargs = {
                "model": model,
                "max_tokens": max_tokens,
                "messages": messages,
            }

            if system:
                kwargs["system"] = system

            logger.info(f"Calling Claude API with model: {model}, messages: {len(messages)}")

            # Stream the response
            async with self.async_client.messages.stream(**kwargs) as stream:
                async for text in stream.text_stream:
                    yield {
                        "type": "content_block_delta",
                        "delta": {"text": text}
                    }

                # Get final message with usage stats
                message = await stream.get_final_message()

                yield {
                    "type": "message_stop",
                    "usage": {
                        "input_tokens": message.usage.input_tokens,
                        "output_tokens": message.usage.output_tokens,
                    }
                }

        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            logger.error(f"Error in Claude stream: {e}\n{error_details}")
            yield {
                "type": "error",
                "error": f"{type(e).__name__}: {str(e)}"
            }

    async def chat(
        self,
        messages: List[Dict[str, str]],
        model: str = "claude-sonnet-4",
        max_tokens: int = 4096,
        system: Optional[str] = None,
    ) -> Dict:
        """
        Send a chat request to Claude (non-streaming)

        Args:
            messages: List of message dictionaries with 'role' and 'content'
            model: Claude model to use
            max_tokens: Maximum tokens in response
            system: Optional system prompt

        Returns:
            Dictionary with response and usage information
        """
        try:
            kwargs = {
                "model": model,
                "max_tokens": max_tokens,
                "messages": messages,
            }

            if system:
                kwargs["system"] = system

            response = await self.async_client.messages.create(**kwargs)

            return {
                "content": response.content[0].text,
                "usage": {
                    "input_tokens": response.usage.input_tokens,
                    "output_tokens": response.usage.output_tokens,
                },
                "model": response.model,
                "stop_reason": response.stop_reason,
            }

        except Exception as e:
            logger.error(f"Error in Claude chat: {e}")
            raise

    def calculate_cost(self, input_tokens: int, output_tokens: int, model: str) -> float:
        """
        Calculate the cost of a Claude API call

        Args:
            input_tokens: Number of input tokens
            output_tokens: Number of output tokens
            model: Model used

        Returns:
            Cost in USD
        """
        # Pricing as of 2024-2025 for Claude 3/3.5 models
        pricing = {
            "claude-3-5-sonnet-20241022": {
                "input": 3.0 / 1_000_000,  # $3 per million input tokens
                "output": 15.0 / 1_000_000,  # $15 per million output tokens
            },
            "claude-3-opus-20240229": {
                "input": 15.0 / 1_000_000,
                "output": 75.0 / 1_000_000,
            },
            "claude-3-5-haiku-20241022": {
                "input": 1.0 / 1_000_000,
                "output": 5.0 / 1_000_000,
            },
        }

        # Default to Sonnet 3.5 pricing if model not found
        model_pricing = pricing.get(model, pricing["claude-3-5-sonnet-20241022"])
        input_cost = input_tokens * model_pricing["input"]
        output_cost = output_tokens * model_pricing["output"]

        return input_cost + output_cost
