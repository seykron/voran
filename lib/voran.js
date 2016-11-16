module.exports = function Voran(traits) {
  const debug = require("debug")("voran");
  const path = require("path");
  const co = require("co");

  const LONG_TERM_MEMORY = path.resolve("data/memory.json");
  const brain = require("./brain")(LONG_TERM_MEMORY);
  const draw = require("./draw")(traits.whiteBoardKey);

  var places;
  var learningTopic = null;

  return {

    wakeUp() {
      debug("is waking up");
      brain.wakeUp();
    },

    sleep() {
      debug("is going to sleep");
      places.remember();
      places.vanish();
      brain.sleep();
      debug("is sleeping, bye");
    },

    arrive: (newPlaces) => co(function* () {
      places = newPlaces;

      yield places.arrive();
    }),

    listen(phrase, topic) {
      debug("is listening about %s: %s", topic || learningTopic, phrase);
      brain.listen(phrase, topic || learningTopic);
    },

    remember() {
      debug("remembering %s", learningTopic || "many topics");
      brain.remember();
      learningTopic = null;
    },

    learning(topic) {

      if (typeof topic === "string") {
        debug("is learning about %s", topic);
        learningTopic = topic;
      }

      return learningTopic !== null;
    },

    topics(phrase) {
      return brain.topics(phrase);
    },

    talk(message) {
      places.talk(message);
    },

    draw: (drawTitle, originalDraw) => co(function* () {
      debug("is copying a picture");

      var drawContent = yield draw.copy(originalDraw);

      debug("is pasting the copied picture in a whiteboard");
      var whiteBoard = yield draw.paste(drawTitle, drawContent);

      return whiteBoard;
    }),

    places() {
      if (!places) {
        throw new Error("Voran is currently nowhere");
      }

      return places.allPlaces();
    },

    currentPlace() {
      return places.currentPlace();
    },

    visit(placePath) {
      places.visit(placePath);
    }
  };
};
