var PostgresClient = require('pg').Client;

class PostgresBackend {
    constructor(connString, namespace) {
        this.pg = new PostgresClient(connString);
        this.namespace = namespace;
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
                result ? result.rows[0] : undefined
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
                namespace,
                markov_order,
                key,
                direction,
                word,
                weight
            )
            VALUES
                ${words.map(() => `(
                    '${this.namespace}',
                    $${i++},
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
                        item.order,
                        item.key,
                        item.direction,
                        item.word,
                        item.weight
                    ]),
                []
            ),
            (err, result) => {
                cb(err);
            }
        );
    }

    pick(key, direction, order, cb) {
        if (typeof order == 'function') {
            cb = order;
            order = 1;
        }

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
                    namespace = '${this.namespace}' AND
                    key = $1 AND
                    markov_order = $2 AND
                    direction = $3
                ) result
            WHERE
                $4 < cumm_weight
                LIMIT 1;
            `,
            [ key, order, direction, random ],
            (err, result) =>
                cb(err, result ? result.word : undefined)
        );
    }

    /**
     * Picks a random key from the db
     * TODO: maybe create a cache table
     */
    pickRandomWord(order, cb) {
        if (typeof order == 'function') {
            cb = order;
            order = 1;
        }

        this.queryRow(
            `
            SELECT
                key
            FROM (
                SELECT
                    key,
                    (
                        sum(weight) OVER (ORDER BY key)::decimal /
                        sum(weight) OVER ()
                    ) AS cumm_weight
                FROM
                    (
                        SELECT key, sum(weight) AS weight
                        FROM markov
                        WHERE
                            namespace = '${this.namespace}' AND
                            markov_order = $1
                        GROUP BY
                            key
                    ) a
                ) result
            WHERE
                $2 < cumm_weight
                LIMIT 1;
            `,
            [ order, Math.random() ],
            function(err, result) {
                cb(err, result ? result.key : undefined);
            }
        );
    }
}

module.exports = PostgresBackend;
