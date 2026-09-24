import pdfplumber

def parse_pdf(file_path: str):
    lines = []
    
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            chars = page.chars
            
            if not chars:
                continue
                
            # Sort chars by top (Y-coordinate), then x0 (X-coordinate)
            chars.sort(key=lambda c: (c["top"], c["x0"]))
            
            current_y = -1
            current_group = []
            line_groups = []
            
            for char in chars:
                if current_y == -1:
                    current_group.append(char)
                    current_y = char["top"]
                elif abs(char["top"] - current_y) <= 3.0:
                    current_group.append(char)
                else:
                    line_groups.append(current_group)
                    current_group = [char]
                    current_y = char["top"]
                    
            if current_group:
                line_groups.append(current_group)
                
            for group in line_groups:
                group.sort(key=lambda c: c["x0"])
                
                text = ""
                last_x1 = -1
                for char in group:
                    if last_x1 != -1 and char["x0"] - last_x1 > 3.0:
                        text += " "
                    text += char["text"]
                    last_x1 = char["x1"]
                    
                is_bold = any(char.get("fontname") and "bold" in char["fontname"].lower() for char in group)
                
                if text.strip():
                    lines.append({
                        "text": text.strip(),
                        "isBold": is_bold,
                        "isHighlight": False
                    })
                    
    return lines
