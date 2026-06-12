import os
import io
import sys
import torch
import numpy as np
from PIL import Image
from typing import List
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

# Add the parent directory to python path to make sure ScanSage can be imported
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import ScanSage

app = FastAPI(title="ScanSage OCR API")
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Cache ScanSage readers by languages key
readers = {}
gpu_available = torch.cuda.is_available()
print(f"CUDA Available: {gpu_available}")

def get_reader(langs_str: str):
    langs = [l.strip() for l in langs_str.split(",") if l.strip()]
    # Sort and join to make a unique cache key
    cache_key = ",".join(sorted(langs))
    
    if cache_key not in readers:
        print(f"Initializing ScanSage reader for languages: {langs} (GPU={gpu_available})")
        readers[cache_key] = ScanSage.Reader(langs, gpu=gpu_available)
        
    return readers[cache_key]

# API endpoint for OCR processing
@app.post("/api/ocr")
async def perform_ocr(
    file: UploadFile = File(...),
    langs: str = Form("en")
):
    try:
        # Read file into memory and convert to PIL Image, then to numpy array
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        image_np = np.array(image)
        
        # Get or initialize the cached reader
        reader = get_reader(langs)
        
        # Run OCR with 2x magnification for small text recognition
        raw_results = reader.readtext(image_np, mag_ratio=2.0)
        
        # Format results for JSON serialization
        results = []
        for bbox, text, confidence in raw_results:
            formatted_bbox = [[int(point[0]), int(point[1])] for point in bbox]
            print(f"Detected Text: '{text}' (Conf: {confidence:.2f})")
            results.append({
                "bbox": formatted_bbox,
                "text": text,
                "confidence": float(confidence)
            })
            
        return JSONResponse(content={"results": results})
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# Route for serving the frontend HTML
@app.get("/")
async def read_index():
    index_path = os.path.join(BASE_DIR, "static", "index.html")
    if not os.path.exists(index_path):
        raise HTTPException(status_code=404, detail="Frontend index.html not found.")
    return FileResponse(index_path)

# Mount the static directory to serve CSS, JS, and image assets
static_dir = os.path.join(BASE_DIR, "static")
os.makedirs(static_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

if __name__ == "__main__":
    import uvicorn
    # Run server locally on port 8000
    uvicorn.run(app, host="127.0.0.1", port=8000)
