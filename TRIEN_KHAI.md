# Đưa LOCALMATE lên mạng — localmate.click

> Tên miền cũ `baynuistay.me` đã **nghỉ hưu**: nó không còn phục vụ trang nữa,
> chỉ còn chỉ đường. Ai vào đường cũ — mã QR trên hộ chiếu, tin nhắn đã gửi,
> danh thiếp đã in — sẽ được đẩy thẳng sang `localmate.click`, giữ nguyên cả
> đường dẫn và tham số phía sau.
>
> Vẫn phải giữ chứng chỉ HTTPS cho tên miền cũ: không có chứng chỉ thì trình
> duyệt chặn ngay ở bước bắt tay, chưa kịp đọc lệnh chuyển hướng nào — khách
> thấy màn hình đỏ cảnh báo bảo mật chứ không phải trang mới.

Hướng dẫn này đưa web và API lên một máy chủ chạy 24/7, ai ở đâu cũng vào được,
không cần máy bạn bật.

---

## Vì sao không dùng GitHub Pages

GitHub Pages **chỉ phục vụ file tĩnh** — HTML, CSS, ảnh. Dự án này là một máy
chủ Node thật:

| Chức năng | Cần máy chủ chạy Node |
|---|---|
| Trợ lý chat AI (`/api/chat`) | Có — gọi Gemini/OpenAI, giữ khoá API bí mật |
| Đặt phòng, tour, xe (`/v1/bookings`) | Có |
| Điều phối tài xế, bám vị trí xe | Có — giữ trạng thái chuyến trong bộ nhớ |
| Hộ chiếu Bảy Núi, đóng dấu QR | Có — ký HMAC, kiểm tra GPS |
| Sổ quỹ, đối soát đối tác | Có |
| Thông báo đẩy FCM | Có |

Đưa lên Pages thì trang chủ hiện ra, còn tất cả những thứ trên đều chết. Nên
tên miền `localmate.click` sẽ trỏ vào máy chủ thật, không trỏ vào Pages.

---

## Chi phí

Gói GitHub Student Pack của bạn có sẵn **200 đô credit DigitalOcean**. Máy nhỏ
nhất đủ chạy dự án này tốn 6 đô/tháng, tức credit dùng được khoảng **33 tháng**.
Không phải trả thêm gì.

---

## Bước 1 — Đưa mã nguồn lên GitHub

Kho mã đã khởi tạo sẵn và đã kiểm tra không có khoá bí mật nào lọt vào.

Tạo một kho **riêng tư** (Private) trên GitHub tên `baynuistay`, rồi ở máy bạn:

```bash
git remote add origin https://github.com/TEN-CUA-BAN/baynuistay.git
```

```bash
git push -u origin master
```

> **Để Private, đừng để Public.** Mã nguồn không chứa khoá API, nhưng nó lộ toàn
> bộ cấu trúc hệ thống — đường dẫn admin, cách ký mã QR hộ chiếu, cách tính hoa
> hồng. Đối thủ trong cuộc thi đọc được là bất lợi cho bạn.

Những thứ **không** được đưa lên (đã chặn sẵn trong `.gitignore`):

- `.env` — khoá Gemini, khoá OpenAI
- `homestay-bay-nui-firebase-adminsdk-*.json` — khoá quản trị Firebase, ai có
  file này là đọc ghi được toàn bộ dữ liệu của bạn
- `data/`, `public/uploads/` — dữ liệu vận hành
- `backup-*.json` — bản sao đơn đặt, có tên và số điện thoại khách

---

## Bước 2 — Tạo máy chủ trên DigitalOcean

1. Vào <https://www.digitalocean.com/github-students> và nhận credit bằng tài
   khoản GitHub của bạn.
2. Tạo **Droplet** với các lựa chọn:
   - Hệ điều hành: **Ubuntu 24.04 LTS**
   - Gói: **Basic → Regular → 1 GB RAM / 25 GB SSD** (6 đô/tháng)
   - Khu vực: **Singapore** — gần Việt Nam nhất, khách vào nhanh nhất
   - Xác thực: **SSH Key** nếu bạn biết dùng, không thì **Password**
3. Tạo xong, ghi lại **địa chỉ IP** của máy (dạng `164.90.xxx.xxx`).

---

## Bước 3 — Dựng máy chủ

Đăng nhập vào máy vừa tạo (thay IP của bạn vào):

```bash
ssh root@164.90.xxx.xxx
```

Rồi chạy một lệnh duy nhất — nó tự cài Node 22, nginx, tường lửa, tài khoản
chạy app, thư mục dữ liệu và dịch vụ tự khởi động lại:

```bash
apt-get update && apt-get install -y git && git clone https://github.com/TEN-CUA-BAN/baynuistay.git /tmp/bns && REPO_URL=https://github.com/TEN-CUA-BAN/baynuistay.git bash /tmp/bns/deploy/cai-dat-may-chu.sh
```

