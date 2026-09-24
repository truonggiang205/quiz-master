import re
import time

def parse_questions(lines):
    questions = []
    current_question = None
    current_option = None
    
    question_regex = re.compile(r'^(Câu\s*hỏi\s*(\d+)|Câu\s*(\d+)|Question\s*(\d+)|\b(\d+)\s*[\.:\-\)])\s*(.*)', re.IGNORECASE)
    option_regex = re.compile(r'^([A-F])\s*[\.:\-\)]\s*(.*)', re.IGNORECASE)
    answer_regex = re.compile(r'^(đáp\s*án|đáp\s*án\s*đúng|answer|correct\s*answer)\s*[:\-]?\s*([A-F])\s*$', re.IGNORECASE)
    answer_key_regex = re.compile(r'^(Câu\s*\d+|\d+)\s*[:\-]\s*([A-F])\s*$', re.IGNORECASE)
    
    def flush():
        nonlocal current_question, current_option
        if current_question:
            opts = current_question["options"]
            correct_opts = [o for o in opts if o["isCorrect"]]
            if correct_opts and len(correct_opts) == len(opts):
                for opt in opts:
                    opt["isCorrect"] = False
                correct_opts[0]["isCorrect"] = True
                current_question["correctAnswer"] = correct_opts[0]["label"]
            elif len(correct_opts) == 1 and not current_question["correctAnswer"]:
                current_question["correctAnswer"] = correct_opts[0]["label"]
                
            questions.append(current_question)
            current_question = None
            current_option = None

    def preprocess_lines(input_lines):
        new_lines = []
        split_regex = re.compile(r'\s+([A-F]\s*[\.:\-\)])\s+', re.IGNORECASE)
        
        for line in input_lines:
            text = line.get("text", "").strip()
            if not text:
                continue
                
            parts = split_regex.split(text)
            if len(parts) == 1:
                new_lines.append(line)
            else:
                first_part = parts[0].strip()
                if first_part:
                    new_line = line.copy()
                    new_line["text"] = first_part
                    new_lines.append(new_line)
                    
                for i in range(1, len(parts), 2):
                    opt_label = parts[i].strip()
                    opt_text = parts[i+1].strip() if i+1 < len(parts) else ""
                    
                    new_line = line.copy()
                    new_line["text"] = f"{opt_label} {opt_text}"
                    new_lines.append(new_line)
        return new_lines

    processed_lines = preprocess_lines(lines)

    for line in processed_lines:
        text = line.get("text", "").strip()
        if not text:
            continue
            
        ans_key_match = answer_key_regex.match(text)
        if ans_key_match:
            qNumStr = re.sub(r'\D', '', ans_key_match.group(1))
            ans = ans_key_match.group(2).upper()
            qNum = int(qNumStr)
            
            target_q = next((q for q in questions if q["questionNumber"] == qNum), None)
            if not target_q and current_question and current_question["questionNumber"] == qNum:
                target_q = current_question
            
            if target_q:
                target_q["correctAnswer"] = ans
            continue
            
        ans_match = answer_regex.match(text)
        if ans_match and current_question:
            current_question["correctAnswer"] = ans_match.group(2).upper()
            current_option = None
            continue
            
        q_match = question_regex.match(text)
        if q_match:
            numStr = q_match.group(2) or q_match.group(3) or q_match.group(4) or q_match.group(5) or '0'
            num = int(numStr)
            remainingText = q_match.group(6) or ''
            remainingText = re.sub(r'^[.:\-]\s*', '', remainingText).strip()
            
            flush()
            current_question = {
                "id": f"q-tmp-{int(time.time()*1000)}-{len(questions)}",
                "questionNumber": num,
                "content": remainingText,
                "options": [],
                "correctAnswer": None,
                "warnings": []
            }
            current_option = None
            continue
            
        if not current_question:
            continue
            
        opt_match = option_regex.match(text)
        if opt_match:
            label = opt_match.group(1).upper()
            optText = (opt_match.group(2) or '').strip()
            
            isCorrect = line.get("isHighlight", False) or line.get("isBold", False)
            
            current_option = {
                "label": label,
                "text": optText,
                "isCorrect": isCorrect
            }
            current_question["options"].append(current_option)
            
            if isCorrect and not current_question["correctAnswer"]:
                current_question["correctAnswer"] = label
            continue
            
        if current_option:
            current_option["text"] += " " + text
        else:
            if current_question["content"]:
                current_question["content"] += "\n" + text
            else:
                current_question["content"] = text
                
    flush()
    return questions
