var async = require('async');
var PostgresBackend = require('./postgresBackend');

class Markov {
    constructor(order, namespace) {
        if (order === undefined)
            order = 1;

        if (namespace === undefined)
            namespace = 'default';

        this.order = order;
        this.backend = new PostgresBackend(namespace);
    }

    tokenize(text) {
        var words = text.split(/\s+/),
            tokens = {};

        // For every word..
        for (let i = 0, len = words.length; i < len - (this.order-1); i++)
        {
            let key = words.slice(i, i + this.order).join(' ');

            if (!key)
                continue;

            // .. index the previous word
            let prev = words.slice(Math.max(0, i - this.order), i).join(' '),
                prevKey = [key, 'prev', prev].join('_');

            if (prevKey in tokens) {
                tokens[prevKey].weight++;
            }
            else {
                tokens[prevKey] = {
                    order: this.order,
                    key,
                    direction: 'prev',
                    word: prev,
                    weight: 1
                };
            }

            // .. and the next word
            let next = words.slice(i + this.order, i + this.order * 2).join(' '),
                nextKey = [key, 'next', next].join('_');

            if (nextKey in tokens) {
                tokens[nextKey].weight++;
            }
            else {
                tokens[nextKey] = {
                    order: this.order,
                    key,
                    direction: 'next',
                    word: next,
                    weight: 1
                };
            }
        }

        return Object.values !== undefined ?
            Object.values(tokens) :
            Object.keys(tokens).map(key => tokens[key]);
    }

    /*
     * Indexing function
     */
    seed(text, cb) {
        // Transform object into array
        this.backend.insertWords(this.tokenize(text), cb);
    }

    prev(word, cb) {
        this.backend.pick(word, 'prev', this.order, cb);
    }
    next(word, cb) {
        this.backend.pick(word, 'next', this.order, cb);
    }

    backward(word, limit, callback) {
        var words = [word];

        async.whilst(
            () =>
                words.length < limit,
            (cb) =>
                this.prev(
                    words[words.length-1],
                    (err, answer) => {
                        if (err)
                            return cb(err);

                        if (!answer)
                            return cb(new Error('No more words'));

                        words.push(answer);
                        cb();
                    }
                ),
            (err) =>
                callback(err, words.reverse())
        );
    }

    forward(word, limit, callback) {
        var words = [word];

        async.whilst(
            () =>
                words.length < limit,
            (cb) =>
                this.next(
                    words[words.length-1],
                    (err, answer) => {
                        if (err)
                            return cb(err);

                        if (!answer)
                            return cb(new Error('No more words'));

                        words.push(answer);
                        cb();
                    }
                ),
            (err) =>
                callback(err, words)
        );
    }

    /*
     * Returns a random word
     */
    pick(cb) {
        this.backend.pickRandomWord(this.order, cb);
    }

    /*
     * Tries its best to respond to a series of tokens
     */
    respondToSentence(text, limit, cb) {
        var self = this;

        if (typeof opts == 'function' &&
            cb === undefined)
        {
            cb = opts;
            limit = 16;
        }

        var tokens = this.tokenize(text)
            .filter(value => value.direction == 'next')
            .map(value => value.key);

        var match;

        if (tokens.length === 0 &&
            text.length)
        {
            match = text;
            tokens = undefined;
        }

        this.backend.pickRandomWord(
            {
                order: this.order,
                tokens,
                match,
            },
            function(err, word) {
                if (err)
                    throw err;

                self.respond(word, limit, cb);
            }
        )
    }

    /*
     * Takes a word and responds to it in
     * both directions
     */
    respond(word, limit, cb) {
        var self = this;
        this.forward(word, limit, function(err, forwardWords) {
            if (err && err.message != 'No more words')
                return cb(err);

            if (forwardWords.length >= limit)
                return cb(err, forwardWords);

            self.backward(
                forwardWords[0],
                limit - forwardWords.length + 1,
                function(err, backwardWords) {
                    if (err && err.message != 'No more words')
                        return cb(err);

                    cb(
                        undefined,
                        backwardWords.slice(0, -1).concat(forwardWords)
                    );
                }
            );
        });
    }

    /*
     * Terminates backend connection
     */
    end(cb) {
        if (this.backend.end) {
            this.backend.end(cb);
        }
    }
};

module.exports = Markov;
