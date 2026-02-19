def calculate_cost(area_sqft, material_quality, location_tier, floors, deadline_months):

    rate_table = {
        "basic": 1500,
        "standard": 2000,
        "premium": 2500
    }

    location_multiplier = {
        "tier1": 1.2,
        "tier2": 1.0,
        "tier3": 0.9
    }

    floor_multiplier = 1 + (floors - 1) * 0.1

    base_cost = area_sqft * rate_table[material_quality]
    adjusted_cost = base_cost * location_multiplier[location_tier] * floor_multiplier

    # Deadline urgency logic
    ideal_time = area_sqft / 500
    if deadline_months < ideal_time:
        adjusted_cost *= 1.1

    contingency = adjusted_cost * 0.05
    total_cost = adjusted_cost + contingency

    return {
        "base_cost": round(base_cost, 2),
        "adjusted_cost": round(adjusted_cost, 2),
        "contingency": round(contingency, 2),
        "total_estimated_cost": round(total_cost, 2)
    }
