const fs = require("fs");
const path = require("path");
const configFile = path.join(__dirname, "..", "cron", "greetingConfig.json");

module.exports = {
  config: {
    name: "greeting",
    version: "1.0",
    author: "GPT x Owen",
    description: "Bật/tắt và tùy chỉnh lời chào tự động",
    commandCategory: "box",
    usages: "[on/off/custom/reset]",
    cooldowns: 5,
  },

  onStart({ args, message, event }) {
    const threadID = event.threadID;

    // Đọc config với try-catch để tránh lỗi khi file hỏng hoặc chưa có
    let config = {};
    if (fs.existsSync(configFile)) {
      try {
        config = JSON.parse(fs.readFileSync(configFile, "utf-8"));
      } catch (e) {
        message.reply("❌ Lỗi đọc file cấu hình. Vui lòng thử lại sau.");
        return;
      }
    }

    // Khởi tạo cấu hình cho thread nếu chưa có
    if (!config[threadID]) config[threadID] = { enabled: true, customMessage: {} };
    if (!config[threadID].customMessage) config[threadID].customMessage = {};

    const sub = args[0]?.toLowerCase();

    switch (sub) {
      case "on":
        config[threadID].enabled = true;
        message.reply("✅ Đã bật lời chào trong box này.");
        break;

      case "off":
        config[threadID].enabled = false;
        message.reply("❌ Đã tắt lời chào trong box này.");
        break;

      case "custom":
        const time = args[1]?.toLowerCase();
        const validTimes = ["morning", "noon", "afternoon", "evening", "night"];
        if (!validTimes.includes(time)) {
          return message.reply("❗ Vui lòng nhập thời gian hợp lệ: morning, noon, afternoon, evening, night.");
        }
        const text = args.slice(2).join(" ");
        if (!text) {
          return message.reply("❗ Vui lòng nhập nội dung lời chào.");
        }
        config[threadID].customMessage[time] = text;
        message.reply(`✅ Đã set lời chào riêng cho ${time}.`);
        break;

      case "reset":
        delete config[threadID];
        message.reply("🔄 Đã reset về mặc định.");
        break;

      default:
        message.reply(
          "🧾 Cách dùng:\n" +
          "- greeting on/off\n" +
          "- greeting custom [thời_gian] [nội_dung]\n" +
          "- greeting reset"
        );
        break;
    }

    // Ghi lại file config
    try {
      fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
    } catch (e) {
      message.reply("❌ Lỗi ghi file cấu hình. Vui lòng thử lại sau.");
    }
  }
};
