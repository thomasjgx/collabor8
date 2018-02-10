const NodeMachine = require('node-machine-id')
const Ip = require('ip')
var Winston = require('winston')
var Riak = require('basho-riak-client')
var Async = require('async')

// Setup the logger
var logger = new (Winston.Logger)({
    transports: [
        new (Winston.transports.Console)()
    ]
})

/**
* Return the node settings of current computer which include a constant machine id, ip address and port number
*
* @return {Object}
*/
module.exports.getNode = function () {
    return {
        machine_id: NodeMachine.machineIdSync({original: true}),
        ip_address: Ip.address(),
        port: 9900
    }
}

/**
* Updates the node settings on the riak data store and returns true if it was successful
*
* @return {Boolean}
*/
module.exports.updateNode = function (cb) {
    const nodeSettings = this.getNode()
    var mapOp = null
    var client = new Riak.Client(['127.0.0.1'], function (err, c) {
        if (err) {
            logger.log('error', err)
            cb(false)
        } else {
            client.ping(function (err, rslt) {
                if (err) {
                    logger.log('error', err)
                    cb(false)
                } else {
                    var options = {
                        bucketType: 'consensus',
                        bucket: 'consensus',
                        key: 'machines'
                    }
                    client.fetchMap(options, function (err, rslt) {
                        if (err) {
                          logger.log('error', err)
                          cb(false)
                        } else {
                            if (rslt.notFound === true) {
                                // Machines key not found. Creating it
                                mapOp = new Riak.Commands.CRDT.UpdateMap.MapOperation()
                                mapOp.addToSet('devices', Buffer.from(nodeSettings.machine_id))
                                options = {
                                  bucketType: 'consensus',
                                  bucket: 'consensus',
                                  key: 'machines',
                                  op: mapOp
                                }
                                client.updateMap(options, function (err, rslt) {
                                  if (err) {
                                    logger.log('error', err)
                                    cb(false)
                                  } else {
                                    mapOp = new Riak.Commands.CRDT.UpdateMap.MapOperation()
                                    mapOp.setRegister('ip_address', Buffer.from(nodeSettings.ip_address))
                                    mapOp.setRegister('port', Buffer.from(nodeSettings.port))
                                    options = {
                                        bucketType: 'consensus',
                                        bucket: 'consensus',
                                        key: nodeSettings.machine_id,
                                        op: mapOp
                                    }
                                    client.updateMap(options, function (err, rslt) {
                                        if (err) {
                                            logger.log('error', err)
                                            cb(false)
                                        } else {
                                            cb(true)
                                        }
                                    })
                                  }
                                })
                            } else {
                                mapOp = new Riak.Commands.CRDT.UpdateMap.MapOperation()
                                mapOp.setRegister('ip_address', Buffer.from(nodeSettings.ip_address))
                                mapOp.setRegister('port', Buffer.from(nodeSettings.port.toString()))
                                options = {
                                    bucketType: 'consensus',
                                    bucket: 'consensus',
                                    key: nodeSettings.machine_id,
                                    op: mapOp
                                }
                                client.updateMap(options, function (err, rslt) {
                                    if (err) {
                                        logger.log('error', err)
                                        cb(false)
                                    } else {
                                        cb(true)
                                    }
                                })
                            }
                        }
                    })
                }
            })
        }
    })
}

/**
* Get list of peers (Any other computer in the cluster apart from myself)
*
* @return {Array}
*/
module.exports.getPeers = function (cb) {
    var self = this
    var client = new Riak.Client(['127.0.0.1'], function (err, c) {
        if (err) {
            logger.log('error', err)
            cb(false)
        } else {
            client.ping(function (err, rslt) {
                if (err) {
                    logger.log('error', err)
                    cb(false)
                } else {
                    var options = {
                        bucketType: 'consensus',
                        bucket: 'consensus',
                        key: 'machines'
                    }
                    client.fetchMap(options, function (err, rslt) {
                        if (err) {
                          logger.log('error', err)
                          cb(false)
                        } else {
                            var peers = []
                            var getPeersFunctions = []
                            rslt.map.sets.devices.forEach( function (device) {
                                if (device !== self.getNode().machine_id) {
                                    getPeersFunctions.push(function (asyncCb) {
                                        options = {
                                            bucketType: 'consensus',
                                            bucket: 'consensus',
                                            key: device
                                        }
                                        client.fetchMap(options, function (err, rsltDevice) {
                                            if (err) {
                                                logger.log('error', err)
                                            } else {
                                                if (rsltDevice.notFound !== true) {
                                                    asyncCb(null, '/ip4/' + rsltDevice.map.registers.ip_address.toString() + '/tcp/' + self.getNode().port)
                                                } else {
                                                    asyncCb(null, null)
                                                }
                                            }
                                        })
                                    })
                                } else {
                                    logger.info('info', 'Found myself in the peer list')
                                }
                            })
                            Async.series(getPeersFunctions, function (err, rslts) {
                                if (err) {
                                    logger.log('error', err)
                                } else {
                                    cb(rslts)
                                }
                            })
                        }
                    })
                }
            })
        }
    })
}