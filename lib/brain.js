module.exports = function Brain(longTermMemory) {

  const debug = require("debug")("brain");
  const fs = require("fs");

  const BrainJSClassifier = require('natural-brain');
  const Stemmer = require("natural").PorterStemmerEs;

  var memories = [];
  var classifier = new BrainJSClassifier({}, Stemmer);

  var toLongTermMemory = () => {
    fs.writeFileSync(longTermMemory, JSON.stringify(memories));
  };

  var warmUpMemory = () => {
    memories.forEach(memory =>
      classifier.addDocument(memory.phrase, memory.topic)
    );
    classifier.train();
  };

  var wakeUp = () => {
    try {
      if (fs.statSync(longTermMemory).isFile()) {
        memories = JSON.parse(fs.readFileSync(longTermMemory).toString());
        warmUpMemory();
      }
    } catch (cause) {
      debug("error waking up brain: %s", cause);
    }
  };

  return {

    listen(phrase, topic) {
      debug("listening about %s: %s", topic, Stemmer.tokenizeAndStem(phrase));
      memories.push({
        phrase: phrase,
        topic: topic
      });
      classifier.addDocument(phrase, topic);
    },

    remember() {
      debug("learning!");
      classifier.train();
    },

    topics(phrase) {
      debug("resolving topics for phrase: %s", phrase);
      return classifier.classify(phrase);
    },

    sleep() {
      toLongTermMemory();
    },

    wakeUp() {
      wakeUp();
    }
  };
};
