from lxml import etree
import sys
import os

sys.path.append(os.path.dirname(__file__))
from docx_parser import parse_omath

omml_xml = """
<m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <m:f>
    <m:num><m:r><m:t>-1</m:t></m:r></m:num>
    <m:den><m:r><m:t>2</m:t></m:r></m:den>
  </m:f>
  <m:r><m:t>x</m:t></m:r>
  <m:sSup>
    <m:e><m:r><m:t>x</m:t></m:r></m:e>
    <m:sup><m:r><m:t>2</m:t></m:r></m:sup>
  </m:sSup>
</m:oMath>
"""

node = etree.fromstring(omml_xml)
print(parse_omath(node))
