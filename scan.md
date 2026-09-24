# TASK: XÂY DỰNG HỆ THỐNG IMPORT CÂU HỎI TRẮC NGHIỆM TỪ DOCX/PDF

Tôi đang xây dựng một website học tập/trắc nghiệm trực tuyến.

Website có 2 vai trò:

* Teacher: tạo đề, upload file câu hỏi, kiểm tra và chỉnh sửa câu hỏi trước khi lưu.
* Student: làm bài trắc nghiệm.

Hiện tại tôi cần xây dựng tính năng:

> Teacher upload file DOCX hoặc PDF → hệ thống tự động đọc câu hỏi + đáp án + đáp án đúng → chuyển thành dữ liệu trắc nghiệm → hiển thị Preview → Teacher kiểm tra/chỉnh sửa → Confirm → lưu database.

## QUY TẮC QUAN TRỌNG

TUYỆT ĐỐI KHÔNG sử dụng AI/LLM/Generative AI/Vision Language Model để đọc, hiểu hoặc suy luận nội dung file.

Không gọi OpenAI API, Gemini API, Claude API hoặc bất kỳ API AI nào để parse file.

Không dùng AI để OCR.

Chỉ sử dụng:

* Document parser
* PDF parser
* DOCX parser
* OCR truyền thống nếu PDF là file scan
* Image processing
* Layout analysis dựa trên tọa độ
* Regex
* String processing
* Rule-based parser
* Rule-based validation
* Math document parsing
* MathML/LaTeX
* Các thư viện mã nguồn mở thông thường

Mục tiêu là xây dựng một hệ thống deterministic/rule-based, không phụ thuộc AI.

---

# 1. FILE ĐƯỢC PHÉP UPLOAD

Chỉ cho phép:

```text
.docx
.pdf
```

Không hỗ trợ:

```text
.doc
.xlsx
.xls
.pptx
.jpg
.jpeg
.png
```

Nếu file không phải DOCX/PDF thì trả lỗi rõ ràng:

```text
Chỉ hỗ trợ file DOCX và PDF.
```

Giới hạn:

* kiểm tra MIME type
* kiểm tra extension
* kiểm tra file signature nếu cần
* giới hạn dung lượng file
* giới hạn số trang PDF hợp lý
* không tin tưởng extension do client gửi lên

---

# 2. KIẾN TRÚC XỬ LÝ

Thiết kế pipeline:

```text
Teacher Upload
      │
      ▼
File Validation
      │
      ▼
File Type Detection
      │
      ├───────────────┐
      ▼               ▼
    DOCX             PDF
      │               │
      ▼               ▼
DOCX Parser       PDF Analyzer
      │               │
      │          ┌────┴─────┐
      │          ▼          ▼
      │       Text PDF    Scan PDF
      │          │          │
      │          │       OCR Engine
      │          │          │
      └──────────┴──────────┘
                 │
                 ▼
          Layout Analyzer
                 │
                 ▼
          Question Parser
                 │
          ┌──────┴──────┐
          ▼             ▼
     Text Parser    Math Parser
          │             │
          └──────┬──────┘
                 ▼
         Validation Engine
                 │
                 ▼
          Import Preview
                 │
                 ▼
        Teacher Edit/Review
                 │
                 ▼
             Confirm
                 │
                 ▼
             Database
```

---

# 3. DOCX PARSER

Đối với DOCX:

TUYỆT ĐỐI KHÔNG OCR nếu DOCX chứa text thật.

Phải đọc trực tiếp cấu trúc DOCX.

Cần hỗ trợ:

* paragraph
* text run
* tables
* bold
* italic
* underline
* superscript
* subscript
* line breaks
* images
* hyperlinks nếu cần
* Office Math / OMML Equation

Cần giữ được thứ tự nội dung.

Ví dụ:

```text
Câu 1. Cho phương trình

x² + 2x + 1 = 0

A. x = 1
B. x = -1
C. x = 0
D. x = 2

Đáp án: B
```

phải parse thành cấu trúc:

