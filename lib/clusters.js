// ============================================================
// LOCALMATE — Cụm điểm đi chung một ngày
// ============================================================
// Sáu điểm đến nằm rải ở Tri Tôn, Tịnh Biên và Châu Đốc, cách nhau hàng chục
// cây số. Khách ngoài tỉnh tự sắp lịch rất dễ chạy zíc-zắc: sáng Tri Tôn, trưa
// vòng lên Châu Đốc, chiều quay lại Tịnh Biên — mất nửa ngày ngồi trên xe.
//
// App đã có toạ độ đủ cả sáu điểm nhưng chưa hề dùng để gom cụm. Ở đây gom
// những điểm gần nhau thành một ngày, và nói rõ đi từ điểm này sang điểm kia
// mất bao lâu.
// ============================================================

const { PLACES } = require('./content');
const { haversineKm } = require('./geo');

// Đường ở vùng này quanh co, không đi thẳng như chim bay. Nhân 1.3 cho sát
// quãng đường thật — cùng hệ số mà phần báo giá xe đang dùng, để hai nơi không
// đưa ra hai con số khác nhau cho cùng một quãng đường.
const ROAD_FACTOR = 1.3;
// 35 km/h: đường tỉnh, đường quê, có đoạn lên dốc.
const SPEED_KMH = 35;

/** Hai điểm cách nhau bao nhiêu km đường và bao nhiêu phút chạy xe. */
function between(a, b) {
    const km = haversineKm(a.lat, a.lng, b.lat, b.lng) * ROAD_FACTOR;
    return {
        km: Math.round(km * 10) / 10,
        minutes: Math.max(5, Math.round((km / SPEED_KMH) * 60)),
    };
}

/**
 * Bao nhiêu km thì coi là "đi chung một ngày được".
 *
 * 18 km đường ≈ 30 phút chạy. Xa hơn thế mà nhét chung một ngày thì khách ngồi
 * trên xe nhiều hơn là đi chơi.
 */
const SAME_DAY_KM = 18;

/** Hai điểm trùng chỗ (như khu cắm trại nằm ngay trên Núi Cấm). */
const SAME_SPOT_KM = 1;

/**
 * Gom điểm thành cụm — LIÊN KẾT ĐẦY ĐỦ.
 *
 * Một điểm chỉ được vào cụm khi nó gần MỌI điểm đã có trong cụm, chứ không chỉ
 * gần điểm đầu tiên.
 *
 * Bản trước chỉ đo với điểm hạt nhân, và kết quả sai rõ: Trà Sư cách Núi Cấm
 * 13 km nên được hút vào cùng cụm, nhưng nó cách Hồ Tà Pạ tới 29 km — thành ra
 * một "ngày" có năm điểm với 2,5 tiếng ngồi trên xe. Đó không phải một ngày đi
 * chơi, đó là một ngày chạy xe.
 */
function build(lang = 'vi') {
    const en = lang === 'en';
    const pts = PLACES.filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng));
    const chuaXep = pts.slice();
    const clusters = [];

    while (chuaXep.length) {
        const trong = [chuaXep.shift()];

        // Quét lại nhiều lượt: thêm một điểm có thể mở ra điểm khác đủ điều kiện
        let themDuoc = true;
        while (themDuoc) {
            themDuoc = false;
            for (let i = 0; i < chuaXep.length; i += 1) {
                const ung = chuaXep[i];
                const vua = trong.every(t => between(t, ung).km <= SAME_DAY_KM);
                if (vua) {
                    trong.push(ung);
                    chuaXep.splice(i, 1);
                    themDuoc = true;
                    break;
                }
            }
        }

        clusters.push(trong);
    }

    // Cụm nhiều điểm lên trước — đó là ngày đáng đi nhất
    clusters.sort((a, b) => b.length - a.length);

    return clusters.map((trong, idx) => {
        const thuTu = sapDuong(trong);
        const chang = [];
        let tongPhut = 0;

        for (let i = 1; i < thuTu.length; i += 1) {
            const d = between(thuTu[i - 1], thuTu[i]);
            const cungCho = d.km <= SAME_SPOT_KM;
            if (!cungCho) tongPhut += d.minutes;
            chang.push({
                from: en ? (thuTu[i - 1].nameEn || thuTu[i - 1].name) : thuTu[i - 1].name,
                to: en ? (thuTu[i].nameEn || thuTu[i].name) : thuTu[i].name,
                km: d.km,
                minutes: d.minutes,
                same_spot: cungCho,
                label: cungCho
                    ? (en ? 'Same location' : 'Cùng địa điểm')
                    : (en ? `${d.km} km · about ${d.minutes} min` : `${d.km} km · khoảng ${d.minutes} phút`),
            });
        }

        // Tên ngày theo TẤT CẢ vùng có trong cụm, không chỉ vùng của điểm đầu.
        // Cụm Trà Sư + Núi Sam nằm vắt qua hai huyện; gọi mỗi "Quanh Tịnh Biên"
        // là nói sai với khách đang tìm đường.
        const vung = [...new Set(
            thuTu.map(p => String(p.area || '').split('–')[0].split(',')[0].trim())
                 .filter(v => v && !/^Tại homestay$/i.test(v)),
        )].join(' – ');

        return {
            day: idx + 1,
            key: thuTu[0].slug,
            area: vung,
            title: en ? `Around ${vung}` : `Quanh ${vung}`,
            places: thuTu.map(p => ({
                slug: p.slug,
                name: en ? (p.nameEn || p.name) : p.name,
                image: p.image,
                duration: en ? (p.durationEn || p.duration) : p.duration,
            })),
            legs: chang,
            drive_minutes: tongPhut,
            note: ghiChu(thuTu.length, tongPhut, en),
        };
    });
}

/**
 * Xếp thứ tự đi trong cụm: luôn tới điểm gần nhất chưa ghé.
 *
 * Không phải lời giải tối ưu tuyệt đối, nhưng với vài điểm thì nó cho ra đúng
 * thứ tự mà người địa phương cũng sẽ chọn — và quan trọng là không bao giờ bắt
 * khách chạy ngược lại chỗ vừa đi qua.
 */
function sapDuong(trong) {
    if (trong.length <= 2) return trong.slice();
    const conLai = trong.slice(1);
    const duong = [trong[0]];

    while (conLai.length) {
        const cuoi = duong[duong.length - 1];
        let gan = 0;
        for (let i = 1; i < conLai.length; i += 1) {
            if (between(cuoi, conLai[i]).km < between(cuoi, conLai[gan]).km) gan = i;
        }
        duong.push(conLai.splice(gan, 1)[0]);
    }
    return duong;
}

function ghiChu(soDiem, phut, en) {
    if (soDiem === 1) {
        return en
            ? 'A single spot — pair it with a meal or a rest nearby.'
            : 'Chỉ một điểm — nên ghép với bữa ăn hoặc nghỉ ngơi gần đó.';
    }
    return en
        ? `${soDiem} spots, about ${phut} minutes of driving in total — comfortably one day.`
        : `${soDiem} điểm, tổng khoảng ${phut} phút chạy xe — đi gọn trong một ngày.`;
}

module.exports = { build, between, SAME_DAY_KM };
