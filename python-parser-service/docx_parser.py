from docx import Document
from lxml import etree

namespaces = {
    'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
    'm': 'http://schemas.openxmlformats.org/officeDocument/2006/math',
    'mc': 'http://schemas.openxmlformats.org/markup-compatibility/2006'
}

def parse_omath(node):
    if node is None:
        return ""
    
    # Strip namespace if present
    tag = node.tag.split('}')[-1] if '}' in node.tag else node.tag
    
    if tag == 't':
        return node.text or ""
        
    result = ""
    
    if tag == 'f':
        num_node = node.find('.//m:num', namespaces)
        den_node = node.find('.//m:den', namespaces)
        num = parse_omath(num_node) if num_node is not None else ""
        den = parse_omath(den_node) if den_node is not None else ""
        result = f"\\frac{{{num}}}{{{den}}}"
    elif tag == 'rad':
        deg_node = node.find('.//m:deg', namespaces)
        e_node = node.find('.//m:e', namespaces)
        e = parse_omath(e_node) if e_node is not None else ""
        if deg_node is not None and deg_node.text:
            deg = parse_omath(deg_node)
            result = f"\\sqrt[{deg}]{{{e}}}"
        else:
            result = f"\\sqrt{{{e}}}"
    elif tag == 'sSup':
        e = parse_omath(node.find('./m:e', namespaces))
        sup = parse_omath(node.find('./m:sup', namespaces))
        result = f"{{{e}}}^{{{sup}}}"
    elif tag == 'sSub':
        e = parse_omath(node.find('./m:e', namespaces))
        sub = parse_omath(node.find('./m:sub', namespaces))
        result = f"{{{e}}}_{{{sub}}}"
    elif tag == 'sSubSup':
        e = parse_omath(node.find('./m:e', namespaces))
        sub = parse_omath(node.find('./m:sub', namespaces))
        sup = parse_omath(node.find('./m:sup', namespaces))
        result = f"{{{e}}}_{{{sub}}}^{{{sup}}}"
    elif tag == 'd':
        e = parse_omath(node.find('./m:e', namespaces))
        result = f"\\left( {e} \\right)"
    elif tag == 'func':
        fName = parse_omath(node.find('./m:fName', namespaces))
        e = parse_omath(node.find('./m:e', namespaces))
        result = f"\\operatorname{{{fName}}}\\left( {e} \\right)"
    else:
        for child in node:
            result += parse_omath(child)
            
    return result

def parse_paragraph_xml(p_element):
    blocks = []
    
    def extract_blocks(n):
        if n is None:
            return
        tag = n.tag.split('}')[-1] if '}' in n.tag else n.tag
        
        if tag == 'r':
            text = "".join(t.text for t in n.findall('.//w:t', namespaces) if t.text)
            # Find w:tab inside w:r
            tabs = n.findall('.//w:tab', namespaces)
            if tabs:
                text += "\t" * len(tabs)
            if text:
                blocks.append({'type': 'text', 'value': text})
        elif tag == 'oMath':
            latex = parse_omath(n)
            blocks.append({'type': 'math', 'value': latex})
        elif tag == 'oMathPara':
            for math_node in n.findall('.//m:oMath', namespaces):
                latex = parse_omath(math_node)
                blocks.append({'type': 'math', 'value': latex})
        else:
            for child in n:
                extract_blocks(child)
                
    extract_blocks(p_element)
    return blocks

def parse_docx(file_path: str):
    parse_docx.list_counters = {}
    doc = Document(file_path)
    lines = []
    
    def process_paragraph(para):
        blocks = parse_paragraph_xml(para._element)
        
        # Check if tabs exist for multiple options (like layout-analyzer in JS)
        has_tabs = any('\t' in b['value'] for b in blocks if b['type'] == 'text')
        
        if has_tabs:
            # We need to split by tab and emit multiple lines
            segments = []
            cur_text = ""
            for b in blocks:
                if b['type'] == 'math':
                    cur_text += f"${b['value']}$"
                else:
                    parts = b['value'].split('\t')
                    cur_text += parts[0]
                    for part in parts[1:]:
                        if cur_text.strip():
                            segments.append(cur_text.strip())
                        cur_text = part
            if cur_text.strip():
                segments.append(cur_text.strip())
                
            has_bold = any(run.bold for run in para.runs)
            has_highlight = any(hasattr(run.font, 'highlight_color') and run.font.highlight_color is not None for run in para.runs)
            
            for seg in segments:
                if seg:
                    lines.append({
                        "text": seg,
                        "isBold": has_bold,
                        "isHighlight": has_highlight
                    })
        else:
            text = ""
            for b in blocks:
                if b['type'] == 'math':
                    text += f"${b['value']}$"
                else:
                    text += b['value']
                    
            text = text.strip()
            if text:
                has_bold = any(run.bold for run in para.runs)
                has_highlight = any(hasattr(run.font, 'highlight_color') and run.font.highlight_color is not None for run in para.runs)
                
                # Check for numbering
                num_text = ""
                numPrs = para._element.xpath('.//w:numPr')
                if numPrs:
                    numId_node = numPrs[0].xpath('.//w:numId/@w:val')
                    ilvl_node = numPrs[0].xpath('.//w:ilvl/@w:val')
                    
                    if numId_node and ilvl_node:
                        numId = numId_node[0]
                        ilvl = ilvl_node[0]
                        
                        # Use a simple global counter dictionary attached to the docx_parser module
                        if not hasattr(parse_docx, 'list_counters'):
                            parse_docx.list_counters = {}
                            
                        if numId not in parse_docx.list_counters:
                            parse_docx.list_counters[numId] = {}
                        if ilvl not in parse_docx.list_counters[numId]:
                            parse_docx.list_counters[numId][ilvl] = 1
                        else:
                            parse_docx.list_counters[numId][ilvl] += 1
                            
                        count = parse_docx.list_counters[numId][ilvl]
                        
                        if ilvl == '0':
                            num_text = f"Câu {count}: "
                        elif ilvl == '1':
                            num_text = f"{chr(64 + count)}. " if count <= 26 else f"{count}. "
                        else:
                            num_text = f"{count}. "
                            
                if num_text:
                    text = num_text + text

                lines.append({
                    "text": text,
                    "isBold": has_bold,
                    "isHighlight": has_highlight
                })

    for para in doc.paragraphs:
        process_paragraph(para)
            
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                for para in cell.paragraphs:
                    process_paragraph(para)
                        
    return lines
