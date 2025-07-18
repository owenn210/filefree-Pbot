const fs = require("fs");
const path = require("path");

// Dữ liệu lời chúc khung giờ
const greetings = {
  "07:00": [
    { text: "Chào buổi sáng rực rỡ! Mong rằng ngày hôm nay sẽ mở ra những điều kỳ diệu và tươi đẹp như ánh nắng ban mai. 🌞✨", img: "morning1.gif" },
    { text: "Một ngày mới bắt đầu, hãy để tâm hồn bạn được thắp sáng bởi hy vọng và năng lượng tích cực. Chúc bạn sảng khoái, thành công! 🌸🌄", img: "morning2.gif" },
    { text: "Sớm nay nắng nhẹ, chim ca vang, chúc bạn một buổi sáng ngọt ngào và tràn đầy cảm hứng! 💐☀️", img: "morning3.gif" }
  ],
  "11:30": [
    { text: "Giữa trưa, gửi bạn lời chúc ăn ngon, nghỉ ngơi vui vẻ và tiếp thêm sức mạnh cho buổi chiều năng động! 🍱💪", img: "noon1.gif" },
    { text: "Buổi trưa tươi đẹp, mong rằng bạn sẽ có những phút giây thư giãn, tái tạo năng lượng để tiếp tục bứt phá! 🌿😌", img: "noon2.gif" },
    { text: "Ăn trưa thật ngon, thưởng thức khoảnh khắc bình yên để ngày mới thêm phần rực rỡ bạn nhé! 🍜🍀", img: "noon3.gif" }
  ],
  "16:00": [
    { text: "Chiều buông nhẹ nhàng, chúc bạn mọi lo toan tan biến, để tâm hồn nhẹ nhàng, thanh thản như hoàng hôn vàng ươm. 🌅🍃", img: "afternoon1.gif" },
    { text: "Chào buổi chiều dịu dàng, hãy thả mình vào nhịp điệu chậm rãi, để thấy cuộc sống thật đẹp và đáng yêu! 🌼🍂", img: "afternoon2.gif" },
    { text: "Cảm ơn bạn đã vượt qua một ngày năng động. Chúc bạn chiều nay an vui, bình an và ấm áp! 🍁💖", img: "afternoon3.gif" }
  ],
  "20:00": [
    { text: "Buổi tối dịu dàng đến, mong rằng mọi muộn phiền tan biến, thay vào đó là sự an yên và hạnh phúc ngập tràn. 🌙✨", img: "evening1.gif" },
    { text: "Ngắm sao trời lấp lánh, gửi lời chúc bình yên đến bạn và gia đình. Một buổi tối ấm áp và trọn vẹn! ⭐️🌌", img: "evening2.gif" },
    { text: "Buổi tối an lành, hãy dành chút thời gian yêu thương và chăm sóc bản thân bạn nhé! 💫🕯️", img: "evening3.gif" }
  ],
  "22:30": [
    { text: "Chúc bạn ngủ ngon trong vòng tay êm dịu của đêm, mơ những giấc mơ ngọt ngào và tràn đầy hy vọng. 😴🌙", img: "night1.gif" },
    { text: "Đêm đến rồi, thả lỏng mọi lo âu và đón nhận giấc ngủ bình yên, ngày mới sẽ rạng rỡ hơn bao giờ hết. 🌌💤", img: "night2.gif" },
    { text: "Hãy để tâm hồn bạn được nghỉ ngơi thật sâu và thức dậy với một ngày tràn ngập năng lượng! ✨🌠", img: "night3.gif" }
  ]
};