```json
{
  "questionNumber": 1,
  "content": [
    {
      "type": "text",
      "value": "Cho phương trình"
    },
    {
      "type": "math",
      "value": "x^2 + 2x + 1 = 0"
    }
  ],
  "options": [
    {
      "label": "A",
      "content": [
        {
          "type": "math",
          "value": "x = 1"
        }
      ]
    },
    {
      "label": "B",
      "content": [
        {
          "type": "math",
          "value": "x = -1"
        }
      ]
    },
    {
      "label": "C",
      "content": [
        {
          "type": "math",
          "value": "x = 0"
        }
      ]
    },
    {
      "label": "D",
      "content": [
        {
          "type": "math",
          "value": "x = 2"
        }
      ]
    }
  ],
  "correctAnswer": "B"
}
```

---

# 4. HỖ TRỢ CÔNG THỨC TOÁN TRONG DOCX

Đây là phần rất quan trọng.

DOCX có thể chứa Office Math / OMML.

Không được OCR công thức nếu công thức tồn tại dưới dạng Equation trong DOCX.

Phải phát hiện và parse OMML.

Pipeline mong muốn:

```text
DOCX
 ↓
OMML
 ↓
MathML hoặc LaTeX
 ↓
Normalized Math Expression
```

Database nên lưu công thức dưới dạng LaTeX hoặc MathML.

Ví dụ:

```text
x² + 2x + 1 = 0
```

lưu:

```latex
x^2 + 2x + 1 = 0
```

Ví dụ:

```text
√(x + 1)
```

lưu:

```latex
\sqrt{x+1}
```

Ví dụ:

```text
∫₀¹ x² dx
```

lưu:

```latex
\int_0^1 x^2\,dx
```

Frontend sẽ render bằng KaTeX hoặc MathJax.

KHÔNG chuyển công thức toán thành plain text nếu có thể giữ được cấu trúc toán.

---

# 5. PDF PROCESSING

PDF phải được phân loại thành 2 loại:

## TYPE A: PDF có text layer

Không OCR.

Pipeline:

```text
PDF
 ↓
Extract Text
 ↓
Extract Position
 ↓
Extract Font/Size nếu cần
 ↓
Layout Analysis
 ↓
Question Parser
```

## TYPE B: PDF scan/image

Nếu PDF không có text layer hoặc lượng text quá thấp:

```text
PDF
 ↓
Render từng page thành image
 ↓
Image preprocessing
 ↓
Traditional OCR
 ↓
Bounding Boxes
 ↓
Layout Analysis
 ↓
Question Parser
```

OCR chỉ sử dụng engine truyền thống.

Ưu tiên:

```text
Tesseract OCR
```

Có thể hỗ trợ:

```text
vie
eng
```

Không được gọi bất kỳ AI API nào.

---

# 6. XỬ LÝ CÂU HỎI THEO LAYOUT

Không được giả định rằng:

```text
A
B
C
D
```

luôn nằm trên 4 dòng khác nhau.

Phải hỗ trợ ít nhất:

## Layout 1

```text
A. Hà Nội
B. Hồ Chí Minh
C. Đà Nẵng
D. Hải Phòng
```

## Layout 2

```text
A. Hà Nội        B. Hồ Chí Minh
C. Đà Nẵng       D. Hải Phòng
```

## Layout 3

```text
A. Hà Nội    B. Hồ Chí Minh    C. Đà Nẵng    D. Hải Phòng
```

## Layout 4

```text
A. Hà Nội
B. Hồ Chí Minh
C. Đà Nẵng
D. Hải Phòng
```

Phải sử dụng:

```text
x coordinate
y coordinate
width
height
bounding box
```

để xác định vị trí.

Không được chỉ sử dụng:

```text
split("\n")
```

để xác định đáp án.

---

# 7. LAYOUT ALGORITHM

Đối với PDF/OCR:

Mỗi text block cần có:

```json
{
  "text": "A. Hà Nội",
  "x": 100,
  "y": 300,
  "width": 120,
  "height": 25
}
```

Sau đó:

