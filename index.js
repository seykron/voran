const co = require("co");
const mkdirp = require("mkdirp");

const DIRS = ["data/memory", "data/photos"]
const voran = require("./lib/voran")({
  whiteBoardKey: process.env.VORAN_WHITE_BOARD_TOKEN
});
const telegram = require("./lib/telegram")(voran, process.env.VORAN_TOKEN);
const irc = require("./lib/irc")(voran, [{
  host: "irc.kernelpanic.com.ar",
  ssl: true,
  channels: ["#voran"]
}]);
const voranDomains = require("./lib/places")({
  telegram: telegram,
  irc: irc
});
const terminal = require("./lib/terminal")(voran);

(async function () {
  DIRS.forEach(dir => mkdirp.sync(dir));

  await voran.arrive(voranDomains);

  terminal.start();
}());
