"""
Local LLM model handler
Provides interface for calling local models (preset models, extensible to llama.cpp/Ollama)
"""

from typing import List, Dict

# Preset local models - these are mock models for now
# In production, replace with actual local model implementations (llama.cpp, Ollama, etc.)
LOCAL_MODELS = {
    "local_small": {
        "name": "Local Small",
        "description": "Small fast model for quick tasks",
        "max_tokens": 2048,
    },
    "local_medium": {
        "name": "Local Medium",
        "description": "Balanced model for general use",
        "max_tokens": 4096,
    },
    "local_large": {
        "name": "Local Large",
        "description": "Large model for complex tasks",
        "max_tokens": 8192,
    },
}


def get_available_models() -> List[Dict]:
    """Get list of available local models"""
    return [
        {
            "id": model_id,
            "name": info["name"],
            "description": info["description"],
        }
        for model_id, info in LOCAL_MODELS.items()
    ]


def generate_local(model_name: str, prompt: str, max_tokens: int = 512) -> str:
    """
    Generate text using local model

    Args:
        model_name: ID of the local model to use
        prompt: The prompt/input text
        max_tokens: Maximum tokens to generate

    Returns:
        Generated text response

    Note:
        This is a mock implementation. Replace with actual local model calls:
        - For llama.cpp: Use llama-cpp-python library
        - For Ollama: Use Ollama API client
        - For transformers: Use HuggingFace transformers library
    """
    if model_name not in LOCAL_MODELS:
        raise ValueError(f"Model {model_name} not found. Available: {list(LOCAL_MODELS.keys())}")

    # Mock response - replace with actual model inference
    # Example for llama.cpp integration:
    # from llama_cpp import Llama
    # llm = Llama(model_path="./models/your-model.gguf")
    # output = llm(prompt, max_tokens=max_tokens)
    # return output['choices'][0]['text']

    # Mock implementation for demonstration
    return f"[Mock {model_name} response to: {prompt[:50]}...]"


async def generate_local_async(model_name: str, prompt: str, max_tokens: int = 512) -> str:
    """Async version of generate_local for non-blocking calls"""
    # In production, use async model libraries or run in thread pool
    import asyncio
    return await asyncio.to_thread(generate_local, model_name, prompt, max_tokens)


# Extension point: Add support for streaming responses
async def generate_local_stream(model_name: str, prompt: str, max_tokens: int = 512):
    """
    Stream generation from local model (for future implementation)

    Yields:
        Text chunks as they are generated
    """
    # This would yield chunks in real implementation
    # For now, just yield the complete response
    result = await generate_local_async(model_name, prompt, max_tokens)
    yield result
