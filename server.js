const http = require('http');
const socketClusterServer = require('socketcluster-server');

let httpServer = http.createServer();
let agServer = socketClusterServer.attach(httpServer);

(async () => {
  for await (let { socket } of agServer.listener('connection')) {
    (async () => {
        // Set up a loop to handle and respond to RPCs for a procedure.
        for await (let req of socket.procedure('customProc')) {
          if (req.data.bad) {
            let error = new Error('Server failed to execute the procedure');
            error.name = 'BadCustomError';
            req.error(error);
          } else {
            req.end('Success');
          }
        }
      })();

      (async () => {
        // Set up a loop to handle remote transmitted events.
        for await (let data of socket.receiver('customRemoteEvent')) {
          console.log(data);
        }
      })();

      

      

      setInterval(() => {
        agServer.exchange.transmitPublish('sampleServerEvent', { data: 'some data' });
      }, 5000);
  }
})();

httpServer.listen(8000, () => {
  console.log('Server listening on port 8000');
});
