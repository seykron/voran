module.exports = function Places(networks) {

  const PLACES_FILE = "data/places.json";

  const debug = require("debug")("places");
  const promisify = require("util").promisify;
  const fs = require("fs");
  const stat = promisify(fs.stat);
  const readFile = promisify(fs.readFile);
  const writeFile = promisify(fs.writeFile);

  var allPlaces = () => {
    var places = [];
    var network;

    for (network in networks) {
      places = places.concat(networks[network].places());
    }

    return places;
  };

  var findPlace = (placePath) => allPlaces()
    .find(place => place.path === placePath);

  var currentNetwork;

  async function joinNetworks(memories) {
    var network;

    for (network in networks) {
      const places = (memories[network] && memories[network].places) || [];
      await networks[network].arrive(places);
    }
  }

  return {

    async arrive() {
      var memories = {};
      var currentPlace;

      try {
        const placesInfo = await stat(PLACES_FILE);

        if (placesInfo.isFile()) {
          const placesData = await readFile(PLACES_FILE);

          debug("recovering memories");
          memories = JSON.parse(placesData.toString());
        }
      } catch(cause) {
        debug("error trying to recover memories: %s", JSON.stringify(cause));
      }

      await joinNetworks(memories);

      debug("visiting previous place: %s", memories.currentPlace);
      currentPlace = findPlace(memories.currentPlace);

      if (currentPlace) {
        currentNetwork = currentPlace && networks[currentPlace.network];
        currentNetwork.visit(currentPlace);
      }
    },

    allPlaces() {
      return allPlaces();
    },

    currentPlace() {
      if (!currentNetwork) {
        return null;
      }

      return currentNetwork.currentPlace();
    },

    visit(placePath) {
      var place = findPlace(placePath);
      var network = networks[place && place.network];

      if (!place || !network) {
        throw new Error("Required place doesn't exist: " + placePath);
      }

      currentNetwork = network;
      currentNetwork.visit(place);
    },

    talk(message) {
      if (!currentNetwork) {
        throw new Error("No place selected");
      }

      currentNetwork.talk(currentNetwork.currentPlace(), message);
    },

    remember() {
      var memories = {
        currentPlace: this.currentPlace() && this.currentPlace().path
      };
      var network;

      try {
        debug("remembering places");

        for (network in networks) {
          memories[network] = {
            currentPlace: networks[network].currentPlace(),
            places: networks[network].places()
          };
        }

        debug("saving memories: %s", JSON.stringify(memories));
        fs.writeFileSync(PLACES_FILE, JSON.stringify(memories));
      } catch (cause) {
        debug("Error remembering places: %s", JSON.stringify(cause));
      }
    },

    vanish() {
      for (network in networks) {
        networks[network].vanish();
      }
    },

    comeBack(placePath) {
      var place = findPlace(placePath);
      var network = networks[place && place.network];

      if (!place || !network) {
        throw new Error("Required place doesn't exist: " + placePath);
      }

      network.comeBack(place);
    },

    leave(placePath, message) {
      var place = findPlace(placePath);
      var network = networks[place && place.network];

      if (!place || !network) {
        throw new Error("Required place doesn't exist: " + placePath);
      }

      network.leave(place, message);
    }
  };
};
