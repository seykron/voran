module.exports = function Brain(memoryMap) {

  const debug = require("debug")("brain");
  const fs = require("fs");

  const BrainJSClassifier = require('natural-brain');
  const Stemmer = require("natural").PorterStemmerEs;

  var knowledges = [];
  var people = {};
  var classifier = new BrainJSClassifier({}, Stemmer);

  var toLongTermMemory = () => {
    fs.writeFileSync(memoryMap.knowledge, JSON.stringify(knowledges));
  };

  var warmUpMemory = () => {
    classifier = new BrainJSClassifier({}, Stemmer);
    knowledges.forEach(knowledge =>
      classifier.addDocument(knowledge.phrase, knowledge.topic)
    );
    classifier.train();
  };

  var wakeUp = () => {
    try {
      if (fs.statSync(memoryMap.knowledge).isFile()) {
        knowledges = JSON.parse(fs.readFileSync(memoryMap.knowledge));
        warmUpMemory();
      }
    } catch (cause) {
      debug("error waking up brain: %s", cause);
    }
  };

  return {

    learn(phrase, topic) {
      debug("listening about %s: %s", topic, Stemmer.tokenizeAndStem(phrase));
      knowledges.push({
        phrase: phrase,
        topic: topic
      });
      classifier.addDocument(phrase, topic);
    },

    remember() {
      debug("learning!");
      warmUpMemory();
    },

    topic(phrase) {
      debug("resolving topics for phrase: %s", phrase);
      debug(classifier.getClassifications(phrase));
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
