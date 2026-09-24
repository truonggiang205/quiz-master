import re
question_regex = re.compile(r'^(Câu\s*hỏi\s*(\d+)|Câu\s*(\d+)|Question\s*(\d+)|\b(\d+)\s*[\.:\-\)])\s*(.*)', re.IGNORECASE)
match = question_regex.match("Câu 1: Cho tam giác ABC")
print("Match for 'Câu 1: ...':", match.groups() if match else "None")

match2 = question_regex.match("Câu 2: Đơn thức")
print("Match for 'Câu 2: ...':", match2.groups() if match2 else "None")

match3 = question_regex.match("\ufeffCâu 2: Đơn thức")
print("Match for BOM 'Câu 2: ...':", match3.groups() if match3 else "None")

match4 = question_regex.match(" Câu 2: Đơn thức")
print("Match for space 'Câu 2: ...':", match4.groups() if match4 else "None")
