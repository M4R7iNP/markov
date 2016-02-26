# Markov chain in Nodejs with Postgresql

This project aims to be very Postgres centered, so that we can run several indexing processes at the same time. Just keep track of which process indexed what, and this should be lightning fast.

### Requirements
* PostgreSQL (>= 9.5) :heart_eyes:
* NodeJS :pill:
* Something to index :closed_book:
* Patience :persevere:

----
### TODO:
* Support several «orders» (WIP)
* Look for performance improvements (indexing 100 Tek.no headlines currently takes 6 seconds. Now imagine a whole article. Ohboy…)
* Implement some sort of «word variance» system («Cool», «cool» and «cool.» are all different words at the moment)
