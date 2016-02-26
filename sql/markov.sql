CREATE TYPE direction AS ENUM ('next', 'prev');

CREATE TABLE markov (
    namespace VARCHAR(100) NOT NULL,
    markov_order SMALLINT NOT NULL,
    key VARCHAR(100) NOT NULL,
    direction direction NOT NULL,
    word VARCHAR(100) NOT NULL,
    weight INTEGER NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX markov_pkey ON markov (namespace, order, key, direction, word);
ALTER TABLE markov ADD CONSTRAINT markov_pkey UNIQUE USING INDEX markov_pkey;