1. Group các block nằm trên cùng một dòng dựa trên khoảng cách y.
2. Sort theo y.
3. Trong cùng một dòng sort theo x.
4. Xác định A/B/C/D dựa trên label.
5. Ghép nội dung của option nếu option bị chia thành nhiều text block.

Ví dụ:

```text
A.      Hà Nội
```

có thể bị OCR thành:

```text
"A."
"Hà Nội"
```

Phải ghép thành:

```text
A. Hà Nội
```

---

# 8. QUESTION DETECTION

Hỗ trợ các dạng:

```text
Câu 1.
Câu 1:
Câu 1
1.
1)
1-
Question 1
Question 1.
```

Ưu tiên tiếng Việt.

Có thể dùng regex.

Ví dụ:

```regex
^(Câu|Câu hỏi|Question)\s*\d+\s*[\.:)\-]?
```

và:

```regex
^\d+\s*[\.:)\-]
```

Nhưng phải tránh nhận nhầm:

```text
1.234
2.5
2026.09.22
```

là câu hỏi.

---

# 9. OPTION DETECTION

Hỗ trợ:

```text
A.
A)
A:
A -
a.
a)
```

và tương tự:

```text
B
C
D
```

Không phân biệt hoa/thường khi detect.

Nhưng sau khi parse phải normalize thành:

```text
A
B
C
D
```

Có thể hỗ trợ số lượng option:

```text
A-D
A-E
A-F
```

Không hard-code chỉ 4 đáp án.

---

# 10. ĐÁP ÁN ĐÚNG

Phải hỗ trợ nhiều format:

```text
Đáp án: A
Đáp án: B
Đáp án đúng: C
Đáp án đúng: D
Answer: A
Correct answer: B
```

và:

```text
Câu 1: B
Câu 2: A
Câu 3: D
```

và nếu đáp án được đánh dấu bằng formatting trong DOCX:

```text
A. Hà Nội
B. Hồ Chí Minh
```

trong đó B được:

* bold
* highlight
* màu
* checkbox
* ký hiệu

thì có thể detect formatting nếu xác định được một cách chắc chắn.

Tuy nhiên KHÔNG tự suy luận đáp án đúng dựa trên kiến thức.

Ví dụ:

```text
1 + 1 = ?
A. 1
B. 2
C. 3
D. 4
```

Nếu file không chỉ rõ đáp án, hệ thống KHÔNG được tự chọn B.

Phải trả:

```text
correctAnswer = null
```

và cảnh báo:

```text
Không tìm thấy đáp án đúng.
```

---

# 11. KHÔNG ĐƯỢC TỰ SUY LUẬN NỘI DUNG

Đây là nguyên tắc bắt buộc.

Ví dụ hệ thống đọc:

```text
Câu 1. Thủ đô Việt Nam là?
A. Hà Nội
B. Đà Nẵng
C. Huế
D. Cần Thơ
```

nhưng không có:

```text
Đáp án: A
```

thì không được tự suy luận A.

Kết quả:

```json
{
  "correctAnswer": null,
  "warnings": [
    "Không tìm thấy đáp án đúng trong file."
  ]
}
```

---

# 12. NORMALIZE TEXT

Phải xử lý:

* Unicode normalization
* khoảng trắng thừa
* xuống dòng
* ký tự đặc biệt
* dấu tiếng Việt
* non-breaking space
* zero-width characters
* ký tự OCR lỗi phổ biến

Nhưng KHÔNG được tự ý sửa nội dung câu hỏi theo suy đoán.

Ví dụ:

```text
“Đà Nẵng”
```

không được biến thành:

```text
“Đà Nang”
```

---

# 13. XỬ LÝ OCR ERROR

Chỉ được sửa các lỗi có rule rõ ràng.

Ví dụ:

```text
A . → A.
B ) → B)
```

Có thể normalize.

Nhưng không được tự động:

```text
V → √
O → 0
l → 1
```

trong toàn bộ document.

Những trường hợp không chắc chắn phải tạo warning.

Ví dụ:

```json
{
  "severity": "warning",
  "message": "Có ký tự OCR không chắc chắn ở câu 5."
}
```

