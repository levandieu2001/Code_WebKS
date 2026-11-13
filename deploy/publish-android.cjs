// Run once on the production host AFTER uploading and checking the signed APK.
// node deploy/publish-android.cjs /absolute/path/release.json --notify
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

async function publish() {
    const configPath = process.argv[2];
    if (!configPath || !path.isAbsolute(configPath)) throw new Error('Absolute release JSON path required');
    const release = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (!Number.isSafeInteger(release.version_code) || release.version_code < 1) throw new Error('Invalid version code');
    if (!/^tai-app\/[A-Za-z0-9._-]+\.apk$/.test(release.apk_path)) throw new Error('Invalid APK path');
    const apk = path.join('/var/lib/baynuistay/apk', path.basename(release.apk_path));
    const bytes = fs.readFileSync(apk);
    if (bytes.length < 1000000 || bytes.readUInt32LE(0) !== 0x04034b50) throw new Error('APK is incomplete');
    const digest = crypto.createHash('sha256').update(bytes).digest('hex');
    if (digest !== release.sha256) throw new Error('APK checksum does not match release manifest');
    const versions = require('../lib/appversion');
    const current = versions.current();
    if (release.version_code <= current.version_code) throw new Error('Version already published or older; refusing duplicate notification');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dataDir = process.env.BAYNUI_DATA_DIR;
    if (dataDir !== '/var/lib/baynuistay/data') throw new Error('Unexpected production data directory');
    fs.copyFileSync(path.join(dataDir, 'app_version.json'), path.join(dataDir, 'app_version.before-' + stamp + '.json'));
    versions.save({ ...release, mandatory: false });
    console.log(JSON.stringify({ published: release.version_name, version_code: release.version_code, apk_path: release.apk_path, sha256: digest }));
    if (!process.argv.includes('--notify')) return;
    const store = require('../lib/store');
    const fcm = require('../lib/fcm');
    const tokens = [...new Set(store.readAll('devices').filter(d => d.platform === 'android').map(d => d.token).filter(Boolean))];
    const result = { version_code: release.version_code, started_at: new Date().toISOString(), registered_android: tokens.length,
        fcm_enabled: fcm.enabled, accepted: 0, failed: 0, expired: 0 };
    store.writeAll('app_release_notifications', [result]);
    if (fcm.enabled) {
        for (let i = 0; i < tokens.length; i += 10) {
            await Promise.all(tokens.slice(i, i + 10).map(async token => {
                try {
                    const sent = await fcm.send(token, { title: `LOCALMATE ${release.version_name} đã có`,
                        body: release.push_body || 'Bản mới sửa lỗi đặt dịch vụ, đơn hàng và giao diện điện thoại. Mở app để cập nhật nhé.',
                        urgent: false, data: { kind: 'app_update', version_code: String(release.version_code) } });
                    if (sent.ok) result.accepted++;
                    else if (sent.gone) result.expired++;
                    else result.failed++;
                } catch (_) { result.failed++; }
            }));
        }
    }
    result.finished_at = new Date().toISOString();
    store.writeAll('app_release_notifications', [result]);
    console.log(JSON.stringify(result));
}
publish().catch(error => { console.error(error.message); process.exitCode = 1; });
