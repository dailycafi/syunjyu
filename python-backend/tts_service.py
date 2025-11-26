import httpx
import json
import os
from typing import Optional, Dict, Any, List

class TTSError(Exception):
    pass

async def generate_speech_minimax(
    text: str, 
    api_key: str, 
    model: str = "speech-01-turbo",
    voice_id: str = "English_expressive_narrator"
) -> Dict[str, Any]:
    """
    Generate speech using Minimax T2A v2 API with subtitles
    Returns dict with 'audio' (bytes) and 'subtitles' (list or None)
    """
    url = "https://api.minimax.io/v1/t2a_v2"
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    
    # Ensure text is not empty
    if not text or not text.strip():
        raise TTSError("Text is empty")

    # Truncate text if too long
    if len(text) > 4000:
        text = text[:4000]
    
    payload = {
        "model": model,
        "text": text,
        "stream": False,
        "subtitle_enable": True, # Request subtitles
        "voice_setting": {
            "voice_id": voice_id,
            "speed": 1,
            "vol": 1,
            "pitch": 0
        },
        "audio_setting": {
            "sample_rate": 32000,
            "bitrate": 128000,
            "format": "mp3",
            "channel": 1
        }
    }
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            response = await client.post(url, headers=headers, json=payload)
            
            if response.status_code != 200:
                error_detail = response.text
                try:
                    error_json = response.json()
                    if "base_resp" in error_json:
                        error_detail = error_json["base_resp"].get("status_msg", error_detail)
                except:
                    pass
                raise TTSError(f"Minimax API Error ({response.status_code}): {error_detail}")
                
            data = response.json()
            
            if "base_resp" in data and data["base_resp"]["status_code"] != 0:
                raise TTSError(f"Minimax API Status Error: {data['base_resp']['status_msg']}")
                
            result = {}
            
            # 1. Extract Audio
            if "data" in data and "audio" in data["data"]:
                hex_audio = data["data"]["audio"]
                try:
                    result["audio"] = bytes.fromhex(hex_audio)
                except ValueError:
                     raise TTSError("Failed to decode audio data (invalid hex)")
            else:
                raise TTSError("No audio data received from Minimax")
                
            # 2. Extract Subtitles
            if "data" in data and "subtitle_file" in data["data"]:
                subtitle_url = data["data"]["subtitle_file"]
                if subtitle_url:
                    try:
                        sub_resp = await client.get(subtitle_url)
                        if sub_resp.status_code == 200:
                            result["subtitles"] = sub_resp.json()
                        else:
                            print(f"Failed to download subtitles: {sub_resp.status_code}")
                    except Exception as e:
                        print(f"Error downloading subtitles: {e}")
            
            return result
                
        except httpx.RequestError as e:
            raise TTSError(f"Request failed: {str(e)}")
        except Exception as e:
            raise TTSError(f"Unexpected error: {str(e)}")
