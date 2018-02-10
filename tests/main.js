const assert = require('assert')
var Riak = require('basho-riak-client')
var Ip = require('ip')
const collabor8 = require('../index')

describe('getNodeSettings function: get current machine id, ip address and port number', function () {
  it('should have a machine_id as a non-empty string', function () {
    assert.equal(collabor8.getNodeSettings().machine_id.length > 0, true, 'Empty machine_id found')
  })
  it('should have a ip_address as a non-empty string', function () {
    assert.equal(collabor8.getNodeSettings().ip_address.length > 0, true, 'Empty ip_address found')
  })
  it('should have a port as an integer', function () {
    assert.equal(collabor8.getNodeSettings().port > 0, true, 'Empty port found')
  })
})

describe('updateNodeSettings function: Save the current machine id, ip address and port number on a riak node', function () {
  it('callback should return true', function (done) {
    collabor8.updateNodeSettings( function (result) {
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
                    if (collabor8.getNodeSettings().machine_id === device) {
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
              key: collabor8.getNodeSettings().machine_id
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
              key: collabor8.getNodeSettings().machine_id
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