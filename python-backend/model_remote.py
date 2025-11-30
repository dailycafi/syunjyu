"""
Remote LLM API handler
Supports OpenAI, DeepSeek, MiniMax (via Anthropic), and other API-compatible providers
"""

import httpx
from typing import Optional, Dict, List
import os
from anthropic import AsyncAnthropic

class RemoteModelError(Exception):
    """Exception raised for remote model API errors"""
    pass


# Provider configurations
PROVIDERS = {
    "openai": {
        "name": "OpenAI",
        "base_url": "https://api.openai.com/v1",
        "models": ["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo"],
    },
    "deepseek": {
        "name": "DeepSeek",
        "base_url": "https://api.deepseek.com/v1",
        "models": ["deepseek-chat", "deepseek-coder"],
    },
    "minimax": {
        "name": "MiniMax",
        "base_url": "https://api.minimax.chat/v1", 
        "models": ["MiniMax-M2"],
    }
}


def get_providers() -> List[Dict]:
    """Get list of supported remote providers"""
    return [
        {
            "id": provider_id,
            "name": info["name"],
            "models": info["models"],
        }
        for provider_id, info in PROVIDERS.items()
    ]


async def generate_remote(
    provider: str,
    model_name: str,
    prompt: str,
    api_key: str,
    max_tokens: int = 1000,
    temperature: float = 0.7,
    system_prompt: Optional[str] = "You are a helpful assistant.",
    base_url: Optional[str] = None,
) -> str:
    """
    Generate text using remote API

    Args:
        provider: Provider ID (e.g., "openai", "deepseek", "minimax")
        model_name: Model name/ID
        prompt: User prompt
        api_key: API key for authentication
        max_tokens: Maximum tokens to generate
        temperature: Sampling temperature (0-2)
        system_prompt: Optional system prompt
        base_url: Optional custom base URL (overrides provider default)

    Returns:
        Generated text response

    Raises:
        RemoteModelError: If API call fails
    """
    
    if provider == "minimax":
        # MiniMax via Anthropic Client
        try:
            # Use environment variables for configuration (ANTHROPIC_API_KEY, ANTHROPIC_BASE_URL)
            # If specific Minimax key is passed, use it, otherwise let client find it in env
            client_kwargs = {}
            if api_key:
                client_kwargs["api_key"] = api_key
            
            # Do NOT hardcode base_url, let it read from ANTHROPIC_BASE_URL env var
            # or fallback to default (which would be wrong for MiniMax but user has env var)
            if os.getenv("ANTHROPIC_BASE_URL"):
                client_kwargs["base_url"] = os.getenv("ANTHROPIC_BASE_URL")
            
            client = AsyncAnthropic(**client_kwargs)
            
            messages = [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": prompt
                        }
                    ]
                }
            ]
            
            message = await client.messages.create(
                model=model_name,
                max_tokens=max_tokens,
                system=system_prompt,
                messages=messages
            )
            
            # Process response blocks (Thinking + Text)
            response_text = ""
            
            # Log thinking process if available (for debugging/server logs)
            # In a real app, we might want to return this to the user too
            for block in message.content:
                if block.type == "thinking":
                    print(f"[MiniMax Thinking]: {block.thinking[:100]}...") # Log brief thinking
                elif block.type == "text":
                    response_text += block.text
            
            return response_text

        except Exception as e:
             raise RemoteModelError(f"MiniMax/Anthropic Error: {str(e)}")

    
    if provider not in PROVIDERS and not base_url:
        raise RemoteModelError(f"Provider {provider} not supported")

    if not api_key and not base_url:
        raise RemoteModelError(f"API key required for {provider}")

    if base_url:
        # Use custom base URL
        pass
    elif provider in PROVIDERS:
        provider_config = PROVIDERS[provider]
        base_url = provider_config["base_url"]

    # Prepare messages
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    # API request payload (OpenAI-compatible format)
    payload = {
        "model": model_name,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=300.0) as client:
            response = await client.post(
                f"{base_url}/chat/completions",
                json=payload,
                headers=headers,
            )
            response.raise_for_status()

            data = response.json()

            # Extract response text
            if "choices" in data and len(data["choices"]) > 0:
                return data["choices"][0]["message"]["content"]
            else:
                raise RemoteModelError("Unexpected API response format")

    except httpx.HTTPStatusError as e:
        raise RemoteModelError(f"API error ({e.response.status_code}): {e.response.text}")
    except httpx.RequestError as e:
        raise RemoteModelError(f"Request failed: {str(e)}")
    except Exception as e:
        raise RemoteModelError(f"Unexpected error: {str(e)}")


async def generate_remote_stream(
    provider: str,
    model_name: str,
    prompt: str,
    api_key: str,
    max_tokens: int = 512,
    temperature: float = 0.7,
    system_prompt: Optional[str] = None,
):
    """
    Stream generation from remote API (for future implementation)

    Yields:
        Text chunks as they arrive from the API
    """
    # For streaming, set stream=True in the payload
    # and process Server-Sent Events (SSE)
    # This is a simplified implementation - just return full response
    result = await generate_remote(
        provider, model_name, prompt, api_key, max_tokens, temperature, system_prompt
    )
    yield result