---

# 14. VALIDATION ENGINE

Sau khi parse phải chạy validation.

Kiểm tra:

### Question

* Có question text hay không?
* Question number có hợp lệ không?
* Có bị trùng question number không?

### Options

* Có option hay không?
* Có A/B/C/D hay không?
* Có option bị thiếu không?
* Có option trùng không?
* Có option rỗng không?

### Answer

* Correct answer có tồn tại không?
* Correct answer có nằm trong danh sách options không?

### Math

* Math expression có bị lỗi không?
* LaTeX có parse được không?

### Layout

* Có text block không xác định vị trí không?
* Có option bị chồng lên nhau không?

---

# 15. ERROR LEVEL

Mỗi vấn đề có:

```text
ERROR
WARNING
INFO
```

Ví dụ:

```text
ERROR:
Không tìm thấy nội dung câu hỏi.

ERROR:
Câu 5 có đáp án B nhưng không có option B.

WARNING:
Không tìm thấy đáp án đúng của câu 7.

WARNING:
Câu 10 có ký tự OCR không chắc chắn.

INFO:
Câu 15 chứa công thức toán.
```

---

# 16. IMPORT PREVIEW

Sau khi parse KHÔNG được lưu database ngay.

Phải trả dữ liệu về frontend.

Frontend hiển thị:

```text
┌────────────────────────────────────────────┐
│ IMPORT PREVIEW                             │
├────────────────────────────────────────────┤
│ Tổng câu: 40                               │
│ Thành công: 36                             │
│ Cần kiểm tra: 4                            │
├────────────────────────────────────────────┤
│                                            │
│ Câu 1                              ✓        │
│ Nội dung câu hỏi...                        │
│                                            │
│ A. ...                                     │
│ B. ...                                     │
│ C. ...                                     │
│ D. ...                                     │
│                                            │
│ Đáp án: B                                  │
│                                            │
├────────────────────────────────────────────┤
│                                            │
│ Câu 7                              ⚠       │
│                                            │
│ Không tìm thấy đáp án đúng.               │
│                                            │
│ [Chọn đáp án]                              │
│                                            │
└────────────────────────────────────────────┘
```

Teacher có thể:

* sửa question
* sửa option
* thêm option
* xóa option
* sửa đáp án
* sửa công thức
* xóa câu
* thêm câu
* đánh dấu câu hợp lệ

---

# 17. CONFIRM IMPORT

Chỉ khi teacher nhấn:

```text
Confirm Import
```

backend mới lưu database.

API dự kiến:

```text
POST /question-import/upload
```

Upload file.

Response:

```json
{
  "importId": "...",
  "status": "PREVIEW",
  "questions": []
}
```

Sau khi teacher sửa:

```text
PUT /question-import/:importId
```

Sau khi xác nhận:

```text
POST /question-import/:importId/confirm
```

Hủy:

```text
DELETE /question-import/:importId
```

---

# 18. LƯU RAW FILE VÀ PARSED RESULT

Khi import nên lưu metadata:

```text
Import
├── id
├── originalFileName
├── fileType
├── fileSize
├── status
├── totalQuestions
├── validQuestions
├── warningQuestions
├── errorQuestions
├── createdBy
├── createdAt
└── confirmedAt
```

Status:

```text
UPLOADED
PROCESSING
PREVIEW
CONFIRMED
FAILED
CANCELLED
```

Không cần lưu file raw trong database.

Có thể lưu filesystem/object storage tùy kiến trúc hiện tại.

---

# 19. API RESPONSE STRUCTURE

Thiết kế response thống nhất:

```json
{
  "importId": "uuid",
  "status": "PREVIEW",
  "summary": {
    "total": 40,
    "valid": 36,
    "warning": 3,
    "error": 1
  },
  "questions": [
    {
      "id": "temp-1",
      "questionNumber": 1,
      "content": [],
      "options": [],
      "correctAnswer": "B",
      "status": "VALID",
      "warnings": []
    }
  ]
}
```

---

# 20. SECURITY

Phải kiểm tra:

