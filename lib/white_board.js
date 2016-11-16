module.exports = function WhiteBoard(whiteBoardKey) {

  const PASTEBIN_URL = "http://paste.spiria.me/api";
  const PASTEBIN_RAW_URL = "http://paste.spiria.me/view/raw";
  const request = require("request");

  var paste = (paperTitle, content) => new Promise((resolve, reject) => {
    data = {
      text: content,
      api_paste_private: 0,
      title: paperTitle,
      name: "voran",
      private: 0,
      lang: "text"
    };
    request.post(PASTEBIN_URL + "/create?apikey=" + whiteBoardKey, {
      form: data
    }, (error, response, body) => {
      if (error) {
        reject(error);
      } else {
        resolve(PASTEBIN_RAW_URL + body.substr(body.lastIndexOf("/")));
      }
    });
  });

  return {
    paste: (paperTitle, content) => paste(paperTitle, content)
  };
};
