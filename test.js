var Markov = require('./markov'),
    async = require('async'),
    assert = require('assert');

var markov = new Markov();

it('should index without fail', function(done) {
    async.each(
        [
            'Martin er kul',
            'Martin er smart',
            'Martin er best'
        ],
        function(sentence, cb) {
            markov.seed(sentence, cb);
        },
        function(err) {
            if (err)
                throw err;

            assert(true);
            // If we got this far without
            // an error, I'm happy.
            done();
        }
    );
});

it('should provide the obvious answer', function(done) {
    markov.next('Martin', function(err, next) {
        if (err)
            throw err;

        assert.equal(next, 'er');
        done();
    });
})

it('should answer a more complicated one', function(done) {
    markov.next('er', function(err, next) {
        if (err)
            throw err;

        assert(['kul', 'smart', 'best'].indexOf(next) !== -1);
        done();
    });
})

it('should complete a sentence', function(done) {
    markov.forward('Martin', 3, function(err, words) {
        if (err)
            throw err;

        var answer = words.join(' ');
        assert(/^Martin er (kul|smart|best)$/.test(answer));
        done();
    });
})

it('should error and give answer on too few words', function(done) {
    markov.forward('Martin', 4, function(err, words) {
        assert(!!err);
        assert(err.message, 'No more words');

        var answer = words.join(' ');
        assert(/^Martin er (kul|smart|best)$/.test(answer));
        done();
    });
})

it('should do backwards too', function(done) {
    markov.backward('best', 3, function(err, words) {
        if (err)
            throw err;

        var answer = words.join(' ');
        assert(/^Martin er (kul|smart|best)$/.test(answer));
        done();
    });
})

it('should respond', function(done) {
    markov.respond('er', 3, function(err, words) {
        if (err)
            throw err;

        var answer = words.join(' ');
        assert(/^Martin er (kul|smart|best)$/.test(answer));
        done();
    });
})
