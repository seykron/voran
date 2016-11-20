module.exports = function Sentence(delimiter) {

  var extractParams = (sentence) => {
    var words = sentence.split(" ");
    var literal = null;

    return words.reduce((prev, word) => {
      var literalStarts = word.substr(0, 1) == (delimiter || "\"");
      var literalEnds = word.substr(-1, 1) == (delimiter || "\"");

      if (literalStarts) {
        if (literalEnds) {
          literal = [word.substr(1, word.length - 2)];
        } else {
          literal = [word.substr(1)];
        }
      }
      if (literal && !literalStarts && !literalEnds) {
        literal.push(word);
      }
      if (literalEnds) {
        if (!literalStarts) {
          literal.push(word.substr(0, word.length - 1));
        }
        prev.push(literal.join(" "));
        literal = null;
      }
      return prev;
    }, []);
  };

  return {
    extractParams(sentence) {
      return extractParams(sentence);
    }
  };
};