const NodeMachine = require('node-machine-id')
const Ip = require('ip')
const Winston = require('winston')
const Riak = require('basho-riak-client')
const Async = require('async')
const Skiff = require('skiff')
const Memdown = require('memdown')

// Setup the logger
var logger = new (Winston.Logger)({
    transports: [
        new (Winston.transports.Console)()
    ]
})

/**
* Return the riak client
*
* @return {Object}
*/
module.exports.getRiak = function (cb) {
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
                    cb(client)
                }
            })
        }
    })
}

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
    var options = {
        bucketType: 'consensus',
        bucket: 'consensus',
        key: 'machines'
    }
    this.getRiak(function (riakClient) {
        riakClient.fetchMap(options, function (err, rslt) {
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
                    riakClient.updateMap(options, function (err, rslt) {
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
                        riakClient.updateMap(options, function (err, rslt) {
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
                    riakClient.updateMap(options, function (err, rslt) {
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
    })
}

/**
* Get list of peers (Any other computer in the cluster apart from myself)
*
* @return {Array}
*/
module.exports.getPeers = function (cb) {
    var self = this
    var options = {
        bucketType: 'consensus',
        bucket: 'consensus',
        key: 'machines'
    }
    this.getRiak(function (riakClient) {
        riakClient.fetchMap(options, function (err, rslt) {
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
                            riakClient.fetchMap(options, function (err, rsltDevice) {
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
    })
}

/**
* Join the other peers in the network
*
* @return {boolean}
*/
module.exports.joinNetwork = function (peers, cb) {
    options = {
        db: Memdown,
        peers: peers
    }
    const skiff = Skiff('/ip4/' + this.getNode().ip_address + '/tcp/19291', options)
    
    skiff.on('leader', function (results) {
        logger.log('info', 'Collabor8: I am leader')
    })
    skiff.on('new state', function (results) {
        if (results === 'New State: follower') {
            logger.log('info', 'Collabor8: I follow')
        }
    })
    skiff.start(err => {
        if (err) {
            logger.info('error', 'Error starting skiff node: ' + err.message)
            this.getRiak(function (riakClient) {
                cb(skiff, riakClient, false)
            })
        } else {
            this.getRiak(function (riakClient) {
                cb(skiff, riakClient, true)
            })
        }
    })
}