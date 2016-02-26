var Markov = require('./markov'),
    async = require('async'),
    assert = require('assert');

function indexMarkov(markov, cb) {
    async.each(
        [
            'Martin er kul',
            'Martin er smart',
            'Martin er best'
        ],
        function(sentence, cb) {
            markov.seed(sentence, cb);
        },
        cb
    );
}

var MartinErBestRegex = /^Martin er (kul|smart|best)$/,
    MartinerBest = [ 'Martin', 'er', 'best' ];

describe(`1. order markov chain`, function() {
    var order = 1;
    var markov = new Markov(order, 'default');

    it('should index without fail', function(done) {
        indexMarkov(
            markov,
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

    it('should answer next after «Martin»', function(done) {
        markov.next('Martin', function(err, next) {
            if (err && order === 1)
                throw err;

            assert.equal(next, 'er', `output was not «Martin er», but instead «Martin ${next}»`);
            done();
        });
    })

    it('should answer next after «er»', function(done) {
        markov.next('er', function(err, next) {
            if (err)
                throw err;

            assert(['kul', 'smart', 'best'].indexOf(next) !== -1, `Output: «${next}»`);
            done();
        });
    })

    it('should complete a sentence', function(done) {
        markov.forward('Martin', 3, function(err, words) {
            if (err)
                throw err;

            var answer = words.join(' ');
            assert(MartinErBestRegex.test(answer), `Answer was «${answer}»`);
            done();
        });
    })

    it('should error and give answer on too few words', function(done) {
        markov.forward('Martin', 4, function(err, words) {
            assert(!!err);
            assert(err.message, 'No more words');

            var answer = words.join(' ');
            assert(MartinErBestRegex.test(answer));
            done();
        });
    })

    it('should do backwards too', function(done) {
        markov.backward('best', 3, function(err, words) {
            if (err)
                throw err;

            var answer = words.join(' ');
            assert(MartinErBestRegex.test(answer), `Answer was «${answer}»`);
            done();
        });
    })

    it('should respond', function(done) {
        markov.respond('er', 3, function(err, words) {
            if (err)
                throw err;

            var answer = words.join(' ');
            assert(MartinErBestRegex.test(answer));
            done();
        });
    })
})

describe(`2. order markov chain`, function() {
    var order = 2;
    var markov = new Markov(order, 'default');

    it('should index without fail', function(done) {
        indexMarkov(
            markov,
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

    it('should answer next after «Martin»', function(done) {
        markov.next('Martin er', function(err, next) {
            if (err && order === 1)
                throw err;

            assert(['kul', 'smart', 'best'].indexOf(next) !== -1, `Output: «${next}»`);
            done();
        });
    })

    it('should complete a sentence', function(done) {
        markov.forward('Martin er', 2, function(err, words) {
            if (err)
                throw err;

            var answer = words.join(' ');
            assert(MartinErBestRegex.test(answer), `Answer was «${answer}»`);
            done();
        });
    })

    it('should error and give answer on too few words', function(done) {
        markov.forward('Martin er', 4, function(err, words) {
            assert(!!err);
            assert(err.message, 'No more words');

            var answer = words.join(' ');
            assert(MartinErBestRegex.test(answer));
            done();
        });
    })

    it('should do backwards too', function(done) {
        markov.backward('best', 2, function(err, words) {
            if (err)
                throw err;

            var answer = words.join(' ');
            assert(MartinErBestRegex.test(answer), `Answer was «${answer}»`);
            done();
        });
    })

    it('should respond', function(done) {
        markov.respond('Martin er', 3, function(err, words) {
            if (err)
                throw err;

            var answer = words.join(' ');
            assert(MartinErBestRegex.test(answer));
            done();
        });
    })
})
