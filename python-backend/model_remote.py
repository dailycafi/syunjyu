"""
Remote LLM API handler
Supports OpenAI, DeepSeek, and other API-compatible providers
"""

import httpx
from typing import Optional, Dict, List


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
    # Add more providers as needed
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
    max_tokens: int = 512,
    temperature: float = 0.7,
    system_prompt: Optional[str] = None,
) -> str:
    """
    Generate text using remote API

    Args:
        provider: Provider ID (e.g., "openai", "deepseek")
        model_name: Model name/ID
        prompt: User prompt
        api_key: API key for authentication
        max_tokens: Maximum tokens to generate
        temperature: Sampling temperature (0-2)
        system_prompt: Optional system prompt

    Returns:
        Generated text response

    Raises:
        RemoteModelError: If API call fails
    """
    if provider not in PROVIDERS:
        raise RemoteModelError(f"Provider {provider} not supported")

    if not api_key:
        raise RemoteModelError(f"API key required for {provider}")

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
        async with httpx.AsyncClient(timeout=60.0) as client:
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
