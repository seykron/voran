module.exports = function Behavior(voran) {

  const co = require("co");
  const shuffle = require("shuffle-array");

  const DELIMITER = "\"";
  const sentence = require("./sentence")(DELIMITER);

  const Invocations = ["voranbot", "voran", "dragón"];

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
    learn: (topic) => co(function* () {
      if (!topic) {
        voran.talk("humano, dime sobre qué tema aprender...");
        return;
      }
      if (voran.learning()) {
        voran.talk("ya estoy aprendiendo... ¿te olvidaste?");
        return;
      }

      voran.learning(topic);
      voran.talk(expandMessage(shuffle.pick(Messages.learn), topic));
    }),

    stop_learn: () => co(function* () {
      if (!voran.learning()) {
        voran.talk("¿de qué hablas? No estoy aprendiendo...");
        return;
      }

      voran.remember();
      voran.talk(shuffle.pick(Messages.stop_learn));
    }),

    listen: (phrase) => co(function* () {
      voran.listen(phrase);
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

  var action = (topic, params) => {
    return {
      topic: topic,
      params: params
    };
  };

  return {

    action(phrase) {
      var topic;

      if (!talksToMe(phrase)) {
        if (voran.learning()) {
          return action("listen", [phrase]);
        }

        return null;
      }

      topic = voran.topic(phrase);

      if (!topic) {
        return null;
      }

      return action(topic, sentence.extractParams(phrase));
    },

    execute: (action) => co(function* () {
      if (!Actions.hasOwnProperty(action.topic)) {
        voran.talk(shuffle.pick(Messages.cant_do));
        return;
      }

      return yield Actions[action.topic].apply(null, action.params);
    })
  };
};
