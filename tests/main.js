const assert = require('assert')
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
  it('should return true', function (done) {
    collabor8.updateNodeSettings( function (result) {
      if (result === true) {
        done()
      } else {
        done('Failed to update riak node')
      }
    })
  })
})