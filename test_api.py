import asyncio
import sys
from anthropic import AsyncAnthropic

async def test_api_key(api_key):
    try:
        client = AsyncAnthropic(api_key=api_key)
        print("Testing API key...")
        
        async with client.messages.stream(
            model="claude-3-5-sonnet-20241022",
            max_tokens=50,
            messages=[{"role": "user", "content": "Say hello"}]
        ) as stream:
            response = ""
            async for text in stream.text_stream:
                response += text
            print(f"✓ API key works! Response: {response}")
            return True
    except Exception as e:
        print(f"✗ API key failed: {type(e).__name__}: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) > 1:
        asyncio.run(test_api_key(sys.argv[1]))
    else:
        print("Usage: python test_api.py YOUR_API_KEY")
