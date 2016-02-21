CREATE TYPE direction AS ENUM ('next', 'prev');

CREATE TABLE markov (
    key VARCHAR(100),
    direction direction,
    word VARCHAR(100),
    weight INTEGER
);

CREATE UNIQUE INDEX markov_pkey ON markov (key, direction, word);
ALTER TABLE markov ADD CONSTRAINT markov_pkey UNIQUE USING INDEX markov_pkey;
