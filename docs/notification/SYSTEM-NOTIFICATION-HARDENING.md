# BÁO CÁO TOÀN DIỆN: SYSTEM NOTIFICATION & ACTION FEEDBACK HARDENING
**Project:** QuizMaster Education System  
**Branch:** `fix/system-notification-action-feedback`  
**Commit:** `fix(ui): harden system notification action feedback`  
**Ngày thực hiện:** 19/10/2026  

---

## 1. Problem (Vấn Đề)
Trước khi hardening, hệ thống frontend gặp phải các vấn đề UX và trạng thái thao tác bất đồng bộ:
1. **Thiếu phản hồi tức thì khi click**: Khi người dùng nhấn các nút thao tác nặng (ghi nhận thanh toán, áp dụng điều chỉnh học phí, thanh toán hàng loạt, xuất file Excel, xóa đề thi, gửi lời mời học sinh), giao diện không lập tức phản hồi rằng hệ thống đã nhận lệnh.
2. **Toast "đang xử lý" biến mất non**: Một số trang mô phỏng trạng thái loading bằng cách bắn toast `type: 'info'` với nội dung *"Đang xử lý..."*. Tuy nhiên, toast này sử dụng timer tự động biến mất mặc định (4 giây). Nếu API mất 5–10 giây để phản hồi, toast biến mất trong khi request vẫn đang pending, khiến người dùng lầm tưởng request đã bị hủy hoặc fail và tiếp tục click lại.
3. **Double Submission & Spamming**: Không có cơ chế khóa logic (action key deduplication / handler guard) nên khi người dùng click liên tục hoặc nhấn phím Enter dồn dập, nhiều request song song được gửi lên backend (đặc biệt nguy hiểm với module tài chính học phí: ghi nhận thanh toán duplicate).
4. **Toast xếp chồng rời rạc (Stacked Toasts)**: Khi request hoàn thành, hệ thống lại bắn thêm một toast `success` độc lập, dẫn đến trên màn hình xuất hiện đồng thời cả toast info cũ và toast success mới, làm rối loạn giao diện và layout nhảy giật.

---

## 2. Root Cause (Nguyên Nhân Gốc Rễ)
1. **`ui.store.ts` chưa có trạng thái `loading` chuyên biệt**:
   - `ToastMessage.type` chỉ hỗ trợ `'success' | 'error' | 'warning' | 'info' | 'message'`.
   - Store áp dụng `setTimeout(4000)` cứng cho mọi toast mà không lưu timer reference vào `Map`, khiến cho việc hủy timer (cancellation) khi cập nhật toast là bất khả thi.
2. **Thiếu cơ chế cập nhật Toast in-place (`updateToast`)**:
   - Store chỉ có `addToast` và `removeToast`. Để thông báo kết quả sau khi loading, developer buộc phải gọi `addToast` lần thứ 2, sinh ra 2 DOM node riêng biệt.
3. **Thiếu Action Key & Global In-Flight Registry**:
   - Không có cơ chế nhận diện request trùng lặp dựa trên khóa thao tác (`actionKey`).
4. **Button Loading State lỏng lẻo**:
   - Một số handler chỉ set state `isSubmitting` mà quên kiểm tra `if (isSubmitting) return;` ở dòng đầu của hàm xử lý, tạo lỗ hổng cho double-click trước khi React kịp re-render button `disabled`.

---

