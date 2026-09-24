import re

text = r"A. $\frac{-1}{2}x^2y$ B. $x^2y^2$ C. $xy^2$ D. $\frac{-1}{2}xy$"
split_regex = re.compile(r'\s+([A-F]\s*[\.:\-\)])\s+', re.IGNORECASE)
parts = split_regex.split(text)
print(parts)
