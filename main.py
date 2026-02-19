from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import re
from dotenv import load_dotenv
import os

from cost_logic import calculate_cost
from ai_helper import generate_explanation

# New planner imports
from planner import parse_description, build_layout, calculate_budget, generate_blueprint

# -------------------------------
# Load environment variables
# -------------------------------
load_dotenv()

print("Loaded GEMINI_API_KEY:", os.getenv("GEMINI_API_KEY"))

# -------------------------------
# Create FastAPI app
# -------------------------------
app = FastAPI(title="BuildWise Smart Cost Estimator API")

# -------------------------------
# Enable CORS (Frontend Access)
# -------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files (blueprints)
static_path = os.path.join(os.getcwd(), "static")
os.makedirs(static_path, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_path), name="static")

# -------------------------------
# Request Model with Validation
# -------------------------------
class ProjectInput(BaseModel):
    area_sqft: int = Field(..., gt=0)
    material_quality: str
    location_tier: str
    floors: int = Field(..., gt=0)
    deadline_months: int = Field(..., gt=0)

# -------------------------------
# Home Route
# -------------------------------
@app.get("/")
def home():
    return {"message": "BuildWise Smart Cost Estimator API Running 🚀"}

# -------------------------------
# Estimate Route
# -------------------------------
@app.post("/estimate")
def estimate(data: ProjectInput):
    try:
        # Step 1: Calculate cost
        result = calculate_cost(
            data.area_sqft,
            data.material_quality.lower(),
            data.location_tier.lower(),
            data.floors,
            data.deadline_months
        )

        # Step 2: Call Gemini AI
        explanation = generate_explanation(
            data.area_sqft,
            data.material_quality,
            result["total_estimated_cost"]
        )

        result["ai_insights"] = explanation

        return result

    except Exception as e:
        print("========== ERROR ==========")
        print(e)
        print("===========================")
        raise HTTPException(status_code=500, detail=str(e))


# -------------------------------
# Smart Plan Route
# -------------------------------
class DescriptionInput(BaseModel):
    description: str


@app.post("/generate-smart-plan")
def generate_smart_plan(payload: DescriptionInput):
    try:
        desc = payload.description
        parsed = parse_description(desc)

        # If plot size not found, try to infer a numeric value from the text
        if not parsed.get("plot_size_sqft"):
            m_num = re.search(r"(\d+(?:\.\d+)?)", desc)
            if m_num:
                # assume number is in square yards if > 50, otherwise sqft
                val = float(m_num.group(1))
                if val > 50:
                    parsed["plot_size_sqft"] = int(val * 9)
                else:
                    parsed["plot_size_sqft"] = int(val)
            else:
                raise HTTPException(status_code=400, detail="Plot size not detected in description")

        layout = build_layout(parsed)

        budget = calculate_budget(layout["builtup_area_sqft"], parsed.get("material"))

        timeline = calculate_budget.estimate_timeline_months if False else None

        # Use budget module functions for timeline and equipment
        from planner.budget import estimate_timeline_months, predict_equipment

        timeline_months = estimate_timeline_months(layout["builtup_area_sqft"])
        equipment = predict_equipment(layout["builtup_area_sqft"])

        # Generate blueprint image
        img_url = generate_blueprint(layout["room_areas"])

        response = {
            "plot_size_sqft": layout["plot_size_sqft"],
            "builtup_area_sqft": layout["builtup_area_sqft"],
            "room_dimensions": layout["room_dimensions"],
            "elevation_style": "modern-minimal",  # placeholder
            "estimated_budget_inr": budget["estimated_budget_inr"],
            "estimated_time_months": timeline_months,
            "required_equipment": equipment,
            "blueprint_image_url": img_url,
        }

        return response

    except HTTPException:
        raise
    except Exception as e:
        print("SMART PLAN ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))
