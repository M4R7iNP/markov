var PostgresClient = require('pg').Client;

class PostgresBackend {
    constructor(connString) {
        this.pg = new PostgresClient(connString);
        this.pg.connect(function(err) {
            if (err)
                throw err;
        });
    }

    // helper function
    queryRow(query, args, cb) {
        if (cb === undefined &&
            typeof args == 'function')
        {
            cb = args;
            args = [];
        }

        this.pg.query(query, args, function(err, result) {
            return cb(
                err,
                result.rows[0]
            );
        });
    }

    insertWord(key, direction, word, cb) {
        this.insertWords(
            [ {key, direction, word} ],
            cb
        );
    }

    insertWords(words, cb) {
        var i = 1;
        this.pg.query(
            `
            INSERT INTO
            markov (
                key, direction, word, weight
            )
            VALUES
                ${words.map(() => `(
                    $${i++},
                    $${i++},
                    $${i++},
                    $${i++}
                )`).join(', ')}
            ON CONFLICT ON CONSTRAINT markov_pkey
            DO UPDATE SET
                weight = markov.weight + EXCLUDED.weight;
            `,
            words.reduce(
                (carry, item) =>
                    carry.concat([
                        item.key,
                        item.direction,
                        item.word,
                        item.weight
                    ]),
                []
            ),
            (err, result) => {
                if (err)
                    console.log(sql);
                cb(err);
            }
        );
    }

    pick(key, direction, cb) {
        var random = Math.random();

        this.queryRow(
            `
            SELECT
                word
            FROM (
                SELECT
                    word,
                    (
                        sum(weight) OVER (ORDER BY weight, word)::decimal /
                        sum(weight) OVER (PARTITION BY key)
                    ) AS cumm_weight
                FROM
                    markov
                WHERE
                    key = $1 AND
                    direction = $2
                ) result
            WHERE
                $3 < cumm_weight
                LIMIT 1;
            `,
            [ key, direction, random ],
            (err, result) =>
                cb(err, result ? result.word : undefined)
        );
    }

    pickRandomWord(cb) {
        this.queryRow(
            `
                SELECT word
                FROM markov
                WHERE direction = 'next'
                OFFSET floor(random() * (SELECT count(*) FROM markov WHERE direction = 'next'))
                LIMIT 1;
            `,
            function(err, result) {
                cb(err, result ? result.word : undefined);
            }
        );
    }
}

module.exports = PostgresBackend;
