module.exports = function Telegram(voran, token) {

  const telegram = {};
  const FILE_BASE_URL = "https://api.telegram.org/file/bot" + token;
  const PHOTOS_DIR = "data/photos/";
  const NETWORK_ID = "telegram";

  const debug = require("debug")("telegram");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");
  const co = require("co");
  const uuid = require("node-uuid");
  const request = require("request");
  const crypto = require('crypto');
  const TeleBot = require('telebot');

  const bot = new TeleBot(token);
  const behavior = require("./behavior")(voran, telegram);

  const TEMP_DIR = fs.mkdtempSync(os.tmpdir() + path.sep + "voran");

  var chats = {};
  var currentChat;

  var messageId = (msg) => msg.chat.id;

  var fileInfo = (fileId) => new Promise((resolve, reject) => {
    bot.getFile(fileId).then(response => {
      var file = response.result;
      file.url = FILE_BASE_URL + "/" + file.file_path;
      resolve(file);
    }).catch(reject);
  });

  var hashFile = (file) => new Promise((resolve, reject) => {
    fs.readFile(file, (err, data) => {
      var contentHash;

      if (err) {
        return reject(err);
      }

      contentHash = crypto.createHash("sha256");
      contentHash.update(data);
      resolve(contentHash.digest("hex"));
    });
  });

  var download = (outputDir, url) => new Promise((resolve, reject) => {
    var outputFile = path.join(TEMP_DIR, uuid.v4());

    request(url, (error, response) => {

      if (error) {
        reject(error);
      } else {
        resolve(co(function* () {
          var targetName = yield hashFile(outputFile);
          var targetFile = path.join(PHOTOS_DIR, targetName);

          fs.renameSync(outputFile, targetFile);

          return targetFile;
        }));
      }
    }).pipe(fs.createWriteStream(outputFile));
  });

  (function __init() {
    bot.on("error", err => {
      debug("bot error: %s", JSON.stringify(err));
    });

    bot.on("/start", msg => {
      return bot.sendMessage(msg.from.id, 'Bam!');
    });

    bot.on("text", msg => {

      debug("incoming message: ", JSON.stringify(msg));

      co(function* () {
        var action;
        var chat = chats[msg.chat.id];

        // TODO(seykron): check raise condition with * event
        action = behavior.action(chat, msg.text);

        if (action) {
          yield behavior.execute(action);
        }
      });
    });

    bot.on("photo", msg => {
      debug("incoming photo:" + JSON.stringify(msg));

      co(function* () {
        debug("retrieving photo");

        var fromId = messageId(msg);
        var photoFile = msg.photo.reduce((prev, file) => {
          if (prev && file.file_size >= prev.file_size) {
            return file;
          } else {
            return prev;
          }
        }, msg.photo[0]);
        var photoInfo = yield fileInfo(photoFile.file_id);
        var outputFile = photoInfo.file_id + ".jpg";
        var asciiUrl;

        debug("photo information: %s", JSON.stringify(photoInfo));

        var targetFile = yield download(path.join(PHOTOS_DIR, outputFile), photoInfo.url);

        asciiUrl = yield voran.draw(photoInfo.file_path, targetFile);

        debug("photo drawn as ascii art: %s", asciiUrl);

        bot.sendMessage(fromId, photoInfo.url);
        bot.sendMessage(fromId, asciiUrl);
      });
    });

    bot.on("*", msg => {
      var resolvedType;

      switch(msg.chat.type) {
        case "group":
        case "supergroup":
        case "channel":
          resolvedType = "channel";
          break;
        case "private":
        default:
          resolvedType = "private";
      }

      chats[msg.chat.id] = {
        id: msg.chat.id,
        name: msg.chat.title || msg.chat.username,
        type: resolvedType,
        network: NETWORK_ID,
        path: "/" + path.join(NETWORK_ID, msg.chat.title || msg.chat.username)
      };
    });
  }());

  return Object.assign(telegram, {
    arrive: (places) => new Promise((resolve, reject) => {
      debug("arriving");

      places.forEach(place => chats[place.id] = place);

      bot.on("connect", () => resolve());

      bot.connect();
    }),

    places() {
      return Object.keys(chats).map(chatId => chats[chatId]);
    },

    visit(place) {
      debug("visiting %s", place.name);
      currentChat = place;
    },

    currentPlace() {
      return currentChat;
    },

    talk(chat, message) {
      if (!chat) {
        debug("there's no a selected chat, not sending the message");
        throw new Error("The required chat doesn't exist");
      }

      debug("talking to %s: %s", chat.name, message);

      bot.sendMessage(chat.id, message);
    },

    vanish() {
      debug("disappearing");
      bot.disconnect();
    },

    leave(place, message) {
      debug("leaving chat: %s (%s)", place.name, message);

      if (currentChat.id === place.id) {
        currentChat = null;
      }

      bot.leaveChat(place.id);
    },

    comeBack(place) {
      debug("I'm sorry, I cannot come back to '%s' without an invitation",
        place.name);
    }
  });
};
