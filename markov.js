var async = require('async');
var PostgresBackend = require('./postgresBackend');

class Markov {
    constructor(order, namespace) {
        if (order === undefined)
            order = 1;

        if (namespace === undefined)
            namespace = 'default';

        this.order = order;
        this.backend = new PostgresBackend(process.env.CONN_STRING, namespace);
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
            let key = words.slice(i, i + this.order).join(' ');

            // .. index the previous word
            let prev = (i >= 1 ?
                    words.slice(Math.max(0, i - this.order), i).join(' ') :
                    undefined),
                prevKey = [key, 'prev', prev].join('_');

            if (prevKey in insertWords) {
                insertWords[prevKey].weight++;
            }
            else {
                insertWords[prevKey] = {
                    order: this.order,
                    key,
                    direction: 'prev',
                    word: prev,
                    weight: 1
                };
            }

            // .. and the next word
            let next = (i + this.order < len ?
                    words.slice(i + this.order, i + this.order * 2).join(' ') :
                    undefined),
                nextKey = [key, 'next', next].join('_');

            if (nextKey in insertWords) {
                insertWords[nextKey].weight++;
            }
            else {
                insertWords[nextKey] = {
                    order: this.order,
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