* file extension
* MIME type
* magic bytes/signature
* file size
* PDF malformed
* DOCX malformed
* path traversal
* filename sanitization
* zip bomb đối với DOCX
* temporary file cleanup
* timeout khi parse
* memory limit
* số trang PDF
* không execute file upload

Không được cho file upload chạy như executable.

---

# 21. TECHNOLOGY

Nếu project backend của tôi là NestJS thì ưu tiên ecosystem Node.js/NestJS.

Hãy lựa chọn thư viện ổn định và phổ biến cho:

### DOCX

Sử dụng thư viện phù hợp để đọc DOCX/OOXML.

Nếu thư viện không hỗ trợ đầy đủ OMML thì có thể:

```text
DOCX
 ↓
Unzip OOXML
 ↓
Parse document.xml
 ↓
Parse OMML
```

Không dùng AI.

### PDF

Sử dụng PDF parser có khả năng:

* extract text
* lấy vị trí text
* lấy page
* lấy bounding box nếu có thể

### OCR

Nếu cần OCR PDF scan:

```text
Tesseract OCR
```

Không sử dụng AI OCR.

### Image processing

Có thể sử dụng:

```text
Sharp
```

hoặc thư viện tương đương để:

* grayscale
* resize
* threshold
* denoise
* deskew

### Math

Ưu tiên:

```text
OMML → MathML/LaTeX
```

Frontend:

```text
KaTeX hoặc MathJax
```

---

# 22. FRONTEND

Frontend React phải có:

```text
/pages
  /teacher
    /question-import
      UploadPage
      ImportPreviewPage
```

Các component:

```text
FileUpload
ImportProgress
ImportSummary
QuestionPreview
QuestionEditor
OptionEditor
MathPreview
ValidationMessage
ImportConfirmDialog
```

UI phải rõ ràng.

Mỗi câu có trạng thái:

```text
✓ Valid
⚠ Warning
✕ Error
```

Công thức toán phải render trực quan, không chỉ hiển thị raw LaTeX.

Ví dụ:

```text
Raw:
x^2 + 2x + 1 = 0

Preview:
x² + 2x + 1 = 0
```

Teacher có thể chuyển sang chế độ chỉnh sửa.

---

# 23. KHÔNG ĐƯỢC VIẾT MỘT PARSER KHỔNG LỒ

Chia thành các module/service riêng:

```text
document-import/
├── controllers/
│   └── question-import.controller.ts
│
├── services/
│   ├── file-validator.service.ts
│   ├── file-detector.service.ts
│   ├── docx-parser.service.ts
│   ├── pdf-parser.service.ts
│   ├── pdf-ocr.service.ts
│   ├── layout-analyzer.service.ts
│   ├── question-parser.service.ts
│   ├── option-parser.service.ts
│   ├── answer-parser.service.ts
│   ├── math-parser.service.ts
│   ├── validation.service.ts
│   └── import-preview.service.ts
│
├── dto/
├── interfaces/
├── types/
└── utils/
```

Mỗi service chỉ chịu trách nhiệm một việc.

---

# 24. TEST CASES BẮT BUỘC

Trước khi hoàn thành phải tạo test cho ít nhất:

### Test 1

DOCX:

```text
Câu 1
A
B
C
D
```

### Test 2

DOCX option ngang:

```text
A    B    C    D
```

### Test 3

DOCX option 2 cột:

```text
A    B
C    D
```

### Test 4

PDF text.

### Test 5

PDF scan.

### Test 6

DOCX có tiếng Việt.

### Test 7

DOCX có công thức:

```text
x²
√x
∫
Σ
≤
≥
≠
π
α
β
θ
```

### Test 8

DOCX có Equation/OMML.

### Test 9

PDF có 2 cột.

### Test 10

PDF có đáp án:

```text
Câu 1: A
Câu 2: C
```

### Test 11

File không có đáp án.

### Test 12

Thiếu option C.

### Test 13

OCR tạo text không chắc chắn.

### Test 14

Question bị chia sang nhiều dòng.

### Test 15

