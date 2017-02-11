CREATE TYPE direction AS ENUM ('next', 'prev');

CREATE TABLE markov (
    namespace text NOT NULL,
    markov_order SMALLINT NOT NULL,
    key text NOT NULL,
    direction direction NOT NULL,
    word text NOT NULL,
    weight INTEGER NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX markov_pkey ON markov (namespace, markov_order, key, direction, word);
CREATE INDEX markov_text_search ON markov USING gin (to_tsvector('english', key));
ALTER TABLE markov ADD CONSTRAINT markov_pkey UNIQUE USING INDEX markov_pkey;
