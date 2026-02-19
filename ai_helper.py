import os
import requests
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")

def generate_explanation(area, material, total_cost):

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={API_KEY}"

    prompt = f"""
    Explain this construction cost estimate clearly.

    Area: {area} sqft
    Material: {material}
    Total Cost: ₹{total_cost}

    Suggest 2 cost optimization ideas and possible risks.
    """

    headers = {"Content-Type": "application/json"}

    data = {
        "contents": [
            {
                "parts": [{"text": prompt}]
            }
        ]
    }

    response = requests.post(url, headers=headers, json=data)

    result = response.json()

    # Extract only AI text
    if "candidates" in result:
        return result["candidates"][0]["content"]["parts"][0]["text"]
    else:
        return f"Gemini Error: {result}"