// Dữ liệu chúc mừng ngày lễ
const holidays = {
  "01-01": [
    { text: "Chúc mừng năm mới! Năm mới như trang sách trắng, mong bạn viết nên những câu chuyện tuyệt vời và hạnh phúc. 🎉✨", img: "newyear1.gif" },
    { text: "Năm mới đến rồi! Mong những điều tốt đẹp nhất sẽ đến với bạn, sức khỏe dồi dào và mọi điều như ý! 🥳🌟", img: "newyear2.gif" }
  ],
  "14-02": [
    { text: "Ngày Valentine lãng mạn, chúc bạn nhận được thật nhiều yêu thương và sẻ chia ngọt ngào! ❤️🌹", img: "valentine1.gif" },
    { text: "Chúc bạn có một ngày Valentine ngập tràn niềm vui và những khoảnh khắc đáng nhớ bên người thân yêu! 💖🍫", img: "valentine2.gif" }
  ],
  "08-03": [
    { text: "Chúc mừng ngày Quốc tế Phụ nữ! Mong các chị em luôn rạng ngời sắc đẹp và thành công trên mọi nẻo đường! 🌷✨", img: "womensday1.gif" },
    { text: "Ngày 8/3, gửi đến các chị em những đóa hoa tươi thắm nhất và lời chúc tràn đầy niềm vui! 💐❤️", img: "womensday2.gif" }
  ],
  "01-05": [
    { text: "Ngày Quốc tế Lao động, chúc bạn thành công viên mãn và luôn tràn đầy nhiệt huyết với công việc! 💼🔥", img: "laborday1.gif" },
    { text: "Chúc ngày lễ 1/5 thật ý nghĩa! Hãy tận hưởng những phút giây nghỉ ngơi và tái tạo năng lượng bạn nhé! 🌿☀️", img: "laborday2.gif" }
  ],
  "20-10": [
    { text: "Chúc mừng ngày Phụ nữ Việt Nam! Mong bạn luôn là đóa hoa xinh đẹp, mạnh mẽ và tràn đầy yêu thương! 🌺💖", img: "vietnamesewomen1.gif" },
    { text: "Ngày 20/10 ngọt ngào, gửi tới bạn những lời chúc tốt đẹp nhất và niềm vui bất tận! 🌸🎁", img: "vietnamesewomen2.gif" }
  ],
  "25-12": [
    { text: "Merry Christmas! Chúc bạn và gia đình một mùa Giáng Sinh an lành, ấm áp và ngập tràn yêu thương! 🎄🎅", img: "christmas1.gif" },
    { text: "Giáng Sinh an lành, mong bạn đón nhận những điều kỳ diệu và hạnh phúc bất tận! ❄️🎁", img: "christmas2.gif" }
  ]
};

// Tránh gửi trùng
let lastSent = { time: null, date: null, holiday: null };

// Lấy thời gian hiện tại
function getCurrentTime() {
  const now = new Date();
  return now.toTimeString().slice(0, 5);
}
function getCurrentDate() {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}`;
}
function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Gửi lời chúc kèm ảnh
function sendGreeting(api, threadID, text, imgFile) {
  if (!imgFile) return api.sendMessage(text, threadID);
  const imgPath = path.join(__dirname, "images", imgFile);
  if (fs.existsSync(imgPath)) {
    const attach = fs.createReadStream(imgPath);
    api.sendMessage({ body: text, attachment: attach }, threadID);
  } else {
    api.sendMessage(text, threadID);
  }
}

// Hàm chạy tự động
async function run(api) {
  const nowTime = getCurrentTime();
  const nowDate = getCurrentDate();

  // Lấy tất cả thread là group chat
  const threads = await api.getThreadList(50, null, ["INBOX"]);
  const groupThreads = threads.filter(t => t.isGroup && t.threadID);

  for (const thread of groupThreads) {
    const threadID = thread.threadID;

    // Gửi chúc ngày lễ nếu chưa gửi
    if (holidays[nowDate] && lastSent.holiday !== nowDate) {
      const holiday = randomChoice(holidays[nowDate]);
      sendGreeting(api, threadID, holiday.text, holiday.img);
    }

    // Reset nếu sang ngày mới
    if (lastSent.date !== nowDate) {
      lastSent.date = nowDate;
      lastSent.time = null;
    }

    // Gửi chúc theo giờ nếu đúng khung
    if (greetings[nowTime] && lastSent.time !== nowTime) {
      const greet = randomChoice(greetings[nowTime]);
      sendGreeting(api, threadID, greet.text, greet.img);
    }
  }

  // Cập nhật trạng thái
  if (holidays[nowDate]) lastSent.holiday = nowDate;
  if (greetings[nowTime]) lastSent.time = nowTime;
}

module.exports = { run };
