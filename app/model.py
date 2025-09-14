import torch
import os
import torch.nn as nn
from torchvision import transforms, models
from PIL import Image

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Define transform (same as during training)
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485,0.456,0.406],[0.229,0.224,0.225])
])

# Load model architecture
def load_model(weights_path="best_model.pth", num_classes=2):
    model = models.resnet50(weights=None)  # no pretrained here
    model.fc = nn.Sequential(
        nn.Linear(model.fc.in_features, 256),
        nn.ReLU(),
        nn.Dropout(0.3),
        nn.Linear(256, num_classes)
    )
    # Use absolute path for weights
    weights_abs_path = os.path.join(os.path.dirname(__file__), weights_path)
    model.load_state_dict(torch.load(weights_abs_path, map_location=device))
    model.eval()
    return model.to(device)

model = load_model()

# Inference function
def predict(image: Image.Image, class_names=["benign", "malignant"]):
    img_t = transform(image).unsqueeze(0).to(device)
    with torch.no_grad():
        outputs = model(img_t)
        _, pred = torch.max(outputs, 1)
    return class_names[pred.item()]