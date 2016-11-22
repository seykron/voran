module.exports = function Behavior(voran, place) {

  const co = require("co");
  const shuffle = require("shuffle-array");

  const DELIMITER = "\"";
  const sentence = require("./sentence")(DELIMITER);

  const Invocations = ["voranbot", "voran", "dragón"];

  var learningSessions = {};

  const Messages = {
    learn: [
      "ok humano, aprendiendo sobre %s",
      "¿%s? ¿qué es eso?",
      "veamos de qué se trata esto...",
      "enseñame bien, luego predeciré tu destino"
    ],
    stop_learn: [
      "recordaré todo lo que he aprendido",
      "una vez aprendido, nunca olvidado...",
      "todo guardado en la memoria, para siempre"
    ],
    cant_do: [
      "humano, no puedo hacer lo que me pides",
      "¿cómo crees que haría eso?",
      "olvidate, no es algo que haría un dragón"
    ]
  };

  const Actions = {
    learn: (action, topic) => co(function* () {
      var message = expandMessage(shuffle.pick(Messages.learn), topic);

      if (!topic) {
        place.talk(action.chat, "humano, dime sobre qué tema aprender...");
        return;
      }

      if (learningSessions.hasOwnProperty(action.chat.id)) {
        place.talk(action.chat, "ya estoy aprendiendo... ¿te olvidaste?");
        return;
      }

      learningSessions[action.chat.id] = {
        topic: topic,
        phrases: []
      };

      place.talk(action.chat, message);
    }),

    stop_learn: (action) => co(function* () {
      if (!learningSessions.hasOwnProperty(action.chat.id)) {
        place.talk(action.chat, "¿de qué hablas? No estoy aprendiendo...");
        return;
      }

      var learningSession = learningSessions[action.chat.id];

      voran.learning(learningSession.topic);
      learningSession.phrases.forEach(input => voran.listen(input));
      voran.remember();

      place.talk(action.chat, shuffle.pick(Messages.stop_learn));

      delete learningSessions[action.chat.id];
    }),

    listen: (action, phrase) => co(function* () {
      if (learningSessions.hasOwnProperty(action.chat.id)) {
        learningSessions[action.chat.id].phrases.push({
          person: action.person,
          text: phrase
        });
      }
    }),

    vanish: (action) => co(function* () {
      place.vanish();
    }),

    leave: (action, message) => co(function* () {
      place.leave(action.chat, message);
    }),

    comeBack: (action) => co(function* () {
      place.comeBack(action.chat);
    })
  };

  var expandMessage = (message, params) => {
    var resolvedParams = params;
    var resolvedMessage = message;

    if (!Array.isArray(params)) {
      resolvedParams = [params];
    }

    resolvedParams.forEach(param =>
      resolvedMessage = resolvedMessage.replace("%s", param)
    );

    return resolvedMessage;
  };

  var talksToMe = (phrase) => {
    var sentence = phrase && phrase.toLowerCase();

    if (!phrase) {
      return false;
    }

    if (phrase.substr(0, 1) === "@") {
      sentence = phrase.substr(1).toLowerCase();
    }

    return Invocations.some(invocation => sentence.indexOf(invocation) === 0);
  };

  var currentChat;

  var action = (chat, topic, params) => {
    return {
      chat: chat,
      topic: topic,
      params: params
    };
  };

  return {

    action(chat, phrase) {
      var topic;

      if (!talksToMe(phrase)) {
        if (learningSessions.hasOwnProperty(chat.id)) {
          return action(chat, "listen", [phrase]);
        }

        return null;
      }

      topic = voran.topic(phrase);

      if (!topic) {
        return null;
      }

      return action(chat, topic, sentence.extractParams(phrase));
    },

    execute: (action) => co(function* () {
      if (!Actions.hasOwnProperty(action.topic)) {
        place.talk(action.chat, shuffle.pick(Messages.cant_do));
        return;
      }

      var params = [action].concat(action.params);

      return yield Actions[action.topic].apply(null, params);
    })
  };
};
