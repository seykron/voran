module.exports = function IRC(voran, servers) {

  const instance = {};

  const NETWORK_ID = "irc";
  const NICK = "voran";

  const debug = require("debug")("irc");
  const path = require("path");
  const co = require("co");

  const irc = require('irc');
  const behavior = require("./behavior")(voran, instance);

  var channels = [];
  var clients = {};
  var currentChat;

  var channelId = (host, name) => host + ":" + name;

  var findChannel = (channelId) => channels.find(channel =>
    channel.id === channelId
  );

  var createClient = (server) => {
    var client = new irc.Client(server.host, NICK, {
      userName: "voran",
      realName: "voran",
      port: server.port || (server.ssl ? 6697 : 6667),
      autoRejoin: true,
      autoConnect: false,
      channels: server.channels || [],
      secure: server.ssl,
      selfSigned: true,
      certExpired: true,
      retryCount: 10,
      retryDelay: 2000,
      stripColors: true
    });

    client.addListener("error", message => {
      debug("server error: %s", message);
    });

    client.addListener("join", (channelName, nick, message) => {
      var exists = findChannel(channelId(server.host, channelName));

      if (nick === NICK && !exists) {
        channels.push({
          id: server.host + ":" + channelName,
          name: channelName,
          type: "channel",
          network: NETWORK_ID,
          path: "/" + path.join(server.host, channelName)
        });
      }
    });

    client.addListener("message", (nick, to, text, message) => {
      debug("incoming message from %s: %s", nick, JSON.stringify(message));

      co(function* () {
        var action;
        var chat = findChannel(channelId(server.host, to));

        if (chat) {
          action = behavior.action(chat, text);

          if (action) {
            yield behavior.execute(action);
          }
        }
      });
    });

    return Object.assign(client, {
      ready: () => new Promise((resolve, reject) => {
        client.addListener("registered", message => {
          client.removeAllListeners("registered");
          resolve(message);
        });

        client.connect();
      })
    });
  };

  return Object.assign(instance, {

    arrive: (places) => co(function* () {
      debug("arriving");

      channels = [].concat(places);

      for (var server of servers) {
        debug("arriving to %s", server.host);
        clients[server.host] = createClient(server);
        yield clients[server.host].ready();
      }
    }),

    places() {
      return [].concat(channels);
    },

    visit(place) {
      debug("visiting %s", place.name);
      currentChat = place;
    },

    currentPlace() {
      return currentChat;
    },

    talk(chat, message) {
      var client;

      if (!chat) {
        debug("there's no a selected chat, not sending the message");
        throw new Error("The required chat doesn't exist");
      }

      client = clients[chat.id.substr(0, chat.id.indexOf(":"))];

      if (!client) {
        throw new Error("Client not found for network: " + chat.network);
      }

      debug("talking to %s: %s", chat.id, message);

      client.say(chat.name, message);
    },

    vanish() {
      debug("disappearing");

      Object.keys(clients).forEach(clientId =>
        clients[clientId].disconnect("Bytez")
      );
    }
  });
};