Option bị chia thành nhiều dòng.

---

# 25. LOGGING

Mỗi import phải có log:

```text
[IMPORT] File received
[IMPORT] File type: DOCX
[IMPORT] Parsing document
[IMPORT] Found 40 questions
[IMPORT] Found 160 options
[IMPORT] Found 38 answers
[IMPORT] Found 12 mathematical expressions
[IMPORT] Validation completed
[IMPORT] 36 valid / 3 warnings / 1 error
```

Không log nội dung nhạy cảm không cần thiết.

---

# 26. FALLBACK STRATEGY

Nếu parser không chắc chắn thì KHÔNG được tự đoán.

Ví dụ:

```text
Parser confidence:
HIGH → tự động nhận
MEDIUM → warning + teacher review
LOW → error/manual correction
```

Lưu ý:

Đây là confidence dựa trên RULE-BASED VALIDATION, không phải AI confidence.

Ví dụ:

```text
A B C D đầy đủ
question rõ ràng
answer tồn tại
layout không bị overlap
```

→ HIGH.

Nếu:

```text
A B D
```

→ LOW/WARNING.

---

# 27. ƯU TIÊN ĐỘ CHÍNH XÁC HƠN TỰ ĐỘNG HÓA

Nguyên tắc:

> "Không chắc thì hỏi giáo viên."

Không được:

> "Không chắc nhưng tự đoán."

Đặc biệt đối với:

* đáp án đúng
* công thức toán
* ký tự đặc biệt
* option bị thiếu
* layout không rõ
* OCR không chắc chắn

---

# 28. OUTPUT MONG MUỐN

Tôi muốn bạn triển khai tính năng hoàn chỉnh chứ không chỉ viết ví dụ.

Hãy làm theo thứ tự:

## STEP 1

Kiểm tra project hiện tại.

## STEP 2

Xác định:

* framework
* package manager
* database
* architecture hiện tại

Không tự ý phá code hiện tại.

## STEP 3

Thiết kế module import.

## STEP 4

Cài dependencies cần thiết.

## STEP 5

Implement backend:

```text
upload
file validation
DOCX parsing
PDF parsing
OCR fallback
layout analysis
question parsing
option parsing
answer parsing
math parsing
validation
preview
confirm
```

## STEP 6

Implement frontend:

```text
upload page
progress
preview
question editor
validation warning
math preview
confirm import
```

## STEP 7

Implement database/entity/model cần thiết.

## STEP 8

Implement test cases.

## STEP 9

Chạy test thực tế.

## STEP 10

Fix lỗi.

---

# 29. QUY TẮC KHI CODE

Không được:

* dùng AI để đọc file
* dùng LLM API
* dùng OCR AI
* tự suy luận đáp án
* tự sửa công thức khi không chắc
* giả định A/B/C/D luôn nằm trên từng dòng
* dùng newline làm cơ chế parse duy nhất
* lưu dữ liệu vào database trước khi teacher confirm

Phải:

* parser theo từng loại file
* layout-aware
* rule-based
* validation
* preview
* manual correction
* deterministic
* có logging
* có test

---

# 30. QUAN TRỌNG NHẤT

Hãy coi hệ thống này là:

```text
DOCUMENT PARSER
+
LAYOUT ANALYZER
+
QUESTION PARSER
+
MATH PARSER
+
VALIDATION ENGINE
```

chứ KHÔNG phải:

```text
OCR → AI → đoán câu hỏi
```

Hãy ưu tiên độ chính xác và khả năng giáo viên kiểm tra/sửa kết quả hơn việc cố gắng tự động hóa 100%.

Trước khi viết code, hãy kiểm tra project hiện tại và đưa ra:

1. Kiến trúc hiện tại.
2. Các file cần tạo.
3. Các file cần sửa.
4. Dependencies cần cài.
5. Luồng xử lý.
6. Database changes.
7. API endpoints.
8. Frontend pages/components.
9. Sau đó mới bắt đầu code từng phần.

Không được xóa hoặc thay đổi các chức năng hiện tại nếu không cần thiết cho tính năng này.
