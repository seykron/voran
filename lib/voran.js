module.exports = function Voran(traits) {

  const debug = require("debug")("voran");
  const path = require("path");

  const brain = require("./brain")({
    knowledge: path.resolve("data/memory/knowledge.json"),
    people: path.resolve("data/memory/people.json")
  });
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

    async arrive(newPlaces) {
      places = newPlaces;
      await places.arrive();
    },

    listen(nick, phrase, topic) {
      debug("is listening to %s about %s: %s", topic || learningTopic, phrase);
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

    topic(phrase) {
      return brain.topic(phrase);
    },

    talk(message) {
      places.talk(message);
    },

    async draw(drawTitle, originalDraw) {
      debug("is copying a picture");

      var drawContent = await draw.copy(originalDraw);

      debug("is pasting the copied picture in a whiteboard");
      var whiteBoard = await draw.paste(drawTitle, drawContent);

      return whiteBoard;
    },

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
    },

    comeBack(placePath) {
      places.comeBack(placePath);
    },

    leave(placePath, message) {
      places.leave(placePath, message);
    }
  };
};
