# Markov chain in Nodejs with Postgresql

This project aims to be very Postgres centered, so that we can run several indexing processes at the same time. Just keep track of which process indexed what, and this should be lightning fast.

### Requirements
* PostgreSQL (>= 9.5) :heart_eyes:
* NodeJS :pill:
* Something to index :closed_book:
* Patience :persevere:

### Postgresql performance
* Turn off `synchronous_commit` if you can.
* Increase your usual settings like `shared_buffers` and `work_mem`.
* One instance of Markov runs _one_ Postgresql connection. Either run multiple instances or switch to [node pg pooling](https://github.com/brianc/node-postgres#client-pooling).
* You can remove the fulltext index while inserting your data.
