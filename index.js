// Xóa sạch terminal (tương thích đa nền tảng)
process.stdout.write('\x1Bc');

const fs = require("fs");
const path = require("path");
const axios = require("axios");
const chalk = require("chalk");
const semver = require("semver");
const CFonts = require('cfonts');
const moment = require("moment-timezone");
const deviceID = require('uuid');
const adid = require('uuid');
const totp = require('totp-generator');
const querystring = require('querystring');
const crypto = require('crypto');

// ============ CONFIG =============
const CONFIG_PATH = path.join(__dirname, "config.json");
const ACC_PATH = path.join(__dirname, "acc.json");

let configLogin = fs.existsSync(CONFIG_PATH) ? JSON.parse(fs.readFileSync(CONFIG_PATH)) : {};
let logacc = fs.existsSync(ACC_PATH) ? JSON.parse(fs.readFileSync(ACC_PATH)) : {};

if (!configLogin.ACCESSTOKEN) configLogin.ACCESSTOKEN = "";

function saveConfig(data) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 4));
}

function md5(string) {
  return crypto.createHash('md5').update(string).digest('hex');
}

function sort(obj) {
  return Object.keys(obj).sort().reduce((acc, key) => (acc[key] = obj[key], acc), {});
}

function encodesig(data) {
  let str = "";
  for (let key in data) str += key + "=" + data[key];
  return md5(str + "62f8ce9f74b12f84c123cc23437a4a32");
}

function randomString(length = 10) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = chars.charAt(Math.floor(Math.random() * 26));
  for (let i = 1; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function loginFacebook() {
  if (!logacc.EMAIL || !logacc.PASSWORD || !logacc.OTPKEY) {
    console.log(chalk.red('[ERROR] Thiếu EMAIL, PASSWORD hoặc OTPKEY trong acc.json'));
    process.exit(1);
  }

  let form = {
    adid: adid.v4(),
    email: logacc.EMAIL,
    password: logacc.PASSWORD,
    format: 'json',
    device_id: deviceID.v4(),
    cpl: 'true',
    family_device_id: deviceID.v4(),
    locale: 'en_US',
    client_country_code: 'US',
    credentials_type: 'device_based_login_password',
    generate_session_cookies: '1',
    generate_analytics_claim: '1',
    generate_machine_id: '1',
    currently_logged_in_userid: '0',
    try_num: '1',
    enroll_misauth: 'false',
    meta_inf_fbmeta: '',
    source: 'login',
    machine_id: randomString(24),
    fb_api_req_friendly_name: 'authenticate',
    fb_api_caller_class: 'com.facebook.account.login.protocol.Fb4aAuthHandler',
    api_key: '882a8490361da98702bf97a021ddc14d',
    access_token: '275254692598279|585aec5b4c27376758abb7ffcb9db2af'
  };

  form.sig = encodesig(sort(form));

  try {
    const res = await axios.post('https://b-graph.facebook.com/auth/login', querystring.stringify(form), {
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'x-fb-http-engine': 'Liger',
        'user-agent': 'Mozilla/5.0 (Linux; Android 12; Build/SP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/109 Mobile Safari/537.36 [FBAN/EMA;FBLC/pt_BR;FBAV/339.0.0.10.100;]'
      }
    });

    const token = res.data.access_token;
    if (token) {
      configLogin.ACCESSTOKEN = token;
      saveConfig(configLogin);
      console.log(chalk.greenBright('[LOGIN] Đăng nhập thành công, đã lưu access token.'));
    } else {
      throw new Error("Không lấy được token.");
    }
  } catch (err) {
    const data = err.response?.data?.error?.error_data;
    if (!data) return console.log(chalk.red('[LOGIN] Lỗi không xác định khi login.'), err.message);

    form.twofactor_code = totp(decodeURI(logacc.OTPKEY).replace(/\s+/g, '').toLowerCase());
    form.encrypted_msisdn = "";
    form.userid = data.uid;
    form.machine_id = data.machine_id;
    form.first_factor = data.login_first_factor;
    form.credentials_type = "two_factor";

    delete form.sig;
    form.sig = encodesig(sort(form));

    try {
      const res2 = await axios.post('https://b-graph.facebook.com/auth/login', querystring.stringify(form), {
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          'x-fb-http-engine': 'Liger',
          'user-agent': 'Mozilla/5.0 (Linux; Android 12; Build/SP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/109 Mobile Safari/537.36 [FBAN/EMA;FBLC/pt_BR;FBAV/339.0.0.10.100;]'
        }
      });

      const token = res2.data.access_token;
      if (token) {
        configLogin.ACCESSTOKEN = token;
        saveConfig(configLogin);
        console.log(chalk.greenBright('[LOGIN] Xác thực 2FA thành công, đã lưu access token.'));
      } else {
        throw new Error("Không lấy được token sau 2FA.");
      }
    } catch (err2) {
      console.log(chalk.red('[LOGIN] Lỗi sau khi gửi mã 2FA:'), err2.response?.data || err2.message);
    }
  }
}
const CACHE_SUFFIX = ".sync-cache.json";
const IGNORED_FILE = ".sync-ignore-list.json";