Kho riêng tư thì Git sẽ hỏi tên đăng nhập và mật khẩu. Mật khẩu ở đây **không
phải mật khẩu GitHub** mà là *Personal Access Token* — tạo tại
GitHub → Settings → Developer settings → Personal access tokens.

---

## Bước 4 — Điền khoá API

```bash
nano /etc/baynuistay.env
```

Điền hai dòng này (lấy giá trị từ file `.env` ở máy bạn):

```
GEMINI_API_KEYS=...
BAYNUI_OPENAI_KEY=...
```

Muốn bật thông báo đẩy thì thêm nội dung file khoá Firebase vào **một dòng**:

```
FCM_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"homestay-bay-nui",...}
```

Lưu (`Ctrl+O`, `Enter`, `Ctrl+X`) rồi khởi động lại:

```bash
systemctl restart baynuistay && systemctl status baynuistay
```

---

## Bước 5 — Trỏ tên miền

Vào trang quản lý tên miền → `localmate.click` → **Bản ghi** (DNS records).

Thêm hai bản ghi:

| Type | Host | Value | TTL |
|---|---|---|---|
| A Record | `@` | địa chỉ IP máy chủ | Automatic |
| A Record | `www` | địa chỉ IP máy chủ | Automatic |

DNS lan toả thường mất 5–30 phút. Kiểm tra đã trỏ đúng chưa:

```bash
nslookup localmate.click
```

---

## Bước 6 — Bật HTTPS

Chỉ chạy **sau khi** bước 5 đã trỏ đúng, không thì certbot báo lỗi:

```bash
certbot --nginx -d localmate.click -d www.localmate.click \n        -d baynuistay.me -d www.baynuistay.me   # tên miền cũ chỉ để chỉ đường
```

Chọn phương án chuyển hướng toàn bộ sang HTTPS. Chứng chỉ tự gia hạn, không
phải làm lại.

Xong. Mở <https://localmate.click> là thấy trang.

---

## Bước 7 — Trỏ app Android về tên miền thật

Sửa `android-app/local.properties`:

```
baynui.apiBaseUrl=https://localmate.click/
```

Rồi build lại app. Từ lúc này app chạy được ở bất kỳ đâu, không cần chung wifi,
không cần cloudflared.

---

## Cập nhật web sau này

Ở máy bạn:

```bash
git add -A && git commit -m "mô tả thay đổi" && git push
```

Trên máy chủ:

```bash
bash /srv/baynuistay/deploy/cap-nhat.sh
```

Script kiểm tra cú pháp **trước** khi khởi động lại — mã lỗi thì máy chủ cũ vẫn
chạy, khách không thấy gì.

---

## Dữ liệu nằm ở đâu

Đây là điểm dễ mất trắng nhất, nên đã xử lý sẵn:

| Thứ | Nơi lưu | Có mất khi cập nhật web? |
|---|---|---|
| Đối tác, tin phòng, đánh giá, sổ quỹ, hộ chiếu | `/var/lib/baynuistay/data` | Không |
| Ảnh đối tác tải lên | `/var/lib/baynuistay/uploads` | Không |
| Đơn đặt dịch vụ | Firebase Firestore | Không |
| Khoá API | `/etc/baynuistay.env` | Không |
| Mã nguồn | `/srv/baynuistay` | Bị ghi đè — đúng như mong muốn |

Cả bốn thứ đầu đều nằm **ngoài** thư mục mã nguồn. Nếu để trong đó, mỗi lần cập
nhật web là hồ sơ đối tác và ảnh phòng thật của khách sạn bay theo.

Nên sao lưu định kỳ:

```bash
tar czf /root/baynui-$(date +%F).tar.gz /var/lib/baynuistay
```

---

## Khi có trục trặc

```bash
systemctl status baynuistay
```

```bash
journalctl -u baynuistay -n 100 --no-pager
```

| Triệu chứng | Nguyên nhân hay gặp |
|---|---|
| Trang trắng, lỗi 502 | Node chết — xem `journalctl`, thường do thiếu khoá trong `/etc/baynuistay.env` |
| Chat bot không trả lời | Hết lượt Gemini và chưa điền `BAYNUI_OPENAI_KEY` |
| Ảnh không hiện | Thiếu `proxy_set_header X-Forwarded-Proto` trong nginx |
| Đối tác không tải được ảnh, lỗi 413 | `client_max_body_size` trong nginx quá nhỏ |
| App báo mất mạng | `local.properties` còn trỏ vào địa chỉ cũ |

---

## Việc cần làm trước khi nộp dự thi

- [ ] Xoá `homestay-bay-nui-firebase-adminsdk-*.json` khỏi bản nén nộp bài
- [ ] Xoá `.env` khỏi bản nén nộp bài
- [ ] Thu hồi và cấp lại khoá Gemini/OpenAI nếu đã từng chia sẻ ra ngoài
- [ ] Kiểm tra `https://localmate.click` mở được từ mạng 4G, không phải wifi nhà
