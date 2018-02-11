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
Ensure riak master node has planned and committed the riak nodes

### How to use
Add node details to riak node
``` 
Collabor8.updateNode( function (result) {
  if (result === true) {
    // We have updated riak with details of this computer.
    // We do this with other computers so that we create a sort of manifest of all computers to join the cluster
  }
})
```

Join a cluster
``` 
Collabor8.getPeers( function (peers) {
  Collabor8.joinNetwork( peers, function (skiff, riakClient, connected) {
    if (connected === true) {
      // We are connected to the cluster. 
      if (skiff._node._state.name === 'leader') {
        // We can do stuff as leader
      }
      if (skiff._node._state.name === 'follower') {
        // We can do stuff as follower
      }
      // We can use the riakClient object to update the riak key/value store. See basho-riak-client npm module for more details
      riakClient.ping(function (err, rslt) {
        if (err) {
          console.log('Riak node is down')
        } else {
          console.log('Riak node is up. We can update riak')
        }
      })
    }
  })
})
``` 