// Đọc danh sách file đã chọn "nn"
function readIgnoreList() {
  if (!fs.existsSync(IGNORED_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(IGNORED_FILE, "utf8"));
  } catch (_) {
    return [];
  }
}

function writeIgnoreList(files) {
  try {
    fs.writeFileSync(IGNORED_FILE, JSON.stringify(files), "utf8");
  } catch (_) {}
}

function readCache(file) {
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (_) {
    return [];
  }
}

function writeCache(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data), "utf8");
  } catch (_) {}
}

async function downloadAndSave(remoteFile, RAW_PREFIX, localDir) {
  try {
    const { data } = await axios.get(RAW_PREFIX + remoteFile.name, { responseType: 'arraybuffer' });
    fs.writeFileSync(path.join(localDir, remoteFile.name), Buffer.from(data));
    console.log(chalk.greenBright(`[SYNC] Đã thêm mới: ${remoteFile.name}`));
  } catch (e) {
    console.log(chalk.redBright(`[SYNC] Lỗi tải file ${remoteFile.name}: ${e.message}`));
  }
}

async function syncOnlyAddNew(localDir, githubDir) {
  const REMOTE_LIST_URL = `https://api.github.com/repos/Kenne400k/k/contents/${githubDir}`;
  const RAW_PREFIX = `https://raw.githubusercontent.com/Kenne400k/k/main/${githubDir}/`;
  const cacheFile = path.join(localDir, CACHE_SUFFIX);
  const ignoreList = readIgnoreList();

  try {
    console.log(chalk.cyanBright(`[SYNC] Kiểm tra và đồng bộ từ GitHub: ${githubDir}`));
    if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });

    const { data: remoteFiles } = await axios.get(REMOTE_LIST_URL, {
      headers: { 'User-Agent': 'mirai-bot-syncmodules' }
    });

    const remoteJsFiles = remoteFiles.filter(f => f.type === "file" && /\.(js|json|ts|cjs|mjs)$/i.test(f.name));
    const localFiles = fs.readdirSync(localDir).filter(f => /\.(js|json|ts|cjs|mjs)$/i.test(f));
    const cachedFiles = readCache(cacheFile);

    const missingFiles = remoteJsFiles.filter(f => !localFiles.includes(f.name));
    const newFiles = missingFiles.filter(f => !cachedFiles.includes(f.name));
    let deletedFiles = missingFiles.filter(f => cachedFiles.includes(f.name)).filter(f => !ignoreList.includes(f.name));

    if (missingFiles.length > 10) {
      console.log(chalk.yellowBright(`[SYNC] Có ${missingFiles.length} lệnh mới (bao gồm ${deletedFiles.length} đã từng có). Tải không? (y/n)`));
      await new Promise(resolve => {
        process.stdin.once('data', async (answer) => {
          if (answer.trim().toLowerCase() === 'y') {
            for (const remoteFile of missingFiles) {
              await downloadAndSave(remoteFile, RAW_PREFIX, localDir);
            }
            console.log(chalk.greenBright(`[SYNC] Đã đồng bộ xong.`));
          } else {
            console.log(chalk.gray(`[SYNC] Đã bỏ qua đồng bộ.`));
          }
          resolve();
        });
      });
    } else {
      for (const remoteFile of newFiles) {
        await downloadAndSave(remoteFile, RAW_PREFIX, localDir);
      }
      for (const remoteFile of deletedFiles) {
        console.log(chalk.yellowBright(`[SYNC] File "${remoteFile.name}" từng bị xóa. Tải lại? (y/n/nn)`));
        await new Promise(resolve => {
          process.stdin.once('data', async (answer) => {
            const ans = answer.trim().toLowerCase();
            if (ans === 'y') await downloadAndSave(remoteFile, RAW_PREFIX, localDir);
            else if (ans === 'nn') {
              ignoreList.push(remoteFile.name);
              writeIgnoreList(ignoreList);
              console.log(chalk.gray(`[SYNC] Đã thêm "${remoteFile.name}" vào danh sách bỏ qua.`));
            }
            resolve();
          });
        });
      }
    }

    const allFiles = [...new Set([...localFiles, ...missingFiles.map(f => f.name)])];
    writeCache(cacheFile, allFiles);
  } catch (err) {
    console.log(chalk.redBright(`[SYNC] Lỗi khi đồng bộ ${githubDir}: ${err.message}`));
  }
}

