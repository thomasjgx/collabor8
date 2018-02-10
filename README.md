# Collabor8

A simple consensus script for distributed systems relying on riak as a data store

Work-In-Progress. This script was developed for a very specific personal use case.
It may not work well for general use cases.
It still needs you to do the work of configuring riak nodes for each computer.

### Configuring riak on the master or the first computer to be setup
riak-admin bucket-type create consensus '{"props":{"datatype":"map"}}'
riak-admin bucket-type activate consensus

### Things to do
Ensure that all riak nodes in the network are part of the same cluster i.e riak-admin cluster join riak@-master-node-
Ensure riak master node as planned and committed the riak nodes

### How to run
'''
node index.js
'''