## 3. Existing Notification Architecture (Kiến Trúc Hiện Tại)
- **State Store**: Zustand store tại [ui.store.ts](file:///d:/WEB/quiz-master/frontend/src/stores/ui.store.ts).
- **View Container**: [ToastContainer.tsx](file:///d:/WEB/quiz-master/frontend/src/components/common/ToastContainer.tsx) gắn cố định tại góc màn hình (`fixed top-5 right-5 sm:bottom-5 sm:top-auto sm:right-5 z-[9999]`).
- **Animation**: Framer Motion `AnimatePresence` với spring transition nhẹ nhàng.
- **Theme**: Hỗ trợ Light mode và Dark mode thông qua Tailwind tokens (`dark:bg-slate-900/95`, `dark:border-...`).

---

## 4. Changes Made (Các Thay Đổi Đã Thực Hiện)
1. **Nâng cấp [ui.store.ts](file:///d:/WEB/quiz-master/frontend/src/stores/ui.store.ts)**:
   - Thêm `'loading'` vào `ToastType`.
   - Bổ sung `persistent?: boolean`, `actionKey?: string`, `createdAt?: number` vào `ToastMessage`.
   - Quản lý auto-dismiss timer tập trung bằng `Map<string, ReturnType<typeof setTimeout>>()`.
   - Thêm hàm `updateToast(id, updates)` cho phép cập nhật in-place icon, title, message và type mà giữ nguyên DOM container.
   - Khi toast là `loading` hoặc `persistent: true`: **tuyệt đối không hẹn giờ auto-dismiss**.
   - `addToast` trả về `id` và tự động tái sử dụng toast đang loading nếu cùng `actionKey`.
   - Thêm dọn dẹp timers trong `removeToast` và `clearToasts`.
2. **Xây dựng [notification.util.ts](file:///d:/WEB/quiz-master/frontend/src/utils/notification.util.ts)**:
   - Cung cấp hàm wrapper chuẩn `withNotification(options, actionFn)`.
   - Kiểm soát `activeActionKeys: Set<string>` chống double-submission ngay tại client runtime.
   - Bắt lỗi API và trích xuất message thân thiện (`err.response?.data?.message`), tự động lọc bỏ stack trace / SQL / internal keywords.
   - Cung cấp object `notify` (`notify.loading`, `notify.success`, `notify.error`, `notify.update`, `notify.dismiss`, `notify.clear`).
3. **Tối ưu [ToastContainer.tsx](file:///d:/WEB/quiz-master/frontend/src/components/common/ToastContainer.tsx)**:
   - Thêm visual cho `loading`: biểu tượng `<Loader2 className="animate-spin text-sky-500" />` và viền `border-sky-300 dark:border-sky-700/60 bg-sky-50/95 dark:bg-slate-900/95`.
   - Thêm dải shimmer progress thanh mảnh ở viền dưới toast loading.
   - Vô hiệu hóa nút close và sự kiện click đóng khi toast đang ở trạng thái `loading` để bảo vệ quá trình async.
   - Chuyển tiếp mượt mà giữa các trạng thái trên cùng một card thông qua CSS transition (không tạo lại DOM element, không nhảy layout).
4. **Tích hợp dọn dẹp Session**:
   - Cập nhật [auth.store.ts](file:///d:/WEB/quiz-master/frontend/src/stores/auth.store.ts) và [api.ts](file:///d:/WEB/quiz-master/frontend/src/services/api.ts) để gọi `clearToasts()` khi user Logout hoặc khi gặp mã lỗi 401.

---

## 5. Notification State Machine (Mô Hình Trạng Thái)

```
[User Trigger Action]
         │
         ▼
 ┌───────────────┐
 │    LOADING    │ ◄── Persistent = true (NO auto-dismiss timer)
 └───────┬───────┘
         │
         ├─────────────────────────────────────────┐
         │ (Promise Resolves)                      │ (Promise Rejects / Throws)
         ▼                                         ▼
 ┌───────────────┐                         ┌───────────────┐
 │    SUCCESS    │                         │     ERROR     │
 └───────┬───────┘                         └───────┬───────┘
         │                                         │
         │ Auto-dismiss (3.5s)                     │ Auto-dismiss (5.0s)
         ▼                                         ▼
   [UI Removed]                              [UI Removed]
```

- **LOADING**:
  - `persistent = true`, không có auto-dismiss timer.
  - Tồn tại xuyên suốt vòng đời của request cho đến khi Promise kết thúc.
  - Giữ nguyên ID thông báo.
- **SUCCESS**:
  - Cập nhật trực tiếp trên cùng ID thông báo.
  - Đổi icon sang CheckCircle2 xanh lá cây, đổi màu viền sang emerald mượt mà.
  - Tự động đóng sau 3500ms.
- **ERROR**:
  - Cập nhật trực tiếp trên cùng ID thông báo.
  - Đổi icon sang AlertCircle đỏ hồng, đổi màu viền sang rose.
  - Hiển thị thông điệp lỗi nghiệp vụ an toàn.
  - Tự động đóng sau 5000ms.
- **INFO / WARNING**:
  - Đóng sau 4000ms.

---

## 6. Duplicate Prevention (Cơ Chế Chống Trùng Lặp)
1. **Lớp 1: In-Flight Action Key Registry**
   - Bộ nhớ `activeActionKeys = new Set<string>()` trong `notification.util.ts`.
   - Khi một action đang xử lý (ví dụ: `tuition-payment-123`), nếu phát hiện thao tác trùng lặp gửi tới trước khi action kết thúc, request thứ 2 sẽ bị từ chối ngay lập tức kèm cảnh báo.
2. **Lớp 2: Store Deduplication**
   - Trong `useUiStore.addToast()`, nếu đã tồn tại toast có cùng `actionKey` đang ở trạng thái `loading`, store sẽ trả về ID của toast hiện tại mà không tạo thêm toast mới.
3. **Lớp 3: Handler Double-Click Guard**
   - Mọi hàm submit đều kiểm tra trạng thái cờ `if (submitting) return;` ngay ở dòng đầu tiên trước khi thực thi.

---

## 7. Button Loading Strategy (Chiến Lược Khóa Nút Thao Tác)
Tất cả các nút hành động bất đồng bộ quan trọng được áp dụng mẫu chuẩn:
```tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (submitting) return; // 1. Logic guard
  setSubmitting(true);   // 2. Immediate UI locked

  try {
    await withNotification({
      actionKey: 'unique-action-id',
      loadingTitle: 'Đang xử lý...',
      successTitle: 'Thao tác thành công',
      errorTitle: 'Thao tác thất bại',
    }, async () => {
      await apiCall();
      await reloadData();
    });
  } catch (err) {
    // Local error state if needed
  } finally {
    setSubmitting(false); // 3. Luôn luôn unlock trong finally
  }
};
```
UI button hiển thị spinner và disable:
```tsx
<button
  type="submit"
  disabled={submitting}
  className="... flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
>
  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
  {submitting ? 'Đang lưu...' : 'Xác nhận'}
</button>
```

---

## 8. API Error Handling (Xử Lý Lỗi API & An Toàn)
- Trích xuất thông báo lỗi nghiệp vụ từ backend (`err.response?.data?.message`).
- Bộ lọc ngăn chặn rò rỉ kỹ thuật: nếu message chứa các chuỗi nhạy cảm như `internal server`, `syntaxerror`, `prisma`, `typeorm`, `sql`, `stack`, hệ thống sẽ thay thế bằng thông báo an toàn: *"Vui lòng kiểm tra lại kết nối và thử lại."*
- Phân biệt rõ ràng giữa Request Pending, Network Failure và Timeout (30s) mà không đánh đồng.

---

## 9. Tuition Actions Hardened (Các Thao Tác Học Phí Được Gia Cố)
Đã rà soát và bảo vệ toàn bộ các thao tác tài chính trong [TeacherTuitionPage.tsx](file:///d:/WEB/quiz-master/frontend/src/pages/teacher/TeacherTuitionPage.tsx):
1. **Ghi nhận thanh toán đơn lẻ (`handleSubmitPayment`)**:
   - `actionKey: tuition-payment-${selectedTuition.id}`
   - Khóa nút "Xác Nhận Nộp Tiền" kèm `<Loader2 className="animate-spin" />`.
   - Toast hiển thị: *"Đang ghi nhận thanh toán..."* -> chuyển thành *"Ghi nhận thanh toán thành công"*.
2. **Cập nhật trạng thái nhanh qua Dropdown (`handleQuickStatusChange`)**:
   - `actionKey: tuition-status-${tuitionId}`
   - Toast hiển thị: *"Đang cập nhật trạng thái..."* -> chuyển thành *"Cập nhật trạng thái thành công"*.
3. **Thêm phụ thu / giảm trừ học phí (`handleSubmitAdjustment`)**:
   - `actionKey: tuition-adjustment-submit`
   - Khóa nút "Lưu Khoản Điều Chỉnh" kèm spinner.
   - Toast hiển thị: *"Đang lưu điều chỉnh học phí..."* -> chuyển thành *"Đã áp dụng điều chỉnh học phí thành công"*.
4. **Xóa khoản điều chỉnh (`handleDeleteAdjustment`)**:
   - `actionKey: tuition-delete-adjustment-${adjustmentId}`
   - Toast hiển thị: *"Đang xóa khoản điều chỉnh..."* -> chuyển thành *"Đã xóa khoản điều chỉnh"*.
5. **Thanh toán học phí hàng loạt (`handleSubmitBulkPayment`)**:
   - `actionKey: tuition-bulk-payment-submit`
   - Khóa nút "Xác Nhận Thu Tiền" kèm spinner.
   - Toast hiển thị: *"Đang ghi nhận thanh toán hàng loạt..."* -> chuyển thành *"Đã ghi nhận thanh toán hàng loạt thành công"*.
6. **Xuất báo cáo Excel (`handleExportExcel`)**:
   - `actionKey: tuition-export-excel-${selectedMonth}`
   - Toast hiển thị: *"Đang xuất file Excel..."* -> chuyển thành *"Xuất file Excel thành công!"*.

Ngoài ra, các trang khác cũng được gia cố mẫu:
- [TeacherQuizListPage.tsx](file:///d:/WEB/quiz-master/frontend/src/pages/teacher/TeacherQuizListPage.tsx): Chuyển bản thảo/Xuất bản đề thi, Xóa bài thi.
- [TeacherStudentsPage.tsx](file:///d:/WEB/quiz-master/frontend/src/pages/teacher/TeacherStudentsPage.tsx): Gửi lời mời học sinh, Xóa học sinh.
- [UserManagementPage.tsx](file:///d:/WEB/quiz-master/frontend/src/pages/admin/UserManagementPage.tsx): Khóa/Mở khóa tài khoản, Đặt lại mật khẩu.

---

## 10. Test Matrix (Ma Trận Kiểm Thử Tự Động)
Toàn bộ 15 kịch bản theo yêu cầu được kiểm thử tự động tại [notification-state-machine.spec.ts](file:///d:/WEB/quiz-master/backend/src/modules/system/tests/notification-state-machine.spec.ts):

| Mã Test | Mô tả Kịch Bản | Kết Quả |
| :--- | :--- | :---: |
| **NOTIFY-01** | Click action → LOADING notification xuất hiện ngay lập tức | **PASS** |
| **NOTIFY-02** | LOADING notification không auto-dismiss trong lúc request đang pending | **PASS** |
| **NOTIFY-03** | API success → LOADING chuyển thành SUCCESS trên cùng notification ID | **PASS** |
| **NOTIFY-04** | API failure → LOADING chuyển thành ERROR trên cùng notification ID | **PASS** |
| **NOTIFY-05** | API throw exception → button/state trở lại trạng thái enabled bình thường | **PASS** |
| **NOTIFY-06** | Double click → chỉ tạo một request duy nhất | **PASS** |
| **NOTIFY-07** | Double click → chỉ có một LOADING notification | **PASS** |
| **NOTIFY-08** | Cùng actionKey đang pending → addToast không tạo duplicate notification | **PASS** |
| **NOTIFY-09** | Khác actionKey → có thể thực thi độc lập và song song | **PASS** |
| **NOTIFY-10** | Lỗi 401 → session/toast cleanup được kích hoạt để tránh orphan notification | **PASS** |
| **NOTIFY-11** | Logout → toàn bộ pending notification và active timers được dọn dẹp sạch | **PASS** |
| **NOTIFY-12** | Light mode notification hiển thị đúng token style cho tất cả các loại | **PASS** |
| **NOTIFY-13** | Dark mode notification hiển thị đúng token `dark:` style cho tất cả các loại | **PASS** |
| **NOTIFY-14** | Long-running request (60s) → notification duy trì trạng thái LOADING cho tới khi hoàn tất | **PASS** |
| **NOTIFY-15** | Request timeout (30s) → chuyển thành ERROR và unlock button | **PASS** |

---

## 11. Build Results (Kết Quả Build)
- **Frontend Build (`tsc -b && vite build`)**:
  - Trạng thái: **PASS** (Exit code 0, hoàn thành trong 10.66s)
  - 0 TypeScript compiler errors.
  - Bundled clean assets: `notification.util`, `ToastContainer`, `TeacherTuitionPage`, v.v.
- **Backend Build (`nest build`)**:
  - Trạng thái: **PASS** (Exit code 0)

---

## 12. Regression Results (Kết Quả Kiểm Thử Hồi Quy)
- **Backend & Logic Vitest Run**:
  - **18 / 18** test files passed (100%).
  - **209 / 209** tests passed (100%).
  - Thời gian chạy: 17.34s.
  - Các module đã qua kiểm thử hồi quy:
    - Auth & Security (`auth-security.spec.ts`, `auth-final-workflow.spec.ts`)
    - Tuition & Teaching (`tuition.service.spec.ts`, `schedule.service.spec.ts`, `scores.service.spec.ts`, `learning-logs-excel.spec.ts`, `holidays.service.spec.ts`)
    - Grading Pipeline (`grading-pipeline.spec.ts`, `fuzzy-matcher.spec.ts`, `keyword-matcher.spec.ts`, `exact-matcher.spec.ts`, `normalizer.spec.ts`)
    - Questions & Question Bank (`questions-update.spec.ts`, `questions-diff.spec.ts`, `frontend-logic.spec.ts`)
    - Dashboard (`dashboard.service.spec.ts`)
    - Notification System (`notification-state-machine.spec.ts`)

---

## 13. Files Changed (Danh Sách Tệp Đã Thay Đổi)
1. `frontend/src/stores/ui.store.ts`: Nâng cấp notification state machine, timers Map, `updateToast`, deduplication.
2. `frontend/src/utils/notification.util.ts` *(mới)*: Helper `withNotification`, `notify`, in-flight action key registry.
3. `frontend/src/components/common/ToastContainer.tsx`: Render trạng thái `loading`, spinner, progress accent bar, in-place CSS transition.
4. `frontend/src/services/api.ts`: Bổ sung `clearToasts()` khi nhận response 401.
5. `frontend/src/stores/auth.store.ts`: Bổ sung `clearToasts()` khi logout.
6. `frontend/src/pages/teacher/TeacherTuitionPage.tsx`: Gia cố payment, bulk payment, adjustment, delete adjustment, quick status change, excel export.
7. `frontend/src/pages/teacher/TeacherQuizListPage.tsx`: Gia cố publish/unpublish và delete quiz.
8. `frontend/src/pages/teacher/TeacherStudentsPage.tsx`: Gia cố invite và remove student.
9. `frontend/src/pages/admin/UserManagementPage.tsx`: Gia cố toggle user status và reset password.
10. `backend/src/modules/system/tests/notification-state-machine.spec.ts` *(mới)*: Bộ test matrix 15 kịch bản NOTIFY-01 đến NOTIFY-15.
11. `docs/notification/SYSTEM-NOTIFICATION-HARDENING.md` *(mới)*: Tài liệu báo cáo chi tiết.

---

## 14. Remaining Risks (Rủi Ro Còn Lại & Khuyến Nghị)
1. **Network Disconnection không có Timeout từ phía Browser**: Nếu trình duyệt bị mất mạng đột ngột mà TCP connection không drop ngay, request có thể pending tới mức timeout mặc định của Axios (30s). Hệ thống đã cấu hình timeout 30s để đảm bảo không bị treo vô hạn.
2. **Third-party Popups / File System API**: Đối với việc xuất ảnh qua `html2canvas` hoặc tải file trình duyệt, nếu trình duyệt của người dùng chặn pop-up download tự động, giao diện đã hiển thị thông báo lỗi thân thiện thay vì im lặng.
