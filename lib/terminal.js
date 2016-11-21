module.exports = function Terminal(voran) {

  const co = require("co");
  const term = require("terminal-kit").terminal;

  var terminateSignal = false;
  var history = [] ;

  var write = function (line, color) {
    var output = line || "";

    if (color) {
      term[color](output + "\n");
    } else {
      term(output + "\n");
    }
  };

  var writeRed = (line) => write(line, "red");
  var writeGreen = (line) => write(line, "green");

  var Commands = {
    help: {
      help: () => "help [command] - Shows help for the specified command",
      exec: (commandName) => co(function* () {
        var command;

        if (!commandName) {
          for (command in Commands) {
            write(Commands[command].help());
          }

          return;
        }

        command = Commands[commandName];

        if (command) {
          write(command.help());
        } else {
          write("Command not found: " + commandName);
        }
      })
    },

    list: {
      help: () => "list places - Lists the Voran domains",
      exec: (type) => co(function* () {
        switch(type) {
          case "places":
            voran.places().forEach(place =>
              write(place.path)
            );
            break;
          default:
            write("Cannot list " + type);
        }
      })
    },

    visit: {
      help: () => "visit placePath - Voran is everywhere, but it makes Voran focus on a place",
      exec: (placePath) => co(function* () {
        voran.visit(placePath);
      })
    },

    talk: {
      help: () => "talk message - Voran sends a message to the current place",
      exec: (message) => co(function* () {
        voran.talk(message);
      })
    },

    learn: {
      help: () => "learn [topic] - Voran starts learning about a topic",
      exec: (topic) => co(function* () {
        if (!topic) {
          write("Tell me what to learn!");
          return;
        }
        voran.learning(topic);
        voran.talk("I'm learning about " + topic);
      })
    },

    remember: {
      help: () => "remember - Voran remembers all that learnt so far",
      exec: () => co(function* () {
        voran.remember();
        voran.talk("I will remember everything you said");
      })
    },

    topic: {
      help: () => "topic phrase - Voran tells you what a phrase about",
      exec: (phrase) => co(function* () {
        if (!phrase) {
          write("Tell me what you want to know about!");
          return;
        }
        var topic = voran.topic(phrase);

        if (!topic) {
          write("I have not idea what are you talking about... teach me!");
        } else {
          write("You might be talking about " + topic);
        }
      })
    },

    comeBack: {
      help: () => "comeBack place - Voran comes back to a place",
      exec: (placePath) => co(function* () {
        voran.comeBack(placePath);
      })
    },

    leave: {
      help: () => "leave place [message] - Voran leaves a place",
      exec: (placePath, message) => co(function* () {
        voran.leave(placePath, message);
      })
    }
  };

  var parseParams = (commandLine) => {
    var params = commandLine.split(" ");
    var literal = null;

    return params.reduce((prev, param) => {
      var literalStarts = param.substr(0, 1) == "\"";
      var literalEnds = param.substr(-1, 1) == "\"";

      if (literalStarts) {
        if (literalEnds) {
          literal = [param.substr(1, param.length - 2)];
        } else {
          literal = [param.substr(1)];
        }
      }
      if (literal == null) {
        prev.push(param);
      } else if (!literalStarts && !literalEnds) {
        literal.push(param);
      }
      if (literalEnds) {
        if (!literalStarts) {
          literal.push(param.substr(0, param.length - 1));
        }
        prev.push(literal.join(" "));
        literal = null;
      }
      return prev;
    }, []);
  };

  var terminate = () => co(function* () {
    term.grabInput(false);
    voran.sleep();

    write("Bye.\n");
    process.exit();
  });

  var grabCommand = () => {
    var currentPlace = voran.currentPlace();
    var prompt = "[Nowhere]> ";

    if (currentPlace) {
      prompt = currentPlace.path + "$ ";
    }

    term(prompt);

    term.inputField({ history: history, echo: true }, function (err, input) {
      var command;
      var commandName;
      var params;

      if (err) {
        writeRed("ERROR: " + err);
        return;
      }

      if (!input) {
        write();
        grabCommand();
        return;
      }

      write();

      params = parseParams(input);
      commandName = params.shift();
      command = Commands[commandName];

      if (!command) {
        write("No such command: " + input);
        write("Type 'help' to show a list of commands");
        write();
        grabCommand();
        return;
      }

      history.push(input);

      command.exec.apply(null, params)
        .then(() => {
          write();
          grabCommand();
        })
        .catch(err => {
          write("Error executing " + commandName + ": " + err);
          console.trace(err);

          grabCommand();
        })
    });
  };

  (function __init() {
    term.on("key", function( name , matches , data ) {
      if (name === "CTRL_C") {
        if (terminateSignal) {
          terminate().catch(err => {
              if (err) {
                term("error: " + err + "\n\n");
              }
              process.exit();
            });
        } else {
          writeGreen("\nHit CTRL-C again to quit.\n");
          terminateSignal = true;
        }
      } else {
        terminateSignal = false;
      }
    });
  }());

  return {
    start() {
      writeGreen("Hit CTRL-C to quit.\n");
      grabCommand();
    }
  };
};
