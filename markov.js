var async = require('async');

class Markov {
    constructor(order, backend) {
        if (order === undefined) {
            order = 1;
        }

        if (order !== 1)
            throw new Error('Only 1. order markov is supported');

        if (backend === undefined) {
            var PostgresBackend = require('./postgresBackend');
            backend = new PostgresBackend(process.env.CONN_STRING);
        }

        this.order = order;
        this.backend = backend;
    }

    /*
     * Indexing function
     */
    seed(text, cb) {
        var words = text.split(/\s+/),
            insertWords = {};

        // For every word..
        for (let i = 0, len = words.length; i < len; i++)
        {
            var key = words[i];

            // .. index the previous word
            if (i >= this.order) {
                let prev = words[i - this.order],
                    k = [key, 'prev', prev].join('_');

                if (k in insertWords)
                    insertWords[k].weight++;
                else
                    insertWords[k] = {
                        key,
                        direction: 'prev',
                        word: prev,
                        weight: 1
                    };
            }

            // .. and the next word
            if (i + this.order < len) {
                let next = words[i + this.order],
                    k = [key, 'next', next].join('_');

                if (k in insertWords)
                    insertWords[k].weight++;
                else
                    insertWords[k] = {
                        key,
                        direction: 'next',
                        word: next,
                        weight: 1
                    };
            }
        }

        // Transform object into array
        insertWords = Object.keys(insertWords).map((key) => insertWords[key]);

        if (!insertWords.length)
            return cb();

        this.backend.insertWords(insertWords, cb);
    }

    prev(word, cb) {
        this.backend.pick(word, 'prev', cb);
    }
    next(word, cb) {
        this.backend.pick(word, 'next', cb);
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
        this.backend.pickRandomWord(cb);
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
};

module.exports = Markov;
