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
    seed(text, callback) {
        var words = text.split(/\s+/),
            queries = [];

        for (let i = 0, len = words.length; i < len; i++)
        {
            var key = words[i];

            if (i > this.order) { // index prev
                var prev = words[i - this.order];
                queries.push(
                    this.backend.insertWord.bind(
                        this.backend, key, 'prev', prev
                    )
                );
            }

            if (i + this.order < len) { // index next
                var next = words[i + this.order];
                queries.push(
                    this.backend.insertWord.bind(
                        this.backend, key, 'next', next
                    )
                );
            }
        }

        // TODO: maybe use parallel here
        async.series(
            queries,
            callback
        );
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
