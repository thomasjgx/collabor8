const NodeMachine = require('node-machine-id')
const Ip = require('ip')
var Winston = require('winston')
var Riak = require('basho-riak-client')

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
module.exports.getNodeSettings = function () {
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
module.exports.updateNodeSettings = function (cb) {
    const nodeSettings = this.getNodeSettings()
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
                                mapOp.addToSet('devices', Buffer.from(nodeSettings.ip_address))
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