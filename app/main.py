
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import io
from model import predict


app = FastAPI(title="Breast Cancer Classifier", description="Upload histopathology image for prediction")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Or specify ["http://localhost:5173"] for more security
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {
        "message": "Welcome to Breast Cancer Image Classifier API",
        "metrics": {
            "accuracy": 0.85,
            "benign": {
                "precision": 0.78,
                "recall": 0.74,
                "f1_score": 0.76,
                "support": 176
            },
            "malignant": {
                "precision": 0.88,
                "recall": 0.90,
                "f1_score": 0.89,
                "support": 369
            },
            "macro_avg": {
                "precision": 0.83,
                "recall": 0.82,
                "f1_score": 0.83,
                "support": 545
            },
            "weighted_avg": {
                "precision": 0.85,
                "recall": 0.85,
                "f1_score": 0.85,
                "support": 545
            }
        }
    }

@app.post("/predict")
async def classify_image(file: UploadFile = File(...)):
    try:
        # Read image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        
        # Predict
        result = predict(image, class_names=["benign", "malignant"])
        return JSONResponse({"prediction": result})
    except Exception as e:
        return JSONResponse({"error": str(e)})
