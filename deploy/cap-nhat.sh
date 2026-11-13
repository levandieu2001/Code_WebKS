#!/usr/bin/env bash
# ============================================================
# Bay Nui Stay — cap nhat web len ban moi
# ============================================================
# Chay tren may chu moi khi ban day ma nguon moi len GitHub:
#
#   bash /srv/baynuistay/deploy/cap-nhat.sh
#
# An toan de chay lai nhieu lan. Du lieu khong dung toi: nam o
# /var/lib/baynuistay, ngoai thu muc bi ghi de.
# ============================================================
set -euo pipefail

APP_DIR=/srv/baynuistay
APP_USER=baynui

say() { printf '\n\033[1;36m==> %s\033[0m\n' "$1"; }

if [[ $EUID -ne 0 ]]; then
    echo "Phai chay bang root. Thu: sudo bash $0" >&2
    exit 1
fi

say "Lay ma nguon moi"
git -C "$APP_DIR" fetch origin
git -C "$APP_DIR" reset --hard origin/HEAD

say "Cai thu vien"
cd "$APP_DIR"
npm ci --omit=dev || npm install --omit=dev
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

say "Kiem tra cu phap truoc khi khoi dong lai"
# Kiem tra truoc thi neu ma nguon loi, may chu CU van dang chay — khach khong
# thay gi. Khoi dong lai roi moi phat hien loi thi trang chet han.
if ! node --check server.js; then
    echo "server.js co loi cu phap — GIU NGUYEN ban dang chay, khong khoi dong lai." >&2
    exit 1
fi

say "Cap nhat cau hinh he thong (neu co doi)"
cp "$APP_DIR/deploy/baynuistay.service" /etc/systemd/system/baynuistay.service
systemctl daemon-reload

# KHONG chep de cau hinh nginx.
#
# Da tung lam hong that: certbot them khoi HTTPS thang vao file nay, con ban
# trong kho ma chi co HTTP. Moi lan cap nhat web la chep de len, xoa sach phan
# SSL — cong 443 dong, ca trang chet, ma `systemctl is-active nginx` van bao
# "active" nen nhin qua tuong khong sao.
#
# Sau lan chay certbot dau tien, file /etc/nginx/... thuoc ve certbot. Sua cau
# hinh nginx thi sua tay tren may chu roi chay `nginx -t && systemctl reload
# nginx`, dung cho script tu dong dung vao.
if ! grep -q "listen 443" /etc/nginx/sites-available/baynuistay 2>/dev/null; then
    echo "  chua bat HTTPS — chep cau hinh nginx tu kho ma"
    cp "$APP_DIR/deploy/nginx-baynuistay.conf" /etc/nginx/sites-available/baynuistay
else
    echo "  giu nguyen cau hinh nginx (dang co HTTPS, khong dung toi)"
fi
nginx -t && systemctl reload nginx

say "Khoi dong lai may chu"
systemctl restart baynuistay
sleep 2

if systemctl is-active --quiet baynuistay; then
    say "XONG — may chu dang chay"
    curl -s -o /dev/null -w "  Trang chu tra ve HTTP %{http_code}\n" http://localhost:3000/
else
    echo "May chu KHONG khoi dong duoc. Xem log:" >&2
    journalctl -u baynuistay -n 40 --no-pager >&2
    exit 1
fi
