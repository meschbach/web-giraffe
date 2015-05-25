Web Giraffe

A library for distributing work across a set of WebWorkers.

License: Apache 2.0

## Quick Start

Please see the instructions at: https://github.com/meschbach/web-giraffe/wiki.

## Contributing
To generate artifacts for the examples run:
``grunt build-examples``

To generate the artifacts for tests run:
``grunt``

Run unit tests via karma:
``karma start``

Run system tests via karma:
``karma start karma-system.conf.js``

As a rule of them any changes should really have tests (either system for new features and/or units for other changes).

### NodeJS/IOJS Testing

Currently the system is in a state of flux while adding the service side processing.

```shell
grunt test
```