async function syncModulesAndEvents() {
  if (configLogin.syncmodulescomands !== false)
    await syncOnlyAddNew(path.join(__dirname, "modules", "commands"), "modules/commands");
  else
    console.log(chalk.gray('[SYNC] Đã tắt đồng bộ commands.'));

  if (configLogin.syncmodulesevents !== false)
    await syncOnlyAddNew(path.join(__dirname, "modules", "events"), "modules/events");
  else
    console.log(chalk.gray('[SYNC] Đã tắt đồng bộ events.'));
}
(async () => {
  const boxen = (await import('boxen')).default;
  const chalkAnimation = await import('chalk-animation');

  const anim = chalkAnimation.default.rainbow('>>> MIRAI đang khởi động... <<<');
  await new Promise(r => setTimeout(r, 3000));
  anim.stop();

  CFonts.say('MIRAI BOT', {
    font: 'block',
    align: 'left',
    colors: ['red', 'yellow', 'green', 'cyan', 'blue', 'magenta'],
    background: 'transparent',
    letterSpacing: 2,
    lineHeight: 1,
    space: true,
    maxLength: '0'
  });

  const fb = chalk.hex('#00acee').underline.bold('https://fb.com/pcoder090');
  const zalo = chalk.hex('#25d366').underline.bold('https://zalo.me/0786888655');
  const banner =
    chalk.hex('#FFD700').bold('⚡ MUA FILE BOT - LIÊN HỆ NGAY! ⚡\n') +
    chalk.white('Facebook: ') + fb +
    chalk.hex('#FFD700').bold(' | ') +
    chalk.white('Zalo: ') + zalo +
    ' ' + chalk.redBright('🔥');

  console.log(
    boxen(banner, {
      padding: 1,
      borderStyle: 'round',
      borderColor: 'yellow',
      backgroundColor: '#111',
      title: chalk.bgYellow.black('  QUẢNG CÁO  '),
      titleAlignment: 'center'
    })
  );

  // Kiểm tra cập nhật phiên bản
  const LOCAL_VERSION = "1.0.0";
  const GITHUB_RAW_URL = "https://raw.githubusercontent.com/Kenne400k/File-Free-PBot/main/index.js";

  console.log(chalk.cyanBright(`[AUTO-UPDATE] Kiểm tra phiên bản mới...`));
  try {
    const { data: remoteSource } = await axios.get(GITHUB_RAW_URL, { timeout: 7000 });
    const m = remoteSource.match(/LOCAL_VERSION\s*=\s*["'`](\d+\.\d+\.\d+)["'`]/i);
    const remoteVersion = m?.[1] || null;

    if (!remoteVersion) {
      console.log(chalk.yellow(`[UPDATE] Không xác định được version remote.`));
    } else if (semver.lt(LOCAL_VERSION, remoteVersion)) {
      console.log(chalk.green(`[UPGRADE] Đang cập nhật lên bản mới: ${remoteVersion}`));
      fs.writeFileSync(__filename, remoteSource, 'utf8');
      const { spawn } = require("child_process");
      spawn(process.argv[0], [__filename, ...process.argv.slice(2)], { stdio: "inherit" });
      process.exit(0);
    } else {
      console.log(chalk.green(`[CHECK] Phiên bản mới nhất: ${LOCAL_VERSION}`));
    }
  } catch (err) {
    console.log(chalk.redBright(`[ERROR] Không thể kiểm tra cập nhật: ${err.message}`));
  }

  // Đồng bộ file command và event
  await syncModulesAndEvents();

  // Hiển thị thông tin trạng thái
  const now = moment().format("YYYY-MM-DD HH:mm:ss");
  console.log(
    chalk.bgRed.white.bold(`  ${now}  `) +
    chalk.bgBlue.white.bold(`  Theme: MIRAI  `) +
    chalk.bgGreen.white.bold(`  Version: ${LOCAL_VERSION}  `) +
    chalk.bgYellow.black.bold(`  PID: ${process.pid}  `)
  );

  console.log(chalk.hex('#FFD700')('='.repeat(50)));
  console.log(chalk.hex('#ff00cc').italic('MiraiBot | PCODER | Chúc bạn một ngày chạy bot vui vẻ!'));
  console.log(chalk.hex('#FFD700')('='.repeat(50)));

  // Khởi động bot chính
  const { spawn } = require("child_process");
  function startBot(msg) {
    if (msg) console.log(chalk.cyan(`[BOT] ${msg}`));
    const child = spawn("node", ["--trace-warnings", "--async-stack-traces", "main.js"], {
      cwd: __dirname,
      stdio: "inherit",
      shell: true
    });
    child.on("close", (codeExit) => {
      if (codeExit != 0 || (global.countRestart && global.countRestart < 5)) {
        global.countRestart = (global.countRestart || 0) + 1;
        console.log(chalk.yellow(`[RESTART] Bot sẽ khởi động lại... (${global.countRestart})`));
        startBot("Đang khởi động lại...");
      }
    });
    child.on("error", (error) => {
      console.log(chalk.red(`[ERROR] Không thể khởi động bot: ${JSON.stringify(error)}`));
    });
  }

  startBot("Đang khởi động bot chính...");
})();
