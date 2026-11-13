#!/usr/bin/env bash
# ============================================================
# Bay Nui Stay — dung may chu tu con so khong
# ============================================================
# Chay MOT LAN tren may chu Ubuntu 24.04 vua tao (DigitalOcean Droplet).
# Dang nhap bang root roi chay:
#
#   bash cai-dat-may-chu.sh
#
# Script tu dung: Node 22, nginx, tuong lua, tai khoan chay app, thu muc du
# lieu rieng, va dich vu tu khoi dong lai khi may reboot.
#
# CHUA lam hai viec (phai lam tay, xem TRIEN_KHAI.md):
#   - Dien khoa API vao /etc/baynuistay.env
#   - Xin chung chi HTTPS (phai tro ten mien ve may nay truoc da)
# ============================================================
set -euo pipefail

REPO_URL="${REPO_URL:-}"
APP_DIR=/srv/baynuistay
DATA_ROOT=/var/lib/baynuistay
ENV_FILE=/etc/baynuistay.env
APP_USER=baynui

say() { printf '\n\033[1;36m==> %s\033[0m\n' "$1"; }

if [[ $EUID -ne 0 ]]; then
    echo "Phai chay bang root. Thu: sudo bash $0" >&2
    exit 1
fi

if [[ -z "$REPO_URL" ]]; then
    echo "Chua biet lay ma nguon o dau." >&2
    echo "Chay lai kem dia chi kho Git, vi du:" >&2
    echo "  REPO_URL=https://github.com/TEN-CUA-BAN/baynuistay.git bash $0" >&2
    exit 1
fi

say "1/8 Cap nhat he thong"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq

say "2/8 Cai Node 22"
# Ubuntu 24.04 dong goi san Node 18 — qua cu cho du an nay, nen lay tu NodeSource.
if ! command -v node >/dev/null || [[ "$(node -v)" != v22* ]]; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y -qq nodejs
fi
node -v

say "3/8 Cai nginx, git, certbot"
apt-get install -y -qq nginx git certbot python3-certbot-nginx ufw

say "4/8 Tao tai khoan rieng cho app"
# Khong chay app bang root: co lo hong nao thi ke tan cong cung chi cam duoc
# quyen cua tai khoan nay, khong cam duoc ca may.
if ! id "$APP_USER" >/dev/null 2>&1; then
    useradd --system --shell /usr/sbin/nologin --home-dir "$APP_DIR" "$APP_USER"
fi

say "5/8 Tao thu muc du lieu (NAM NGOAI ma nguon)"
# Day la diem mau chot: cap nhat web se ghi de len $APP_DIR, nen moi thu can
# giu lai deu phai nam ngoai do.
mkdir -p "$DATA_ROOT/data" "$DATA_ROOT/uploads"
chown -R "$APP_USER:$APP_USER" "$DATA_ROOT"

say "6/8 Tai ma nguon"
# Chay lai script lan hai thi thu muc nay da thuoc ve tai khoan baynui (do
# dong chown o cuoi buoc nay), trong khi script chay bang root. Git thay chu
# so huu khac minh la tu choi han voi loi "dubious ownership" — co che chong
# ke khac cai bay lenh vao repo cua minh. Khai bao ngoai le truoc, khong thi
# moi lan chay lai deu chet o day.
git config --global --add safe.directory "$APP_DIR" 2>/dev/null || true

if [[ -d "$APP_DIR/.git" ]]; then
    git -C "$APP_DIR" fetch --depth 1 origin
    git -C "$APP_DIR" reset --hard origin/HEAD
else
    rm -rf "$APP_DIR"
    git clone --depth 1 "$REPO_URL" "$APP_DIR"
fi
cd "$APP_DIR"
npm ci --omit=dev || npm install --omit=dev
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

say "7/8 Tao file bien moi truong"
if [[ ! -f "$ENV_FILE" ]]; then
    cat > "$ENV_FILE" <<'ENVEOF'
# ── Bay Nui Stay — bien moi truong may chu ──
# SUA FILE NAY roi chay: systemctl restart baynuistay

PORT=3000
NODE_ENV=production

# Du lieu va anh nam ngoai thu muc ma nguon de khong mat khi cap nhat web
BAYNUI_DATA_DIR=/var/lib/baynuistay/data
BAYNUI_UPLOAD_DIR=/var/lib/baynuistay/uploads

# Trang duoc phep goi API. Thieu ten mien that o day la trinh duyet chan het.
CORS_ORIGINS=https://localmate.click,https://www.localmate.click

# ── Chatbot ──
GEMINI_API_KEYS=DIEN_VAO_DAY
BAYNUI_OPENAI_KEY=DIEN_VAO_DAY
OPENAI_MODEL=gpt-4o-mini

# ── Dat coc VietQR (de trong thi trang thanh toan noi "chua bat") ──
BANK_CODE=
BANK_ACCOUNT=
BANK_ACCOUNT_NAME=
DEPOSIT_RATE_HOTEL=0.3
DEPOSIT_RATE_TOUR=0.3
DEPOSIT_RATE_TRANSPORT=0.2
DEPOSIT_MIN=50000

# ── Thong bao day ──
# Dan NGUYEN noi dung file khoa admin Firebase vao mot dong duy nhat.
FCM_SERVICE_ACCOUNT_JSON=
ENVEOF
    echo "Da tao $ENV_FILE — NHO DIEN KHOA API vao truoc khi chay."
else
    echo "$ENV_FILE da co san, giu nguyen."
fi
# Chua khoa API nen chi cho chu may va tai khoan app doc
chown root:"$APP_USER" "$ENV_FILE"
chmod 640 "$ENV_FILE"

say "8/8 Bat dich vu va nginx"
cp "$APP_DIR/deploy/baynuistay.service" /etc/systemd/system/baynuistay.service
# Chi chep khi CHUA bat HTTPS. Sau khi certbot chay, file nay thuoc ve
# certbot — chep de len la xoa mat khoi SSL va giet ca trang.
if ! grep -q "listen 443" /etc/nginx/sites-available/baynuistay 2>/dev/null; then
    cp "$APP_DIR/deploy/nginx-baynuistay.conf" /etc/nginx/sites-available/baynuistay
fi
ln -sf /etc/nginx/sites-available/baynuistay /etc/nginx/sites-enabled/baynuistay
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl reload nginx
systemctl daemon-reload
systemctl enable --now baynuistay

ufw allow OpenSSH >/dev/null
ufw allow 'Nginx Full' >/dev/null
ufw --force enable >/dev/null

say "XONG PHAN TU DONG"
cat <<'DONE'

Con lai ba viec phai lam tay:

  1. Dien khoa API:
       nano /etc/baynuistay.env
       systemctl restart baynuistay

  2. Tro ten mien localmate.click ve dia chi IP cua may nay (lam o trang ban ten mien).
     Cho DNS lan toa — thuong 5-30 phut.

  3. Xin chung chi HTTPS (chi chay SAU khi DNS da tro dung):
       certbot --nginx -d localmate.click -d www.localmate.click

Kiem tra may chu chay chua:
       systemctl status baynuistay
       journalctl -u baynuistay -n 50 --no-pager
       curl -I http://localhost:3000

DONE
