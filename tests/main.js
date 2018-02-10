const assert = require('assert')
var Riak = require('basho-riak-client')
var Ip = require('ip')
const Collabor8 = require('../index')

describe('getNode function: get current machine id, ip address and port number', function () {
  it('should have a machine_id as a non-empty string', function () {
    assert.equal(Collabor8.getNode().machine_id.length > 0, true, 'Empty machine_id found')
  })
  it('should have a ip_address as a non-empty string', function () {
    assert.equal(Collabor8.getNode().ip_address.length > 0, true, 'Empty ip_address found')
  })
  it('should have a port as an integer', function () {
    assert.equal(Collabor8.getNode().port > 0, true, 'Empty port found')
  })
})

describe('updateNodeSettings function: Save the current machine id, ip address and port number on a riak node', function () {
  it('callback should return true', function (done) {
    Collabor8.updateNode( function (result) {
      if (result === true) {
        done()
      } else {
        done('Failed to update riak node')
      }
    })
  })
  it('Machine key set should have matching machine id', function (done) {
    var client = new Riak.Client(['127.0.0.1'], function (err, c) {
      if (err) {
        logger.log('error', err)
        done('Error: ' + err)
      } else {
        client.ping(function (err, rslt) {
          if (err) {
            logger.log('error', err)
            done('Error: ' + err)
          } else {
            var options = {
              bucketType: 'consensus',
              bucket: 'consensus',
              key: 'machines'
            }
            client.fetchMap(options, function (err, rslt) {
              if (err) {
                logger.log('error', err)
                done('Error: ' + err)
              } else {
                if (rslt.notFound === true) {
                  done('Machines key not found')
                } else {
                  rslt.map.sets.devices.forEach( function (device) {
                    if (Collabor8.getNode().machine_id === device) {
                      done()
                    }
                  })
                  done(false)
                }
              }
            })
          }
        })
      }
    })
  })
  it('key with matching machine id should be found', function (done) {
    var client = new Riak.Client(['127.0.0.1'], function (err, c) {
      if (err) {
        logger.log('error', err)
        done('Could not connect to riak')
      } else {
        client.ping(function (err, rslt) {
          if (err) {
            logger.log('error', err)
            done('No riak nodes active')
          } else {
            var options = {
              bucketType: 'consensus',
              bucket: 'consensus',
              key: Collabor8.getNode().machine_id
            }
            client.fetchMap(options, function (err, rslt) {
              if (err) {
                logger.log('error', err)
                done('Error: ' + err)
              } else {
                if (rslt.notFound === true) {
                  done('Device id key not found')
                } else {
                  done()
                }
              }
            })
          }
        })
      }
    })
  })
  it('key with machine id should have a value of the current machine\'s ip address', function (done) {
    var client = new Riak.Client(['127.0.0.1'], function (err, c) {
      if (err) {
        logger.log('error', err)
        done('Error: ' + err)
      } else {
        client.ping(function (err, rslt) {
          if (err) {
            logger.log('error', err)
            done('Error: ' + err)
          } else {
            var options = {
              bucketType: 'consensus',
              bucket: 'consensus',
              key: Collabor8.getNode().machine_id
            }
            client.fetchMap(options, function (err, rslt) {
              if (err) {
                logger.log('error', err)
                done('Error: ' + err)
              } else {
                if (rslt.notFound === true) {
                  done('Device id key not found')
                } else {
                  if (rslt.map.registers.ip_address.toString() === Ip.address()) {
                    done()
                  } else {
                    done('IP address doesn\'t seem to be updated')
                  }
                }
              }
            })
          }
        })
      }
    })
  })
})

describe('getPeers function: Returns the list of others computers in the cluster', function () {
  it('It should return at least one peer', function (done) {
    var client = new Riak.Client(['127.0.0.1'], function (err, c) {
      if (err) {
        logger.log('error', err)
        done('Error: ' + err)
      } else {
        client.ping(function (err, rslt) {
          if (err) {
            logger.log('error', err)
            done('Error: ' + err)
          } else {
            var mapOp = new Riak.Commands.CRDT.UpdateMap.MapOperation()
            mapOp.addToSet('devices', Buffer.from('local-chai-test'))
            options = {
              bucketType: 'consensus',
              bucket: 'consensus',
              key: 'machines',
              op: mapOp
            }
            client.updateMap(options, function (err, rslt) {
                if (err) {
                    logger.log('error', err)
                    done('Error: ' + err)
                } else {
                  mapOp = new Riak.Commands.CRDT.UpdateMap.MapOperation()
                  mapOp.setRegister('ip_address', Buffer.from('192.168.0.1'))
                  mapOp.setRegister('port', Buffer.from('9900'))
                  options = {
                      bucketType: 'consensus',
                      bucket: 'consensus',
                      key: 'local-chai-test',
                      op: mapOp
                  }
                  client.updateMap(options, function (err, rslt) {
                      if (err) {
                          logger.log('error', err)
                          done('Error: ' + err)
                      } else {
                        Collabor8.getPeers( function (peers) {
                          if (peers.length > 0) {
                            done()
                          } else {
                            done('No peers found')
                          }
                        })
                      }
                  })
                }
            })
          }
        })
      }
    })
  })
})

describe('joinNetwork function: Joins other peers in a network and forms a cluster with election protocols', function () {
  it('Should return true when joined successfully', function (done) {
    Collabor8.getPeers( function (peers) {
      Collabor8.joinNetwork( peers, function (skiff, skiffdb, connected) {
        if (connected === true) {
          done()
        } else {
          done('Unable to join cluster')
        }
      })
    })
  })
})