// ============================================================
// LOCALMATE — Nộp CCCD ở phía trình duyệt
// ============================================================
// Dùng ở hai chỗ, cùng một mã: lúc đăng ký làm đối tác, và lúc đối tác đã
// đăng nhập nhưng hồ sơ còn thiếu giấy (nộp hụt một mặt, hoặc mạng rớt giữa
// chừng ở lần đăng ký).
//
// Ảnh CCCD nén nhỏ hơn ảnh phòng một chút nhưng KHÔNG nén mạnh: Admin phải
// đọc được số trên thẻ. Nén xuống 1200 px là số bắt đầu nhoè, mà nhoè thì
// Admin không đối chiếu được, phải bắt người ta chụp lại — mất công cả hai.
//
// Vẽ lại qua canvas cũng bóc luôn EXIF: ảnh gốc mang theo toạ độ GPS chỗ
// chụp, không có lý do gì để toạ độ nhà người ta đi kèm ảnh CCCD.
// ============================================================

const BayNuiKyc = (() => {
    const CANH_TOI_DA = 1800;
    const CHAT_LUONG = 0.92;

    const NHAN = { front: 'mặt trước', back: 'mặt sau' };

    /** Nén ảnh ngay trên máy. Trả về Blob JPEG. */
    function nen(file) {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(file);
            const img = new Image();

            img.onload = () => {
                URL.revokeObjectURL(url);
                const scale = Math.min(1, CANH_TOI_DA / Math.max(img.width, img.height));
                const w = Math.round(img.width * scale);
                const h = Math.round(img.height * scale);

                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                canvas.toBlob(
                    (blob) => (blob ? resolve(blob) : reject(new Error('Không xử lý được ảnh này.'))),
                    'image/jpeg', CHAT_LUONG,
                );
            };

            img.onerror = () => {
                URL.revokeObjectURL(url);
                // iPhone mặc định chụp HEIC, Chrome/Firefox không đọc được.
                reject(new Error(
                    'Trình duyệt không đọc được ảnh này. Nếu bạn dùng iPhone, vào Cài đặt → '
                    + 'Camera → Định dạng → chọn "Tương thích nhất" rồi chụp lại giúp mình nhé.',
                ));
            };

            img.src = url;
        });
    }

    /**
     * Gửi một mặt thẻ lên máy chủ. Cần đã đăng nhập (có token) — cửa nhận ảnh
     * không mở cho người lạ.
     */
    async function guiMot(file, side) {
        const blob = await nen(file);
        const token = await BayNuiAuth.token();
        const res = await fetch('/v1/partner/kyc/' + side, {
            method: 'POST',
            headers: {
                'Content-Type': 'image/jpeg',
                ...(token ? { Authorization: 'Bearer ' + token } : {}),
            },
            body: blob,
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((body.error && body.error.message) || 'Không gửi được ảnh.');
        return body.data;
    }

    /**
     * Gửi cả hai mặt, báo tiến độ qua hàm gọi lại.
     * Trả về { ok, loi } — ok là số mặt đã gửi được.
     */
    async function guiCaHai({ front, back }, baoTien) {
        const viec = [['front', front], ['back', back]].filter(x => x[1]);
        let ok = 0;
        for (const [side, file] of viec) {
            if (baoTien) baoTien('Đang gửi ảnh ' + NHAN[side] + '…');
            await guiMot(file, side);
            ok += 1;
        }
        return ok;
    }

    /**
     * Gắn xem trước cho một ô chọn tệp.
     * Xem trước không phải để cho đẹp: chụp CCCD hay bị ngược, bị mờ, bị thiếu
     * góc — không nhìn thấy thì người ta bấm gửi rồi mới bị Admin trả về.
     */
    function ganXemTruoc(inputId, khungId) {
        const input = document.getElementById(inputId);
        const khung = document.getElementById(khungId);
        if (!input || !khung) return;
        input.addEventListener('change', () => {
            const file = input.files && input.files[0];
            if (!file) { khung.innerHTML = ''; return; }
            const url = URL.createObjectURL(file);
            khung.innerHTML = '<img src="' + url + '" alt="Xem trước">';
        });
    }

    return { nen, guiMot, guiCaHai, ganXemTruoc, NHAN };
})();
