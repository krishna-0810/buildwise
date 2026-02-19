import React, { useState } from "react";
import "./App.css";

function App() {
  const [formData, setFormData] = useState({
    area_sqft: "",
    material_quality: "basic",
    location_tier: "tier1",
    floors: "",
    deadline_months: ""
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);
  const [planResult, setPlanResult] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleGeneratePlan = async (description) => {
    setPlanLoading(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/generate-smart-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      const data = await response.json();
      setPlanResult(data);
    } catch (err) {
      alert("Error generating plan");
      console.error(err);
    }
    setPlanLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/estimate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          area_sqft: Number(formData.area_sqft),
          material_quality: formData.material_quality,
          location_tier: formData.location_tier,
          floors: Number(formData.floors),
          deadline_months: Number(formData.deadline_months)
        })
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      alert("Error connecting to backend");
      console.log(error);
    }

    setLoading(false);
  };

  const parseAiInsights = (text) => {
    if (!text) return { plan: "", cost: "", other: "" };

    // Try to find explicit headings like "Plan" and "Cost"
    const planMatch = text.match(/(plan[:\-\s]*)([\s\S]*?)(?=(cost|cost structure|costs|$))/i);
    const costMatch = text.match(/(cost(?: structure|s)?[:\-\s]*)([\s\S]*)/i);

    let plan = planMatch ? planMatch[2].trim() : "";
    let cost = costMatch ? costMatch[2].trim() : "";
    let other = "";

    if (!plan && !cost) {
      const parts = text.split(/\n\s*\n/);
      if (parts.length >= 2) {
        plan = parts[0].trim();
        cost = parts.slice(1).join("\n\n").trim();
      } else {
        const costIdx = text.toLowerCase().search(/cost/);
        if (costIdx !== -1) {
          plan = text.slice(0, costIdx).trim();
          cost = text.slice(costIdx).trim();
        } else {
          other = text.trim();
        }
      }
    }

    return { plan, cost, other };
  };

  return (
    <div className="container">
      <h1>🏗️ BuildWise Smart Cost Estimator</h1>

      <form onSubmit={handleSubmit} className="form-box">

        <input
          type="number"
          name="area_sqft"
          placeholder="Area (sqft)"
          onChange={handleChange}
          required
        />

        <select name="material_quality" onChange={handleChange}>
          <option value="basic">Basic</option>
          <option value="standard">Standard</option>
          <option value="premium">Premium</option>
        </select>

        <select name="location_tier" onChange={handleChange}>
          <option value="tier1">Tier 1</option>
          <option value="tier2">Tier 2</option>
          <option value="tier3">Tier 3</option>
        </select>

        <input
          type="number"
          name="floors"
          placeholder="Number of Floors"
          onChange={handleChange}
          required
        />

        <input
          type="number"
          name="deadline_months"
          placeholder="Deadline (months)"
          onChange={handleChange}
          required
        />

        <button type="submit">
          {loading ? "Calculating..." : "Calculate Cost"}
        </button>

      </form>

      <div className="plan-box">
        <h2>🧭 Smart AI Construction Planner</h2>
        <textarea id="desc" placeholder="Describe your plot and requirements (e.g. 'I have 300 square yards land, need 3 bedrooms, 1 big hall, kitchen, balcony and parking.')"></textarea>
        <div className="plan-actions">
          <button onClick={() => handleGeneratePlan(document.getElementById('desc').value)} className="primary">
            {planLoading ? 'Generating...' : 'Generate Smart Plan'}
          </button>
        </div>
      </div>

      {result && (
        <div className="result-box animated-card">
          <h2>📊 Estimated Cost Breakdown</h2>
          <p><strong>Base Cost:</strong> ₹{result.base_cost}</p>
          <p><strong>Adjusted Cost:</strong> ₹{result.adjusted_cost}</p>
          <p><strong>Contingency:</strong> ₹{result.contingency}</p>
          <p className="total"><strong>Total Cost:</strong> ₹{result.total_estimated_cost}</p>

          <div className="ai-sections">
            {(() => {
              const { plan, cost, other } = parseAiInsights(result.ai_insights);
              return (
                <>
                  <div className="ai-section">
                    <h3>📝 Suggested Build Plan</h3>
                    {plan ? (
                      <pre className="ai-pre">{plan}</pre>
                    ) : other ? (
                      <pre className="ai-pre">{other}</pre>
                    ) : (
                      <p>No build plan found in AI insights.</p>
                    )}
                  </div>

                  <div className="ai-section">
                    <h3>💰 Suggested Cost Structure</h3>
                    {cost ? (
                      <pre className="ai-pre">{cost}</pre>
                    ) : (
                      <p>Cost structure not explicitly found in AI insights.</p>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {planResult && (
        <div className="plan-result animated-card">
          <h2>🏗️ Smart Plan</h2>
          <p><strong>Plot Size:</strong> {planResult.plot_size_sqft} sqft</p>
          <p><strong>Built-up Area:</strong> {planResult.builtup_area_sqft} sqft</p>
          <p><strong>Estimated Budget:</strong> ₹{planResult.estimated_budget_inr}</p>
          <p><strong>Estimated Time:</strong> {planResult.estimated_time_months} months</p>
          <h3>Rooms & Dimensions</h3>
          <pre className="ai-pre">{JSON.stringify(planResult.room_dimensions, null, 2)}</pre>
          <h3>Equipment</h3>
          <pre className="ai-pre">{JSON.stringify(planResult.required_equipment, null, 2)}</pre>
          {planResult.blueprint_image_url && (
            <div className="blueprint-wrap">
              <img src={planResult.blueprint_image_url} alt="blueprint" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
