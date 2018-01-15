module.exports = function Brain(memoryMap) {

  const debug = require("debug")("brain");
  const fs = require("fs");
  const promisify = require("util").promisify;

  const BrainJSClassifier = require('natural-brain');
  const Stemmer = require("natural").PorterStemmerEs;

  const writeFile = promisify(fs.writeFile);
  const stat = promisify(fs.stat);
  const readFile = promisify(fs.readFile);

  var knowledges = [];
  var people = {};
  var classifier = new BrainJSClassifier({}, Stemmer);

  async function toLongTermMemory() {
    await writeFile(memoryMap.knowledge, JSON.stringify(knowledges));
  };

  function warmUpMemory() {
    classifier = new BrainJSClassifier({}, Stemmer);
    knowledges.forEach(knowledge =>
      classifier.addDocument(knowledge.phrase, knowledge.topic)
    );
    classifier.train();
  };

  async function wakeUp() {
    try {
      const info = await stat(memoryMap.knowledge);

      if (info.isFile()) {
        const knowledgeData = await readFile(memoryMap.knowledge);
        knowledges = JSON.parse(knowledgeData);
        warmUpMemory();
      }
    } catch (cause) {
      debug("error waking up brain: %s", cause);
    }
  };

  (function __init() {
    wakeUp();
  }());

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
