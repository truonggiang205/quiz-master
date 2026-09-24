import re

text = r"A. $3\sqrt{3}cm$ B. 3cm C. $3\sqrt{2}cm$ D. $6\sqrt{3}cm$"
split_regex = re.compile(r'\s+([A-F]\s*[\.:\-\)])\s+', re.IGNORECASE)
parts = split_regex.split(text)
print(parts)
