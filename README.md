# Collabor8

A simple consensus script for distributed systems relying on riak as a data store

### Configuring riak
riak-admin bucket-type create consensus '{"props":{"datatype":"map"}}'
riak-admin bucket-type activate consensus

### How to run
'''
node index.js
'''