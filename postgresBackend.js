var PostgresClient = require('pg').native.Client;

class PostgresBackend {
    constructor(namespace) {
        this.pg = new PostgresClient();
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
        if (!words.length)
            return cb();

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

        this.queryRow(
            `
            SELECT
                word
            FROM (
                SELECT
                    word,
                    (
                        sum(weight) OVER (ORDER BY word)::decimal /
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
            [ key, order, direction, this.getRandomDecimal() ],
            (err, result) =>
                cb(err, result ? result.word : undefined)
        );
    }

    /**
     * Picks a random key from the db
     * TODO: maybe create a cache table
     */
    pickRandomWord(opts, cb) {
        if (typeof opts == 'function') {
            cb = opts;
            opts = {
                order: 1
            };
        }
        else if (typeof opts == 'number') {
            opts = {
                order: opts
            };
        }

        var queryParams = [ opts.order, this.getRandomDecimal() ],
            hasTokens = opts.tokens && opts.tokens.length;

        if (hasTokens) {
            queryParams.push(opts.tokens)
        }

        if (opts.match) {
            queryParams.push(opts.match)
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
                            ${hasTokens ? " AND key = ANY ( $3 ) " : ''}
                            ${opts.match ? " AND to_tsvector('english', key) @@ to_tsquery('english', $3) " : ''}
                        GROUP BY
                            key
                    ) a
                ) result
            WHERE
                $2 <= cumm_weight
                LIMIT 1;
            `,
            queryParams,
            function(err, result) {
                cb(err, result ? result.key : undefined);
            }
        );
    }

    getRandomDecimal() {
        return Math.random().toString() + Math.random().toString().substr(-2);
    }

    end(cb) {
        this.pg.end(cb);
    }
}

module.exports = PostgresBackend;
