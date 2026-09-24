from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import shutil
import traceback
import uuid

from docx_parser import parse_docx
from pdf_parser import parse_pdf
from question_parser import parse_questions

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/parse-document")
async def parse_document(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")
    
    file_ext = os.path.splitext(file.filename)[1].lower()
    temp_file_path = f"temp_{uuid.uuid4().hex}_{file.filename}"
    
    with open(temp_file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        lines = []
        if file_ext == '.pdf':
            lines = parse_pdf(temp_file_path)
        elif file_ext == '.docx':
            lines = parse_docx(temp_file_path)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format")
            
        questions = parse_questions(lines)
        return {"status": "success", "data": questions}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
