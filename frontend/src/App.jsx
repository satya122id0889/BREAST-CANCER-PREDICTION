import React, { useEffect, useState } from "react";
import Plot from "react-plotly.js";
import "./App.css";

const SplashSequence = ({ images, onFinish, visibleDuration = 1500, fade = 300 }) => {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (index >= images.length) {
      const t = setTimeout(onFinish, 200);
      return () => clearTimeout(t);
    }

    const hideTimer = setTimeout(() => setVisible(false), visibleDuration);
    const changeTimer = setTimeout(() => {
      setIndex((i) => i + 1);
      setVisible(true);
    }, visibleDuration + fade);

    return () => {
      clearTimeout(hideTimer);
      clearTimeout(changeTimer);
    };
  }, [index, images.length, visibleDuration, fade, onFinish]);

  if (index >= images.length) return null;

  return (
    <div className="splash-root">
      <img
        src={images[index]}
        alt={`splash-${index}`}
        className={`splash-img ${visible ? "splash-visible" : "splash-hidden"}`}
        draggable={false}
      />
      <div className="splash-credit">Have you checked yours?</div>
    </div>
  );
};

function App() {
  const images = ["/images/melons.jpg", "/images/trafficlight.jpg"];
  const [showSplash, setShowSplash] = useState(true);

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
  const DATA_API = import.meta.env.VITE_DATA_URL
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch(DATA_API);
        const data = await res.json();
        setMetrics(data.metrics ?? data);
      } catch (err) {
        console.warn("Could not fetch metrics:", err);
      }
    };
    fetchMetrics();
  }, [DATA_API]);

  const onFileChange = (e) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setPrediction(null);
    setError(null);
    if (f) setPreview(URL.createObjectURL(f));
    else setPreview(null);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setPrediction(null);
    setError(null);

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch(API, { method: "POST", body: fd });
      const data = await res.json();

      if (data.prediction) setPrediction(data.prediction);
      if (data.error) setError(data.error);
      if (!data.prediction && !data.error) setError("Unexpected API response");
    } catch (err) {
      console.error(err);
      setError("Failed to connect to API");
    } finally {
      setLoading(false);
    }
  };

  if (showSplash) {
    return (
      <SplashSequence
        images={images}
        onFinish={() => setShowSplash(false)}
        visibleDuration={1500}
        fade={350}
      />
    );
  }

  return (
    <div className="app-root">
      <header className="app-header">
        <h1>🩺 Breast Cancer Image Classifier</h1>
      </header>

      <main className="dashboard">
        {/* Left column: upload + preview + prediction */}
        <section className="left-col card">
          <form className="upload-row" onSubmit={onSubmit}>
            <label className="file-label">
              <input
                type="file"
                accept="image/*"
                onChange={onFileChange}
                className="file-input"
              />
              <span className="btn-ghost">Choose Image</span>
            </label>
            <button className="btn-primary" disabled={!file || loading} type="submit">
              {loading ? "Predicting..." : "Predict"}
            </button>
          </form>

          <div className="preview-area">
            {preview ? (
              <img src={preview} alt="preview" className="preview-img" />
            ) : (
              <div className="preview-placeholder">Image preview appears here</div>
            )}
          </div>

          <div className="prediction-area">
            <h3>Prediction</h3>
            {prediction ? (
              <div
                className={`prediction-pill ${
                  prediction.toLowerCase().includes("malignant") ? "malignant" : "benign"
                }`}
              >
                {prediction.toUpperCase()}
              </div>
            ) : (
              <div className="muted">No prediction yet</div>
            )}
            {error && <div className="error-box">{error}</div>}
          </div>
        </section>

        {/* Right column: analytics (only after prediction) */}
        {prediction && metrics && (
          <section className="right-col card">
            <h2>Model Analytics</h2>
            <div className="charts-grid">
              {/* Accuracy gauge */}
              <Plot
                data={[
                  {
                    type: "indicator",
                    mode: "gauge+number",
                    value: (metrics.accuracy ?? 0) * 100,
                    title: { text: "Accuracy (%)" },
                    gauge: {
                      axis: { range: [0, 100] },
                      bar: { color: "#2ecc71" },
                    },
                  },
                ]}
                layout={{
                  autosize: true,
                  margin: { l: 10, r: 10, t: 40, b: 10 },
                  height: 220,
                }}
                style={{ width: "100%", height: "220px" }}
                useResizeHandler
              />

              {/* Class-wise bars */}
              <Plot
                data={[
                  {
                    x: ["Benign", "Malignant"],
                    y: [metrics.benign?.precision ?? 0, metrics.malignant?.precision ?? 0],
                    name: "Precision",
                    type: "bar",
                    marker: { color: "#3498db" },
                  },
                  {
                    x: ["Benign", "Malignant"],
                    y: [metrics.benign?.recall ?? 0, metrics.malignant?.recall ?? 0],
                    name: "Recall",
                    type: "bar",
                    marker: { color: "#e67e22" },
                  },
                  {
                    x: ["Benign", "Malignant"],
                    y: [metrics.benign?.f1_score ?? 0, metrics.malignant?.f1_score ?? 0],
                    name: "F1 Score",
                    type: "bar",
                    marker: { color: "#2ecc71" },
                  },
                ]}
                layout={{
                  barmode: "group",
                  title: `Scores per class (highlight: ${prediction})`,
                  yaxis: { range: [0, 1], title: "Score" },
                  autosize: true,
                  margin: { t: 40, b: 40 },
                  height: 280,
                }}
                style={{ width: "100%", height: "280px" }}
                useResizeHandler
              />

              {/* Support pie */}
              <Plot
                data={[
                  {
                    labels: ["Benign", "Malignant"],
                    values: [metrics.benign?.support ?? 0, metrics.malignant?.support ?? 0],
                    type: "pie",
                    textinfo: "label+percent",
                  },
                ]}
                layout={{
                  title: "Support Distribution",
                  margin: { t: 40, b: 10 },
                  height: 260,
                }}
                style={{ width: "100%", height: "260px" }}
                useResizeHandler
              />

              {/* Macro vs Weighted */}
              <Plot
                data={[
                  {
                    x: ["Precision", "Recall", "F1"],
                    y: [
                      metrics.macro_avg?.precision ?? 0,
                      metrics.macro_avg?.recall ?? 0,
                      metrics.macro_avg?.f1_score ?? 0,
                    ],
                    name: "Macro Avg",
                    type: "bar",
                    marker: { color: "#9b59b6" },
                  },
                  {
                    x: ["Precision", "Recall", "F1"],
                    y: [
                      metrics.weighted_avg?.precision ?? 0,
                      metrics.weighted_avg?.recall ?? 0,
                      metrics.weighted_avg?.f1_score ?? 0,
                    ],
                    name: "Weighted Avg",
                    type: "bar",
                    marker: { color: "#f39c12" },
                  },
                ]}
                layout={{
                  barmode: "group",
                  title: "Macro vs Weighted Averages",
                  yaxis: { range: [0, 1] },
                  margin: { t: 40, b: 40 },
                  height: 280,
                }}
                style={{ width: "100%", height: "280px" }}
                useResizeHandler
              />
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
