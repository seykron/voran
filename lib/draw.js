module.exports = function Draw(whiteBoardKey) {

  const Ascii = require("ascii").default;
  const whiteBoard = require("./white_board")(whiteBoardKey);

  var copy = (originalDraw) => new Promise((resolve, reject) => {
    var draw = new Ascii(originalDraw);

    draw.convert(function(err, result) {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });

  return {
    copy: (originalDraw) => copy(originalDraw),
    paste: (drawTitle, drawContent) => whiteBoard.paste(drawTitle, drawContent)
  };
};
